import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Dimensions, FlatList
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { isEventPast } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

// Mini Revenue Chart using SVG
// Enhanced Revenue Chart Component with smooth Bezier curves and area fill
const RevenueChart = ({ data = [40, 70, 45, 90, 65, 80, 50], colors }) => {
    const chartHeight = 140;
    const chartWidth = 400;
    const maxVal = Math.max(...data, 100);

    // Create a smooth Bezier path
    const getBezierPath = (data) => {
        if (!data || data.length < 2) return '';
        const points = data.map((val, i) => ({
            x: (i / (data.length - 1)) * chartWidth,
            y: chartHeight - (val / maxVal) * chartHeight
        }));

        let path = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const curr = points[i];
            const next = points[i + 1];
            const cp1x = curr.x + (next.x - curr.x) / 2;
            const cp1y = curr.y;
            const cp2x = curr.x + (next.x - curr.x) / 2;
            const cp2y = next.y;
            path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
        }
        return path;
    };

    const strokePath = getBezierPath(data);
    const fillPath = `${strokePath} V ${chartHeight} H 0 Z`;

    return (
        <View style={chartStyles.container}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                <Defs>
                    <LinearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
                        <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                    </LinearGradient>
                    <LinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0%" stopColor={colors.primary} />
                        <Stop offset="100%" stopColor={colors.primaryLight || colors.primary} />
                    </LinearGradient>
                </Defs>
                <Path d={fillPath} fill="url(#chartFillGradient)" />
                <Path d={strokePath} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" />
            </Svg>
            <View style={chartStyles.labels}>
                {['WK 1', 'WK 2', 'WK 3', 'WK 4'].map(l => (
                    <Text key={l} style={[chartStyles.label, { color: colors.textSecondary }]}>{l}</Text>
                ))}
            </View>
        </View>
    );
};
const chartStyles = StyleSheet.create({
    container: { width: '100%', marginTop: 10 },
    labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 12 },
    label: { fontSize: 11, fontWeight: '600', opacity: 0.6 },
});

