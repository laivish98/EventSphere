import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Image, Dimensions, Switch, Platform, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

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
        <LinearGradient
            colors={[color + '15', color + '05']}
            style={styles.menuIconContainer}
        >
            <MaterialCommunityIcons name={icon} size={22} color={color} />
        </LinearGradient>
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
    const { user, userData, logout } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [regCount, setRegCount] = useState(0);
    const [createdCount, setCreatedCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

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

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Profile Section */}
                <View style={styles.profileHeader}>
                    <LinearGradient
                        colors={[colors.primary, colors.primary + '80']}
                        style={styles.headerGradient}
                    />

                    {/* Back Button */}
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
                    </TouchableOpacity>

                    <View style={styles.profileInfoMain}>
                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatarWrapper, { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                <Image
                                    source={{
                                        uri: (userData?.avatarUrl &&
                                            !userData.avatarUrl.includes('iran.liara.run') &&
                                            !userData.avatarUrl.includes('hair=short') &&
                                            !userData.avatarUrl.includes('hair=long'))
                                            ? userData.avatarUrl
                                            : getDefaultAvatar(userData?.name || user?.email?.split('@')[0], userData?.gender)
                                    }}
                                    style={styles.avatar}
                                />
                            </View>
                        </View>

                        <Text style={styles.userNameText}>{userData.name || 'User'}</Text>
                        <Text style={styles.userEmailText}>{user.email}</Text>

                        <View style={styles.roleBadgeContainer}>
                            <MaterialCommunityIcons name={userData.role === 'admin' ? "shield-check" : "school"} size={14} color="white" />
                            <Text style={styles.roleBadgeText}>
                                {userData.role === 'admin' ? 'Event Organizer' : 'Student Pro'}
                            </Text>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                            <StatItem label="XP Points" value={regCount * 50} colors={colors} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content Sections */}
                <View style={styles.contentSections}>
                    <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ACCOUNT SETTINGS</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                    </View>

                    <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 24 }]}>PREFERENCES</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.menuButton}>
                            <View style={[styles.menuIconContainer, { backgroundColor: '#8b5cf615' }]}>
                                <MaterialCommunityIcons name="theme-light-dark" size={22} color="#8b5cf6" />
                            </View>
                            <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
                            <Switch
                                value={isDarkMode}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#767577', true: colors.primary }}
                                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : ''}
                            />
                        </View>
                    </View>

                    <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 24 }]}>SUPPORT</Text>
                    <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                    </View>

                    <TouchableOpacity
                        style={[styles.logoutButton, { backgroundColor: isDarkMode ? '#ef444410' : '#fee2e2' }]}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name="logout-variant" size={22} color="#ef4444" />
                        <Text style={styles.logoutText}>Sign Out</Text>
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
    profileHeader: { paddingHorizontal: 24, paddingBottom: 24, position: 'relative', overflow: 'hidden' },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
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
    profileInfoMain: { alignItems: 'center', marginTop: 10 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatarWrapper: { padding: 4, borderRadius: 52, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
    avatar: { width: 92, height: 92, borderRadius: 46 },
    userNameText: { fontSize: 28, fontWeight: 'bold', color: 'white', letterSpacing: -1 },
    userEmailText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
    roleBadgeContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, backgroundColor: 'rgba(255,255,255,0.15)' },
    roleBadgeText: { fontSize: 13, fontWeight: 'bold', color: 'white' },
    statsRow: { flexDirection: 'row', marginTop: 32, width: '100%', borderRadius: 28, padding: 22, borderWidth: 1.5, justifyContent: 'space-around', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.6 },
    statDivider: { width: 1.5, height: 36, opacity: 0.3 },
    contentSections: { paddingHorizontal: 20, marginTop: 40 },
    sectionHeading: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginLeft: 8, marginBottom: 16 },
    menuCard: { borderRadius: 32, borderWidth: 1.5, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
    menuButton: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    menuIconContainer: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 18 },
    menuLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
    badgeContainer: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginRight: 10 },
    badgeText: { color: 'white', fontSize: 11, fontWeight: '900' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, padding: 22, borderRadius: 32, gap: 12 },
    logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    versionText: { textAlign: 'center', fontSize: 12, marginVertical: 32, opacity: 0.5, letterSpacing: 1.5 },
});
