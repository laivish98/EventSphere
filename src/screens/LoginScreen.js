import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput, ImageBackground, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

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

        console.log('[Login] Attempting login for:', trimmedEmail);

        if (!trimmedEmail || !trimmedPassword) {
            alert('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const cred = await login(trimmedEmail, trimmedPassword);
            console.log('[Login] Success: UID', cred.user.uid);
            const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
            const role = userDoc.exists() ? userDoc.data().role : 'student';
            if (role === 'admin' || role === 'organizer') {
                navigation.replace('OrganizerDashboard');
            } else {
                navigation.replace('Home');
            }
        } catch (error) {
            console.error('[Login] Error:', error.code, error.message);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <ImageBackground
                        source={{ uri: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2670&auto=format&fit=crop' }} // Premium Event Crowd
                        style={styles.heroImage}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={isDarkMode ? ['transparent', colors.background + '80', colors.background] : ['transparent', 'rgba(255, 255, 255, 0.4)', colors.background]}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.heroContent}>
                            <View style={styles.logoRow}>
                                <View style={[styles.logoIcon, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                                    <MaterialCommunityIcons name="ticket-confirmation" size={24} color="white" />
                                </View>
                                <Text style={[styles.brandName, { color: colors.text }]}>EventSphere</Text>
                            </View>
                            <Text style={[styles.heroTitle, { color: colors.text }]}>
                                Experience{'\n'}
                                <Text style={{ color: colors.primary }}>Campus Life.</Text>
                            </Text>
                        </View>
                    </ImageBackground>
                </View>

                {/* Login Form Section */}
                <View style={styles.formContainer}>
                    <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>Log in to manage your tickets and events.</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="student@university.edu"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
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
                        style={[styles.loginButton, { shadowColor: colors.primary, elevation: 8 }]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.primaryLight]}
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
                </View>
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
    heroContainer: { height: 340, width: '100%' },
    heroImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
    heroContent: { padding: 24 },
    logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    logoIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    brandName: { fontSize: 26, fontWeight: 'bold', letterSpacing: -0.5 },
    heroTitle: { fontSize: 38, fontWeight: '900', lineHeight: 44, letterSpacing: -1 },
    formContainer: { flex: 1, padding: 24, gap: 24 },
    formSubtitle: { fontSize: 14, fontWeight: '500', opacity: 0.7 },
    inputGroup: { gap: 8 },
    inputLabel: { fontSize: 11, fontWeight: 'bold', marginLeft: 4, letterSpacing: 1, textTransform: 'uppercase' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, height: 60, borderWidth: 1.5 },
    inputIcon: { marginLeft: 16, marginRight: 12, opacity: 0.8 },
    input: { flex: 1, height: '100%', fontSize: 16, fontWeight: '500' },
    eyeIcon: { padding: 12, marginRight: 6 },
    forgotPassword: { alignSelf: 'flex-end' },
    forgotPasswordText: { fontSize: 13, fontWeight: 'bold' },
    spacer: { flex: 1, minHeight: 12 },
    loginButton: { height: 60, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, marginBottom: 12 },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loginButtonText: { color: 'white', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.2 },
    footer: { marginTop: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
    footerText: { fontSize: 14, opacity: 0.6 },
    signupText: { fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
});