// Progress Bar
const ProgressBar = ({ percent, colors }) => (
    <View style={{ height: 6, backgroundColor: colors.surface, borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
        <ExpoGradient
            colors={[colors.primary, colors.primaryLight || colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: '100%', width: `${percent}%`, borderRadius: 3 }}
        />
    </View>
);

export default function OrganizerDashboardScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user, userData } = useAuth();
    const [events, setEvents] = useState([]);
    const [sponsorships, setSponsorships] = useState([]);
    const [registrations, setRegistrations] = useState([]);

    useEffect(() => {
        if (!user) return;
        // Only fetch events created by this admin
        const q = query(
            collection(db, 'events'),
            where('createdBy', '==', user.uid)
            // Note: To use orderBy('createdAt', 'desc'), a composite index must be created in Firestore.
        );
        const unsub = onSnapshot(q, snap => {
            setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [user]);

    useEffect(() => {
        if (!user || events.length === 0) return;

        const eventIds = events.map(e => e.id);
        // Firebase 'in' operator supports up to 30 items
        const chunkedIds = [];
        for (let i = 0; i < eventIds.length; i += 30) {
            chunkedIds.push(eventIds.slice(i, i + 30));
        }

        const unsubs = chunkedIds.map(ids => {
            const q = query(collection(db, 'registrations'), where('eventId', 'in', ids));
            return onSnapshot(q, snap => {
                const regs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRegistrations(prev => {
                    const otherRegs = prev.filter(r => !ids.includes(r.eventId));
                    return [...otherRegs, ...regs];
                });
            });
        });

        return () => unsubs.forEach(unsub => unsub());
    }, [user, events]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'sponsorships'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const allSponsorships = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const filtered = allSponsorships.filter(s => events.some(e => e.id === s.eventId));
            setSponsorships(filtered);
        });
        return unsub;
    }, [user, events]);

    const sponsorshipRevenue = sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0);
    const ticketRevenue = registrations.reduce((sum, r) => sum + (r.ticketPrice || 0), 0);
    const totalRevenue = sponsorshipRevenue + ticketRevenue;
    const totalRegistrations = registrations.length;
    const liveCheckIns = registrations.filter(r => r.utilized).length;

    // Category Insights
    const categoryStats = Object.entries(
        events.reduce((acc, event) => {
            const cat = event.category || 'social';
            const regs = registrations.filter(r => r.eventId === event.id).length;
            acc[cat] = (acc[cat] || 0) + regs;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning,';
        if (h < 17) return 'Good Afternoon,';
        return 'Good Evening,';
    };

    const renderEventCard = (event) => {
        const eventRegs = registrations.filter(r => r.eventId === event.id).length;
        const capacity = event.capacity || 100;
        const percent = Math.min(Math.round((eventRegs / capacity) * 100), 100);
        const isPast = isEventPast(event.date);

        return (
            <TouchableOpacity
                key={event.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('EventDetails', { event })}
            >
                <BlurView
                    intensity={isDarkMode ? 20 : 40}
                    tint={isDarkMode ? "dark" : "light"}
                    style={[styles.glassCard, styles.eventCard, { borderColor: colors.border }]}
                >
                    <View style={styles.eventImageContainer}>
                        <Image
                            source={{ uri: event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop' }}
                            style={styles.eventThumb}
                        />
                        {!isPast && (
                            <View style={styles.livePulseContainer}>
                                <View style={[styles.livePulse, { backgroundColor: colors.success }]} />
                            </View>
                        )}
                    </View>
                    <View style={styles.eventInfo}>
                        <View style={styles.eventInfoTop}>
                            <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
                            <View style={[
                                styles.premiumStatusBadge,
                                { backgroundColor: !isPast ? colors.success + '15' : colors.error + '15' }
                            ]}>
                                <Text style={[
                                    styles.premiumStatusText,
                                    { color: !isPast ? colors.success : colors.error }
                                ]}>
                                    {!isPast ? 'LIVE' : 'FINISHED'}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{event.venue} • {event.date}</Text>

                        <View style={styles.eventStatsRow}>
                            <View style={styles.miniStatItem}>
                                <Text style={[styles.miniStatValue, { color: colors.text }]}>{eventRegs}</Text>
                                <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Sales</Text>
                            </View>
                            <View style={styles.miniStatDivider} />
                            <View style={styles.miniStatItem}>
                                <Text style={[styles.miniStatValue, { color: colors.text }]}>{percent}%</Text>
                                <Text style={[styles.miniStatLabel, { color: colors.textSecondary }]}>Capacity</Text>
                            </View>
                            <View style={{ flex: 1 }} />
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('EditEvent', { event })}
                                    style={[styles.iconButtonSmall, { backgroundColor: colors.surface }]}
                                >
                                    <MaterialCommunityIcons name="pencil" size={16} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('EventChat', { eventId: event.id, eventTitle: event.title })}
                                    style={[styles.iconButtonSmall, { backgroundColor: colors.primary + '15' }]}
                                >
                                    <MaterialCommunityIcons name="chat-processing" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ProgressBar percent={percent} colors={colors} />
                    </View>
                </BlurView>
            </TouchableOpacity>
        );
    };

    const renderSponsorCard = ({ item }) => (
        <View style={[styles.sponsorItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.sponsorLogo, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)' }]}>
                <MaterialCommunityIcons name="rocket-launch" size={24} color={colors.primary} />
            </View>
            <View style={styles.sponsorInfo}>
                <Text style={[styles.sponsorName, { color: colors.text }]}>{item.sponsorName}</Text>
                <Text style={[styles.sponsorTier, { color: colors.textSecondary }]}>₹{item.amount?.toLocaleString()}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Super Premium Background Gradient */}
            <ExpoGradient
                colors={isDarkMode
                    ? [colors.background, '#1e1b4b', '#0f172a']
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
                    <Text style={[styles.collegeName, { color: colors.text }]}>{userData?.name || "Organizer"}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={[styles.premiumIconBtn, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('Ticket')}>
                        <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.premiumIconBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => navigation.navigate('OrganizerExportPortal')}>
                        <MaterialCommunityIcons name="export-variant" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.profileCircle, { borderColor: colors.primary + '30' }]}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Image
                            source={{
                                uri: (userData?.avatarUrl && !userData.avatarUrl.includes('iran.liara.run'))
                                    ? userData.avatarUrl
                                    : getDefaultAvatar(userData?.name || user?.email?.split('@')?.[0], userData?.gender)
                            }}
                            style={styles.avatarMini}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Stats Summary Area */}
                <View style={styles.statsOverview}>
                    <TouchableOpacity activeOpacity={0.9}>
                        <ExpoGradient
                            colors={[colors.primary, colors.primaryLight || '#8b5cf6', '#a855f7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.mainStatCard}
                        >
                            <View style={styles.mainStatGloss} />
                            <View style={styles.mainStatContent}>
                                <View style={styles.mainStatLabelRow}>
                                    <Text style={styles.mainStatLabel}>Gross Revenue</Text>
                                    <View style={styles.premiumBadge}>
                                        <MaterialCommunityIcons name="crown" size={12} color="#FFD700" />
                                        <Text style={styles.premiumBadgeText}>PRO</Text>
                                    </View>
                                </View>
                                <Text style={styles.mainStatValue}>₹{totalRevenue.toLocaleString()}</Text>
                                <View style={styles.trendContainer}>
                                    <MaterialCommunityIcons name="trending-up" size={14} color="white" />
                                    <Text style={styles.trendText}>+12.5% vs last month</Text>
                                </View>
                            </View>
                        </ExpoGradient>
                    </TouchableOpacity>

                    <View style={styles.gridStats}>
                        <BlurView intensity={isDarkMode ? 30 : 50} tint={isDarkMode ? "dark" : "light"} style={[styles.glassCard, styles.statCard, { borderColor: colors.border }]}>
                            <View style={[styles.statIconBox, { backgroundColor: colors.primary + '20' }]}>
                                <MaterialCommunityIcons name="ticket" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sales</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>₹{ticketRevenue.toLocaleString()}</Text>
                        </BlurView>
                        <BlurView intensity={isDarkMode ? 30 : 50} tint={isDarkMode ? "dark" : "light"} style={[styles.glassCard, styles.statCard, { borderColor: colors.border }]}>
                            <View style={[styles.statIconBox, { backgroundColor: colors.success + '20' }]}>
                                <MaterialCommunityIcons name="handshake" size={20} color={colors.success} />
                            </View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sponsors</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>₹{sponsorshipRevenue.toLocaleString()}</Text>
                        </BlurView>
                    </View>

                    <View style={styles.gridStats}>
                        <BlurView intensity={isDarkMode ? 30 : 50} tint={isDarkMode ? "dark" : "light"} style={[styles.glassCard, styles.statCard, { borderColor: colors.border }]}>
                            <View style={[styles.statIconBox, { backgroundColor: colors.accent + '20' }]}>
                                <MaterialCommunityIcons name="account-group" size={20} color={colors.accent || colors.primary} />
                            </View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Users</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{totalRegistrations}</Text>
                        </BlurView>
                        <BlurView intensity={isDarkMode ? 30 : 50} tint={isDarkMode ? "dark" : "light"} style={[styles.glassCard, styles.statCard, { borderColor: colors.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={[styles.statIconBox, { backgroundColor: colors.success + '20' }]}>
                                    <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
                                </View>
                                <View style={styles.liveIndicatorContainer}>
                                    <View style={[styles.liveIndicator, { backgroundColor: colors.success }]} />
                                </View>
                            </View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Check-ins</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{liveCheckIns}</Text>
                        </BlurView>
                    </View>
                </View>

                {/* Category Insights */}
                {categoryStats.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Popularity</Text>
                                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Registration volume by event type</Text>
                            </View>
                        </View>
                        <BlurView intensity={isDarkMode ? 20 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.categoryStatsRow, { borderColor: colors.border, overflow: 'hidden' }]}>
                            {categoryStats.slice(0, 4).map(([cat, count]) => (
                                <View key={cat} style={styles.categoryStatItem}>
                                    <View style={[styles.categoryStatBarContainer, { backgroundColor: colors.background + '50' }]}>
                                        <View
                                            style={[
                                                styles.categoryStatBar,
                                                { height: `${Math.max(10, (count / Math.max(1, totalRegistrations)) * 100)}%`, backgroundColor: colors.success }
                                            ]}
                                        />
                                    </View>
                                    <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]} numberOfLines={1}>{cat.toUpperCase()}</Text>
                                    <Text style={[styles.categoryStatCount, { color: colors.text }]}>{count}</Text>
                                </View>
                            ))}
                        </BlurView>
                    </View>
                )}

                {/* Revenue Chart */}
                <View style={[styles.section, { marginBottom: 32 }]}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Trend</Text>
                            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Performance over the last 30 days</Text>
                        </View>
                        <TouchableOpacity style={[styles.filterChip, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)' }]}>
                            <Text style={[styles.filterChipText, { color: colors.primary }]}>Monthly</Text>
                            <MaterialCommunityIcons name="chevron-down" size={14} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <RevenueChart colors={colors} />
                </View>

                {/* Active Events */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Events</Text>
                        <Text style={[styles.badgeTextCount, { color: colors.primary }]}>
                            {events.filter(e => !isEventPast(e.date)).length}
                        </Text>
                    </View>
                    <View style={styles.eventList}>
                        {events.filter(e => !isEventPast(e.date)).length > 0 ? (
                            events.filter(e => !isEventPast(e.date)).map((e) => renderEventCard(e))
                        ) : (
                            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active events.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Event History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Event History</Text>
                        <Text style={[styles.badgeTextCount, { color: colors.textSecondary }]}>
                            {events.filter(e => isEventPast(e.date)).length}
                        </Text>
                    </View>
                    <View style={styles.eventList}>
                        {events.filter(e => isEventPast(e.date)).length > 0 ? (
                            events.filter(e => isEventPast(e.date)).map((e) => renderEventCard(e))
                        ) : (
                            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No past events yet.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Recent Sponsorships */}
                <View style={[styles.section, { marginBottom: 0 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sponsorships</Text>
                    </View>
                    {sponsorships.length > 0 ? (
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={sponsorships}
                            renderItem={renderSponsorCard}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ gap: 16 }}
                        />
                    ) : (
                        <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No sponsorships yet.</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={[styles.floatingBottomNav, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="view-dashboard" size={26} color={colors.primary} />
                    <Text style={[styles.navLabel, { color: colors.primary, fontWeight: '700' }]}>Dash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                    <MaterialCommunityIcons name="compass-outline" size={26} color={colors.textSecondary} />
                    <Text style={[styles.navLabel, { color: colors.textSecondary }]}>Discover</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.floatingFab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                    onPress={() => navigation.navigate('CreateEvent')}
                >
                    <MaterialCommunityIcons name="plus" size={32} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ScanTicket')}>
                    <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.textSecondary} />
                    <Text style={[styles.navLabel, { color: colors.textSecondary }]}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <MaterialCommunityIcons name="account-outline" size={26} color={colors.textSecondary} />
                    <Text style={[styles.navLabel, { color: colors.textSecondary }]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
    },
    headerLeft: { flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    greeting: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 },
    collegeName: { fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: -0.8 },
    premiumIconBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    profileCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
    avatarMini: { width: '100%', height: '100%' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 140 },

    // Stats
    statsOverview: { marginBottom: 24, gap: 16 },
    mainStatCard: {
        padding: 28,
        borderRadius: 32,
        overflow: 'hidden',
        position: 'relative',
        elevation: 12,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    mainStatGloss: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    mainStatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    mainStatLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
    premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    premiumBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
    mainStatValue: { color: 'white', fontSize: 44, fontWeight: '900', letterSpacing: -1.5, marginBottom: 12 },
    trendContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
    trendText: { color: 'white', fontSize: 12, fontWeight: '700' },

    gridStats: { flexDirection: 'row', gap: 16 },
    statCard: { flex: 1, padding: 20, borderRadius: 28, borderWidth: 1, gap: 4 },
    statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    liveIndicatorContainer: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(11, 218, 94, 0.1)', alignItems: 'center', justifyContent: 'center' },
    liveIndicator: { width: 6, height: 6, borderRadius: 3 },

    // Sections
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    sectionSubtitle: { fontSize: 12, marginTop: 2, opacity: 0.6 },
    badgeTextCount: { fontSize: 14, fontWeight: '800', opacity: 0.5 },

    // Glass & Content
    glassCard: {
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    eventCard: { flexDirection: 'row', padding: 14, borderRadius: 28, marginBottom: 16, alignItems: 'center' },
    eventImageContainer: { position: 'relative' },
    eventThumb: { width: 80, height: 80, borderRadius: 20, marginRight: 16 },
    livePulseContainer: { position: 'absolute', top: -4, right: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    livePulse: { width: 8, height: 8, borderRadius: 4 },
    eventInfo: { flex: 1 },
    eventInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    eventName: { fontSize: 17, fontWeight: '800', flex: 1, letterSpacing: -0.3 },
    premiumStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    premiumStatusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    eventMeta: { fontSize: 12, marginBottom: 12, opacity: 0.6, fontWeight: '600' },
    eventStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
    miniStatItem: { alignItems: 'flex-start' },
    miniStatValue: { fontSize: 14, fontWeight: '900' },
    miniStatLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', opacity: 0.5 },
    miniStatDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.1)' },
    actionRow: { flexDirection: 'row', gap: 8 },
    iconButtonSmall: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    // Others
    categoryStatsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 24, borderRadius: 32, marginTop: 12, borderWidth: 1, height: 180, alignItems: 'flex-end' },
    categoryStatItem: { alignItems: 'center', flex: 1 },
    categoryStatBarContainer: { height: 100, width: 16, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 12 },
    categoryStatBar: { width: '100%', borderRadius: 8 },
    categoryStatLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', opacity: 0.6 },
    categoryStatCount: { fontSize: 13, fontWeight: '900' },

    sponsorItem: { borderRadius: 26, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, minWidth: 200, marginRight: 16 },
    sponsorLogo: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    sponsorName: { fontSize: 15, fontWeight: '800' },
    sponsorTier: { fontSize: 13, opacity: 0.6, fontWeight: '700', marginTop: 2 },

    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, gap: 6 },
    filterChipText: { fontSize: 13, fontWeight: '800' },

    floatingBottomNav: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
        height: 76,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 12,
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    navItem: { alignItems: 'center', gap: 2 },
    navLabel: { fontSize: 11, fontWeight: '600' },
    floatingFab: {
        width: 60,
        height: 60,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -40,
        elevation: 10,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    emptyCard: { padding: 40, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', opacity: 0.4 },
    emptyText: { fontWeight: '700', letterSpacing: 0.5 }
});
