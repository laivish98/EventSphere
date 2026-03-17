import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Dimensions, Alert, Platform, Linking
} from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import * as RazorpayConfig from '../config/razorpayConfig';

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
    const [debugCount, setDebugCount] = useState(0);
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    const handleDebugTrigger = () => {
        // Debug trigger removed for production
    };

    useEffect(() => {
        // Load Razorpay Script for Web
        if (Platform.OS === 'web') {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
            return () => {
                const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
                if (existingScript) document.body.removeChild(existingScript);
            };
        }
    }, []);

    const handlePay = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to partner with EventSphere.');
            navigation.navigate('Login');
            return;
        }

        if (!companyName.trim() || !contactEmail.trim()) {
            Alert.alert('Missing Info', 'Please fill in your company name and contact email.');
            return;
        }

        if (!event?.id) {
            Alert.alert('Error', 'Invalid event data. Please go back and try again.');
            return;
        }

        // Refined check for event.createdBy
        if (!event.createdBy || typeof event.createdBy !== 'string' || event.createdBy.trim() === '') {
            Alert.alert('Error', 'Event organizer information is missing or invalid. Please contact support.');
            return;
        }

        // Robust number parsing
        const rawAmount = String(event.sponsorshipAmount || '0').replace(/[^0-9.]/g, '');
        const amount = parseFloat(rawAmount) || 0;

        if (amount <= 0) {
            await finalizeRegistration('FREE');
            return;
        }

        if (!RazorpayConfig.RAZORPAY_KEY_ID) {
            Alert.alert('Gateway Error', 'The payment gateway is not configured properly.');
            return;
        }

        // MOBILE BROWSER GESTURE OPTIMIZATION: 
        // We set loading immediately and check script status.
        // If script is missing on web, we load it and wait.
        if (Platform.OS === 'web' && typeof window.Razorpay === 'undefined') {
            setLoading(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
            Alert.alert('Loading Gateway', 'Preparing secure checkout... Please click PAY again in 3 seconds.');
            setLoading(false);
            return;
        }

        setLoading(true);

        // Safety timeout
        const safetyRetry = setTimeout(() => {
            if (loading) {
                setLoading(false);
                console.warn("Safety timeout triggered: Loading state reset");
                Alert.alert('Gateway Unresponsive', 'If the payment window didn\'t open, please check if your browser blocked a pop-up.');
            }
        }, 12000);

        try {
            const { RAZORPAY_KEY_ID, RAZORPAY_MERCHANT_NAME, RAZORPAY_THEME_COLOR, CURRENCY_MULTIPLIER } = RazorpayConfig;

            if (Platform.OS === 'web') {
                const options = {
                    key: RAZORPAY_KEY_ID,
                    amount: Math.round(amount * CURRENCY_MULTIPLIER),
                    currency: 'INR',
                    name: RAZORPAY_MERCHANT_NAME,
                    description: `Sponsorship for ${event.title}`,
                    handler: async function (response) {
                        clearTimeout(safetyRetry);
                        await finalizeRegistration(response.razorpay_payment_id);
                    },
                    prefill: {
                        name: companyName,
                        email: contactEmail,
                    },
                    notes: {
                        event_id: event.id,
                        type: 'sponsorship'
                    },
                    theme: { color: RAZORPAY_THEME_COLOR },
                    modal: {
                        ondismiss: function () {
                            clearTimeout(safetyRetry);
                            setLoading(false);
                        },
                        escape: true,
                        backdropclose: false
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    clearTimeout(safetyRetry);
                    Alert.alert('Payment Failed', response.error.description || 'Transaction cancelled.');
                    setLoading(false);
                });
                rzp.open();
            } else {
                // Mobile native Implementation
                const RazorpayCheckoutModule = require('react-native-razorpay');
                const RazorpayCheckout = RazorpayCheckoutModule.default || RazorpayCheckoutModule;

                const options = {
                    description: `Sponsorship for ${event.title}`,
                    image: event.imageUrl || event.image,
                    currency: 'INR',
                    key: RAZORPAY_KEY_ID,
                    amount: Math.round(amount * CURRENCY_MULTIPLIER),
                    name: RAZORPAY_MERCHANT_NAME,
                    prefill: {
                        email: contactEmail,
                        contact: '9988776655',
                        name: companyName
                    },
                    theme: { color: RAZORPAY_THEME_COLOR }
                };

                RazorpayCheckout.open(options).then(async (data) => {
                    clearTimeout(safetyRetry);
                    await finalizeRegistration(data.razorpay_payment_id);
                }).catch((error) => {
                    clearTimeout(safetyRetry);
                    if (error.code === 2) {
                        setLoading(false);
                        return;
                    }
                    Alert.alert('Payment Failed', error.description || 'Transaction failed.');
                    setLoading(false);
                });
            }
        } catch (error) {
            clearTimeout(safetyRetry);
            Alert.alert('Initialization Error', error.message || 'Check your internet connection');
            setLoading(false);
        }
    };

    const finalizeRegistration = async (paymentId) => {
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
                paymentId: paymentId,
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
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            {/* Cinematic Background Elements */}
            <View style={StyleSheet.absoluteFill}>
                <ExpoGradient
                    colors={isDarkMode ? ['#0f172a', '#1e1b4b', '#000000'] : ['#f8fafc', '#e2e8f0', '#cbd5e1']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.bgOrb, styles.orb1, { backgroundColor: colors.primaryGlow }]} />
                <View style={[styles.bgOrb, styles.orb2, { backgroundColor: (colors.secondaryGlow || '#8b5cf630') }]} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
            >
                {/* Refined Header */}
                <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDarkMode ? 'dark' : 'light'} style={styles.headerGlass}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Partner Program</Text>
                        <View style={{ width: 44 }} />
                    </View>
                </BlurView>

                {/* Event Context Card */}
                <View style={styles.heroSection}>
                    <ExpoGradient
                        colors={[colors.primary, (colors.iridescent || '#6366f1')]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.amountHero}
                    >
                        <View style={styles.amountHeroInner}>
                            <Text style={styles.heroLabel}>Exclusive Sponsorship</Text>
                            <Text style={styles.heroAmount}>₹{event.sponsorshipAmount || '0'}</Text>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '20px', gap: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <MaterialCommunityIcons name="calendar-check" size={14} color="white" />
                                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>{event.title}</Text>
                            </div>
                        </View>
                    </ExpoGradient>
                </View>

                <View style={styles.formPadding}>
                    {/* Brand Identity Panel */}
                    <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={[styles.formPanel, { borderColor: colors.glassBorder }]}>
                        <View style={styles.panelHeader}>
                            <MaterialCommunityIcons name="briefcase-variant-outline" size={20} color={colors.primary} />
                            <Text style={[styles.panelTitle, { color: colors.text }]}>Brand Identity</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>COMPANY LEGAL NAME</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="e.g. Nexus Dynamics"
                                    placeholderTextColor={colors.textSecondary}
                                    value={companyName}
                                    onChangeText={setCompanyName}
                                    selectionColor={colors.primary}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>LOGO ASSET URL (PNG/JPG)</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="https://brand.com/logo.png"
                                    placeholderTextColor={colors.textSecondary}
                                    value={logoUrl}
                                    onChangeText={setLogoUrl}
                                    selectionColor={colors.primary}
                                />
                            </View>
                        </View>
                    </BlurView>

                    {/* Partnership Details Panel */}
                    <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={[styles.formPanel, { borderColor: colors.glassBorder }]}>
                        <View style={styles.panelHeader}>
                            <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.primary} />
                            <Text style={[styles.panelTitle, { color: colors.text }]}>Collaboration Note</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PROMOTIONAL MESSAGE</Text>
                            <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, styles.textArea, { color: colors.text }]}
                                    placeholder="Briefly describe your brand goals for this event..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={details}
                                    onChangeText={setDetails}
                                    multiline
                                    numberOfLines={4}
                                    selectionColor={colors.primary}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PARTNERSHIP CONTACT EMAIL</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="partners@brand.com"
                                    placeholderTextColor={colors.textSecondary}
                                    value={contactEmail}
                                    onChangeText={setContactEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    selectionColor={colors.primary}
                                />
                            </View>
                        </View>
                    </BlurView>

                    {/* Quality Assurance */}
                    <View style={styles.trustFooter}>
                        <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.trustText, { color: colors.textSecondary }]}>Verified Partnership via EventSphere Secure Gateway</Text>
                    </View>
                </View>

                {/* Space for sticky bar */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Premium Sticky Footer */}
            <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={[styles.stickyBar, { borderTopColor: colors.glassBorder }]}>
                <View style={styles.stickyBarInner}>
                    <View>
                        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>COMMITMENT</Text>
                        <Text style={[styles.totalValue, { color: colors.text }]}>₹{(event.sponsorshipAmount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.secureBadge, { backgroundColor: isDarkMode ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)' }]}>
                        <MaterialCommunityIcons name="lock-outline" size={14} color="#10b981" />
                        <Text style={styles.secureBadgeText}>SECURE</Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handlePay}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    <ExpoGradient
                        colors={[colors.primary, (colors.iridescent || '#6366f1')]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.premiumPayBtn, loading && { opacity: 0.7 }]}
                    >
                        {loading ? (
                            <Text style={styles.payButtonText}>Securing Assets...</Text>
                        ) : (
                            <>
                                <Text style={styles.payButtonText}>Finalize Partnership</Text>
                                <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
                            </>
                        )}
                    </ExpoGradient>
                </TouchableOpacity>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgOrb: {
        position: 'absolute',
        width: width * 1.2,
        height: width * 1.2,
        borderRadius: width * 0.6,
        opacity: 0.15,
    },
    orb1: {
        top: -width * 0.4,
        right: -width * 0.4,
    },
    orb2: {
        bottom: -width * 0.4,
        left: -width * 0.2,
    },
    scrollContent: {
        paddingBottom: 150,
    },
    headerGlass: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        zIndex: 100,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        zIndex: 10,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    heroSection: {
        padding: 20,
        paddingTop: 30,
    },
    amountHero: {
        borderRadius: 32,
        padding: 30,
        overflow: 'hidden',
        elevation: 10,
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(0,0,0,0.3)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            }
        })
    },
    amountHeroInner: {
        alignItems: 'center',
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    heroAmount: {
        color: 'white',
        fontSize: 48,
        fontWeight: 'bold',
        letterSpacing: -1,
        marginBottom: 20,
    },
    eventPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    eventPillText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    formPadding: {
        paddingHorizontal: 20,
        gap: 20,
    },
    formPanel: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    panelTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
        opacity: 0.8,
    },
    inputWrapper: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    input: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    textAreaWrapper: {
        minHeight: 120,
    },
    textArea: {
        textAlignVertical: 'top',
        paddingTop: 16,
    },
    trustFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
        opacity: 0.6,
    },
    trustText: {
        fontSize: 12,
        fontWeight: '600',
    },
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        paddingTop: 20,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        gap: 20,
    },
    stickyBarInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 26,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    secureBadgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#10b981',
        letterSpacing: 0.5,
    },
    premiumPayBtn: {
        height: 64,
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        elevation: 10,
        ...Platform.select({
            web: { boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)' },
            default: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
            }
        })
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.2,
    },
});
