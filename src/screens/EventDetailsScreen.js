import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Image, Dimensions, Share, Platform, Alert, Modal, TextInput, Linking, KeyboardAvoidingView } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
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
    const { user, userData, getDefaultAvatar } = useAuth();
    const [isRegistered, setIsRegistered] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [organizer, setOrganizer] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showRegForm, setShowRegForm] = useState(false);
    const [regFormData, setRegFormData] = useState({
        name: '',
        email: '',
        contact: '',
        course: '',
        department: ''
    });

    useEffect(() => {
        if (user && event.participants) {
            setIsRegistered(event.participants.includes(user.uid));
        }
        if (user) {
            setRegFormData(prev => ({
                ...prev,
                name: userData?.name || user.displayName || '',
                email: user.email || ''
            }));
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
        if (!event.createdBy || typeof event.createdBy !== 'string' || event.createdBy.trim() === '') {
            setOrganizer({
                name: 'EventSphere Team',
                role: 'admin',
                avatarUrl: getDefaultAvatar('EventSphere', 'Male')
            });
            return;
        }

        // Handle dummy organizers from featured data
        if (event.createdBy.startsWith('dummy_')) {
            setOrganizer({
                name: 'Official Partner',
                role: 'admin',
                avatarUrl: getDefaultAvatar(event.category || 'Event', 'Male')
            });
            return;
        }

        try {
            const orgDoc = await getDoc(doc(db, 'users', event.createdBy));
            if (orgDoc.exists()) {
                setOrganizer(orgDoc.data());
            } else {
                setOrganizer({
                    name: 'Campus Organizer',
                    role: 'organizer',
                    avatarUrl: getDefaultAvatar('Campus Organizer', 'Male')
                });
            }
        } catch (error) {
            // Silently handle or fallback
        }
    };

    const checkFollowStatus = async () => {
        if (!user || !event.createdBy || typeof event.createdBy !== 'string' || event.createdBy.trim() === '') {
            return;
        }
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

        setShowRegForm(true);
    };

    const handleFormSubmit = async () => {
        if (!regFormData.name || !regFormData.email || !regFormData.contact || !regFormData.course || !regFormData.department) {
            Alert.alert('Required Fields', 'Please fill in all the details.');
            return;
        }

        setShowRegForm(false);
        proceedWithPayment();
    };

    const proceedWithPayment = async () => {

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
                            await finalizeRegistration(response.razorpay_payment_id, regFormData);
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
                        await finalizeRegistration(data.razorpay_payment_id, regFormData);
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
            await finalizeRegistration('FREE', regFormData);
        }
    };

    const finalizeRegistration = async (paymentId, studentData) => {
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
                certificateTemplateUrl: event.certificateTemplateUrl || null,
                userId: user.uid,
                userName: studentData.name || userData?.name || user.displayName || 'Attendee',
                userEmail: studentData.email || user.email || 'N/A',
                userContact: studentData.contact || 'N/A',
                userCourse: studentData.course || 'N/A',
                userDepartment: studentData.department || 'N/A',
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

            {/* Cinematic Background Elements for Content */}
            <View style={StyleSheet.absoluteFill}>
                <ExpoGradient
                    colors={isDarkMode ? ['#0f172a', '#1e1b4b', '#000000'] : ['#f8fafc', '#e2e8f0', '#cbd5e1']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={[styles.bgOrb, styles.orb1, { backgroundColor: colors.primaryGlow }]} />
                <View style={[styles.bgOrb, styles.orb2, { backgroundColor: (colors.secondaryGlow || '#8b5cf630') }]} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Immersive Hero Section */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: event.imageUrl || event.image }} style={styles.image} />
                    <ExpoGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.95)']}
                        locations={[0, 0.4, 1]}
                        style={styles.imageOverlay}
                    />

                    {/* Premium Header Overlay */}
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity
                            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
                            style={styles.premiumRoundBtn}
                        >
                            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                            <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.premiumRoundBtn} onPress={onShare}>
                                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                                <MaterialCommunityIcons name="share-variant" size={20} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.premiumRoundBtn, { marginLeft: 12 }]}>
                                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                                <MaterialCommunityIcons name="heart-outline" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hero Title & Context */}
                    <View style={styles.heroTextContent}>
                        <BlurView intensity={20} tint="light" style={styles.glassBadge}>
                            <Text style={styles.glassBadgeText}>{event.category}</Text>
                        </BlurView>
                        <Text style={styles.titleText}>{event.title}</Text>
                        <View style={styles.heroLocationRow}>
                            <View style={styles.locationIconGlow}>
                                <MaterialCommunityIcons name="map-marker-radius" size={18} color="#fff" />
                            </View>
                            <Text style={styles.heroLocationText}>{event.venue || event.location}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.dragIndicator} />


                    {/* Glass Info Cards */}
                    <View style={styles.infoGrid}>
                        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={[styles.premiumInfoCard, { borderColor: colors.glassBorder }]}>
                            <View style={[styles.premiumIconBox, { backgroundColor: colors.primary + '20' }]}>
                                <MaterialCommunityIcons name="calendar-multiselect" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.premiumInfoLabel, { color: colors.textSecondary }]}>SCHEDULE</Text>
                                <Text style={[styles.premiumInfoValue, { color: colors.text }]}>{event.date}</Text>
                            </View>
                        </BlurView>

                        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={[styles.premiumInfoCard, { borderColor: colors.glassBorder }]}>
                            <View style={[styles.premiumIconBox, { backgroundColor: '#10b98120' }]}>
                                <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color="#10b981" />
                            </View>
                            <View>
                                <Text style={[styles.premiumInfoLabel, { color: colors.textSecondary }]}>ENTRY FEE</Text>
                                <Text style={[styles.premiumInfoValue, { color: event.price > 0 ? colors.text : '#10b981' }]}>
                                    {event.price > 0 ? `₹${event.price}` : 'COMPLIMENTARY'}
                                </Text>
                            </View>
                        </BlurView>
                    </View>

                    <View style={styles.infoGrid}>
                        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={[styles.premiumInfoCard, { borderColor: colors.glassBorder }]}>
                            <View style={[styles.premiumIconBox, { backgroundColor: '#f59e0b20' }]}>
                                <MaterialCommunityIcons name="office-building-marker-outline" size={20} color="#f59e0b" />
                            </View>
                            <View>
                                <Text style={[styles.premiumInfoLabel, { color: colors.textSecondary }]}>DEPARTMENT</Text>
                                <Text style={[styles.premiumInfoValue, { color: colors.text }]}>{event.department || 'All Domains'}</Text>
                            </View>
                        </BlurView>

                        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={[styles.premiumInfoCard, { borderColor: colors.glassBorder }]}>
                            <View style={[styles.premiumIconBox, { backgroundColor: '#8b5cf620' }]}>
                                <MaterialCommunityIcons name="account-group-outline" size={20} color="#8b5cf6" />
                            </View>
                            <View>
                                <Text style={[styles.premiumInfoLabel, { color: colors.textSecondary }]}>CAPACITY</Text>
                                <Text style={[styles.premiumInfoValue, { color: colors.text }]}>{event.capacity || 'Open Access'}</Text>
                            </View>
                        </BlurView>
                    </View>


                    {/* Organizer Section */}
                    {organizer && (
                        <BlurView intensity={10} tint={isDarkMode ? 'dark' : 'light'} style={[styles.organizerPanel, { borderColor: colors.glassBorder }]}>
                            <View style={styles.organizerInfo}>
                                <View style={styles.avatarGlowContainer}>
                                    <Image
                                        source={{
                                            uri: (organizer.avatarUrl &&
                                                !organizer.avatarUrl.includes('iran.liara.run') &&
                                                !hasImageError)
                                                ? organizer.avatarUrl
                                                : getDefaultAvatar(organizer.name || 'Organizer', organizer.gender)
                                        }}
                                        style={styles.premiumAvatar}
                                        onError={() => setHasImageError(true)}
                                    />
                                    <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                                        <MaterialCommunityIcons name="check" size={10} color="white" />
                                    </View>
                                </View>
                                <View style={styles.organizerDetails}>
                                    <Text style={[styles.organizerName, { color: colors.text }]}>{organizer.name}</Text>
                                    <Text style={[styles.organizerRole, { color: colors.textSecondary }]}>
                                        {organizer.role === 'admin' ? 'Elite Organizer' : 'Campus Lead'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={handleFollow}
                                disabled={followLoading}
                            >
                                <ExpoGradient
                                    colors={isFollowing ? ['#4b5563', '#374151'] : [colors.primary, (colors.iridescent || '#6366f1')]}
                                    style={styles.premiumFollowBtn}
                                >
                                    <Text style={styles.followBtnText}>
                                        {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </ExpoGradient>
                            </TouchableOpacity>
                        </BlurView>
                    )}

                    {/* Description */}
                    <View style={styles.sectionArea}>
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>About the Event</Text>
                        <BlurView intensity={10} tint={isDarkMode ? 'dark' : 'light'} style={[styles.descriptionPanel, { borderColor: colors.glassBorder }]}>
                            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                                {event.description}
                            </Text>
                        </BlurView>
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
                                                <Image
                                                    source={{ uri: (sponsor.logo && sponsor.logo !== 'data:;base64,=') ? sponsor.logo : `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&background=random&color=fff` }}
                                                    style={styles.sponsorLogoFull}
                                                />
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

            {/* Premium Registration Modal */}
            <Modal
                visible={showRegForm}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRegForm(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={Platform.OS === 'ios' ? 30 : 100} tint="dark" style={StyleSheet.absoluteFill} />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalKeyboardAvoid}
                    >
                        <BlurView
                            intensity={40}
                            tint={isDarkMode ? 'dark' : 'light'}
                            style={[styles.modalSheet, { borderColor: colors.glassBorder }]}
                        >
                            <View style={styles.modalIndicator} />

                            <View style={styles.modalHeader}>
                                <ExpoGradient
                                    colors={[colors.primary, (colors.iridescent || '#6366f1')]}
                                    style={styles.modalIconWrap}
                                >
                                    <MaterialCommunityIcons name="sparkles" size={28} color="white" />
                                </ExpoGradient>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Attendance</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                    Please verify your details to secure your spot for {event.title}.
                                </Text>
                            </View>

                            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                        <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            nativeID="reg-name"
                                            name="name"
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="John Doe"
                                            placeholderTextColor={colors.textSecondary}
                                            value={regFormData.name}
                                            onChangeText={(val) => setRegFormData(prev => ({ ...prev, name: val }))}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Official Email</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                        <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            nativeID="reg-email"
                                            name="email"
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="john@campus.edu"
                                            placeholderTextColor={colors.textSecondary}
                                            value={regFormData.email}
                                            onChangeText={(val) => setRegFormData(prev => ({ ...prev, email: val }))}
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Contact Number</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                        <MaterialCommunityIcons name="phone-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            nativeID="reg-contact"
                                            name="contact"
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="+91 12345 67890"
                                            placeholderTextColor={colors.textSecondary}
                                            value={regFormData.contact}
                                            onChangeText={(val) => setRegFormData(prev => ({ ...prev, contact: val }))}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.rowInputs}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>University / Course</Text>
                                        <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                            <TextInput
                                                nativeID="reg-course"
                                                name="course"
                                                style={[styles.input, { color: colors.text }]}
                                                placeholder="B.Tech CS"
                                                placeholderTextColor={colors.textSecondary}
                                                value={regFormData.course}
                                                onChangeText={(val) => setRegFormData(prev => ({ ...prev, course: val }))}
                                            />
                                        </View>
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Major / Dept</Text>
                                        <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                                            <TextInput
                                                nativeID="reg-dept"
                                                name="department"
                                                style={[styles.input, { color: colors.text }]}
                                                placeholder="CSE"
                                                placeholderTextColor={colors.textSecondary}
                                                value={regFormData.department}
                                                onChangeText={(val) => setRegFormData(prev => ({ ...prev, department: val }))}
                                            />
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                                    onPress={() => setShowRegForm(false)}
                                >
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Later</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleFormSubmit}
                                >
                                    <ExpoGradient
                                        colors={[colors.primary, (colors.iridescent || '#6366f1')]}
                                        style={styles.modalSubmitBtn}
                                    >
                                        <Text style={styles.modalSubmitText}>Complete Registration</Text>
                                    </ExpoGradient>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Premium Floating Footer */}
            <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={[styles.bottomNav, { borderTopColor: colors.glassBorder }]}>
                <View>
                    <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>ENTRY PASS</Text>
                    <Text style={[styles.finalPrice, { color: event.price > 0 ? colors.text : '#10b981' }]}>
                        {event.price > 0 ? `₹${event.price}` : 'FREE'}
                    </Text>
                </View>
                <View style={styles.actionButtons}>
                    {user?.uid === event.createdBy ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('OrganizerDashboard')}
                        >
                            <ExpoGradient
                                colors={[colors.primary, (colors.iridescent || '#6366f1')]}
                                style={styles.manageButton}
                            >
                                <MaterialCommunityIcons name="view-dashboard-outline" size={20} color="white" />
                                <Text style={styles.registerButtonText}>Manage</Text>
                            </ExpoGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleRegister}
                            disabled={registering || isRegistered}
                        >
                            <ExpoGradient
                                colors={isRegistered ? ['#10b981', '#059669'] : [colors.primary, (colors.iridescent || '#6366f1')]}
                                style={[styles.registerButton, registering && { opacity: 0.7 }]}
                            >
                                <Text style={styles.registerButtonText}>
                                    {registering ? 'Securing...' : isRegistered ? 'Got Ticket!' : 'Book My Spot'}
                                </Text>
                            </ExpoGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...(Platform.OS === 'web' ? { overflow: 'hidden', height: '100vh' } : {})
    },
    bgOrb: {
        position: 'absolute',
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        opacity: 0.1,
    },
    orb1: { top: 200, right: -width * 0.5 },
    orb2: { bottom: 0, left: -width * 0.5 },
    imageContainer: { width: '100%', height: 500, overflow: 'hidden' },
    image: { width: '100%', height: '100%' },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    headerOverlay: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
    premiumRoundBtn: { width: 48, height: 48, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    headerActions: { flexDirection: 'row' },
    heroTextContent: { position: 'absolute', bottom: 60, left: 24, right: 24, gap: 12 },
    glassBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    glassBadgeText: { color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
    titleText: { color: 'white', fontSize: 40, fontWeight: 'bold', letterSpacing: -1, lineHeight: 46 },
    heroLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    locationIconGlow: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    heroLocationText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '500' },
    contentContainer: { marginTop: -40, backgroundColor: 'transparent', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 20, paddingTop: 10 },
    dragIndicator: { width: 40, height: 5, backgroundColor: 'rgba(156, 163, 175, 0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 30 },
    infoGrid: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    premiumInfoCard: { flex: 1, padding: 20, borderRadius: 28, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14 },
    premiumIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    premiumInfoLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4, opacity: 0.8 },
    premiumInfoValue: { fontSize: 14, fontWeight: 'bold', letterSpacing: -0.2 },
    organizerPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 32, marginBottom: 32, borderWidth: 1, overflow: 'hidden', marginTop: 15 },
    organizerInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarGlowContainer: { width: 60, height: 60, borderRadius: 30, padding: 3, backgroundColor: 'rgba(99, 102, 241, 0.2)' },
    premiumAvatar: { width: '100%', height: '100%', borderRadius: 27 },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
    organizerDetails: { marginLeft: 15 },
    organizerName: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.5 },
    organizerRole: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    premiumFollowBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
        ...Platform.select({
            web: { boxShadow: '0 4px 8px rgba(99, 102, 241, 0.2)' },
            default: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5
            }
        })
    },
    followBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    sectionArea: { marginBottom: 35 },
    sectionHeading: { fontSize: 24, fontWeight: 'bold', marginBottom: 18, letterSpacing: -0.5, marginLeft: 4 },
    descriptionPanel: { padding: 24, borderRadius: 32, borderWidth: 1, overflow: 'hidden' },
    descriptionText: { fontSize: 16, lineHeight: 28, opacity: 0.9 },
    mapWrapper: {
        width: '100%',
        height: 240,
        borderRadius: 32,
        borderWidth: 1,
        overflow: 'hidden',
        marginTop: 10,
        ...Platform.select({
            web: { boxShadow: '0 10px 20px rgba(0,0,0,0.2)' },
            default: {
                elevation: 15,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20
            }
        })
    },
    venueInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12, paddingHorizontal: 8 },
    venueText: { fontSize: 16, fontWeight: '600', flex: 1, letterSpacing: -0.3 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    sponsorScroll: { gap: 20, paddingRight: 24, paddingVertical: 10 },
    sponsorItem: { alignItems: 'center', width: 90 },
    sponsorCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'white',
        ...Platform.select({
            web: { boxShadow: '0 4px 8px rgba(0,0,0,0.2)' },
            default: {
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8
            }
        })
    },
    sponsorLogoFull: { width: '80%', height: '80%', resizeMode: 'contain' },
    sponsorName: { fontSize: 12, marginTop: 10, textAlign: 'center', fontWeight: '700', letterSpacing: -0.2 },
    sponsorPlaceholder: { width: '100%', height: 120, borderRadius: 32, borderWidth: 2, borderStyle: 'dotted', alignItems: 'center', justifyContent: 'center', gap: 10 },
    sponsorPlaceholderText: { fontSize: 15, fontWeight: '600', opacity: 0.6 },
    bottomNav: {
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingVertical: 25,
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: Platform.OS === 'ios' ? 44 : 25,
        zIndex: 1000,
        ...Platform.select({
            web: { position: 'fixed' },
            default: { position: 'absolute' }
        })
    },
    priceLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.6 },
    finalPrice: { fontSize: 28, fontWeight: 'bold', letterSpacing: -0.8 },
    actionButtons: { flexDirection: 'row', gap: 15 },
    manageButton: { paddingHorizontal: 25, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, elevation: 10 },
    registerButton: {
        paddingHorizontal: 35,
        height: 64,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 15,
        ...Platform.select({
            web: { boxShadow: '0 8px 16px rgba(0,0,0,0.4)' },
            default: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
            }
        })
    },
    registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.2 },
    sponsorAction: { fontSize: 14, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalKeyboardAvoid: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: Platform.OS === 'ios' ? 44 : 32, paddingHorizontal: 28, borderWidth: 1, borderBottomWidth: 0, maxHeight: '94%', overflow: 'hidden' },
    modalIndicator: { width: 44, height: 5, backgroundColor: 'rgba(156, 163, 175, 0.4)', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 30 },
    modalHeader: { alignItems: 'center', marginBottom: 35 },
    modalIconWrap: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 26, fontWeight: 'bold', letterSpacing: -0.5, marginBottom: 8 },
    modalSubtitle: { fontSize: 15, textAlign: 'center', opacity: 0.7, lineHeight: 22 },
    modalFormScroll: { marginBottom: 25 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4, opacity: 0.7 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, height: 60 },
    inputIcon: { marginRight: 15, opacity: 0.8 },
    input: { flex: 1, fontSize: 16, fontWeight: '500' },
    rowInputs: { flexDirection: 'row', gap: 16 },
    modalActions: { flexDirection: 'row', gap: 14 },
    modalCancelBtn: { flex: 1, height: 64, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { fontSize: 17, fontWeight: '700' },
    modalSubmitBtn: {
        flex: 2,
        height: 64,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        ...Platform.select({
            web: { boxShadow: '0 8px 12px rgba(99, 102, 241, 0.3)' },
            default: {
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            }
        })
    },
    modalSubmitText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
});
