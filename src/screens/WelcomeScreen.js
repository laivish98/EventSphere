import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Background Gradient */}
            <LinearGradient
                colors={isDarkMode ? [colors.background, '#0d121c'] : [colors.background, '#f1f5f9']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Orbs */}
            <View style={[styles.orb, styles.orbTop, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.2)' : 'rgba(19, 91, 236, 0.1)' }]} />
            <View style={[styles.orb, styles.orbBottom, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.1)' : 'rgba(19, 91, 236, 0.05)' }]} />

            {/* Content Container */}
            <View style={styles.content}>

                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <BlurView intensity={20} tint={isDarkMode ? "dark" : "light"} style={[styles.glassPanel, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(19, 91, 236, 0.05)', borderColor: colors.border }]}>
                        <LinearGradient
                            colors={isDarkMode ? ['rgba(255,255,255,0.1)', 'transparent'] : ['rgba(19, 91, 236, 0.1)', 'transparent']}
                            style={styles.innerGlow}
                        />
                        <MaterialCommunityIcons name="calendar-text" size={64} color={colors.primary} style={styles.iconShadow} />
                        <View style={styles.decorativeDot} />
                    </BlurView>
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>EventSphere</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Where Campus Events Come Together</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionContainer}>
                    {/* Sign Up Button (Primary) */}
                    <TouchableOpacity
                        style={styles.primaryButton}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Signup')}
                    >
                        <LinearGradient
                            colors={['#135bec', '#135bec']} // Pure primary color as base
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.buttonContent}>
                            <Text style={styles.primaryButtonText}>Sign Up</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                        </View>
                    </TouchableOpacity>

                    {/* Log In Button (Secondary) */}
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: colors.border }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={[styles.secondaryButtonText, { color: isDarkMode ? 'white' : colors.primary }]}>Log In</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        By continuing, you agree to our <Text style={styles.link}>Terms</Text> & <Text style={styles.link}>Privacy Policy</Text>
                    </Text>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    orb: {
        position: 'absolute',
        borderRadius: 1000,
    },
    orbTop: {
        top: -height * 0.1,
        left: -width * 0.1,
        width: 500,
        height: 500,
        backgroundColor: 'rgba(19, 91, 236, 0.2)', // Primary with opacity
        // Using shadow as poor man's blur if needed, currently reliant on design
    },
    orbBottom: {
        bottom: -height * 0.1,
        right: -width * 0.1,
        width: 400,
        height: 400,
        backgroundColor: 'rgba(19, 91, 236, 0.1)',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glassPanel: {
        width: 128,
        height: 128,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    innerGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
    },
    iconShadow: {
        textShadowColor: 'rgba(19, 91, 236, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    decorativeDot: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#135bec',
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 48, // Space before buttons
    },
    title: {
        fontSize: 36, // ~text-4xl
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 12,
        textShadowColor: 'rgba(19, 91, 236, 0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    subtitle: {
        fontSize: 18, // ~text-lg
        color: '#94a3b8', // slate-400
        textAlign: 'center',
        lineHeight: 28,
        maxWidth: 280,
    },
    actionContainer: {
        width: '100%',
        gap: 16,
        maxWidth: 400,
    },
    primaryButton: {
        height: 56,
        borderRadius: 12, // xl
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#135bec',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    secondaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        color: '#64748b', // slate-500
        fontSize: 12,
        textAlign: 'center',
    },
    link: {
        color: '#135bec',
        textDecorationLine: 'underline',
    },
});
