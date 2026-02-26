import React, { useState, useEffect, useRef } from 'react';
import {
    Text, View, StyleSheet, TouchableOpacity,
    Animated, Easing, Dimensions, TextInput, Modal,
    Pressable
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { db } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const SCAN_WINDOW = 260;

// Scan result state type: null | 'success' | 'error' | 'used'
export default function ScanTicketScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
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
            />

            {/* Overlay mask — 4 dark quadrants + central clear window */}
            <View style={styles.overlay}>
                {/* Top dark */}
                <View style={styles.overlayTop} />
                {/* Middle row */}
                <View style={styles.overlayMiddle}>
                    <View style={styles.overlaySide} />
                    {/* Scan window */}
                    <View style={styles.scanWindow}>
                        {/* Corner markers */}
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                        {/* Animated scan line */}
                        <Animated.View
                            style={[
                                styles.scanLine,
                                { transform: [{ translateY: scanLineAnim }] },
                            ]}
                        />
                    </View>
                    <View style={styles.overlaySide} />
                </View>
                {/* Bottom dark */}
                <View style={styles.overlayBottom}>
                    <View style={styles.alignHint}>
                        <Text style={styles.alignHintText}>Align QR code within frame</Text>
                    </View>
                </View>
            </View>

            {/* Top header */}
            <LinearGradient
                colors={['rgba(0,0,0,0.75)', 'transparent']}
                style={styles.topBar}
            >
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.titleBlock}>
                    <Text style={styles.topBarTitle}>Scan Entry Ticket</Text>
                    <View style={styles.liveBadge}>
                        <Animated.View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live Camera</Text>
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
            </LinearGradient>

            {/* Bottom Result Sheet */}
            {scanResult && (
                <Animated.View style={[styles.resultSheet, {
                    backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                    borderColor: colors.border,
                    transform: [{ translateY: cardSlide }]
                }]}>
                    {/* Top color bar */}
                    <LinearGradient
                        colors={scanResult.type === 'success'
                            ? ['#4ade80', '#059669']
                            : scanResult.type === 'used'
                                ? ['#f59e0b', '#d97706']
                                : ['#ef4444', '#dc2626']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.resultTopBar}
                    />
                    <View style={styles.resultContent}>
                        <View style={styles.resultRow}>
                            {/* Status icon */}
                            <View style={[
                                styles.resultIcon,
                                {
                                    backgroundColor: scanResult.type === 'success'
                                        ? 'rgba(74, 222, 128, 0.15)'
                                        : scanResult.type === 'used'
                                            ? 'rgba(245, 158, 11, 0.15)'
                                            : 'rgba(239, 68, 68, 0.15)'
                                }
                            ]}>
                                <MaterialCommunityIcons
                                    name={scanResult.type === 'success' ? 'check-circle' : scanResult.type === 'used' ? 'alert-circle' : 'close-circle'}
                                    size={32}
                                    color={scanResult.type === 'success' ? '#4ade80' : scanResult.type === 'used' ? '#f59e0b' : '#ef4444'}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.resultTitleRow}>
                                    <View>
                                        <Text style={[styles.resultTitle, { color: colors.text }]}>
                                            {scanResult.type === 'success' ? 'Verified' : scanResult.type === 'used' ? 'Already Used' : 'Entry Denied'}
                                        </Text>
                                        <Text style={[
                                            styles.resultSubtitle,
                                            { color: scanResult.type === 'success' ? '#4ade80' : scanResult.type === 'used' ? '#f59e0b' : '#ef4444' }
                                        ]}>
                                            {scanResult.message}
                                        </Text>
                                    </View>
                                    <Text style={styles.resultTime}>{scanResult.time}</Text>
                                </View>
                                {scanResult.name && (
                                    <View style={[styles.attendeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={[styles.attendeeAvatar, { backgroundColor: colors.primary }]}>
                                            <Text style={styles.attendeeInitials}>{initials(scanResult.name)}</Text>
                                        </View>
                                        <View>
                                            <Text style={[styles.attendeeName, { color: colors.text }]}>{scanResult.name}</Text>
                                            <Text style={[styles.attendeePass, { color: colors.textSecondary }]}>{scanResult.passType}</Text>
                                        </View>
                                    </View>
                                )}
                                {!scanResult.name && (
                                    <Text style={styles.errorMessage}>{scanResult.message}</Text>
                                )}
                            </View>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setManualModalVisible(true)}>
                                <MaterialCommunityIcons name="keyboard" size={18} color={colors.text} />
                                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Manual Entry</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleScanNext}>
                                <MaterialCommunityIcons name="qrcode-scan" size={18} color="white" />
                                <Text style={styles.primaryBtnText}>Scan Next</Text>
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
    cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: '#135bec', borderTopLeftRadius: 12 },
    cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: '#135bec', borderTopRightRadius: 12 },
    cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: '#135bec', borderBottomLeftRadius: 12 },
    cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: '#135bec', borderBottomRightRadius: 12 },
    scanLine: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        backgroundColor: '#135bec',
        opacity: 0.8,
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },

    // Top bar
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    iconButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center', justifyContent: 'center',
    },
    iconButtonActive: { backgroundColor: 'rgba(255,255,100,0.2)' },
    titleBlock: { alignItems: 'center' },
    topBarTitle: { fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80' },
    liveText: { fontSize: 11 },

    // Result sheet
    resultSheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(28, 28, 30, 0.92)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    resultTopBar: { height: 4, width: '100%' },
    resultContent: { padding: 20, paddingBottom: 40 },
    resultRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    resultIcon: {
        width: 52, height: 52, borderRadius: 26,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    resultTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    resultTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    resultSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    resultTime: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' },
    attendeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    attendeeAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#4c1d95',
        alignItems: 'center', justifyContent: 'center',
    },
    attendeeInitials: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    attendeeName: { color: 'white', fontWeight: '600', fontSize: 14 },
    attendeePass: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1 },
    errorMessage: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },

    // Action buttons
    actionRow: { flexDirection: 'row', gap: 12 },
    secondaryBtn: {
        flex: 1, height: 48, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    secondaryBtnText: { color: 'white', fontSize: 14, fontWeight: '500' },
    primaryBtn: {
        flex: 1, height: 48, borderRadius: 14,
        backgroundColor: '#135bec',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        shadowColor: '#135bec', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
    },
    primaryBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

    // Bottom helper (no result state)
    bottomHelper: {
        position: 'absolute', bottom: 32, left: 0, right: 0,
        alignItems: 'center', gap: 16,
    },
    manualEntryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    manualEntryChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
    versionText: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },

    // Grant permission
    grantButton: {
        backgroundColor: '#135bec', paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: 14,
    },
    grantButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

    // Manual modal
    modalOverlay: {
        flex: 1, justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalSheet: {
        backgroundColor: '#1c2333', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 24, paddingBottom: 40, gap: 16,
        borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    modalTitle: { fontSize: 17, fontWeight: 'bold', color: 'white' },
    modalInput: {
        backgroundColor: '#111722', borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(75,85,99,0.5)',
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: 'white',
    },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: {
        flex: 1, height: 48, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    modalCancelText: { color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
    modalConfirmBtn: {
        flex: 1, height: 48, borderRadius: 12,
        backgroundColor: '#135bec', alignItems: 'center', justifyContent: 'center',
    },
    modalConfirmText: { color: 'white', fontWeight: 'bold' },
});
