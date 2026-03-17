import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function AboutScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();

    const FeatureItem = ({ icon, title, description }) => (
        <View style={styles.featureItem}>
            <LinearGradient
                colors={[colors.primary + '15', colors.primary + '05']}
                style={styles.iconContainer}
            >
                <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
            </LinearGradient>
            <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{description}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>ABOUT US</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={[styles.logoOuter, { borderColor: colors.primary + '20' }]}>
                        <LinearGradient
                            colors={[colors.primary, colors.primary + '80']}
                            style={styles.logoGradient}
                        >
                            <MaterialCommunityIcons name="ticket-confirmation" size={50} color="white" />
                        </LinearGradient>
                    </View>
                    <Text style={[styles.appName, { color: colors.text }]}>EventSphere</Text>
                    <View style={[styles.versionBadge, { backgroundColor: colors.primary + '10' }]}>
                        <Text style={[styles.versionText, { color: colors.primary }]}>VERSION 1.0.0</Text>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.primary }]}>Our Mission</Text>
                    <Text style={[styles.cardBody, { color: colors.text }]}>
                        EventSphere is a premium campus life manager designed to bridge the gap between students and organizers.
                        We believe that campus events are the heart of university life, and our goal is to make discovery,
                        participation, and hosting as seamless as possible.
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>KEY FEATURES</Text>
                <View style={styles.featuresList}>
                    <FeatureItem
                        icon="magnify"
                        title="Smart Discovery"
                        description="Find events tailored to your interests and department instantly."
                    />
                    <FeatureItem
                        icon="qrcode-scan"
                        title="Digital Ticketing"
                        description="Seamless entry with secure QR codes and real-time validation."
                    />
                    <FeatureItem
                        icon="chat-processing"
                        title="Live Communities"
                        description="Connect with other participants in dedicated event chat rooms."
                    />
                    <FeatureItem
                        icon="certificate"
                        title="Verified Achievements"
                        description="Earn digitally signed certificates for your participation."
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>Made with ❤️ for Campus Communities</Text>
                    <Text style={[styles.copyright, { color: colors.textSecondary }]}>© 2026 EventSphere Platform</Text>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 24 },
    headerTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 60 },
    heroSection: { alignItems: 'center', marginVertical: 32 },
    logoOuter: { padding: 14, borderRadius: 44, borderWidth: 2, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    logoGradient: { width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    appName: { fontSize: 36, fontWeight: 'bold', letterSpacing: -1.5, marginBottom: 8 },
    versionBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
    versionText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    card: { padding: 28, borderRadius: 32, borderWidth: 1.5, marginBottom: 40, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15 },
    cardTitle: { fontSize: 12, fontWeight: '900', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' },
    cardBody: { fontSize: 16, lineHeight: 26, opacity: 0.8, fontWeight: '500' },
    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 32, marginLeft: 8 },
    featuresList: { gap: 32 },
    featureItem: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 20 },
    featureText: { flex: 1 },
    featureTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
    featureDesc: { fontSize: 14, lineHeight: 20, opacity: 0.7 },
    footer: { marginTop: 80, alignItems: 'center' },
    footerText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    copyright: { fontSize: 12, marginTop: 10, opacity: 0.4, letterSpacing: 1 }
});
