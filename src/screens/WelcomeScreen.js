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
                    <BlurView intensity={20} tint={isDarkMode ? "dark" : "light"} style={[styles.glassPanel, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(19, 91, 236, 0.05)', borderColor: colors.glassBorder }]}>
                        <LinearGradient
                            colors={isDarkMode ? ['rgba(255,255,255,0.1)', 'transparent'] : ['rgba(19, 91, 236, 0.1)', 'transparent']}
                            style={styles.innerGlow}
                        />
                        <MaterialCommunityIcons name="ticket-confirmation" size={68} color={colors.primary} style={styles.iconShadow} />
                        <View style={[styles.decorativeDot, { backgroundColor: colors.primary, shadowColor: colors.primary }]} />
                    </BlurView>
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>EventSphere</Text>
                    <View style={[styles.titleUnderline, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Discover and organize the best campus experiences with ease and style.
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionContainer}>
                    {/* Sign Up Button (Primary) */}
                    <TouchableOpacity
                        style={[styles.primaryButton, { shadowColor: colors.primary }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Signup')}
                    >
                        <LinearGradient
                            colors={[colors.primary, colors.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.buttonContent}>
                            <Text style={styles.primaryButtonText}>Get Started</Text>
                            <MaterialCommunityIcons name="chevron-right" size={22} color="white" />
                        </View>
                    </TouchableOpacity>

                    {/* Log In Button (Secondary) */}
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: colors.border }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={[styles.secondaryButtonText, { color: isDarkMode ? 'white' : colors.text }]}>Log In</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        By continuing, you agree to our <Text style={[styles.link, { color: colors.primary }]}>Terms</Text> & <Text style={[styles.link, { color: colors.primary }]}>Privacy Policy</Text>
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
    logoContainer: { marginBottom: 56, alignItems: 'center' },
    glassPanel: {
        width: 140,
        height: 140,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    innerGlow: { ...StyleSheet.absoluteFillObject },
    iconShadow: {
        textShadowColor: 'rgba(19, 91, 236, 0.3)',
        textShadowOffset: { width: 0, height: 8 },
        textShadowRadius: 20,
    },
    decorativeDot: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 10,
        height: 10,
        borderRadius: 5,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    textContainer: { alignItems: 'center', marginBottom: 56, paddingHorizontal: 20 },
    title: {
        fontSize: 48,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: -1.5,
    },
    titleUnderline: {
        width: 60,
        height: 5,
        borderRadius: 3,
        marginBottom: 24,
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 28,
        opacity: 0.8,
        fontWeight: '500',
    },
    actionContainer: { width: '100%', gap: 16, maxWidth: 320 },
    primaryButton: {
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    primaryButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
    secondaryButton: { height: 60, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    secondaryButtonText: { fontSize: 16, fontWeight: 'bold' },
    footer: { marginTop: 40, alignItems: 'center' },
    footerText: { fontSize: 12, textAlign: 'center', opacity: 0.6 },
    link: { fontWeight: '600' },
});
