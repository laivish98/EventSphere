import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Image, Dimensions, Switch, Platform, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const StatItem = ({ label, value, colors }) => (
    <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
);

const MenuButton = ({ icon, label, onPress, colors, showBadge, badgeCount, color, isLast }) => (
    <TouchableOpacity
        style={[styles.menuButton, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.6}
    >
        <ExpoGradient
            colors={[color + '15', color + '05']}
            style={styles.menuIconContainer}
        >
            <MaterialCommunityIcons name={icon} size={22} color={color} />
        </ExpoGradient>
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        {showBadge && (
            <View style={[styles.badgeContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
);

export default function ProfileScreen({ navigation }) {
    const { colors, isDarkMode, toggleTheme } = useTheme();
    const { user, userData, logout, getDefaultAvatar } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [regCount, setRegCount] = useState(0);
    const [createdCount, setCreatedCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Fetch registration count
        const qReg = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const unsubReg = onSnapshot(qReg, (snap) => setRegCount(snap.size));

        // If admin, fetch created events count
        let unsubCreated = () => { };
        if (userData?.role === 'admin') {
            const qCreated = query(collection(db, 'events'), where('createdBy', '==', user.uid));
            unsubCreated = onSnapshot(qCreated, (snap) => setCreatedCount(snap.size));
        }

        // Fetch following count (users this user follows)
        const qFollowing = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        const unsubFollowing = onSnapshot(qFollowing, (snap) => setFollowingCount(snap.size));

        // Fetch followers count (people following this user - typically relevant for admins)
        const qFollowers = query(collection(db, 'follows'), where('organizerId', '==', user.uid));
        const unsubFollowers = onSnapshot(qFollowers, (snap) => setFollowersCount(snap.size));

        return () => {
            unsubReg();
            unsubCreated();
            unsubFollowing();
            unsubFollowers();
        };
    }, [user, userData]);

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to logout?");
            if (confirmed) {
                try {
                    await logout();
                    navigation.replace('Login');
                } catch (error) {
                    alert("Error: " + error.message);
                }
            }
            return;
        }

        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await logout();
                            navigation.replace('Login');
                        } catch (error) {
                            Alert.alert("Error", error.message);
                        }
                    }
                }
            ]
        );
    };

    if (!user || !userData) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Cinematic Background Layering */}
            <ExpoGradient
                colors={isDarkMode
                    ? [colors.background, '#0f172a', '#1e1b4b']
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Depth Orbs */}
            <View style={[styles.bgOrb, { top: -width * 0.2, right: -width * 0.2, backgroundColor: colors.primaryGlow, opacity: isDarkMode ? 0.4 : 0.1 }]} />
            <View style={[styles.bgOrb, { bottom: height * 0.1, left: -width * 0.3, width: 400, height: 400, backgroundColor: isDarkMode ? '#6366f130' : '#6366f110' }]} />
            <View style={[styles.bgOrb, { top: height * 0.4, right: -width * 0.1, width: 250, height: 250, backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.03)' }]} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={Platform.OS !== 'web'}>
                {/* Header Profile Section */}
                <View style={styles.profileHeader}>
                    <ExpoGradient
                        colors={[colors.primary, '#6366f1', '#a855f7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.mainStatGloss} />
                    </ExpoGradient>

                    {/* Back Button */}
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
                    </TouchableOpacity>

                    <BlurView
                        intensity={isDarkMode ? 50 : 30}
                        tint={isDarkMode ? "dark" : "light"}
                        style={[styles.profileInfoCard, { borderColor: colors.glassBorder }]}
                    >
                        <ExpoGradient
                            colors={isDarkMode ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(19, 91, 236, 0.05)', 'transparent']}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.profileInfoMain}>
                            <View style={[styles.avatarContainer, {
                                ...Platform.select({
                                    web: { boxShadow: '0 8px 16px rgba(0,0,0,0.2)' },
                                    default: {
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 16,
                                    }
                                })
                            }]}>
                                <View style={[styles.avatarWrapper, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                                    <Image
                                        source={{
                                            uri: (userData?.avatarUrl &&
                                                !userData.avatarUrl.includes('iran.liara.run') &&
                                                !hasImageError)
                                                ? userData.avatarUrl
                                                : getDefaultAvatar(userData?.name || user?.email?.split('@')?.[0] || 'User', userData?.gender)
                                        }}
                                        style={styles.avatar}
                                        onError={() => setHasImageError(true)}
                                    />
                                    <BlurView intensity={30} tint="dark" style={styles.editAvatarOverlay}>
                                        <MaterialCommunityIcons name="camera-outline" size={16} color="white" />
                                    </BlurView>
                                </View>
                            </View>

                            <Text style={[styles.userNameText, { color: colors.text }]}>{userData.name || 'User'}</Text>
                            <Text style={[styles.userEmailText, { color: colors.textSecondary }]}>{user.email}</Text>

                            <ExpoGradient
                                colors={[colors.primary, colors.primaryLight]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.roleBadgeContainer}
                            >
                                <MaterialCommunityIcons name={userData.role === 'admin' ? "shield-check" : "school"} size={14} color="white" />
                                <Text style={styles.roleBadgeText}>
                                    {userData.role === 'admin' ? 'Event Organizer' : 'Student PRO'}
                                </Text>
                            </ExpoGradient>
                        </View>
                    </BlurView>

                    {/* Stats Row */}
                    <BlurView
                        intensity={isDarkMode ? 50 : 35}
                        tint={isDarkMode ? "dark" : "light"}
                        style={[styles.statsRowGlass, { borderColor: colors.glassBorder }]}
                    >
                        <ExpoGradient
                            colors={isDarkMode ? ['rgba(255,255,255,0.03)', 'transparent'] : ['rgba(19, 91, 236, 0.03)', 'transparent']}
                            style={StyleSheet.absoluteFill}
                        />
                        <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
                            <StatItem label="Tickets" value={regCount} colors={colors} />
                        </TouchableOpacity>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        {userData.role === 'admin' && (
                            <>
                                <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { type: 'Followers', userId: user.uid })} activeOpacity={0.7}>
                                    <StatItem label="Followers" value={followersCount} colors={colors} />
                                </TouchableOpacity>
                                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                            </>
                        )}
                        <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('FollowList', { type: 'Following', userId: user.uid })} activeOpacity={0.7}>
                            <StatItem label="Following" value={followingCount} colors={colors} />
                        </TouchableOpacity>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
                            <StatItem label="XP" value={regCount * 50} colors={colors} />
                        </TouchableOpacity>
                    </BlurView>
                </View>

                {/* Content Sections */}
                <View style={styles.contentSections}>
                    <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ACCOUNT SETTINGS</Text>
                    <BlurView intensity={isDarkMode ? 25 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.menuCardGlass, { borderColor: colors.glassBorder }]}>
                        <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                        <MenuButton
                            icon="account-outline"
                            label="Personal Information"
                            color="#3b82f6"
                            colors={colors}
                            onPress={() => navigation.navigate('EditProfile')}
                        />
                        <MenuButton
                            icon="ticket-outline"
                            label="My Tickets"
                            color="#10b981"
                            showBadge={regCount > 0}
                            badgeCount={regCount}
                            colors={colors}
                            onPress={() => navigation.navigate('Ticket')}
                        />
                        <MenuButton
                            icon="shield-lock-outline"
                            label="Security"
                            color="#f59e0b"
                            colors={colors}
                            isLast
                            onPress={() => navigation.navigate('Security')}
                        />
                    </BlurView>

                    <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 24 }]}>PREFERENCES</Text>
                    <BlurView intensity={isDarkMode ? 25 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.menuCardGlass, { borderColor: colors.glassBorder }]}>
                        <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                        <View style={styles.menuButton}>
                            <ExpoGradient
                                colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                                style={styles.menuIconContainer}
                            >
                                <MaterialCommunityIcons name="theme-light-dark" size={22} color="#8b5cf6" />
                            </ExpoGradient>
                            <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
                            <Switch
                                value={isDarkMode}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#cbd5e1', true: colors.primary }}
                                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                            />
                        </View>
                    </BlurView>

                    <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 24 }]}>SUPPORT</Text>
                    <BlurView intensity={isDarkMode ? 25 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.menuCardGlass, { borderColor: colors.glassBorder }]}>
                        <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                        <MenuButton
                            icon="help-circle-outline"
                            label="Help Center"
                            color="#64748b"
                            colors={colors}
                            onPress={() => navigation.navigate('HelpCenter')}
                        />
                        <MenuButton
                            icon="information-outline"
                            label="About EventSphere"
                            color="#64748b"
                            colors={colors}
                            isLast
                            onPress={() => navigation.navigate('About')}
                        />
                    </BlurView>

                    <TouchableOpacity
                        style={[styles.logoutButton, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : '#fee2e2' }]}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="logout-variant" size={20} color="#ef4444" />
                        <Text style={styles.logoutText}>Sign Out from account</Text>
                    </TouchableOpacity>

                    <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0 (Build 124)</Text>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    profileHeader: { paddingHorizontal: 20, paddingBottom: 24, position: 'relative', overflow: 'hidden' },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden' },
    backButton: {
        marginTop: Platform.OS === 'ios' ? 60 : 40,
        marginBottom: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    profileInfoMain: { alignItems: 'center' },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatarWrapper: {
        padding: 4,
        borderRadius: 52,
        borderWidth: 2,
        ...Platform.select({
            web: { boxShadow: '0 8px 16px rgba(0,0,0,0.2)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
            }
        })
    },
    avatar: { width: 88, height: 88, borderRadius: 44 },
    userNameText: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
    userEmailText: { fontSize: 13, marginBottom: 16, opacity: 0.6 },
    roleBadgeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
    roleBadgeText: { fontSize: 11, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 },
    statsRowGlass: {
        flexDirection: 'row',
        marginTop: 24,
        width: '100%',
        borderRadius: 28,
        padding: 20,
        borderWidth: 1.5,
        justifyContent: 'space-around',
        alignItems: 'center',
        overflow: 'hidden',
    },
    bgOrb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
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
    profileInfoCard: {
        borderRadius: 36,
        padding: 24,
        marginTop: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 12,
            }
        })
    },
    editAvatarOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: '#135bec', // Premium primary color
        overflow: 'hidden',
    },
    statValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5 },
    statDivider: { width: 1.5, height: 32, opacity: 0.1 },
    contentSections: { paddingHorizontal: 20, marginTop: 32 },
    sectionHeading: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginLeft: 8, marginBottom: 16, opacity: 0.5 },
    menuCardGlass: {
        borderRadius: 28,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    menuButton: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    menuIconContainer: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
    badgeContainer: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginRight: 10 },
    badgeText: { color: 'white', fontSize: 11, fontWeight: '900' },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        padding: 18,
        borderRadius: 28,
        gap: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    logoutText: { color: '#ef4444', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
    versionText: { textAlign: 'center', fontSize: 11, marginVertical: 32, opacity: 0.3, letterSpacing: 2 },
});
