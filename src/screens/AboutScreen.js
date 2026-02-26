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
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
            </View>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>About EventSphere</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={[colors.primary, colors.primary + '80']}
                        style={styles.logoGradient}
                    >
                        <MaterialCommunityIcons name="ticket-confirmation" size={50} color="white" />
                    </LinearGradient>
                    <Text style={[styles.appName, { color: colors.text }]}>EventSphere</Text>
                    <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    backBtn: { padding: 4 },
    scrollContent: { paddingHorizontal: 24 },
    heroSection: { alignItems: 'center', marginVertical: 32 },
    logoGradient: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    appName: { fontSize: 28, fontWeight: 'bold', letterSpacing: 1 },
    version: { fontSize: 14, marginTop: 4, fontWeight: '500' },
    card: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 32 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    cardBody: { fontSize: 15, lineHeight: 24, opacity: 0.9 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 20, marginLeft: 4 },
    featuresList: { gap: 24 },
    featureItem: { flexDirection: 'row', alignItems: 'flex-start' },
    iconContainer: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    featureText: { flex: 1 },
    featureTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    featureDesc: { fontSize: 13, lineHeight: 18 },
    footer: { marginTop: 48, alignItems: 'center', paddingBottom: 20 },
    footerText: { fontSize: 14, fontWeight: '600' },
    copyright: { fontSize: 12, marginTop: 8, opacity: 0.6 }
});
