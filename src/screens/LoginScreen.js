import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput, ImageBackground, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            Alert.alert('Required Fields', 'Please fill in all fields to log in.');
            return;
        }
        setLoading(true);
        try {
            const cred = await login(trimmedEmail, trimmedPassword);
            let role = 'student';
            try {
                const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
                if (userDoc.exists()) {
                    role = userDoc.data().role;
                }
            } catch (err) {
                console.warn("Could not fetch user role, defaulting to student:", err.message);
            }
            if (role === 'admin' || role === 'organizer') {
                navigation.replace('OrganizerDashboard');
            } else {
                navigation.replace('Home');
            }
        } catch (error) {
            Alert.alert('Login Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Ambient Background Structure */}
            <ExpoGradient
                colors={isDarkMode
                    ? [colors.background, colors.surfaceDeep, colors.background]
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Accent Glows */}
            <View style={[styles.bgOrb, { top: 200, left: -100, backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.15)' : 'rgba(19, 91, 236, 0.05)' }]} />
            <View style={[styles.bgOrb, { bottom: -100, right: -100, backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.04)' }]} />

            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <ImageBackground
                        source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop' }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    >
                        <ExpoGradient
                            colors={['transparent', 'rgba(15, 23, 42, 0.4)', colors.background]}
                            style={StyleSheet.absoluteFill}
                        />
                        <BlurView intensity={isDarkMode ? 20 : 10} tint="dark" style={StyleSheet.absoluteFill} />

                        <View style={styles.heroContent}>
                            <View style={styles.logoRow}>
                                <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
                                    <ExpoGradient
                                        colors={[colors.primary, colors.primaryLight]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <MaterialCommunityIcons name="ticket-confirmation" size={24} color="white" />
                                </View>
                                <Text style={[styles.brandName, { color: 'white' }]}>EventSphere</Text>
                            </View>
                            <Text style={[styles.heroTitle, { color: 'white' }]}>
                                Experience{'\n'}
                                <Text style={{ color: colors.primaryLight || colors.primary }}>Campus Life.</Text>
                            </Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* Login Form Section */}
                <BlurView intensity={isDarkMode ? 30 : 20} tint={isDarkMode ? "dark" : "light"} style={[styles.formContainer, { borderColor: colors.glassBorder }]}>
                    <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                    <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>Log in to manage your tickets and events.</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.surface + '60', borderColor: colors.glassBorder }]}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                nativeID="email"
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
                                nativeID="password"
                                name="password"
                                style={[styles.input, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="current-password"
                                textContentType="password"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <MaterialCommunityIcons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <View style={styles.spacer} />

                    <TouchableOpacity
                        style={[styles.loginButton, Platform.select({ web: { boxShadow: isDarkMode ? 'none' : `0 4px 12px ${colors.primary}60` }, default: { shadowColor: isDarkMode ? 'transparent' : colors.primary } })]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <ExpoGradient
                            colors={[colors.primary, '#6366f1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.buttonContent}>
                            <Text style={styles.loginButtonText}>{loading ? 'Authenticating...' : 'Secure Login'}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Text style={[styles.signupText, { color: colors.text, textDecorationColor: colors.primary }]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#101622',
    },
    scrollContent: {
        flexGrow: 1,
    },
    heroContainer: { height: height * 0.45, width: '100%' },
    heroImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    heroContent: { padding: 24, zIndex: 10 },
    logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    logoIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' },
    brandName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    heroTitle: { fontSize: 42, fontWeight: '900', lineHeight: 48, letterSpacing: -1.5 },
    formContainer: {
        flex: 1,
        padding: 24,
        gap: 24,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        marginTop: -40,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    formSubtitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5 },
    inputGroup: { gap: 10 },
    inputLabel: { fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 1.5, opacity: 0.6 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, height: 64, borderWidth: 1.5 },
    inputIcon: { marginLeft: 18, marginRight: 12 },
    input: { flex: 1, height: '100%', fontSize: 16, fontWeight: '700' },
    eyeIcon: { padding: 12, marginRight: 8 },
    forgotPassword: { alignSelf: 'flex-end', marginRight: 8 },
    forgotPasswordText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    spacer: { flex: 1, minHeight: 12 },
    loginButton: {
        height: 64,
        borderRadius: 24,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 12,
        marginBottom: 16,
        ...(Platform.OS === 'web'
            ? { boxShadow: '0 8px 15px rgba(0,0,0,0.3)' }
            : {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            })
    },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loginButtonText: { color: 'white', fontSize: 17, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
    footer: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
    footerText: { fontSize: 14, fontWeight: '600', opacity: 0.5 },
    signupText: { fontSize: 14, fontWeight: '900', textDecorationLine: 'underline' },
    bgOrb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
});
