import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Image, Dimensions, Share, Platform, Alert, Modal, TextInput, Linking, KeyboardAvoidingView } from 'react-native';
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
    const { user, userData, getDefaultAvatar } = useAuth();
    const [isRegistered, setIsRegistered] = useState(false);
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
                avatarUrl: 'https://ui-avatars.com/api/?name=EventSphere&background=135bec&color=fff'
            });
            return;
        }

        // Handle dummy organizers from featured data
        if (event.createdBy.startsWith('dummy_')) {
            setOrganizer({
                name: 'Official Partner',
                role: 'admin',
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(event.category || 'Event')}&background=random&color=fff`
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
                    avatarUrl: 'https://ui-avatars.com/api/?name=Campus+Organizer&background=random&color=fff'
                });
            }
        } catch (error) {
            console.error('Error fetching organizer:', error);
        }
    };

    const checkFollowStatus = async () => {
        if (!user || !event.createdBy || typeof event.createdBy !== 'string' || event.createdBy.trim() === '') {
            console.log('Skipping follow check: invalid user or event.createdBy');
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
                            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
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
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.heroShadow}
                        />
                        <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '30', borderColor: colors.primary + '60' }]}>
                            <Text style={[styles.categoryText, { color: 'white' }]}>{event.category}</Text>
                        </View>
                        <Text style={[styles.title, { color: 'white' }]}>{event.title}</Text>
                        <View style={styles.locationContainer}>
                            <MaterialCommunityIcons name="map-marker-radius" size={18} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.locationText}>{event.venue || event.location}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    {/* Basic Info Cards */}
                    <View style={styles.infoGrid}>
                        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
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
                        <View style={[styles.organizerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.organizerInfo}>
                                <Image
                                    source={{
                                        uri: (organizer.avatarUrl &&
                                            !organizer.avatarUrl.includes('iran.liara.run') &&
                                            !organizer.avatarUrl.includes('hair=short') &&
                                            !organizer.avatarUrl.includes('hair=long'))
                                            ? organizer.avatarUrl
                                            : getDefaultAvatar(organizer.name || 'Organizer', organizer.gender)
                                    }}
                                    style={styles.organizerAvatar}
                                />
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
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore Event</Text>
                        <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>
                                {event.description}
                            </Text>
                        </View>
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

            {/* Registration Form Modal */}
            <Modal
                visible={showRegForm}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRegForm(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalKeyboardAvoid}
                    >
                        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <View style={styles.modalIndicator} />

                            <View style={styles.modalHeader}>
                                <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + '20' }]}>
                                    <MaterialCommunityIcons name="sparkles" size={24} color={colors.primary} />
                                </View>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Almost there! ✨</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Help the host organize better by filling these details.</Text>
                            </View>

                            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="John Doe"
                                            placeholderTextColor={colors.textSecondary}
                                            value={regFormData.name}
                                            onChangeText={(val) => setRegFormData(prev => ({ ...prev, name: val }))}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <MaterialCommunityIcons name="email-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="john@example.com"
                                            placeholderTextColor={colors.textSecondary}
                                            value={regFormData.email}
                                            onChangeText={(val) => setRegFormData(prev => ({ ...prev, email: val }))}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Contact Number</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <MaterialCommunityIcons name="phone-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="+91 98765-43210"
                                            placeholderTextColor={colors.textSecondary}
                                            value={regFormData.contact}
                                            onChangeText={(val) => setRegFormData(prev => ({ ...prev, contact: val }))}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.rowInputs}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Course</Text>
                                        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <MaterialCommunityIcons name="school-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                                            <TextInput
                                                style={[styles.input, { color: colors.text }]}
                                                placeholder="B.Tech"
                                                placeholderTextColor={colors.textSecondary}
                                                value={regFormData.course}
                                                onChangeText={(val) => setRegFormData(prev => ({ ...prev, course: val }))}
                                            />
                                        </View>
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Department</Text>
                                        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <MaterialCommunityIcons name="office-building" size={18} color={colors.primary} style={styles.inputIcon} />
                                            <TextInput
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
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleFormSubmit}
                                >
                                    <Text style={styles.modalSubmitText}>Register Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

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
    imageContainer: { width: '100%', height: 440 },
    image: { width: '100%', height: '100%' },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    headerOverlay: { position: 'absolute', top: 60, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
    roundButton: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    headerActions: { flexDirection: 'row' },
    quickInfoContainer: { position: 'absolute', bottom: 40, left: 24, right: 24 },
    heroShadow: { ...StyleSheet.absoluteFillObject, height: 160, bottom: -40, top: 'auto', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
    categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 12, borderWidth: 1.5 },
    categoryText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
    title: { fontSize: 36, fontWeight: 'bold', letterSpacing: -1, lineHeight: 42 },
    locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    locationText: { color: 'rgba(255,255,255,0.95)', fontSize: 16, marginLeft: 8, fontWeight: '500' },
    contentContainer: { paddingHorizontal: 24, marginTop: -40, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingTop: 40 },
    infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    infoCard: { flex: 1, padding: 18, borderRadius: 24, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { fontSize: 11, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.6 },
    infoValue: { fontSize: 15, fontWeight: 'bold' },
    organizerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 28, marginBottom: 32, borderWidth: 1.5, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 15 },
    organizerInfo: { flexDirection: 'row', alignItems: 'center' },
    organizerAvatar: { width: 54, height: 54, borderRadius: 27 },
    organizerDetails: { marginLeft: 16 },
    organizerName: { fontSize: 18, fontWeight: 'bold', letterSpacing: -0.5 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    roleText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    followButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 2 },
    followButtonText: { fontSize: 14, fontWeight: 'bold' },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, letterSpacing: -0.5 },
    descriptionCard: { padding: 20, borderRadius: 24, borderWidth: 1.5 },
    description: { fontSize: 16, lineHeight: 26, opacity: 0.8 },
    mapWrapper: { width: '100%', height: 220, borderRadius: 28, borderWidth: 1.5, overflow: 'hidden', marginTop: 8, elevation: 4 },
    venueInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10, paddingHorizontal: 4 },
    venueText: { fontSize: 15, fontWeight: '600', flex: 1 },
    sponsorScroll: { gap: 16, paddingRight: 24 },
    sponsorCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 20, borderTopWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Platform.OS === 'ios' ? 44 : 24, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 12 },
    priceLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 },
    finalPrice: { fontSize: 28, fontWeight: 'bold', letterSpacing: -0.5 },
    actionButtons: { flexDirection: 'row', gap: 12 },
    manageButton: { paddingHorizontal: 24, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, elevation: 8 },
    registerButton: { paddingHorizontal: 36, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
    registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.2 },
    sponsorAction: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    sponsorItem: { alignItems: 'center', width: 84, marginRight: 16 },
    sponsorLogoFull: { width: '100%', height: '100%', borderRadius: 36 },
    sponsorName: { fontSize: 11, marginTop: 8, textAlign: 'center', fontWeight: 'bold' },
    sponsorPlaceholder: { width: '100%', height: 110, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 10 },
    sponsorPlaceholderText: { fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalKeyboardAvoid: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingBottom: Platform.OS === 'ios' ? 44 : 28, paddingHorizontal: 24, borderWidth: 2, borderBottomWidth: 0, maxHeight: '92%' },
    modalIndicator: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 14, marginBottom: 24 },
    modalHeader: { marginBottom: 32, alignItems: 'center' },
    modalIconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 4 },
    modalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
    modalSubtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', opacity: 0.7, fontWeight: '500' },
    modalFormScroll: { maxHeight: 480, paddingBottom: 20 },
    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 12, fontWeight: '900', marginBottom: 10, marginLeft: 6, letterSpacing: 1, textTransform: 'uppercase' },
    inputWrapper: { height: 60, borderRadius: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
    inputIcon: { marginRight: 14 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    rowInputs: { flexDirection: 'row', marginBottom: 6 },
    modalActions: { flexDirection: 'row', gap: 14, marginTop: 16, paddingBottom: 12 },
    modalCancelBtn: { flex: 1, height: 64, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { fontSize: 17, fontWeight: 'bold' },
    modalSubmitBtn: { flex: 2, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    modalSubmitText: { color: 'white', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
});
