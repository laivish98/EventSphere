import React, { useRef, useState, useEffect } from 'react';
import {
    View, StyleSheet, Text, TouchableOpacity, ScrollView,
    ImageBackground, Image, Dimensions, Animated, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { isEventPast } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = height * 0.7;

export default function TicketScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user, userData } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'registrations'),
            where('userId', '==', user.uid)
        );

        const unsub = onSnapshot(q, async (snap) => {
            const regs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side to avoid missing index error
            regs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setRegistrations(regs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tickets:", error);
            setLoading(false);
        });

        return unsub;
    }, [user]);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const renderTicket = (reg) => {
        const qrValue = JSON.stringify({ registrationId: reg.id, eventId: reg.eventId, userId: user.uid });
        const shortId = reg.id.slice(0, 8).toUpperCase();

        return (
            <View key={reg.id} style={styles.ticketCard}>
                {/* Ticket Header Image */}
                <ImageBackground
                    source={{ uri: reg.eventImage || 'https://images.unsplash.com/photo-1459749411177-8c275d85d31e?q=80&w=2670&auto=format&fit=crop' }}
                    style={styles.ticketHeaderImage}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.ticketHeaderBadge}>
                        <Text style={styles.ticketHeaderBadgeText}>EVENTSPHERE</Text>
                    </View>
                </ImageBackground>

                {/* Ticket Body */}
                <View style={[styles.ticketBody, { backgroundColor: isDarkMode ? colors.surface : 'white' }]}>
                    <View style={styles.eventTitleContainer}>
                        <Text style={[styles.eventTitle, { color: colors.text }]}>{reg.eventTitle}</Text>
                        <Text style={[styles.eventDate, { color: colors.textSecondary }]}>{reg.eventDate}</Text>
                        <Text style={[styles.eventVenue, { color: colors.textSecondary }]}>{reg.eventVenue || 'Venue Managed'}</Text>
                    </View>

                    <View style={[styles.qrWrapper, { borderColor: isDarkMode ? 'rgba(19, 91, 236, 0.4)' : colors.border }]}>
                        <View style={[styles.qrInner, { backgroundColor: isDarkMode ? 'white' : 'white' }]}>
                            <QRCode
                                value={qrValue}
                                size={140}
                                color="#0f172a"
                                backgroundColor="white"
                            />
                        </View>
                        <View style={[styles.liveCodeBadge, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)', borderColor: colors.primary }]}>
                            <Animated.View style={[styles.liveDot, { backgroundColor: colors.primary, opacity: pulseAnim }]} />
                            <Text style={[styles.liveCodeText, { color: colors.primary }]}>LIVE TICKET</Text>
                        </View>
                    </View>

                    <View style={styles.statusContainer}>
                        <View style={[styles.statusBadge, { backgroundColor: reg.utilized ? (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)') : (isDarkMode ? 'rgba(5, 150, 105, 0.1)' : 'rgba(5, 150, 105, 0.05)'), borderColor: reg.utilized ? 'rgba(239, 68, 68, 0.2)' : 'rgba(5, 150, 105, 0.2)' }]}>
                            <MaterialCommunityIcons
                                name={reg.utilized ? "close-circle" : "check-circle"}
                                size={18}
                                color={reg.utilized ? colors.error || "#ef4444" : colors.success || "#059669"}
                            />
                            <Text style={[styles.statusText, { color: reg.utilized ? (colors.error || "#ef4444") : (colors.success || "#059669") }]}>
                                {reg.utilized ? 'Ticket Used' : 'Ticket Active'}
                            </Text>
                        </View>
                        <Text style={[styles.ticketId, { color: colors.textSecondary }]}>ID: {shortId}</Text>
                    </View>

                    <View style={[styles.detailGrid, { borderTopColor: colors.border }]}>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>GUEST</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>{reg.userName || 'Attendee'}</Text>
                        </View>
                        <View style={[styles.detailItem, styles.detailItemRight]}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ENTRY</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>General</Text>
                        </View>
                    </View>
                </View>

                {/* Decorative cutouts */}
                <View style={[styles.cutoutLeft, { backgroundColor: colors.background }]} />
                <View style={[styles.cutoutRight, { backgroundColor: colors.background }]} />
                <View style={[styles.dashedLine, { borderColor: isDarkMode ? 'rgba(209, 213, 219, 0.1)' : 'rgba(209, 213, 219, 0.5)' }]} />

                {reg.utilized && (
                    <TouchableOpacity
                        style={[styles.certificateBtn, { backgroundColor: isDarkMode ? 'rgba(11, 218, 94, 0.08)' : 'rgba(11, 218, 94, 0.05)', borderColor: isDarkMode ? 'rgba(11, 218, 94, 0.2)' : 'rgba(11, 218, 94, 0.1)' }]}
                        onPress={() => navigation.navigate('Certificate', {
                            eventTitle: reg.eventTitle,
                            userName: reg.userName || 'Attendee',
                            date: reg.eventDate,
                            university: userData?.college || 'EventSphere University'
                        })}
                    >
                        <MaterialCommunityIcons name="certificate" size={18} color={colors.success} />
                        <Text style={[styles.certificateBtnText, { color: colors.success }]}>Claim Achievement Certificate</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.chatButton, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.08)' : 'rgba(19, 91, 236, 0.05)', borderColor: isDarkMode ? 'rgba(19, 91, 236, 0.2)' : 'rgba(19, 91, 236, 0.1)' }]}
                    onPress={() => navigation.navigate('EventChat', { eventId: reg.eventId, eventTitle: reg.eventTitle })}
                >
                    <MaterialCommunityIcons name="chat-processing" size={18} color={colors.primary} />
                    <Text style={[styles.chatButtonText, { color: colors.primary }]}>Join Community Chat</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={styles.header}>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Event Tickets</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : registrations.length > 0 ? (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Active Tickets */}
                    {registrations.filter(r => !isEventPast(r.eventDate)).length > 0 && (
                        <View style={styles.sectionWrapper}>
                            <Text style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}>ACTIVE TICKETS</Text>
                            {registrations.filter(r => !isEventPast(r.eventDate)).map(reg => renderTicket(reg))}
                        </View>
                    )}

                    {/* Past Tickets */}
                    {registrations.filter(r => isEventPast(r.eventDate)).length > 0 && (
                        <View style={styles.sectionWrapper}>
                            <Text style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}>PAST EVENTS</Text>
                            {registrations.filter(r => isEventPast(r.eventDate)).map(reg => renderTicket(reg))}
                        </View>
                    )}
                </ScrollView>
            ) : (
                <View style={styles.center}>
                    <MaterialCommunityIcons name="ticket-off-outline" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tickets Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Events you register for will appear here.</Text>
                    <TouchableOpacity
                        style={[styles.browseButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={styles.browseButtonText}>Browse Events</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Security dot pattern background via gradient
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 55,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    ticketCard: {
        width: CARD_WIDTH,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
        position: 'relative',
        marginBottom: 30, // Spacing between tickets
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    browseButton: {
        backgroundColor: '#135bec',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    browseButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    ticketHeaderImage: {
        width: '100%',
        height: 128,
        justifyContent: 'flex-end',
    },
    ticketHeaderBadge: {
        position: 'absolute',
        bottom: 12,
        left: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    ticketHeaderBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    ticketBody: {
        padding: 24,
        alignItems: 'center',
    },
    eventTitleContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 4,
    },
    eventDate: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    eventVenue: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },
    qrWrapper: {
        position: 'relative',
        padding: 4,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: 'rgba(19, 91, 236, 0.4)',
        marginBottom: 28,
        alignItems: 'center',
    },
    qrInner: {
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 8,
    },
    liveCodeBadge: {
        position: 'absolute',
        bottom: -14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#135bec',
    },
    liveCodeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#135bec',
        letterSpacing: 1,
    },
    statusContainer: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#d1fae5',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    statusText: {
        color: '#065f46',
        fontWeight: 'bold',
        fontSize: 14,
    },
    ticketId: {
        fontSize: 11,
        color: '#9ca3af',
        fontFamily: 'monospace',
    },
    detailGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 20,
    },
    detailItem: {
        width: '50%',
        paddingVertical: 8,
    },
    detailItemRight: {
        alignItems: 'flex-end',
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9ca3af',
        letterSpacing: 1,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    cutoutLeft: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        left: -12,
        top: 116,
    },
    cutoutRight: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        right: -12,
        top: 116,
    },
    dashedLine: {
        position: 'absolute',
        left: 20,
        right: 20,
        top: 128,
        borderBottomWidth: 2,
        borderStyle: 'dashed',
    },
    actionsContainer: {
        width: '100%',
        marginTop: 24,
        gap: 16,
    },
    walletButton: {
        height: 56,
        backgroundColor: '#111827',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    walletButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
    secondaryActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        paddingTop: 8,
    },
    secondaryAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    secondaryActionTextPrimary: {
        color: '#135bec',
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryActionText: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 16,
        backgroundColor: '#374151',
    },
    helpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    helpText: {
        fontSize: 12,
        color: '#6b7280',
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        backgroundColor: 'rgba(19, 91, 236, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(19, 91, 236, 0.2)',
        gap: 8,
    },
    chatButtonText: {
        color: '#135bec',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    certificateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 14,
        backgroundColor: 'rgba(11, 218, 94, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(11, 218, 94, 0.2)',
        gap: 8,
    },
    certificateBtnText: {
        color: '#0bda5e',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    sectionWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    sectionHeaderLabel: {
        alignSelf: 'flex-start',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.2,
        marginBottom: 16,
        marginTop: 8,
        paddingHorizontal: 4,
    }
});
