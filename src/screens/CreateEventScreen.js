import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Button, Text, TextInput, HelperText, Switch } from 'react-native-paper';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { suggestImages, searchImages } from '../services/ImageSearchService';

export default function CreateEventScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user, userData } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [venue, setVenue] = useState('');
    const [price, setPrice] = useState('');
    const [sponsorshipAmount, setSponsorshipAmount] = useState('');
    const [category, setCategory] = useState('social');
    const [department, setDepartment] = useState('');
    const [acceptsSponsorship, setAcceptsSponsorship] = useState(true);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState('https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2670&auto=format&fit=crop');
    const [suggestedImages, setSuggestedImages] = useState([]);
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const CATEGORY_IMAGE_POOLS = {
        music: [
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1514525253361-bee8a18742ca?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1459749411177-8c275d85d31e?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=2670&auto=format&fit=crop'
        ],
        sports: [
            'https://images.unsplash.com/photo-1461896756970-8d5f3964f4f3?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1461310941160-de270c3a9584?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2670&auto=format&fit=crop'
        ],
        tech: [
            'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=2670&auto=format&fit=crop'
        ],
        social: [
            'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519671482749-fd09be4ccebf?q=80&w=2670&auto=format&fit=crop'
        ],
        workshop: [
            'https://images.unsplash.com/photo-1544928147-7972ef03f2cb?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1541854615901-93c354197834?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=2670&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2670&auto=format&fit=crop'
        ]
    };

    const getRandomImage = (cat) => {
        const pool = CATEGORY_IMAGE_POOLS[cat] || CATEGORY_IMAGE_POOLS.social;
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const CATEGORIES = [
        { id: 'music', label: 'Music', icon: 'music' },
        { id: 'sports', label: 'Sports', icon: 'soccer' },
        { id: 'tech', label: 'Tech', icon: 'laptop' },
        { id: 'social', label: 'Social', icon: 'account-group' },
        { id: 'workshop', label: 'Workshop', icon: 'pencil-ruler' },
    ];

    useEffect(() => {
        // Auto-assign a random image when category changes if user hasn't manually picked one
        setSelectedImage(getRandomImage(category));
    }, [category]);

    useEffect(() => {
        // Smart Suggestions based on title and description
        if (imageSearchQuery.trim() === '') {
            const combinedText = `${title} ${description}`;
            const suggestions = suggestImages(combinedText);
            setSuggestedImages(suggestions);
        }
    }, [title, description, imageSearchQuery]);

    useEffect(() => {
        if (imageSearchQuery.trim() !== '') {
            setIsSearching(true);
            const timeoutId = setTimeout(() => {
                const results = searchImages(imageSearchQuery);
                setSuggestedImages(results);
                setIsSearching(false);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [imageSearchQuery]);

    const handleShuffle = () => {
        setSelectedImage(getRandomImage(category));
    };

    const handleCreateEvent = async () => {
        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();
        const trimmedDate = date.trim();
        const trimmedVenue = venue.trim();
        const trimmedDepartment = department.trim();

        if (!trimmedTitle || !trimmedDescription || !trimmedDate || !trimmedVenue || !trimmedDepartment || !price || (acceptsSponsorship && !sponsorshipAmount)) {
            Alert.alert('Missing Fields', 'Please fill in all details to post the event.');
            return;
        }

        const ticketPrice = parseFloat(price);
        const sponsorAmount = acceptsSponsorship ? parseFloat(sponsorshipAmount) : 0;

        if (isNaN(ticketPrice) || (acceptsSponsorship && isNaN(sponsorAmount))) {
            Alert.alert('Invalid Format', 'Price and Sponsorship must be valid numbers.');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'events'), {
                title: trimmedTitle,
                description: trimmedDescription,
                date: trimmedDate,
                venue: trimmedVenue,
                department: trimmedDepartment,
                price: ticketPrice,
                sponsorshipAmount: sponsorAmount,
                acceptsSponsorship: acceptsSponsorship,
                category: category,
                imageUrl: selectedImage || getRandomImage(category),
                createdBy: user.uid,
                collegeName: userData?.name || user.displayName || 'Campus Organizer',
                createdAt: serverTimestamp(),
            });
            Alert.alert('Success ✨', 'Your event has been published to the community!');
            navigation.goBack();
        } catch (error) {

            let errorMessage = 'Failed to connect to database. Please check your network.';
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please ensure you are logged in correctly.';
            } else if (error.message.includes('blocked-by-client')) {
                errorMessage = 'Request blocked by your browser. Please disable ad-blockers and try again.';
            }

            Alert.alert('Publishing Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Ambient Background Structure */}
            <ExpoGradient
                colors={isDarkMode
                    ? [colors.background, colors.surfaceDeep, colors.background]
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Accent Glows */}
            <View style={[styles.bgOrb, { top: -100, right: -100, backgroundColor: isDarkMode ? 'rgba(19, 91, 236, 0.12)' : 'rgba(19, 91, 236, 0.04)' }]} />
            <View style={[styles.bgOrb, { bottom: 200, left: -150, backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.03)' }]} />

            {/* Premium Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomColor: colors.glassBorder, borderBottomWidth: 1 }]}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'white', borderColor: colors.glassBorder }]} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Publish Event</Text>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'white', borderColor: colors.glassBorder }]} onPress={() => Alert.alert('Help Center', 'Our AI assists you in making your event stand out. Fill in the details below.')}>
                    <MaterialCommunityIcons name="sparkles" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                enabled={Platform.OS !== 'web'}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <BlurView intensity={isDarkMode ? 25 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.formPanel, { borderColor: colors.glassBorder }]}>
                        <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EVENT CORE DETAILS</Text>
                        <TextInput
                            nativeID="event-title"
                            name="title"
                            label="Event Title"
                            value={title}
                            onChangeText={setTitle}
                            style={[styles.input, { backgroundColor: colors.surface + '40' }]}
                            mode="outlined"
                            outlineColor={colors.glassBorder}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            placeholder="Enter a catchy title"
                            theme={{ roundness: 16, colors: { primary: colors.primary, outline: colors.glassBorder } }}
                        />
                        <TextInput
                            nativeID="event-desc"
                            name="description"
                            label="Description"
                            value={description}
                            onChangeText={setDescription}
                            style={[styles.input, { backgroundColor: colors.surface + '40' }]}
                            mode="outlined"
                            multiline
                            numberOfLines={4}
                            outlineColor={colors.glassBorder}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            placeholder="What's happening?"
                            theme={{ roundness: 16, colors: { primary: colors.primary, outline: colors.glassBorder } }}
                        />
                        <View style={styles.gridRow}>
                            <TextInput
                                nativeID="event-date"
                                name="date"
                                label="Date"
                                value={date}
                                onChangeText={setDate}
                                style={[styles.input, styles.flexInput, { backgroundColor: colors.surface + '40' }]}
                                mode="outlined"
                                placeholder="25 OCT"
                                theme={{ roundness: 16, colors: { primary: colors.primary } }}
                            />
                            <View style={{ width: 12 }} />
                            <TextInput
                                nativeID="event-venue"
                                name="venue"
                                label="Venue"
                                value={venue}
                                onChangeText={setVenue}
                                style={[styles.input, styles.flexInput, { backgroundColor: colors.surface + '40' }]}
                                mode="outlined"
                                placeholder="Main Hall"
                                theme={{ roundness: 16, colors: { primary: colors.primary } }}
                            />
                        </View>

                        <TextInput
                            nativeID="event-dept"
                            name="department"
                            label="Department"
                            placeholder="e.g. Computer Science"
                            value={department}
                            onChangeText={setDepartment}
                            style={[styles.input, { backgroundColor: colors.surface + '40' }]}
                            mode="outlined"
                            outlineColor={colors.glassBorder}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            theme={{ roundness: 16, colors: { primary: colors.primary } }}
                        />
                    </BlurView>

                    <View style={styles.categorySection}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EVENT CLASSIFICATION</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: colors.surface + '40', borderColor: colors.glassBorder },
                                        category === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                    ]}
                                    onPress={() => setCategory(cat.id)}
                                >
                                    <View style={[
                                        styles.iconCircle,
                                        { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255, 255, 255, 0.4)' },
                                        category === cat.id && styles.iconCircleActive
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={cat.icon}
                                            size={18}
                                            color={category === cat.id ? 'white' : colors.primary}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: colors.textSecondary },
                                        category === cat.id && styles.categoryChipTextSelected
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Thumbnail Section */}
                    <BlurView intensity={isDarkMode ? 25 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.formPanel, { borderColor: colors.glassBorder, padding: 0 }]}>
                        <View style={{ padding: 20, paddingBottom: 0 }}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginLeft: 0 }]}>VISUAL IDENTITY</Text>

                            {/* NEW: Search Bar for Images */}
                            <View style={[styles.imageSearchContainer, { backgroundColor: colors.surface + '40', borderColor: colors.glassBorder }]}>
                                <MaterialCommunityIcons name="magnify" size={20} color={colors.primary} />
                                <TextInput
                                    placeholder="Search posters (e.g. 'coding', 'neon', 'beach')"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    value={imageSearchQuery}
                                    onChangeText={setImageSearchQuery}
                                    style={styles.imageSearchInput}
                                    underlineColor="transparent"
                                    activeUnderlineColor="transparent"
                                    dense
                                />
                                {imageSearchQuery !== '' && (
                                    <TouchableOpacity onPress={() => setImageSearchQuery('')}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={[styles.thumbnailSection, { marginTop: 0 }]}>
                            <View style={[styles.thumbnailContainer, { borderColor: colors.glassBorder }]}>
                                {selectedImage ? (
                                    <Image source={{ uri: selectedImage }} style={styles.thumbnailImage} />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <MaterialCommunityIcons name="image-off" size={40} color={colors.border} />
                                    </View>
                                )}
                                <ExpoGradient
                                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                                    style={styles.thumbnailOverlay}
                                />
                                <TouchableOpacity
                                    style={[styles.shuffleButton, { backgroundColor: colors.primary }]}
                                    onPress={handleShuffle}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="cached" size={20} color="white" />
                                    <Text style={styles.shuffleText}>AI Regenerate</Text>
                                </TouchableOpacity>
                            </View>

                            {/* AI Magic Suggestions */}
                            {suggestedImages.length > 0 && (
                                <View style={styles.suggestionSection}>
                                    <View style={styles.suggestionHeader}>
                                        <MaterialCommunityIcons name="sparkles" size={16} color="#fbbf24" />
                                        <Text style={[styles.suggestionLabel, { color: colors.textSecondary }]}>
                                            {imageSearchQuery ? 'SEARCH RESULTS' : 'AI SUGGESTIONS'}
                                        </Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
                                        {suggestedImages.map((img, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                onPress={() => setSelectedImage(img)}
                                                style={[
                                                    styles.suggestionItem,
                                                    { borderColor: selectedImage === img ? colors.primary : colors.glassBorder }
                                                ]}
                                            >
                                                <Image source={{ uri: img }} style={styles.suggestionImage} />
                                                {selectedImage === img && (
                                                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                                                        <MaterialCommunityIcons name="check" size={12} color="white" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={styles.hintContainer}>
                                <MaterialCommunityIcons name="information-outline" size={14} color={colors.primary} />
                                <Text style={[styles.thumbnailHint, { color: colors.textSecondary }]}>
                                    Our AI suggests posters based on your event description.
                                </Text>
                            </View>
                        </View>
                    </BlurView>

                    <BlurView intensity={isDarkMode ? 25 : 40} tint={isDarkMode ? "dark" : "light"} style={[styles.formPanel, { borderColor: colors.glassBorder }]}>
                        <ExpoGradient colors={colors.iridescent} style={StyleSheet.absoluteFill} />
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ECONOMY & SPONSORSHIP</Text>
                        <TextInput
                            label="Ticket Price (₹)"
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                            style={[styles.input, { backgroundColor: colors.surface + '40' }]}
                            mode="outlined"
                            outlineColor={colors.glassBorder}
                            activeOutlineColor={colors.primary}
                            textColor={colors.text}
                            placeholderTextColor={colors.textSecondary + '80'}
                            theme={{ roundness: 16, colors: { primary: colors.primary, outline: colors.glassBorder } }}
                        />

                        <View style={[styles.switchRow, { backgroundColor: colors.surface + '40', borderColor: colors.glassBorder }]}>
                            <View>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 }}>Accept Sponsorship</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Enable business funding</Text>
                            </View>
                            <Switch
                                value={acceptsSponsorship}
                                onValueChange={setAcceptsSponsorship}
                                color={colors.primary}
                                disabled={loading}
                            />
                        </View>

                        {acceptsSponsorship && (
                            <View style={{ marginTop: 8 }}>
                                <TextInput
                                    label="Required Sponsorship (₹)"
                                    value={sponsorshipAmount}
                                    onChangeText={setSponsorshipAmount}
                                    keyboardType="numeric"
                                    style={[styles.input, { backgroundColor: colors.surface + '40' }]}
                                    mode="outlined"
                                    outlineColor={colors.glassBorder}
                                    activeOutlineColor={colors.primary}
                                    textColor={colors.text}
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    theme={{ roundness: 16, colors: { primary: colors.primary, outline: colors.glassBorder } }}
                                />
                                <HelperText type="info" style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', opacity: 0.6 }}>
                                    Target amount for full event sponsorship.
                                </HelperText>
                            </View>
                        )}
                    </BlurView>

                    <TouchableOpacity
                        style={[styles.postButton, Platform.select({ web: { boxShadow: `0 4px 12px ${colors.primary}60` }, default: { shadowColor: Platform.OS === 'web' ? 'transparent' : colors.primary } })]}
                        onPress={handleCreateEvent}
                        disabled={loading}
                        activeOpacity={0.9}
                    >
                        <ExpoGradient
                            colors={[colors.primary, '#6366f1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.postButtonContent}>
                            <MaterialCommunityIcons name="rocket-launch-outline" size={22} color="white" />
                            <Text style={styles.postButtonText}>{loading ? 'Deploying to Feed...' : 'Publish Event'}</Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView >
            </KeyboardAvoidingView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...(Platform.OS === 'web' ? { overflow: 'hidden', height: '100vh' } : {})
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        paddingTop: 20,
        gap: 20,
    },
    formPanel: {
        borderRadius: 32,
        padding: 24,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 20,
        marginLeft: 4,
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.5,
    },
    categorySection: {
        marginVertical: 4,
    },
    categoryScroll: {
        paddingRight: 20,
        gap: 12,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1.5,
        marginRight: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    iconCircleActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '800',
        paddingRight: 8,
    },
    categoryChipTextSelected: {
        color: 'white',
    },
    thumbnailSection: { paddingVertical: 20, paddingHorizontal: 20 },
    thumbnailContainer: { height: 200, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5, position: 'relative' },
    thumbnailImage: { width: '100%', height: '100%' },
    thumbnailOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
    shuffleButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        ...Platform.select({
            web: { boxShadow: '0 4px 8px rgba(0,0,0,0.3)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            }
        })
    },
    shuffleText: { color: 'white', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    suggestionSection: { marginTop: 24 },
    suggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginLeft: 4 },
    suggestionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, opacity: 0.6 },
    suggestionScroll: { gap: 12, paddingRight: 20 },
    suggestionItem: { width: 80, height: 80, borderRadius: 20, overflow: 'hidden', borderWidth: 2, position: 'relative' },
    suggestionImage: { width: '100%', height: '100%' },
    checkBadge: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    hintContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 8, opacity: 0.5 },
    thumbnailHint: { fontSize: 11, flex: 1, fontWeight: '700' },
    imageSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderRadius: 16,
        borderWidth: 1.5,
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    imageSearchInput: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 14,
        height: 40,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1.5, marginBottom: 12 },
    postButton: {
        height: 64,
        borderRadius: 24,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 12,
        marginTop: 12,
        ...Platform.select({
            web: { boxShadow: '0 8px 16px rgba(19, 91, 236, 0.4)' },
            default: {
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 15,
            }
        })
    },
    postButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    postButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    bgOrb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
});
