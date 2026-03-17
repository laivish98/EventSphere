import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Dimensions, FlatList
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { isEventPast } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

// Mini Revenue Chart using SVG
// Enhanced Revenue Chart Component
const RevenueChart = ({ data = [40, 70, 45, 90, 65, 80, 50], colors }) => {
    const chartHeight = 120;
    const chartWidth = 400;
    const maxVal = Math.max(...data, 100);

    // Generate SVG path dynamically
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * chartWidth;
        const y = chartHeight - (val / maxVal) * chartHeight;
        return `${x},${y}`;
    }).join(' ');

    const fillPath = `M0,${chartHeight} ${points} V${chartHeight} H0 Z`;
    const strokePath = `M${points}`;

    return (
        <View style={chartStyles.container}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                <Defs>
                    <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
                        <Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
                    </LinearGradient>
                </Defs>
                <Path d={fillPath} fill="url(#chartGradient)" />
                <Path d={strokePath} fill="none" stroke={colors.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
    container: { width: '100%' },
    labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 8 },
    label: { fontSize: 10, color: '#92a4c9', fontWeight: '500' },
});

// Progress Bar
const ProgressBar = ({ percent, colors }) => (
    <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: colors.primary, borderRadius: 2 }} />
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
        const capacity = 100; // Default capacity for percentage
        const percent = Math.min(Math.round((eventRegs / capacity) * 100), 100);
        const isPast = isEventPast(event.date);

        return (
            <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetails', { event })}
                activeOpacity={0.75}
            >
                <Image
                    source={{ uri: event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop' }}
                    style={styles.eventThumb}
                />
                <View style={styles.eventInfo}>
                    <View style={styles.eventInfoTop}>
                        <Text style={styles.eventName} numberOfLines={1}>{event.title}</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EditEvent', { event })}
                            style={[styles.chatIconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EventChat', { eventId: event.id, eventTitle: event.title })}
                            style={[styles.chatIconBtn, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)' }]}
                        >
                            <MaterialCommunityIcons name="chat-processing-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: !isPast ? 'rgba(11, 218, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: !isPast ? '#0bda5e' : '#ef4444' }
                            ]}>
                                {!isPast ? 'ACTIVE' : 'PAST'}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{event.department || 'General'} • {event.date} • {event.venue}</Text>
                    <ProgressBar percent={percent} colors={colors} />
                    <View style={styles.eventStatsRow}>
                        <Text style={[styles.soldText, { color: colors.textSecondary }]}>{eventRegs} Registered</Text>
                        <Text style={[styles.checkInText, { color: colors.success }]}>{registrations.filter(r => r.eventId === event.id && r.utilized).length} Checked In</Text>
                        <Text style={[styles.percentText, { color: colors.success }]}>{percent}%</Text>
                    </View>
                </View>
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

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={styles.headerLeft}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
                    <Text style={[styles.collegeName, { color: colors.text }]}>{userData?.name || "Admin Panel"}</Text>
                </TouchableOpacity>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Ticket')}>
                        <MaterialCommunityIcons name="ticket-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '20' }]} onPress={() => navigation.navigate('OrganizerExportPortal')}>
                        <MaterialCommunityIcons name="file-download-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.profileBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Profile')}>
                        <MaterialCommunityIcons name="account-circle-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Stats Summary Area */}
                <View style={styles.statsOverview}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.mainStat}
                    >
                        <Text style={styles.mainStatLabel}>Total Revenue</Text>
                        <Text style={styles.mainStatValue}>₹{totalRevenue.toLocaleString()}</Text>
                        <View style={styles.trendContainer}>
                            <MaterialCommunityIcons name="trending-up" size={16} color="white" />
                            <Text style={styles.trendText}>+12.5% this month</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.gridStats}>
                        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ticket Sales</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>₹{ticketRevenue.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sponsorships</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>₹{sponsorshipRevenue.toLocaleString()}</Text>
                        </View>
                    </View>

                    <View style={styles.gridStats}>
                        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Registrations</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{totalRegistrations.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Live Check-ins</Text>
                                <View style={[styles.liveIndicatorContainer, { backgroundColor: isDarkMode ? 'rgba(11, 218, 94, 0.2)' : 'rgba(11, 218, 94, 0.1)' }]}>
                                    <View style={[styles.liveIndicator, { backgroundColor: colors.success }]} />
                                </View>
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{liveCheckIns.toLocaleString()}</Text>
                            <Text style={[styles.statSubValue, { color: colors.textSecondary }]}>Real-time updates</Text>
                        </View>
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
                        <View style={[styles.categoryStatsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            {categoryStats.slice(0, 4).map(([cat, count]) => (
                                <View key={cat} style={styles.categoryStatItem}>
                                    <View style={[styles.categoryStatBarContainer, { backgroundColor: colors.background }]}>
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
                        </View>
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
            <View style={[styles.bottomNav, { backgroundColor: isDarkMode ? 'rgba(25, 34, 51, 0.92)' : 'rgba(255, 255, 255, 0.95)', borderTopColor: colors.border }]}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialCommunityIcons name="view-dashboard" size={24} color={colors.primary} />
                    <Text style={[styles.navLabelActive, { color: colors.primary }]}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                    <MaterialCommunityIcons name="calendar-search" size={24} color={colors.textSecondary} />
                    <Text style={[styles.navLabel, { color: colors.textSecondary }]}>Discover</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={() => navigation.navigate('CreateEvent')}>
                    <MaterialCommunityIcons name="plus" size={32} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ScanTicket')}>
                    <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.textSecondary} />
                    <Text style={[styles.navLabel, { color: colors.textSecondary }]}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <MaterialCommunityIcons name="account" size={24} color={colors.textSecondary} />
                    <Text style={[styles.navLabel, { color: colors.textSecondary }]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
    },
    headerRight: { flexDirection: 'row', gap: 10 },
    greeting: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
    collegeName: { fontSize: 22, fontWeight: 'bold', marginTop: 2, letterSpacing: -0.5 },
    profileBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerLeft: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
    mainStat: {
        padding: 24,
        borderRadius: 28,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    mainStatLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    mainStatValue: { color: 'white', fontSize: 36, fontWeight: 'bold', marginVertical: 6, letterSpacing: -1 },
    trendContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    trendText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
    gridStats: { flexDirection: 'row', gap: 16 },
    statCard: { flex: 1, padding: 18, borderRadius: 24, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: 'bold', letterSpacing: -0.5 },
    statSubValue: { fontSize: 10, marginTop: 4, opacity: 0.6 },
    liveIndicatorContainer: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    liveIndicator: { width: 6, height: 6, borderRadius: 3 },
    categoryStatsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 24, borderRadius: 28, marginTop: 12, borderWidth: 1, height: 160, alignItems: 'flex-end', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    categoryStatItem: { alignItems: 'center', flex: 1 },
    categoryStatBarContainer: { height: 80, width: 14, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 10 },
    categoryStatBar: { width: '100%', borderRadius: 7 },
    categoryStatLabel: { fontSize: 9, fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' },
    categoryStatCount: { fontSize: 12, fontWeight: 'bold' },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.2 },
    sectionSubtitle: { fontSize: 12, marginTop: 2, opacity: 0.6 },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
    filterChipText: { fontSize: 12, fontWeight: 'bold' },
    eventCard: { flexDirection: 'row', borderRadius: 24, padding: 12, marginBottom: 16, borderWidth: 1, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    eventThumb: { width: 64, height: 64, borderRadius: 16, marginRight: 16 },
    eventInfo: { flex: 1 },
    eventInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    eventName: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8, letterSpacing: -0.2 },
    chatIconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    eventMeta: { fontSize: 12, marginBottom: 8, opacity: 0.7 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    eventStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
    checkInText: { fontSize: 11, fontWeight: 'bold' },
    percentText: { fontSize: 11, fontWeight: '800' },
    sponsorItem: { borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, minWidth: 180, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    sponsorLogo: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    sponsorName: { fontSize: 14, fontWeight: 'bold' },
    sponsorTier: { fontSize: 12, opacity: 0.7 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 32, paddingTop: 12, paddingHorizontal: 16, borderTopWidth: 1, elevation: 20 },
    navItem: { flex: 1, alignItems: 'center', gap: 4 },
    navLabel: { fontSize: 10, fontWeight: '600' },
    navLabelActive: { fontSize: 10, fontWeight: 'bold' },
    fab: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, marginBottom: 12 },
    badgeTextCount: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
    emptyCard: { padding: 32, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', opacity: 0.6 }
});
