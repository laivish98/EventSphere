import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
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
            <ExpoGradient
                colors={[colors.primary + '15', colors.primary + '05']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Orbs */}
            <View style={[styles.orb, styles.orbTop, { backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.25)' : 'rgba(19, 91, 236, 0.12)' }]} />
            <View style={[styles.orb, styles.orbBottom, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)' }]} />
            <View style={[styles.orb, styles.orbCenter, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]} />

            {/* Content Container */}
            <View style={styles.content}>

                {/* Logo Section */}
                <View style={styles.logoContainer}>
                    <BlurView intensity={isDarkMode ? 40 : 25} tint={isDarkMode ? "dark" : "light"} style={[styles.glassPanel, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(19, 91, 236, 0.06)', borderColor: colors.glassBorder }]}>
                        <ExpoGradient
                            colors={colors.iridescent}
                            style={styles.innerGlow}
                        />
                        <MaterialCommunityIcons name="ticket-confirmation" size={72} color={colors.primary} style={styles.iconShadow} />
                        <View style={[styles.decorativeDot, {
                            backgroundColor: colors.accent,
                            ...(Platform.OS === 'web'
                                ? { boxShadow: `0 0 15px ${colors.accent}` }
                                : {
                                    shadowColor: Platform.OS === 'web' ? 'transparent' : colors.accent,
                                    shadowOpacity: 0.8,
                                    shadowRadius: 15
                                })
                        }]} />
                    </BlurView>
                </View>

                {/* Text Content */}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>EventSphere</Text>
                    <ExpoGradient
                        colors={[colors.primary, colors.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.titleUnderline}
                    />
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Experience campus life like never before. Discover, connect, and celebrate in style.
                    </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { shadowColor: Platform.OS === 'web' ? 'transparent' : colors.primary }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Signup')}
                    >
                        <ExpoGradient
                            colors={[colors.primary, colors.primaryLight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.buttonContent}>
                            <Text style={styles.primaryButtonText}>Get Started</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Already a member? <Text style={{ color: colors.primary }}>Log In</Text></Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Crafted for the next generation of campus leaders.
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
        top: -height * 0.15,
        left: -width * 0.2,
        width: width * 1.2,
        height: width * 1.2,
    },
    orbBottom: {
        bottom: -height * 0.2,
        right: -width * 0.2,
        width: width,
        height: width,
    },
    orbCenter: {
        top: height * 0.3,
        left: width * 0.1,
        width: 300,
        height: 300,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    logoContainer: { marginBottom: 64, alignItems: 'center' },
    glassPanel: {
        width: 160,
        height: 160,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        elevation: 10,
    },
    innerGlow: { ...StyleSheet.absoluteFillObject },
    iconShadow: {
        ...(Platform.OS === 'web'
            ? { textShadow: '0 12px 25px rgba(19, 91, 236, 0.4)' }
            : {
                textShadowColor: 'rgba(19, 91, 236, 0.4)',
                textShadowOffset: { width: 0, height: 12 },
                textShadowRadius: 25,
            })
    },
    decorativeDot: {
        position: 'absolute',
        top: 24,
        right: 24,
        width: 14,
        height: 14,
        borderRadius: 7,
        elevation: 10,
    },
    textContainer: { alignItems: 'center', marginBottom: 64 },
    title: {
        fontSize: 52,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -2,
    },
    titleUnderline: {
        width: 80,
        height: 6,
        borderRadius: 3,
        marginBottom: 28,
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 28,
        opacity: 0.9,
        fontWeight: '500',
        paddingHorizontal: 10,
    },
    actionContainer: { width: '100%', gap: 16, maxWidth: 340 },
    primaryButton: {
        height: 68,
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { boxShadow: '0 8px 15px rgba(0,0,0,0.3)' },
            default: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
            }
        })
    },
    buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    primaryButtonText: { color: 'white', fontSize: 19, fontWeight: 'bold', letterSpacing: 0.5 },
    secondaryButton: { height: 64, borderRadius: 24, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    secondaryButtonText: { fontSize: 16, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    footerText: { fontSize: 13, textAlign: 'center', opacity: 0.5, fontWeight: '600', letterSpacing: 0.3 },
});
