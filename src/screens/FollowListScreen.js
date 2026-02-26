import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, TextInput, ActivityIndicator, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';

export default function FollowListScreen({ route, navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { type, userId } = route.params; // type: 'Following' or 'Followers'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let q;
                if (type === 'Following') {
                    // People the user follows
                    q = query(collection(db, 'follows'), where('followerId', '==', userId));
                } else {
                    // People following the user
                    q = query(collection(db, 'follows'), where('organizerId', '==', userId));
                }

                const snap = await getDocs(q);
                const userList = [];

                for (const d of snap.docs) {
                    const data = d.data();
                    const targetId = type === 'Following' ? data.organizerId : data.followerId;

                    // Fetch user details for each
                    const userRef = doc(db, 'users', targetId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        userList.push({
                            id: targetId,
                            ...userSnap.data()
                        });
                    }
                }

                setUsers(userList);
            } catch (error) {
                console.error("Error fetching follow list:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type, userId]);

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.college?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderUser = ({ item }) => (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
                // Future: Navigate to their profile
            }}
        >
            <Image
                source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random&color=fff` }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.userSub, { color: colors.textSecondary }]}>{item.college || item.role}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{type}</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder={`Search ${type.toLowerCase()}...`}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : filteredUsers.length > 0 ? (
                    <FlatList
                        data={filteredUsers}
                        renderItem={renderUser}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.center}>
                        <MaterialCommunityIcons name="account-search-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {searchQuery ? 'No users found matching search' : `No ${type.toLowerCase()} yet`}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    backBtn: { padding: 4 },
    content: { flex: 1, paddingHorizontal: 20 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 48, borderRadius: 12, borderWidth: 1, marginBottom: 20, marginTop: 10 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
    list: { paddingBottom: 40 },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    userInfo: { flex: 1, marginLeft: 15 },
    userName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    userSub: { fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    emptyText: { marginTop: 16, fontSize: 16, textAlign: 'center' }
});
