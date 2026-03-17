import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Text, Dimensions, FlatList, Alert, TextInput, Platform } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';
import { isEventPast } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

const dummyFeatured = [
    {
        id: '1',
        title: 'Neon Nights 2024',
        category: 'Music',
        image: 'https://images.unsplash.com/photo-1459749411177-8c275d85d31e?q=80&w=2670&auto=format&fit=crop',
        date: '24',
        month: 'OCT',
        location: 'Central Park Arena',
        price: 45,
        createdBy: 'dummy_organizer_1'
    },
    {
        id: '2',
        title: 'Future AI Summit',
        category: 'Tech',
        image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2670&auto=format&fit=crop',
        date: '12',
        month: 'NOV',
        location: 'Silicon Valley Hub',
        price: 0,
        createdBy: 'dummy_organizer_2'
    }
];

const categories = [
    { id: 'all', icon: 'view-grid', label: 'All' },
    { id: 'music', icon: 'music', label: 'Music' },
    { id: 'sports', icon: 'soccer', label: 'Sports' },
    { id: 'tech', icon: 'laptop', label: 'Tech' },
    { id: 'social', icon: 'account-group', label: 'Social' },
    { id: 'workshop', icon: 'pencil-ruler', label: 'Workshop' },
];

export default function HomeScreen({ navigation }) {
    const { user, userData, logout, getDefaultAvatar } = useAuth();
    const { isDarkMode, colors } = useTheme();
    const [events, setEvents] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDateFilter, setActiveDateFilter] = useState('All');
    const [hasImageError, setHasImageError] = useState(false);

    const dateFilters = ['All', 'Today', 'This Week', 'Upcoming'];

    useEffect(() => {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            const upcomingEvents = allEvents.filter(event => !isEventPast(event.date));
            setEvents(upcomingEvents);
        }, (error) => {
            // Silently handle error in production or use a toast
        });
        return unsubscribe;
    }, []);

    const featuredEvents = events.slice(0, 3);
    const regularEvents = events.filter(e => activeCategory === 'all' || e.category?.toLowerCase() === activeCategory.toLowerCase());

    const renderFeaturedItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.featuredCard}
            onPress={() => navigation.navigate('EventDetails', { event: item })}
        >
            <Image
                source={{ uri: item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop' }}
                style={styles.featuredImage}
            />
            <ExpoGradient
                colors={['transparent', 'rgba(15, 23, 42, 0.5)', 'rgba(15, 23, 42, 0.95)']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.featuredContent}>
                <BlurView intensity={20} style={styles.featuredBlur}>
                    <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '30', borderColor: colors.primary + '50' }]}>
                        <Text style={[styles.categoryText, { color: colors.primaryLight }]}>{item.category || 'Event'}</Text>
                    </View>
                    <Text style={[styles.featuredTitle, { color: 'white' }]} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.featuredMeta}>
                        <MaterialCommunityIcons name="calendar-month" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={[styles.featuredSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>{item.date}</Text>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 }} />
                        <MaterialCommunityIcons name="map-marker" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={[styles.featuredSubtitle, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>{item.location || 'TBA'}</Text>
                    </View>
                </BlurView>
            </View>
        </TouchableOpacity>
    );

    const renderEventItem = (item) => (
        <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EventDetails', { event: item })}
            style={styles.eventItemWrapper}
        >
            <BlurView intensity={isDarkMode ? 45 : 30} tint={isDarkMode ? "dark" : "light"} style={[styles.eventItemGlass, { borderColor: colors.glassBorder }]}>
                <ExpoGradient
                    colors={colors.iridescent}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.imageWrapper}>
                    <Image
                        source={{ uri: item.imageUrl || item.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=400&auto=format&fit=crop' }}
                        style={styles.eventImage}
                    />
                    <View style={[styles.categoryFloatingBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.categoryFloatingText}>{item.category || 'Event'}</Text>
                    </View>
                </View>
                <View style={styles.eventInfo}>
                    <View style={styles.eventHeader}>
                        <Text style={[styles.eventTime, { color: colors.primary, fontWeight: '900' }]}>{item.date}</Text>
                        <MaterialCommunityIcons name="heart-outline" size={18} color={isDarkMode ? "rgba(255,255,255,0.4)" : colors.textSecondary} />
                    </View>
                    <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.primary} />
                        <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.department || 'General'} • {item.venue || item.location || 'TBA'}
                        </Text>
                    </View>
                    <View style={styles.eventFooter}>
                        <Text style={[styles.eventPrice, { color: isDarkMode ? '#10b981' : '#059669', fontWeight: '900' }]}>
                            {item.price > 0 ? `₹${item.price}` : 'FREE'}
                        </Text>
                        <View style={styles.participantSmallRow}>
                            <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.textSecondary} />
                            <Text style={[styles.participantCount, { color: colors.textSecondary }]}>
                                {item.currentParticipants || 0}
                            </Text>
                        </View>
                    </View>
                </View>
            </BlurView>
        </TouchableOpacity>
    );

    const filterByDate = (eventDate, filter) => {
        if (filter === 'All') return true;
        if (!eventDate || typeof eventDate !== 'string') return false;

        // Simple date parsing for 'DD MON' format (e.g., '24 OCT')
        const parts = eventDate.split(' ');
        if (parts.length < 2) return false;

        const [day, mon] = parts;
        const now = new Date();
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthIndex = monthNames.indexOf(mon.toUpperCase());

        if (monthIndex === -1) return false;

        const eventFullDate = new Date(now.getFullYear(), monthIndex, parseInt(day));

        // If event date is in the past month-wise (e.g. searching in Jan for Dec), assume next year
        if (eventFullDate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) {
            eventFullDate.setFullYear(now.getFullYear() + 1);
        }

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);

        if (filter === 'Today') {
            return eventFullDate.toDateString() === today.toDateString();
        }
        if (filter === 'This Week') {
            return eventFullDate >= today && eventFullDate <= weekEnd;
        }
        if (filter === 'Upcoming') {
            return eventFullDate > weekEnd;
        }
        return true;
    };

    const filteredEvents = events.filter(e => {
        const matchesCategory = activeCategory === 'all' || e.category?.toLowerCase() === activeCategory.toLowerCase();
        const matchesSearch = e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.venue || e.location)?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDate = filterByDate(e.date || '01 JAN', activeDateFilter);

        return matchesCategory && matchesSearch && matchesDate;
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Cinematic Background Elements */}
            <View style={StyleSheet.absoluteFill}>
                <ExpoGradient
                    colors={isDarkMode ? ['#0f172a', '#1e1b4b', '#000000'] : ['#f8fafc', '#e2e8f0', '#cbd5e1']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.bgOrb, styles.orb1, { backgroundColor: colors.primaryGlow }]} />
                <View style={[styles.bgOrb, styles.orb2, { backgroundColor: (colors.secondaryGlow || '#8b5cf630') }]} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={Platform.OS !== 'web'}
            >
                {/* Premium Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Discover</Text>
                        <Text style={[styles.userName, { color: colors.text }]}>Explore Events</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile')}
                        style={styles.avatarWrapper}
                    >
                        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        <Image
                            source={{ uri: (userData?.avatarUrl && !userData.avatarUrl.includes('iran.liara.run') && !hasImageError) ? userData.avatarUrl : getDefaultAvatar(userData?.name || user?.email?.split('@')[0] || 'User', userData?.gender) }}
                            style={styles.avatar}
                            onError={() => setHasImageError(true)}
                        />
                    </TouchableOpacity>
                </View>

                {/* Glassmorphic Search Bar */}
                <BlurView intensity={25} tint={isDarkMode ? 'dark' : 'light'} style={[styles.searchContainer, { borderColor: colors.glassBorder }]}>
                    <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search festivals, workshops, etc."
                        placeholderTextColor={colors.textSecondary + '80'}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </BlurView>

                {/* Featured Horizontal Scroller */}
                {featuredEvents.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Events</Text>
                            <TouchableOpacity>
                                <Text style={[styles.seeAll, { color: colors.primary }]}>View all</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={featuredEvents}
                            renderItem={renderFeaturedItem}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.featuredList}
                            snapToInterval={width * 0.85 + 20}
                            decelerationRate="fast"
                        />
                    </View>
                )}

                {/* Glassmorphic Category Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryList}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setActiveCategory(cat.id)}
                        >
                            <BlurView
                                intensity={activeCategory === cat.id ? 40 : 15}
                                tint={isDarkMode ? 'dark' : 'light'}
                                style={[
                                    styles.categoryChip,
                                    {
                                        borderColor: activeCategory === cat.id ? colors.primary : colors.glassBorder,
                                        backgroundColor: activeCategory === cat.id ? colors.primary + '15' : 'transparent'
                                    }
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={cat.icon}
                                    size={18}
                                    color={activeCategory === cat.id ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.categoryLabel,
                                    { color: activeCategory === cat.id ? colors.primary : colors.textSecondary }
                                ]}>
                                    {cat.label}
                                </Text>
                            </BlurView>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.filterSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dateFilterList}
                    >
                        {dateFilters.map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                onPress={() => setActiveDateFilter(filter)}
                            >
                                <BlurView
                                    intensity={activeDateFilter === filter ? 30 : 10}
                                    tint={isDarkMode ? 'dark' : 'light'}
                                    style={[
                                        styles.dateFilterChip,
                                        {
                                            borderColor: activeDateFilter === filter ? colors.primary : colors.glassBorder,
                                            backgroundColor: activeDateFilter === filter ? colors.primary + '10' : 'transparent'
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        styles.dateFilterLabel,
                                        { color: activeDateFilter === filter ? (isDarkMode ? '#fff' : colors.primary) : colors.textSecondary }
                                    ]}>
                                        {filter}
                                    </Text>
                                </BlurView>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Event List */}
                <View style={[styles.section, { marginTop: 24 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {activeCategory === 'all' ? 'Upcoming Events' : `${categories.find(c => c.id === activeCategory)?.label} Events`}
                        </Text>
                    </View>

                    {filteredEvents.length > 0 ? (
                        filteredEvents.map(item => renderEventItem(item))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                                <MaterialCommunityIcons name="calendar-search" size={48} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyText, { color: colors.text }]}>No events found</Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Try adjusting your filters or search keywords</Text>
                            <TouchableOpacity
                                style={[styles.resetButton, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                    setActiveCategory('all');
                                    setSearchQuery('');
                                    setActiveDateFilter('All');
                                }}
                            >
                                <Text style={styles.resetButtonText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Role-Based Bottom Navigation */}
            <View style={styles.bottomNavContainer}>
                <BlurView intensity={80} tint="dark" style={styles.bottomNav}>
                    {userData?.role === 'admin' ? (
                        <>
                            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('OrganizerDashboard')}>
                                <MaterialCommunityIcons name="view-dashboard" size={24} color="#94a3b8" />
                                <Text style={styles.navLabel}>Dashboard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.fab, {
                                    backgroundColor: colors.primary,
                                    ...(Platform.OS === 'web'
                                        ? { boxShadow: `0 4px 10px ${colors.primary}40` }
                                        : {
                                            shadowColor: colors.primary,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.5,
                                            shadowRadius: 10,
                                            elevation: 8,
                                        })
                                }]}
                                onPress={() => navigation.navigate('CreateEvent')}
                            >
                                <MaterialCommunityIcons name="plus" size={28} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ScanTicket')}>
                                <MaterialCommunityIcons name="qrcode-scan" size={24} color="#94a3b8" />
                                <Text style={styles.navLabel}>Scan</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.navItem}>
                                <MaterialCommunityIcons name="compass" size={24} color="#135bec" />
                                <Text style={styles.navLabelActive}>Explore</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Ticket')}>
                                <MaterialCommunityIcons name="ticket-outline" size={24} color="#94a3b8" />
                                <Text style={styles.navLabel}>Tickets</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </BlurView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...(Platform.OS === 'web' ? { overflow: 'hidden', height: '100vh' } : {})
    },
    scrollContent: { paddingBottom: 110 },
    bgOrb: {
        position: 'absolute',
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        opacity: 0.1,
    },
    orb1: { top: -100, right: -width * 0.5 },
    orb2: { bottom: 200, left: -width * 0.5 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, marginBottom: 30 },
    welcomeText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
    userName: { fontSize: 26, fontWeight: 'bold', letterSpacing: -0.5 },
    avatarWrapper: { width: 52, height: 52, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 2 },
    avatar: { width: '100%', height: '100%', borderRadius: 18 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, paddingHorizontal: 20, height: 60, borderRadius: 24, borderWidth: 1, overflow: 'hidden', marginBottom: 35 },
    searchIcon: { marginRight: 15 },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
    section: { marginBottom: 35 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', letterSpacing: -0.5 },
    seeAll: { fontSize: 14, fontWeight: 'bold' },
    featuredList: { paddingLeft: 24, paddingRight: 8 },
    featuredCard: {
        width: width * 0.85,
        height: 460,
        marginRight: 20,
        borderRadius: 40,
        overflow: 'hidden',
        elevation: 20,
        ...Platform.select({
            web: { boxShadow: '0 12px 20px rgba(0,0,0,0.3)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            }
        })
    },
    featuredImage: { width: '100%', height: '100%' },
    featuredGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
    },
    featuredContent: { position: 'absolute', bottom: 12, left: 12, right: 12, overflow: 'hidden', borderRadius: 32 },
    featuredGlassInfo: {
        borderRadius: 24,
        padding: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    featuredTextContent: {
        gap: 4,
    },
    featuredBlur: { padding: 24, gap: 10 },
    categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
    categoryText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
    featuredTitle: { fontSize: 28, fontWeight: 'bold', lineHeight: 34, letterSpacing: -0.5 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.8 },
    featuredMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '600',
    },
    metaDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    featuredDateBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    dateBadgeDay: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
    },
    dateBadgeMonth: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    featuredSubtitle: { fontSize: 14, fontWeight: '500' },
    categoryList: { paddingHorizontal: 24, marginBottom: 35 },
    categoryChip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginRight: 12,
        elevation: 6,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            })
    },
    categoryLabel: { fontSize: 14, fontWeight: 'bold' },
    filterSection: { paddingHorizontal: 24, marginBottom: 20 },
    dateFilterList: { paddingBottom: 10 },
    dateFilterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, marginRight: 10, borderWidth: 1 },
    dateFilterLabel: { fontSize: 13, fontWeight: 'bold' },
    dateFilterLabelActive: {
        fontWeight: 'bold',
    },
    eventList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    eventCard: {
        flexDirection: 'row',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 16,
        padding: 10,
        elevation: 2,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            })
    },
    eventItemWrapper: {
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
    },
    eventItemGlass: {
        flexDirection: 'row',
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    imageWrapper: { position: 'relative' },
    eventImage: {
        width: 100,
        height: 100,
        borderRadius: 18,
    },
    categoryFloatingBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    categoryFloatingText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    eventInfo: {
        flex: 1,
        paddingLeft: 16,
        paddingRight: 4,
        justifyContent: 'center',
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    eventTime: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    eventTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 12,
        flex: 1,
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventPrice: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    participantSmallRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        opacity: 0.8,
    },
    participantCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    bottomNavContainer: {
        bottom: 24,
        left: 20,
        right: 20,
        height: 72,
        borderRadius: 36,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        elevation: 20,
        ...Platform.select({
            web: {
                position: 'fixed',
                boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
                zIndex: 1000,
            },
            default: {
                position: 'absolute',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.5,
                shadowRadius: 24,
            }
        })
    },
    bottomNav: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    navLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '500',
    },
    navLabelActive: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -30,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    resetButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
    },
    resetButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
