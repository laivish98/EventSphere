import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform, Modal, Alert, FlatList } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const colleges = [
    'University of Delhi (DU) - Main Campus',
    'Hindu College (DU)',
    'St. Stephen\'s College (DU)',
    'Shri Ram College of Commerce (SRCC - DU)',
    'Miranda House (DU)',
    'Hansraj College (DU)',
    'Lady Shri Ram College (LSR - DU)',
    'Kirori Mal College (KMC - DU)',
    'Ramjas College (DU)',
    'Sri Venkateswara College (Venky - DU)',
    'Gargi College (DU)',
    'Kamala Nehru College (DU)',
    'Shaheed Sukhdev College of Business Studies (SSCBS - DU)',
    'Indraprastha College for Women (DU)',
    'Jesus and Mary College (JMC - DU)',
    'Atma Ram Sanatan Dharma College (ARSD - DU)',
    'Deen Dayal Upadhyaya College (DDUC - DU)',
    'Indian Institute of Technology (IIT) Delhi',
    'Delhi Technological University (DTU)',
    'Netaji Subhas University of Technology (NSUT)',
    'Indraprastha Institute of Information Technology (IIIT Delhi)',
    'National Institute of Technology (NIT) Delhi',
    'Guru Gobind Singh Indraprastha University (GGSIPU)',
    'Maharaja Agrasen Institute of Technology (MAIT)',
    'Bhagwan Parshuram Institute of Technology (BPIT)',
    'Bharati Vidyapeeth\'s College of Engineering (BVCOE)',
    'Jamia Millia Islamia (JMI)',
    'Jawaharlal Nehru University (JNU)',
    'Indira Gandhi Delhi Technical University for Women (IGDTUW)',
    'Ambedkar University Delhi (AUD)',
    'Amity University, Noida',
    'Amity University, Gurugram',
    'Galgotias University',
    'Sharda University',
    'Shiv Nadar University',
    'Bennett University',
    'Jaypee Institute of Information Technology (JIIT)',
    'Manav Rachna University',
    'Manav Rachna International Institute of Research and Studies (MRIIRS)',
    'GD Goenka University',
    'KR Mangalam University',
    'Ashoka University',
    'O.P. Jindal Global University',
    'Gautam Buddha University',
    'Noida International University',
    'IILM University',
    'The NorthCap University',
    'BML Munjal University',
    'Other / Outside Delhi NCR'
];

const GenderCard = ({ value, icon, selected, onSelect, colors, isDarkMode }) => (
    <TouchableOpacity
        style={[styles.genderCard, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)' }]}
        onPress={() => onSelect(value)}
        activeOpacity={0.7}
    >
        <MaterialCommunityIcons
            name={icon}
            size={24}
            color={selected ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.genderLabel, { color: selected ? (isDarkMode ? 'white' : colors.text) : colors.textSecondary }]}>{value}</Text>
    </TouchableOpacity>
);

