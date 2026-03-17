import React, { useState, useEffect, useRef } from 'react';
import {
    Text, View, StyleSheet, TouchableOpacity,
    Animated, Easing, Dimensions, TextInput, Modal,
    Pressable, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { db } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const SCAN_WINDOW = 260;

// Scan result state type: null | 'success' | 'error' | 'used'
export default function ScanTicketScreen({ navigation, route }) {
    const eventId = route.params?.eventId;
    const { colors, isDarkMode } = useTheme();
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanResult, setScanResult] = useState(null); // { type, name, passType, time, message }
    const [torchOn, setTorchOn] = useState(false);
    const [manualModalVisible, setManualModalVisible] = useState(false);
    const [manualCode, setManualCode] = useState('');

    // Animated scan line
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: SCAN_WINDOW,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Result card slide-in
    const cardSlide = useRef(new Animated.Value(300)).current;
    useEffect(() => {
        if (scanResult) {
            Animated.spring(cardSlide, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }).start();
        } else {
            cardSlide.setValue(300);
        }
    }, [scanResult]);

    useEffect(() => {
        if (permission && !permission.granted) requestPermission();
    }, [permission]);

    const processTicket = async (data) => {
        try {
            const ticketData = JSON.parse(data);
            const registrationId = ticketData.registrationId;
            if (!registrationId) {
                setScanResult({ type: 'error', message: 'Invalid Ticket QR Code' });
                return;
            }
            const docRef = doc(db, 'registrations', registrationId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const regData = docSnap.data();
                if (regData.utilized) {
                    setScanResult({
                        type: 'used',
                        name: regData.userName || 'Unknown',
                        passType: 'General Admission',
                        message: 'Ticket Already Used',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    });
                } else {
                    await updateDoc(docRef, { utilized: true });
                    setScanResult({
                        type: 'success',
                        name: regData.userName || 'Attendee',
                        passType: 'General Admission',
                        message: 'Ticket Valid',
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    });
                }
            } else {
                // If direct doc fetch fails, try to resolve as a short ID if we have an eventId context or can fetch organizer's events
                if (registrationId.length <= 8) {
                    let querySnapshots = [];

                    if (eventId) {
                        const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
                        querySnapshots.push(await getDocs(q));
                    } else if (user) {
                        // Global scan without specific eventId: Find all events created by this organizer
                        const eQ = query(collection(db, 'events'), where('createdBy', '==', user.uid));
                        const eSnap = await getDocs(eQ);
                        const eventIds = eSnap.docs.map(d => d.id);

                        // Chunk by 30 due to Firestore 'in' query limits
                        for (let i = 0; i < eventIds.length; i += 30) {
                            const chunk = eventIds.slice(i, i + 30);
                            const rQ = query(collection(db, 'registrations'), where('eventId', 'in', chunk));
                            querySnapshots.push(await getDocs(rQ));
                        }
                    }

                    let matchedDoc = null;
                    for (const snap of querySnapshots) {
                        snap.forEach((d) => {
                            if (d.id.toUpperCase().startsWith(registrationId.toUpperCase())) {
                                matchedDoc = d;
                            }
                        });
                        if (matchedDoc) break;
                    }

                    if (matchedDoc) {
                        const regData = matchedDoc.data();
                        if (regData.utilized) {
                            setScanResult({
                                type: 'used',
                                name: regData.userName || 'Unknown',
                                passType: 'General Admission',
                                message: 'Ticket Already Used',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            });
                        } else {
                            await updateDoc(doc(db, 'registrations', matchedDoc.id), { utilized: true });
                            setScanResult({
                                type: 'success',
                                name: regData.userName || 'Attendee',
                                passType: 'General Admission',
                                message: 'Ticket Valid',
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            });
                        }
                        return;
                    }
                }

                setScanResult({ type: 'error', message: 'Ticket not found in database' });
            }
        } catch (e) {
            setScanResult({ type: 'error', message: 'Failed to read QR code' });
        }
    };

    const handleBarCodeScanned = ({ data }) => {
        setScanned(true);
        processTicket(data);
    };

    const handleScanNext = () => {
        setScanResult(null);
        setScanned(false);
    };

    const handleManualEntry = () => {
        if (!manualCode.trim()) return;
        setManualModalVisible(false);
        setScanned(true);
        processTicket(JSON.stringify({ registrationId: manualCode.trim() }));
        setManualCode('');
    };

    const initials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white', textAlign: 'center' }}>Requesting camera permission...</Text>
            </View>
        );
    }
    if (!permission.granted) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }]}>
                <MaterialCommunityIcons name="camera-off" size={48} color={colors.textSecondary} />
                <Text style={{ color: colors.text, textAlign: 'center', fontSize: 16 }}>Camera access is required to scan tickets.</Text>
                <TouchableOpacity style={[styles.grantButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
                    <Text style={styles.grantButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
            <StatusBar style="light" />

            {/* Camera Background */}
            <CameraView
                style={StyleSheet.absoluteFill}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417'] }}
                enableTorch={torchOn}
                autofocus="on"
                facing="back"
            />

            {/* Premium Scanner Overlay */}
            <View style={styles.overlay}>
                {/* Top Cinematic Mask */}
                <ExpoGradient
                    colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.6)', 'transparent']}
                    style={styles.overlayTop}
                />

                <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    {/* High-Tech Scan Window */}
                    <View style={[styles.scanWindow, { borderColor: colors.glassBorder }]}>
                        <BlurView intensity={isDarkMode ? 10 : 0} tint="dark" style={StyleSheet.absoluteFill} />

                        {/* Precision Corner Markers */}
                        <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
                        <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
                        <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
                        <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />

                        {/* Atmospheric Scan Line */}
                        <Animated.View
                            style={[
                                styles.scanLine,
                                {
                                    transform: [{ translateY: scanLineAnim }],
                                    backgroundColor: colors.primary,
                                    ...Platform.select({ web: { boxShadow: `0 0 15px ${colors.primary}80` }, default: { shadowColor: colors.primary } }),
                                },
                            ]}
                        >
                            <ExpoGradient
                                colors={['transparent', colors.primary, 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>
                    <View style={styles.overlaySide} />
                </View>

                {/* Bottom Cinematic Mask */}
                <ExpoGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
                    style={styles.overlayBottom}
                >
                    <View style={[styles.alignHint, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: colors.glassBorder }]}>
                        <MaterialCommunityIcons name="target" size={16} color="rgba(255,255,255,0.7)" style={{ marginRight: 8 }} />
                        <Text style={styles.alignHintText}>ALIGN VALID QR CODE</Text>
                    </View>
                </ExpoGradient>
            </View>

            {/* Premium Header Control Bar */}
            <ExpoGradient
                colors={['rgba(0,0,0,0.85)', 'transparent']}
                style={styles.topBar}
            >
                <BlurView intensity={20} tint="dark" style={styles.headerGlassBacking}>
                    <Pressable
                        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
                    </Pressable>
                    <View style={styles.titleBlock}>
                        <Text style={styles.topBarTitle}>VALIDATION PORTAL</Text>
                        <View style={styles.liveBadge}>
                            <View style={[styles.liveDot, { backgroundColor: '#4ade80' }]} />
                            <Text style={styles.liveText}>NEURAL SCAN ACTIVE</Text>
                        </View>
                    </View>
                    <Pressable
                        style={({ pressed }) => [
                            styles.iconButton,
                            torchOn && styles.iconButtonActive,
                            pressed && { opacity: 0.7 }
                        ]}
                        onPress={async () => {
                            const newTorchState = !torchOn;
                            setTorchOn(newTorchState);

                            // Mobile Browser Fallback: Direct MediaStream manipulation
                            if (Platform.OS === 'web') {
                                try {
                                    const videoElements = document.getElementsByTagName('video');
                                    for (let i = 0; i < videoElements.length; i++) {
                                        const stream = videoElements[i].srcObject;
                                        if (stream) {
                                            const tracks = stream.getVideoTracks();
                                            for (const track of tracks) {
                                                const capabilities = track.getCapabilities?.() || {};
                                                if (capabilities.torch) {
                                                    await track.applyConstraints({
                                                        advanced: [{ torch: newTorchState }]
                                                    });
                                                    console.log(`Torch successfully ${newTorchState ? 'enabled' : 'disabled'} via MediaStream`);
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn("Mobile browser torch fallback failed:", e);
                                }
                            }
                        }}
                    >
                        <MaterialCommunityIcons name={torchOn ? 'flash' : 'flash-outline'} size={24} color="white" />
                    </Pressable>
                </BlurView>
            </ExpoGradient>

            {/* High-Performance Result Sheet */}
            {scanResult && (
                <Animated.View style={[styles.resultSheet, {
                    borderColor: colors.glassBorder,
                    transform: [{ translateY: cardSlide }]
                }]}>
                    <BlurView intensity={90} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill} />

                    {/* Visual Feedback Bar */}
                    <ExpoGradient
                        colors={scanResult.type === 'success'
                            ? ['#4ade80', '#059669']
                            : ['#f87171', '#dc2626']}
                        style={styles.resultTopBar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />

                    <View style={styles.resultContent}>
                        <View style={styles.resultRow}>
                            {/* Cinematic Status Icon */}
                            <View style={[
                                styles.resultIcon,
                                {
                                    backgroundColor: scanResult.type === 'success'
                                        ? 'rgba(74, 222, 128, 0.1)'
                                        : scanResult.type === 'used'
                                            ? 'rgba(245, 158, 11, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                    borderColor: scanResult.type === 'success' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    borderWidth: 1,
                                }
                            ]}>
                                <MaterialCommunityIcons
                                    name={scanResult.type === 'success' ? 'shield-check' : scanResult.type === 'used' ? 'alert-decagram' : 'shield-alert'}
                                    size={36}
                                    color={scanResult.type === 'success' ? '#10b981' : scanResult.type === 'used' ? '#f59e0b' : '#ef4444'}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <View style={styles.resultTitleRow}>
                                    <View>
                                        <Text style={[styles.resultTitle, { color: colors.text }]}>
                                            {scanResult.type === 'success' ? 'IDENTITY VERIFIED' : scanResult.type === 'used' ? 'SECURITY ALERT' : 'ACCESS DENIED'}
                                        </Text>
                                        <Text style={[
                                            styles.resultSubtitle,
                                            { color: scanResult.type === 'success' ? '#10b981' : scanResult.type === 'used' ? '#f59e0b' : '#ef4444' }
                                        ]}>
                                            {scanResult.message.toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={[styles.timeBadge, { backgroundColor: colors.surface + '60' }]}>
                                        <Text style={[styles.resultTime, { color: colors.textSecondary }]}>{scanResult.time}</Text>
                                    </View>
                                </View>

                                {scanResult.name && (
                                    <BlurView intensity={20} tint={isDarkMode ? "dark" : "light"} style={[styles.attendeeCard, { backgroundColor: colors.surface + '30', borderColor: colors.glassBorder }]}>
                                        <ExpoGradient
                                            colors={isDarkMode ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(19, 91, 236, 0.05)', 'transparent']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={[styles.attendeeAvatar, { backgroundColor: colors.primary }, Platform.select({ web: { boxShadow: `0 4px 12px ${colors.primary}40` }, default: { shadowColor: colors.primary } })]}>
                                            <MaterialCommunityIcons name="account" size={24} color="white" />
                                        </View>
                                        <View>
                                            <Text style={[styles.attendeeName, { color: colors.text }]}>{scanResult.name}</Text>
                                            <Text style={[styles.attendeePass, { color: colors.textSecondary }]}>{scanResult.passType.toUpperCase()}</Text>
                                        </View>
                                    </BlurView>
                                )}
                                {!scanResult.name && (
                                    <View style={[styles.errorAlert, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                        <Text style={styles.errorMessage}>{scanResult.message}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.secondaryBtn,
                                    { backgroundColor: colors.surface + '40', borderColor: colors.glassBorder }
                                ]}
                                onPress={() => setManualModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="form-textbox" size={20} color={colors.text} />
                                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>MANUAL OVERRIDE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.primaryBtn,
                                    Platform.select({ web: { boxShadow: `0 8px 24px ${colors.primary}40` }, default: { shadowColor: colors.primary } })
                                ]}
                                onPress={handleScanNext}
                                activeOpacity={0.8}
                            >
                                <ExpoGradient
                                    colors={[colors.primary, '#6366f1']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <MaterialCommunityIcons name="qrcode-scan" size={20} color="white" />
                                <Text style={styles.primaryBtnText}>NEXT SCAN</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}

            {/* Bottom helper when no result */}
            {!scanResult && (
                <View style={styles.bottomHelper}>
                    <TouchableOpacity style={styles.manualEntryChip} onPress={() => setManualModalVisible(true)}>
                        <MaterialCommunityIcons name="keyboard" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.manualEntryChipText}>Manual Entry</Text>
                    </TouchableOpacity>
                    <Text style={styles.versionText}>EventSphere • Connected</Text>
                </View>
            )}

            {/* Manual entry modal */}
            <Modal
                visible={manualModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setManualModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Enter Ticket ID</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder="Paste or type Registration ID"
                            placeholderTextColor={colors.textSecondary}
                            value={manualCode}
                            onChangeText={setManualCode}
                            autoCapitalize="none"
                            selectionColor={colors.primary}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setManualModalVisible(false)}>
                                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleManualEntry}>
                                <Text style={styles.modalConfirmText}>Verify</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Overlay
    overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
    overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
    overlayMiddle: { flexDirection: 'row', height: SCAN_WINDOW },
    overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
    overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', paddingTop: 28 },
    alignHint: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 100,
    },
    alignHintText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },

    // Scan window
    scanWindow: {
        width: SCAN_WINDOW,
        height: SCAN_WINDOW,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: CORNER_SIZE,
        height: CORNER_SIZE,
    },
    cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 16 },
    cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 16 },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 16 },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 16 },
    scanLine: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 4,
        opacity: 0.8,
        ...Platform.select({
            web: { boxShadow: '0 0 15px currentColor' },
            default: {
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 12,
            }
        })
    },

    // Top bar
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerGlassBacking: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconButton: {
        width: 48, height: 48, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    iconButtonActive: { backgroundColor: 'rgba(255,255,100,0.3)' },
    titleBlock: { alignItems: 'center' },
    topBarTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: 'white' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },

    // Result sheet
    resultSheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    resultTopBar: { height: 6, width: '100%' },
    resultContent: { padding: 24, paddingBottom: 48 },
    resultRow: { flexDirection: 'row', gap: 20, marginBottom: 24 },
    resultIcon: {
        width: 64, height: 64, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    resultTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    resultTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
    resultSubtitle: { fontSize: 18, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
    timeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    resultTime: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    attendeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    attendeeAvatar: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
            default: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            }
        })
    },
    attendeeName: { fontWeight: '900', fontSize: 16, letterSpacing: -0.3 },
    attendeePass: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
    errorAlert: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
    errorMessage: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

    // Action buttons
    actionRow: { flexDirection: 'row', gap: 16 },
    secondaryBtn: {
        flex: 1, height: 60, borderRadius: 20,
        borderWidth: 1.5,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    secondaryBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    primaryBtn: {
        flex: 1, height: 60, borderRadius: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 8px 15px rgba(0,0,0,0.3)' },
            default: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 15,
                elevation: 8,
            }
        })
    },
    primaryBtnText: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

    // Bottom helper (no result state)
    bottomHelper: {
        position: 'absolute', bottom: 48, left: 0, right: 0,
        alignItems: 'center', gap: 20,
    },
    manualEntryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    },
    manualEntryChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
    versionText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },

    // Grant permission
    grantButton: {
        height: 56, paddingHorizontal: 32,
        borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    },
    grantButtonText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

    // Manual modal
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalSheet: {
        borderTopLeftRadius: 40, borderTopRightRadius: 40,
        padding: 32, paddingBottom: 60, gap: 24,
        borderTopWidth: 1.5, overflow: 'hidden',
    },
    modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    modalInput: {
        borderRadius: 20,
        borderWidth: 1.5,
        paddingHorizontal: 20, paddingVertical: 18,
        fontSize: 16, fontWeight: '700',
    },
    modalActions: { flexDirection: 'row', gap: 16 },
    modalCancelBtn: {
        flex: 1, height: 60, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
    },
    modalCancelText: { fontWeight: '900', letterSpacing: 1, fontSize: 13 },
    modalConfirmBtn: {
        flex: 1, height: 60, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    modalConfirmText: { color: 'white', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
});
