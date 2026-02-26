import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Text, Dimensions, FlatList, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
        price: 45
    },
    {
        id: '2',
        title: 'Future AI Summit',
        category: 'Tech',
        image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?q=80&w=2670&auto=format&fit=crop',
        date: '12',
        month: 'NOV',
        location: 'Silicon Valley Hub',
        price: 0
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
    const { user, userData, logout } = useAuth();
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
            console.error("Error fetching events: ", error);
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
            <LinearGradient
                colors={['transparent', 'rgba(16, 22, 34, 0.95)']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.featuredContent}>
                <View style={styles.featuredTextContainer}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category || 'Event'}</Text>
                    </View>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.featuredMeta}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#94a3b8" />
                        <Text style={styles.featuredSubtitle}>{item.date}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEventItem = (item) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EventDetails', { event: item })}
        >
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
                    <Text style={[styles.eventTime, { color: colors.primary }]}>{item.date}</Text>
                    <MaterialCommunityIcons name="heart-outline" size={18} color={colors.textSecondary} />
                </View>
                <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.primary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.department || 'General'} • {item.venue || item.location || 'TBA'}
                    </Text>
                </View>
                <View style={styles.eventFooter}>
                    <Text style={[styles.eventPrice, { color: item.price > 0 ? '#10b981' : colors.primary }]}>
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
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Image
                        source={{
                            uri: hasImageError
                                ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'User')}&background=random&color=fff`
                                : (userData?.avatarUrl || 'https://avatar.iran.liara.run/public')
                        }}
                        style={styles.avatar}
                        onError={() => setHasImageError(true)}
                    />
                    <View>
                        <Text style={[styles.greeting, { color: colors.textSecondary }]}>Discover Events</Text>
                        <Text style={[styles.username, { color: colors.text }]}>{userData?.name || user?.email?.split('@')[0]}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('Profile')}>
                    <MaterialCommunityIcons name="cog-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="magnify" size={22} color={colors.textSecondary} />
                        <TextInput
                            placeholder="Search events, organizers..."
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.searchInput, { color: colors.text }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Categories */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScroll}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                activeCategory === cat.id && styles.categoryChipActive
                            ]}
                            onPress={() => setActiveCategory(cat.id)}
                        >
                            <View style={[
                                styles.iconCircle,
                                activeCategory === cat.id && styles.iconCircleActive
                            ]}>
                                <MaterialCommunityIcons
                                    name={cat.icon}
                                    size={18}
                                    color={activeCategory === cat.id ? 'white' : '#94a3b8'}
                                />
                            </View>
                            <Text style={[
                                styles.categoryLabel,
                                activeCategory === cat.id && styles.categoryLabelActive
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Date Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.categoriesScroll, { marginTop: 12, marginBottom: 8 }]}
                >
                    {dateFilters.map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.dateFilterChip,
                                activeDateFilter === filter && styles.dateFilterChipActive
                            ]}
                            onPress={() => setActiveDateFilter(filter)}
                        >
                            <Text style={[
                                styles.dateFilterLabel,
                                activeDateFilter === filter && styles.dateFilterLabelActive
                            ]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Featured Section */}
                {activeCategory === 'all' && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Featured Events</Text>
                            <TouchableOpacity>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.featuredScroll}
                        >
                            {events.slice(0, 3).map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.featuredCard}
                                    onPress={() => navigation.navigate('EventDetails', { event: item })}
                                >
                                    <Image
                                        source={{ uri: item.imageUrl || item.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop' }}
                                        style={styles.featuredImage}
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                                        style={styles.featuredGradient}
                                    />
                                    <View style={styles.featuredContent}>
                                        <View style={styles.dateBadge}>
                                            <Text style={styles.dateDay}>{item.date?.split(' ')[0] || '24'}</Text>
                                            <Text style={styles.dateMonth}>{item.date?.split(' ')[1] || 'OCT'}</Text>
                                        </View>
                                        <Text style={styles.featuredTitle}>{item.title}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

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
                            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateEvent')}>
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
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#135bec',
    },
    greeting: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchSection: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 15,
        marginLeft: 10,
    },
    scrollContent: {
        paddingTop: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    featuredList: {
        paddingLeft: 20,
    },
    featuredCard: {
        width: width - 40,
        height: 220,
        borderRadius: 24,
        overflow: 'hidden',
        marginRight: 16,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    featuredContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    featuredTextContainer: {
        flexDirection: 'column',
        gap: 8,
    },
    dateBadge: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 46,
        height: 52,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    dateDay: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#101622',
    },
    dateMonth: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#135bec',
        textTransform: 'uppercase',
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#135bec',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 100,
    },
    categoryText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    featuredTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    featuredMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    featuredSubtitle: {
        fontSize: 14,
        color: '#cbd5e1',
    },
    categorySection: {
        marginBottom: 24,
    },
    categoriesScroll: {
        paddingLeft: 20,
        paddingRight: 20,
        gap: 12,
        paddingBottom: 4,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: 'rgba(26, 34, 51, 0.7)',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(35, 47, 72, 0.5)',
        marginRight: 4,
    },
    categoryChipActive: {
        backgroundColor: '#135bec',
        borderColor: '#135bec',
        elevation: 8,
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    iconCircleActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    categoryLabel: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '600',
        paddingRight: 12,
    },
    categoryLabelActive: {
        color: 'white',
        fontWeight: '700',
    },
    dateFilterChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(26, 34, 51, 0.4)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(35, 47, 72, 0.3)',
    },
    dateFilterChipActive: {
        backgroundColor: 'rgba(19, 91, 236, 0.2)',
        borderColor: '#135bec',
    },
    dateFilterLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    dateFilterLabelActive: {
        color: '#135bec',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
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
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        height: 70,
        borderRadius: 35,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
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
        color: '#135bec',
        fontWeight: 'bold',
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#135bec',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -30,
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
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
