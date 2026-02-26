import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Dimensions, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function SponsorRegistrationScreen({ route, navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { event } = route.params;
    const { user, userData } = useAuth();

    const [companyName, setCompanyName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [details, setDetails] = useState('');
    const [contactEmail, setContactEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        if (!companyName.trim() || !contactEmail.trim()) {
            Alert.alert('Missing Info', 'Please fill in your company name and contact email.');
            return;
        }
        setLoading(true);
        // Simulate payment delay
        setTimeout(async () => {
            try {
                // 1. Create the sponsorship record
                const sponsorDoc = {
                    eventId: event.id,
                    eventTitle: event.title,
                    sponsorId: user.uid,
                    sponsorName: companyName,
                    sponsorEmail: contactEmail,
                    sponsorLogo: logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=random&color=fff`,
                    sponsorDetails: details,
                    amount: event.sponsorshipAmount || 0,
                    timestamp: serverTimestamp(),
                };

                await addDoc(collection(db, 'sponsorships'), sponsorDoc);

                // 2. Link the sponsor to the event document for display in EventDetails
                const eventRef = doc(db, 'events', event.id);
                await updateDoc(eventRef, {
                    sponsors: arrayUnion({
                        name: companyName,
                        logo: sponsorDoc.sponsorLogo,
                        id: user.uid
                    })
                });

                Alert.alert(
                    '🎉 Sponsorship Confirmed!',
                    `Thank you, ${companyName}! Your sponsorship of ₹${(event.sponsorshipAmount || 0).toLocaleString()} for ${event.title} has been registered.`,
                    [{ text: 'Done', onPress: () => navigation.navigate('Home') }]
                );
            } catch (error) {
                console.error("Sponsorship error:", error);
                Alert.alert('Error', error.message);
            } finally {
                setLoading(false);
            }
        }, 1500);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Top App Bar */}
            <View style={[styles.appBar, { backgroundColor: isDarkMode ? 'rgba(16, 22, 34, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderBottomColor: colors.border }]}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? "white" : colors.text} />
                </TouchableOpacity>
                <Text style={[styles.appBarTitle, { color: colors.text }]}>Partner with EventSphere</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.headerSection}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Sponsor "{event.title}"</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Directly support this event and get your brand featured in front of the community.
                    </Text>
                </View>

                {/* Event Sponsor Info */}
                <View style={[styles.amountCard, { borderColor: isDarkMode ? 'rgba(19, 91, 236, 0.3)' : colors.border }]}>
                    <LinearGradient
                        colors={isDarkMode ? ['rgba(19, 91, 236, 0.15)', 'rgba(25, 33, 51, 0.5)'] : ['rgba(19, 91, 236, 0.05)', colors.surface]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.amountRow}>
                        <View>
                            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>SPONSORSHIP AMOUNT</Text>
                            <Text style={[styles.amountValue, { color: colors.text }]}>₹{(event.sponsorshipAmount || 0).toLocaleString()}</Text>
                        </View>
                        <View style={[styles.eventBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="star-outline" size={24} color={colors.primary} />
                        </View>
                    </View>
                    <Text style={[styles.amountHint, { color: colors.textSecondary }]}>One-time sponsorship for the selected event. Get premium visibility.</Text>
                </View>

                {/* Registration Form */}
                <View style={styles.formSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sponsor Details</Text>

                    {/* Company Name */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>BRAND / COMPANY NAME</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. Acme Corp"
                            placeholderTextColor={colors.textSecondary}
                            value={companyName}
                            onChangeText={setCompanyName}
                            selectionColor={colors.primary}
                        />
                    </View>

                    {/* Logo URL */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>LOGO IMAGE URL</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder="https://example.com/logo.png"
                            placeholderTextColor={colors.textSecondary}
                            value={logoUrl}
                            onChangeText={setLogoUrl}
                            selectionColor={colors.primary}
                        />
                    </View>

                    {/* Details */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SPONSORSHIP DETAILS / MESSAGE</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, height: 100, textAlignVertical: 'top' }]}
                            placeholder="Tell us about your brand and what you'd like to promote..."
                            placeholderTextColor={colors.textSecondary}
                            value={details}
                            onChangeText={setDetails}
                            multiline
                            selectionColor={colors.primary}
                        />
                    </View>

                    {/* Contact Email */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CONTACT EMAIL</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                            placeholder="sponsor@company.com"
                            placeholderTextColor={colors.textSecondary}
                            value={contactEmail}
                            onChangeText={setContactEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            selectionColor={colors.primary}
                        />
                    </View>
                </View>

                {/* Space for sticky bar */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Sticky Payment Bar */}
            <View style={[styles.stickyBar, { backgroundColor: isDarkMode ? 'rgba(16, 22, 34, 0.9)' : 'rgba(255, 255, 255, 0.95)', borderTopColor: colors.border }]}>
                <View style={styles.stickyBarInner}>
                    <View>
                        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>TOTAL</Text>
                        <Text style={[styles.totalValue, { color: colors.text }]}>₹{(event.sponsorshipAmount || 0).toLocaleString()}.00</Text>
                    </View>
                    <View style={[styles.secureChip, { backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.08)' : 'rgba(74, 222, 128, 0.1)', borderColor: 'rgba(74, 222, 128, 0.2)' }]}>
                        <MaterialCommunityIcons name="lock" size={12} color="#4ade80" />
                        <Text style={styles.secureText}>SECURE CHECKOUT</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                    onPress={handlePay}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <Text style={styles.payButtonText}>{loading ? 'Processing...' : 'Pay & Register'}</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 55,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appBarTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#9ca3af',
        lineHeight: 22,
    },
    metricsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 24,
        gap: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#1c2333',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        gap: 8,
    },
    metricIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metricLabel: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 26,
        fontWeight: 'bold',
        color: 'white',
    },
    amountCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(19, 91, 236, 0.3)',
        marginBottom: 24,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    amountLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#9ca3af',
        letterSpacing: 1,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    eventBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    amountHint: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
    },
    inputHint: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
        marginLeft: 4,
    },
    formSection: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 16,
    },
    uploadBox: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(75, 85, 99, 0.6)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#1c2333',
        gap: 8,
    },
    uploadIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(19, 91, 236, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    uploadTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    uploadHint: {
        fontSize: 12,
        color: '#6b7280',
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.8,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        gap: 14,
        overflow: 'hidden',
    },
    stickyBarInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.8,
    },
    totalValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    secureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(74, 222, 128, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(74, 222, 128, 0.2)',
    },
    secureText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#4ade80',
        letterSpacing: 0.5,
    },
    payButton: {
        height: 56,
        backgroundColor: '#135bec',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    payButtonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
});
