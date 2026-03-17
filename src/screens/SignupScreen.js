import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, Dimensions, KeyboardAvoidingView, Platform, Modal, Alert, FlatList } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const RoleCard = ({ role, icon, label, selected, onSelect, colors, isDarkMode }) => (
    <TouchableOpacity
        style={[styles.roleCard, { backgroundColor: selected ? 'transparent' : colors.surface + '40', borderColor: selected ? colors.primary : colors.glassBorder }]}
        onPress={() => onSelect(role)}
        activeOpacity={0.7}
    >
        {selected && (
            <BlurView intensity={30} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill}>
                <ExpoGradient
                    colors={[colors.primary + '20', colors.primaryLight + '10']}
                    style={StyleSheet.absoluteFill}
                />
            </BlurView>
        )}
        <MaterialCommunityIcons
            name={icon}
            size={32}
            color={selected ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.roleLabel, { color: selected ? colors.text : colors.textSecondary }]}>{label}</Text>
        {selected && (
            <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="check" size={12} color="white" />
            </View>
        )}
    </TouchableOpacity>
);

export default function SignupScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [gender, setGender] = useState('Male'); // Default gender
    const [showCollegeModal, setShowCollegeModal] = useState(false);
    const [college, setCollege] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const handleSignup = async () => {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword || !name.trim()) {
            Alert.alert('Required Fields', 'Please fill in all fields to create your account.');
            return;
        }
        setLoading(true);
        try {
            const backendRole = role === 'organizer' ? 'admin' : role;
            await signup(trimmedEmail, trimmedPassword, backendRole, { name: name.trim(), college, gender });
            if (backendRole === 'admin') {
                navigation.replace('OrganizerDashboard');
            } else {
                navigation.replace('Home');
            }
        } catch (error) {
            Alert.alert('Signup Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

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

    const filteredColleges = colleges.filter(c =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const GenderCard = ({ value, icon, selected, onSelect, colors, isDarkMode }) => (
        <TouchableOpacity
            style={[styles.genderCard, { backgroundColor: selected ? 'transparent' : colors.surface + '40', borderColor: selected ? colors.primary : colors.glassBorder }]}
            onPress={() => onSelect(value)}
            activeOpacity={0.7}
        >
            {selected && (
                <BlurView intensity={20} tint={isDarkMode ? "dark" : "light"} style={StyleSheet.absoluteFill}>
                    <ExpoGradient
                        colors={[colors.primary + '15', 'transparent']}
                        style={StyleSheet.absoluteFill}
                    />
                </BlurView>
            )}
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={selected ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.genderLabel, { color: selected ? colors.text : colors.textSecondary }]}>{value}</Text>
        </TouchableOpacity>
    );

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

            <View style={[styles.bgOrb, { top: height * 0.4, right: -width * 0.1, width: 250, height: 250, backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.03)' }]} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)', borderColor: colors.glassBorder }]}
                        >
                            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>USER REGISTRATION</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.titleContainer}>
                        <Text style={[styles.screenTitle, { color: colors.text }]}>Create Account</Text>
                        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Join the ultimate college event network.</Text>
                    </View>

                    {/* Role Selection */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.primary }]}>I AM A...</Text>
                        <View style={styles.roleContainer}>
                            <RoleCard
                                role="student"
                                icon="school"
                                label="Student"
                                selected={role === 'student'}
                                onSelect={setRole}
                                colors={colors}
                                isDarkMode={isDarkMode}
                            />
                            <RoleCard
                                role="organizer"
                                icon="calendar-text"
                                label="Organizer"
                                selected={role === 'organizer'}
                                onSelect={setRole}
                                colors={colors}
                                isDarkMode={isDarkMode}
                            />
                        </View>
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

                    {/* Form Inputs Container */}
                    <BlurView
                        intensity={isDarkMode ? 40 : 25}
                        tint={isDarkMode ? "dark" : "light"}
                        style={[styles.formContainer, { borderColor: colors.glassBorder }]}
                    >
                        <ExpoGradient
                            colors={isDarkMode ? ['rgba(255,255,255,0.03)', 'transparent'] : ['rgba(19, 91, 236, 0.03)', 'transparent']}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.surface + '60', borderColor: colors.glassBorder }]}>
                                <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    nativeID="signup-name"
                                    name="name"
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Jane Doe"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={name}
                                    onChangeText={setName}
                                    autoComplete="name"
                                    textContentType="name"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.surface + '60', borderColor: colors.glassBorder }]}>
                                <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    nativeID="signup-email"
                                    name="email"
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="jane@college.edu"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.surface + '60', borderColor: colors.glassBorder }]}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    nativeID="signup-password"
                                    name="password"
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoComplete="new-password"
                                    textContentType="password"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <MaterialCommunityIcons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>COLLEGE / UNIVERSITY</Text>
                            <TouchableOpacity style={[styles.inputWrapper, { backgroundColor: colors.surface + '60', borderColor: colors.glassBorder }]} onPress={() => setShowCollegeModal(true)}>
                                <View style={[styles.collegeIconBadge, { backgroundColor: colors.primary + '15' }]}>
                                    <MaterialCommunityIcons name="bank-outline" size={18} color={colors.primary} />
                                </View>
                                <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: Platform.OS === 'android' ? 14 : 0, color: college ? colors.text : colors.textSecondary + '80' }]} numberOfLines={1}>
                                    {college || "Search for your college..."}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} style={{ marginRight: 15 }} />
                            </TouchableOpacity>
                        </View>
                    </BlurView>

                    <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                        By creating an account, you agree to our <Text style={{ color: colors.primary }}>Terms of Service</Text> and <Text style={{ color: colors.primary }}>Privacy Policy</Text>.
                    </Text>

                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Bottom Actions */}
                {/* Bottom Sticky Action Bar */}
                <BlurView intensity={80} tint={isDarkMode ? "dark" : "light"} style={[styles.bottomActionContainer, { borderTopColor: colors.glassBorder }]}>
                    <ExpoGradient
                        colors={isDarkMode ? ['rgba(15, 23, 42, 0.9)', 'rgba(15, 23, 42, 0.95)'] : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.98)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <TouchableOpacity onPress={handleSignup} disabled={loading} activeOpacity={0.9}>
                        <View style={[styles.primaryButton, { shadowColor: isDarkMode ? 'transparent' : colors.primary }]}>
                            <ExpoGradient
                                colors={[colors.primary, '#6366f1']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Text style={styles.primaryButtonText}>{loading ? 'Establishing Identity...' : 'Join EventSphere Ecosystem'}</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.loginLinkContainer}>
                        <Text style={[styles.loginText, { color: colors.textSecondary }]}>Already a member? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={[styles.loginLink, { color: colors.primary, textDecorationLine: 'underline' }]}>Log In here</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>

            </KeyboardAvoidingView>

            {/* Modal */}
            <Modal animationType="slide" transparent={true} visible={showCollegeModal}>
                <View style={styles.modalOverlay}>
                    <BlurView intensity={isDarkMode ? 40 : 25} tint={isDarkMode ? "dark" : "light"} style={[styles.modalContent, { borderColor: colors.glassBorder }]}>
                        <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select University</Text>
                            <TouchableOpacity onPress={() => { setShowCollegeModal(false); setSearchQuery(''); }}>
                                <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search Input in Modal */}
                        <View style={[styles.searchWrapper, { backgroundColor: colors.surface + '60', borderColor: colors.glassBorder }]}>
                            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search university..."
                                placeholderTextColor={colors.textSecondary + '80'}
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
                                    style={[styles.collegeItem, { borderBottomColor: colors.border + '30' }]}
                                    onPress={() => {
                                        setCollege(c);
                                        setShowCollegeModal(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <View style={[styles.collegeInitialBadge, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.15)' : 'rgba(19, 91, 236, 0.05)' }]}>
                                        <Text style={[styles.collegeInitial, { color: colors.primary }]}>{c[0]}</Text>
                                    </View>
                                    <Text style={[styles.collegeName, { color: colors.text }]}>{c}</Text>
                                    {college === c && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </BlurView>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
    backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, overflow: 'hidden' },
    headerTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2, opacity: 0.5 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 160 },
    titleContainer: { marginBottom: 32, marginTop: 10, paddingHorizontal: 4 },
    screenTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -1.2 },
    screenSubtitle: { fontSize: 15, marginTop: 6, opacity: 0.6, fontWeight: '600' },
    section: { marginBottom: 32 },
    sectionLabel: { fontSize: 11, fontWeight: '900', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase', paddingLeft: 4, opacity: 0.8 },
    roleContainer: { flexDirection: 'row', gap: 12 },
    roleCard: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        overflow: 'hidden',
        elevation: 4,
        ...Platform.select({
            web: { boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
            }
        })
    },
    roleLabel: { marginTop: 12, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    checkBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4
            }
        })
    },
    genderContainer: { flexDirection: 'row', gap: 10 },
    genderCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 20, height: 56, borderWidth: 1.5, gap: 8, overflow: 'hidden' },
    genderLabel: { fontSize: 13, fontWeight: '800' },
    formContainer: { gap: 24, borderRadius: 32, padding: 24, borderWidth: 1.5, overflow: 'hidden' },
    inputGroup: { gap: 10 },
    inputLabel: { fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 1.5, opacity: 0.6 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, height: 64, borderWidth: 1.5 },
    inputIcon: { marginLeft: 18, marginRight: 12 },
    input: { flex: 1, height: '100%', fontSize: 15, fontWeight: '700' },
    eyeIcon: { padding: 12, marginRight: 8 },
    collegeIconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginRight: 10 },
    termsText: { textAlign: 'center', fontSize: 11, marginTop: 32, lineHeight: 18, opacity: 0.4, paddingHorizontal: 20, fontWeight: '600' },
    bottomActionContainer: { position: Platform.OS === 'web' ? 'fixed' : 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1.5, overflow: 'hidden' },
    primaryButton: {
        height: 64,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...Platform.select({
            web: { boxShadow: '0 8px 15px rgba(0,0,0,0.3)' },
            default: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            }
        })
    },
    primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
    loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    loginText: { fontSize: 13, fontWeight: '600', opacity: 0.5 },
    loginLink: { fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, maxHeight: '85%', borderWidth: 1.5, borderBottomWidth: 0, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingHorizontal: 4 },
    modalTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    cancelText: { fontWeight: '800', textTransform: 'uppercase', fontSize: 13, letterSpacing: 1 },
    collegeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    collegeInitialBadge: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    collegeInitial: { fontWeight: '900', fontSize: 18 },
    collegeName: { flex: 1, fontSize: 15, fontWeight: '700' },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 20, height: 60, borderWidth: 1.5, marginBottom: 20 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, height: '100%', fontWeight: '600' },
    bgOrb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
});