export default function EditProfileScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user, userData, getDefaultAvatar } = useAuth();
    const [name, setName] = useState(userData?.name || '');
    const [gender, setGender] = useState(userData?.gender || 'Male');
    const [college, setCollege] = useState(userData?.college || '');
    const [showCollegeModal, setShowCollegeModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const filteredColleges = colleges.filter(c =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUpdate = async () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Name cannot be empty.');
            return;
        }
        setLoading(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);

            let newAvatarUrl = userData?.avatarUrl;

            // Detection: Has dicebear or ui-avatars, OR has the old legacy patterns
            const isDefaultAvatar = !userData?.avatarUrl ||
                userData.avatarUrl.includes('dicebear.com') ||
                userData.avatarUrl.includes('ui-avatars.com') ||
                userData.avatarUrl.includes('iran.liara.run') ||
                userData.avatarUrl.includes('hair=short') ||
                userData.avatarUrl.includes('hair=long');

            if (isDefaultAvatar) {
                // If it's a default avatar, we sync it with the NEW parameters
                newAvatarUrl = getDefaultAvatar(name.trim() || 'User', gender);
            }

            await updateDoc(userDocRef, {
                name: name.trim(),
                college: college,
                gender: gender,
                avatarUrl: newAvatarUrl,
                updatedAt: new Date(),
            });
            Alert.alert('Success ✨', 'Your profile has been updated!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Update Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <ExpoGradient
                colors={isDarkMode
                    ? [colors.background, '#1e1b4b', '#0f172a']
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <BlurView intensity={isDarkMode ? 30 : 50} tint={isDarkMode ? "dark" : "light"} style={styles.headerGlass}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: 'white' }]}>EDIT PROFILE</Text>
                    <View style={{ width: 44 }} />
                </BlurView>

                <View style={styles.titleContainer}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>Personal Info</Text>
                    <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Update your details to stay connected.</Text>
                </View>

                {/* Gender Selection */}
                <View style={[styles.section, { marginBottom: 24 }]}>
                    <Text style={[styles.sectionLabel, { color: colors.primary }]}>GENDER</Text>
                    <View style={styles.genderContainer}>
                        <GenderCard
                            value="Male"
                            icon="gender-male"
                            selected={gender === 'Male'}
                            onSelect={setGender}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                        <GenderCard
                            value="Female"
                            icon="gender-female"
                            selected={gender === 'Female'}
                            onSelect={setGender}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                        <GenderCard
                            value="Other"
                            icon="gender-non-binary"
                            selected={gender === 'Other'}
                            onSelect={setGender}
                            colors={colors}
                            isDarkMode={isDarkMode}
                        />
                    </View>
                </View>

                {/* Form Inputs */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.primary }]}>FULL NAME</Text>
                        <BlurView intensity={isDarkMode ? 20 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.inputWrapperGlass, { borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                nativeID="edit-name"
                                name="name"
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Jane Doe"
                                placeholderTextColor={colors.textSecondary}
                                value={name}
                                onChangeText={setName}
                                autoComplete="name"
                                textContentType="name"
                            />
                        </BlurView>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.primary }]}>COLLEGE / UNIVERSITY</Text>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCollegeModal(true)}>
                            <BlurView intensity={isDarkMode ? 20 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.inputWrapperGlass, { borderColor: colors.border }]}>
                                <View style={[styles.collegeIconBadge, { backgroundColor: colors.primary + '20' }]}>
                                    <MaterialCommunityIcons name="bank-outline" size={18} color={colors.primary} />
                                </View>
                                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: Platform.OS === 'android' ? 14 : 0, color: college ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                                    {college || "Search for your college..."}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} style={{ marginRight: 15 }} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.bottomActionContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity onPress={handleUpdate} disabled={loading} activeOpacity={0.9}>
                    <View style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
                        <Text style={styles.primaryButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Modal */}
            <Modal animationType="slide" transparent={true} visible={showCollegeModal}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select University</Text>
                            <TouchableOpacity onPress={() => { setShowCollegeModal(false); setSearchQuery(''); }}>
                                <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Input in Modal */}
                        <View style={[styles.searchWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                            <TextInput
                                nativeID="search-college"
                                name="search"
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search university..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={filteredColleges}
                            keyExtractor={(item) => item}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: c }) => (
                                <TouchableOpacity
                                    style={[styles.collegeItem, { borderBottomColor: colors.border }]}
                                    onPress={() => {
                                        setCollege(c);
                                        setShowCollegeModal(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <View style={[styles.collegeInitialBadge, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)' }]}>
                                        <Text style={[styles.collegeInitial, { color: colors.primary }]}>{c[0]}</Text>
                                    </View>
                                    <Text style={[styles.collegeName, { color: colors.text }]}>{c}</Text>
                                    {college === c && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
    headerGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    titleContainer: { marginBottom: 32, marginTop: 10 },
    screenTitle: { fontSize: 32, fontWeight: 'bold', letterSpacing: -0.5 },
    screenSubtitle: { fontSize: 16, marginTop: 8 },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 16, letterSpacing: 1 },
    genderContainer: { flexDirection: 'row', gap: 12 },
    genderCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, height: 48, borderWidth: 1, gap: 8 },
    genderLabel: { fontSize: 13, fontWeight: '600' },
    formContainer: { gap: 20 },
    inputGroup: { gap: 8 },
    inputLabel: { fontSize: 12, fontWeight: '900', marginLeft: 8, letterSpacing: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 56, borderWidth: 1 },
    inputWrapperGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        height: 60,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    inputIcon: { marginLeft: 16, marginRight: 12 },
    input: { flex: 1, height: '100%', fontSize: 15 },
    collegeIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginRight: 10 },
    bottomActionContainer: { padding: 24, borderTopWidth: 1 },
    primaryButton: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    cancelText: { fontWeight: 'bold' },
    collegeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    collegeInitialBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    collegeInitial: { fontWeight: 'bold', fontSize: 16 },
    collegeName: { flex: 1, fontSize: 16 },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, height: '100%' },
});
