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
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const cred = await login(email, password);
            const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
            const role = userDoc.exists() ? userDoc.data().role : 'student';
            if (role === 'admin' || role === 'organizer') {
                navigation.replace('OrganizerDashboard');
            } else {
                navigation.replace('Home');
            }
        } catch (error) {
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
                        source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2670&auto=format&fit=crop' }} // Concert/Event Crowd Image
                        style={styles.heroImage}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={isDarkMode ? ['transparent', 'rgba(16, 22, 34, 0.4)', '#101622'] : ['transparent', 'rgba(255, 255, 255, 0.4)', colors.background]}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.heroContent}>
                            <View style={styles.logoRow}>
                                <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
                                    <MaterialCommunityIcons name="ticket-confirmation" size={24} color="white" />
                                </View>
                                <Text style={[styles.brandName, { color: isDarkMode ? 'white' : colors.text }]}>EventSphere</Text>
                            </View>
                            <Text style={[styles.heroTitle, { color: isDarkMode ? 'white' : colors.text }]}>
                                Experience{'\n'}
                                <Text style={[styles.heroHighlight, { color: colors.primary }]}>Campus Life.</Text>
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
                            <MaterialCommunityIcons name="email" size={20} color={colors.textSecondary} style={styles.inputIcon} />
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
                            <MaterialCommunityIcons name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                <MaterialCommunityIcons name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <View style={styles.spacer} />

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: colors.primary }]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Secure Login'}</Text>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="white" />
                    </TouchableOpacity>


                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Text style={[styles.signupText, { color: isDarkMode ? 'white' : colors.text, textDecorationColor: colors.primary }]}>Sign Up</Text>
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
    heroContainer: {
        height: 320,
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
    },
    heroContent: {
        padding: 24,
        paddingBottom: 10, // Adjusted as the gradient handles blend
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#135bec',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    brandName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 0.5,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        lineHeight: 42,
    },
    heroHighlight: {
        color: '#135bec',
    },
    formContainer: {
        flex: 1,
        padding: 24,
        paddingTop: 24,
        gap: 20,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        height: 56,
        borderWidth: 1,
    },
    inputIcon: {
        marginLeft: 16,
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: 'white',
    },
    eyeIcon: {
        padding: 10,
        marginRight: 6,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        color: '#135bec',
        fontSize: 14,
        fontWeight: '500',
    },
    spacer: {
        flex: 1,
        minHeight: 20,
    },
    loginButton: {
        height: 56,
        backgroundColor: '#135bec',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
        marginBottom: 16,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    footer: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 14,
    },
    signupText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
        textDecorationColor: '#135bec',
    },
});
