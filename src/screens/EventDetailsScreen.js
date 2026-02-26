import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Image, Dimensions, Share, Platform, Alert, Modal, TextInput, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import EventMap from '../components/EventMap';
import { useTheme } from '../context/ThemeContext';
import { doc, getDoc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen({ route, navigation }) {
    const { event } = route.params;
    const { colors, isDarkMode } = useTheme();
    const { user, userData } = useAuth();
    const [isRegistered, setIsRegistered] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [organizer, setOrganizer] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (user && event.participants) {
            setIsRegistered(event.participants.includes(user.uid));
        }
        fetchOrganizer();
        checkFollowStatus();

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
    }, [user, event.participants]);

    const fetchOrganizer = async () => {
        try {
            const orgDoc = await getDoc(doc(db, 'users', event.createdBy));
            if (orgDoc.exists()) {
                setOrganizer(orgDoc.data());
            }
        } catch (error) {
            console.error('Error fetching organizer:', error);
        }
    };

    const checkFollowStatus = async () => {
        if (!user || !event.createdBy) return;
        try {
            const q = query(
                collection(db, 'follows'),
                where('followerId', '==', user.uid),
                where('organizerId', '==', event.createdBy)
            );
            const snap = await getDocs(q);
            setIsFollowing(!snap.empty);
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const handleFollow = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to follow creators.');
            navigation.navigate('Login');
            return;
        }

        if (user.uid === event.createdBy) {
            Alert.alert('Notice', 'You cannot follow yourself.');
            return;
        }

        setFollowLoading(true);
        try {
            if (isFollowing) {
                // Unfollow
                const q = query(
                    collection(db, 'follows'),
                    where('followerId', '==', user.uid),
                    where('organizerId', '==', event.createdBy)
                );
                const snap = await getDocs(q);
                snap.forEach(async (d) => {
                    await deleteDoc(doc(db, 'follows', d.id));
                });
                setIsFollowing(false);
            } else {
                // Follow
                await addDoc(collection(db, 'follows'), {
                    followerId: user.uid,
                    organizerId: event.createdBy,
                    timestamp: serverTimestamp()
                });
                setIsFollowing(true);
            }
        } catch (error) {
            Alert.alert('Follow Action Failed', error.message);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to register for events.');
            navigation.navigate('Login');
            return;
        }

        if (isRegistered) {
            Alert.alert('Already Registered', 'You are already registered for this event.');
            return;
        }

        // Robust price parsing (remove non-numeric chars except decimal)
        const priceString = String(event.price || '0').replace(/[^0-9.]/g, '');
        const price = parseFloat(priceString) || 0;

        if (price > 0) {
            // Handle Paid Registration
            try {
                if (Platform.OS === 'web') {
                    // Web Implementation
                    const { RAZORPAY_KEY_ID, RAZORPAY_MERCHANT_NAME, RAZORPAY_THEME_COLOR, CURRENCY_MULTIPLIER } = require('../config/razorpayConfig');

                    if (typeof window.Razorpay === 'undefined') {
                        Alert.alert('Error', 'Razorpay script not loaded. Please refresh and try again.');
                        return;
                    }

                    const options = {
                        key: RAZORPAY_KEY_ID,
                        amount: Math.round(price * CURRENCY_MULTIPLIER),
                        currency: 'INR',
                        name: RAZORPAY_MERCHANT_NAME,
                        description: `Registration for ${event.title}`,
                        image: event.imageUrl || event.image,
                        handler: async function (response) {
                            await finalizeRegistration(response.razorpay_payment_id);
                        },
                        prefill: {
                            name: userData?.name || user.displayName || '',
                            email: user.email,
                            contact: '9988776655' // A different test number
                        },
                        notes: {
                            registration_for: event.title,
                            event_id: event.id
                        },
                        theme: {
                            color: RAZORPAY_THEME_COLOR
                        },
                        retry: {
                            enabled: true,
                            max_count: 3
                        }
                    };

                    const rzp = new window.Razorpay(options);
                    rzp.on('payment.failed', function (response) {
                        Alert.alert('Payment Failed', response.error.description);
                    });
                    rzp.open();
                } else {
                    // Native Implementation
                    const RazorpayCheckoutModule = require('react-native-razorpay');
                    const RazorpayCheckout = RazorpayCheckoutModule.default || RazorpayCheckoutModule;

                    const { RAZORPAY_KEY_ID, RAZORPAY_MERCHANT_NAME, RAZORPAY_THEME_COLOR, CURRENCY_MULTIPLIER } = require('../config/razorpayConfig');

                    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
                        console.error('Razorpay native module not found');
                        Alert.alert(
                            'Payment Error',
                            'Razorpay SDK is not available in this environment. If you are using Expo Go, please use a Development Build.'
                        );
                        return;
                    }

                    const options = {
                        description: `Registration for ${event.title}`,
                        image: event.imageUrl || event.image,
                        currency: 'INR',
                        key: RAZORPAY_KEY_ID,
                        amount: Math.round(price * CURRENCY_MULTIPLIER),
                        name: RAZORPAY_MERCHANT_NAME,
                        prefill: {
                            email: user.email,
                            contact: '9988776655', // A different test number
                            name: userData?.name || user.displayName || ''
                        },
                        theme: { color: RAZORPAY_THEME_COLOR },
                        retry: {
                            enabled: true,
                            max_count: 3
                        },
                        notes: {
                            event_id: event.id
                        }
                    };

                    RazorpayCheckout.open(options).then(async (data) => {
                        await finalizeRegistration(data.razorpay_payment_id);
                    }).catch((error) => {
                        console.error('Razorpay Error:', error);
                        Alert.alert('Payment Failed', error.description || 'The transaction was cancelled or failed.');
                    });
                }
            } catch (error) {
                console.error('Payment Initialization Error:', error);
                Alert.alert('Error', 'Could not initialize payment. Please try again.');
            }
        } else {
            // Free registration
            await finalizeRegistration('FREE');
        }
    };

    const finalizeRegistration = async (paymentId) => {
        setRegistering(true);
        try {
            // 1. Update event document
            const eventRef = doc(db, 'events', event.id);
            await updateDoc(eventRef, {
                participants: arrayUnion(user.uid),
                currentParticipants: (event.currentParticipants || 0) + 1
            });

            // 2. Create a specific registration document for TicketScreen/Organizer Dashboard
            await addDoc(collection(db, 'registrations'), {
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventVenue: event.venue,
                eventImage: event.imageUrl || event.image,
                userId: user.uid,
                userName: userData?.name || user.displayName || 'Attendee',
                ticketPrice: event.price || 0,
                paymentId: paymentId,
                paymentStatus: paymentId === 'FREE' ? 'N/A' : 'COMPLETED',
                utilized: false, // For check-in
                timestamp: serverTimestamp()
            });

            // 3. Update user's registered events for profile tracking
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                registeredEvents: arrayUnion(event.id)
            });

            setIsRegistered(true);
            Alert.alert('Success ✨', paymentId === 'FREE' ? 'You are registered!' : 'Payment successful! You are going! View your ticket in the Tickets tab.');
        } catch (error) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setRegistering(false);
        }
    };


    const onShare = async () => {
        try {
            const eventVenue = event.venue || event.location;
            const eventUrl = `https://event-sphere-delta.vercel.app/event/${event.id}`;

            await Share.share({
                title: event.title,
                message: `Check out ${event.title} at ${eventVenue} on EventSphere!\n\nView here: ${eventUrl}`,
                url: eventUrl // url field is supported on some platforms (iOS)
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const openMaps = () => {
        const eventVenue = event.venue || event.location;
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(eventVenue)}`,
            android: `geo:0,0?q=${encodeURIComponent(eventVenue)}`,
            web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventVenue)}`,
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Google Maps/Apple Maps is not installed on your device.');
            }
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style="light" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Image */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: event.imageUrl || event.image }} style={styles.image} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.imageOverlay}
                    />

                    {/* Header Overlay */}
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={[styles.roundButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                        >
                            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                            <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            <TouchableOpacity style={[styles.roundButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={onShare}>
                                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                                <MaterialCommunityIcons name="share-variant" size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.roundButton, { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                                <MaterialCommunityIcons name="heart-outline" size={22} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Info */}
                    <View style={styles.quickInfoContainer}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{event.category}</Text>
                        </View>
                        <Text style={styles.title}>{event.title}</Text>
                        <View style={styles.locationContainer}>
                            <MaterialCommunityIcons name="map-marker" size={16} color="#94a3b8" />
                            <Text style={styles.locationText}>{event.venue || event.location}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    {/* Basic Info Cards */}
                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(19, 91, 236, 0.1)' }]}>
                                <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date & Time</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{event.date}</Text>
                            </View>
                        </View>

                        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <MaterialCommunityIcons name="cash" size={24} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Price</Text>
                                <Text style={[styles.infoValue, { color: event.price > 0 ? '#10b981' : colors.primary }]}>
                                    {event.price > 0 ? `₹${event.price}` : 'FREE'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Additional Info (Department) */}
                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                <MaterialCommunityIcons name="office-building" size={24} color="#f59e0b" />
                            </View>
                            <View>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Department</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{event.department || 'General'}</Text>
                            </View>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                                <MaterialCommunityIcons name="account-group" size={24} color="#8b5cf6" />
                            </View>
                            <View>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Capacity</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{(event.capacity || 'Unlimited')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Organizer Section */}
                    {organizer && (
                        <View style={styles.organizerCard}>
                            <View style={styles.organizerInfo}>
                                <Image source={{ uri: organizer.avatarUrl || 'https://via.placeholder.com/150' }} style={styles.organizerAvatar} />
                                <View style={styles.organizerDetails}>
                                    <Text style={[styles.organizerName, { color: colors.text }]}>{organizer.name}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                                            <Text style={[styles.roleText, { color: colors.primary }]}>{organizer.role === 'admin' ? 'Event Organizer' : 'Student Pro'}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.followButton,
                                    { borderColor: colors.primary },
                                    isFollowing && { backgroundColor: colors.primary }
                                ]}
                                onPress={handleFollow}
                                disabled={followLoading}
                            >
                                <Text style={[
                                    styles.followButtonText,
                                    { color: isFollowing ? 'white' : colors.primary }
                                ]}>
                                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>About Event</Text>
                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            {event.description}
                        </Text>
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
                            <TouchableOpacity onPress={openMaps}>
                                <Text style={[styles.sponsorAction, { color: colors.primary }]}>Get Directions</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.mapWrapper, { borderColor: colors.border }]}>
                            <EventMap
                                event={event}
                                openMaps={openMaps}
                                colors={colors}
                            />
                        </View>
                        <View style={styles.venueInfoRow}>
                            <MaterialCommunityIcons name="map-marker-radius" size={20} color={colors.primary} />
                            <Text style={[styles.venueText, { color: colors.text }]}>{event.venue || event.location}</Text>
                        </View>
                    </View>

                    {/* Sponsors Section */}
                    {event.acceptsSponsorship && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Partners</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('SponsorRegistration', { event })}>
                                    <Text style={[styles.sponsorAction, { color: colors.primary }]}>Sponsor Now</Text>
                                </TouchableOpacity>
                            </View>
                            {event.sponsors && event.sponsors.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sponsorScroll}>
                                    {event.sponsors.map((sponsor, index) => (
                                        <View key={index} style={styles.sponsorItem}>
                                            <View style={[styles.sponsorCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <Image source={{ uri: sponsor.logo }} style={styles.sponsorLogoFull} />
                                            </View>
                                            <Text style={[styles.sponsorName, { color: colors.textSecondary }]} numberOfLines={1}>{sponsor.name}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <View style={[styles.sponsorPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <MaterialCommunityIcons name="star-face" size={32} color={colors.textSecondary} />
                                    <Text style={[styles.sponsorPlaceholderText, { color: colors.textSecondary }]}>Be the first to partner with us!</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Bottom Register Action */}
            <View style={[styles.bottomNav, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <View>
                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Registration Fee</Text>
                    <Text style={[styles.finalPrice, { color: event.price > 0 ? colors.text : '#10b981' }]}>
                        {event.price > 0 ? `₹${event.price}` : 'FREE'}
                    </Text>
                </View>
                <View style={styles.actionButtons}>
                    {user?.uid === event.createdBy ? (
                        <TouchableOpacity
                            style={[styles.manageButton, { backgroundColor: colors.primary }]}
                            onPress={() => navigation.navigate('OrganizerDashboard')}
                        >
                            <MaterialCommunityIcons name="view-dashboard" size={20} color="white" />
                            <Text style={styles.registerButtonText}>Manage</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.registerButton, { backgroundColor: isRegistered ? '#10b981' : colors.primary }]}
                            onPress={handleRegister}
                            disabled={registering || isRegistered}
                        >
                            <Text style={styles.registerButtonText}>
                                {registering ? 'Processing...' : isRegistered ? 'Registered' : 'Register Now'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    imageContainer: { width: '100%', height: 400 },
    image: { width: '100%', height: '100%' },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    headerOverlay: { position: 'absolute', top: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
    roundButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    headerActions: { flexDirection: 'row' },
    quickInfoContainer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
    categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#135bec', marginBottom: 12 },
    categoryText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    title: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    locationText: { color: '#e2e8f0', fontSize: 16, marginLeft: 6 },
    contentContainer: { paddingHorizontal: 24, marginTop: -30, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingTop: 36 },
    infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 30 },
    infoCard: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: 'bold' },
    organizerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(19, 91, 236, 0.05)', borderRadius: 20, marginBottom: 30 },
    organizerInfo: { flexDirection: 'row', alignItems: 'center' },
    organizerAvatar: { width: 50, height: 50, borderRadius: 25 },
    organizerDetails: { marginLeft: 12 },
    organizerName: { fontSize: 16, fontWeight: '700' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    roleText: { fontSize: 10, fontWeight: 'bold' },
    followButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    followButtonText: { fontSize: 13, fontWeight: 'bold' },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    description: { fontSize: 15, lineHeight: 24 },
    mapWrapper: { width: '100%', height: 200, borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginTop: 8 },
    map: { ...StyleSheet.absoluteFillObject },
    mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    venueInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8, paddingHorizontal: 4 },
    venueText: { fontSize: 14, fontWeight: '600' },
    mapText: { marginTop: 12, fontSize: 14 },
    sponsorScroll: { gap: 16, paddingRight: 24 },
    sponsorCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 20, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    priceLabel: { fontSize: 12, fontWeight: 'bold' },
    finalPrice: { fontSize: 24, fontWeight: 'bold' },
    actionButtons: { flexDirection: 'row', gap: 12 },
    manageButton: { paddingHorizontal: 24, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    registerButton: { paddingHorizontal: 32, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    registerButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    sponsorAction: { fontSize: 14, fontWeight: 'bold' },
    sponsorItem: { alignItems: 'center', width: 80, marginRight: 16 },
    sponsorLogoFull: { width: '100%', height: '100%', borderRadius: 32 },
    sponsorName: { fontSize: 10, marginTop: 4, textAlign: 'center' },
    sponsorPlaceholder: { width: '100%', height: 100, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
    sponsorPlaceholderText: { fontSize: 13, fontWeight: '500' },
});
