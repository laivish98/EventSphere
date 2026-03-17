import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, TextInput, HelperText, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { suggestImages } from '../services/ImageSearchService';

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
        const combinedText = `${title} ${description}`;
        const suggestions = suggestImages(combinedText);
        setSuggestedImages(suggestions);
    }, [title, description]);

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
            console.log("Attempting to post event for user:", user.uid);
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
            console.error("Firestore post error details:", {
                code: error.code,
                message: error.message,
                user: user.uid,
                data: { title: trimmedTitle, category }
            });

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

            {/* Premium Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color={isDarkMode ? "white" : colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Event</Text>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => Alert.alert('Help', 'Fill in the details to create your event.')}>
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <TextInput
                    label="Event Title"
                    value={title}
                    onChangeText={setTitle}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    placeholder="Enter a catchy title"
                    theme={{ roundness: 16, colors: { primary: colors.primary } }}
                />
                <TextInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    placeholder="What's happening?"
                    theme={{ roundness: 16, colors: { primary: colors.primary } }}
                />
                <View style={styles.gridRow}>
                    <TextInput
                        label="Date"
                        value={date}
                        onChangeText={setDate}
                        style={[styles.input, styles.flexInput, { backgroundColor: colors.surface }]}
                        mode="outlined"
                        placeholder="25 OCT"
                        theme={{ roundness: 16, colors: { primary: colors.primary } }}
                    />
                    <View style={{ width: 12 }} />
                    <TextInput
                        label="Venue"
                        value={venue}
                        onChangeText={setVenue}
                        style={[styles.input, styles.flexInput, { backgroundColor: colors.surface }]}
                        mode="outlined"
                        placeholder="Main Hall"
                        theme={{ roundness: 16, colors: { primary: colors.primary } }}
                    />
                </View>

                <TextInput
                    label="Department"
                    placeholder="e.g. Computer Science"
                    value={department}
                    onChangeText={setDepartment}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    theme={{ roundness: 16, colors: { primary: colors.primary } }}
                />

                <View style={styles.categorySection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Event Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryChip,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    category === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setCategory(cat.id)}
                            >
                                <View style={[
                                    styles.iconCircle,
                                    { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)' },
                                    category === cat.id && styles.iconCircleActive
                                ]}>
                                    <MaterialCommunityIcons
                                        name={cat.icon}
                                        size={18}
                                        color={category === cat.id ? 'white' : colors.textSecondary}
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

                {/* Thumbnail Preview */}
                <View style={styles.thumbnailSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Event Poster</Text>
                    <View style={[styles.thumbnailContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={styles.thumbnailImage} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <MaterialCommunityIcons name="image-off" size={40} color={colors.border} />
                            </View>
                        )}
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.thumbnailOverlay}
                        />
                        <TouchableOpacity
                            style={[styles.shuffleButton, { backgroundColor: colors.primary }]}
                            onPress={handleShuffle}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="cached" size={20} color="white" />
                            <Text style={styles.shuffleText}>Shuffle Designs</Text>
                        </TouchableOpacity>
                    </View>

                    {/* AI Magic Suggestions */}
                    {suggestedImages.length > 0 && (
                        <View style={styles.suggestionSection}>
                            <View style={styles.suggestionHeader}>
                                <MaterialCommunityIcons name="sparkles" size={16} color="#fbbf24" />
                                <Text style={[styles.suggestionLabel, { color: colors.textSecondary }]}>MAGIC SUGGESTIONS</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
                                {suggestedImages.map((img, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => setSelectedImage(img)}
                                        style={[
                                            styles.suggestionItem,
                                            selectedImage === img && { borderColor: colors.primary, borderWidth: 2 }
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
                            Smart AI picking! Tap shuffle or select from magic suggestions above.
                        </Text>
                    </View>
                </View>

                <TextInput
                    label="Ticket Price (₹)"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    placeholderTextColor={colors.textSecondary}
                    theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
                />

                <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 }]}>
                    <View>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Accept Sponsorship</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Allow brands to sponsor this show</Text>
                    </View>
                    <Switch
                        value={acceptsSponsorship}
                        onValueChange={setAcceptsSponsorship}
                        color={colors.primary}
                    />
                </View>

                {
                    acceptsSponsorship && (
                        <>
                            <TextInput
                                label="Sponsorship Amount (₹)"
                                value={sponsorshipAmount}
                                onChangeText={setSponsorshipAmount}
                                keyboardType="numeric"
                                style={[styles.input, { backgroundColor: colors.surface }]}
                                mode="outlined"
                                outlineColor={colors.border}
                                activeOutlineColor={colors.primary}
                                textColor={colors.text}
                                placeholderTextColor={colors.textSecondary}
                                theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
                            />
                            <HelperText type="info" style={{ color: colors.textSecondary, marginBottom: 10 }}>
                                Minimum amount for sponsors to advertise at this event.
                            </HelperText>
                        </>
                    )
                }

                <TouchableOpacity
                    style={[styles.postButton, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
                    onPress={handleCreateEvent}
                    disabled={loading}
                >
                    <Text style={styles.postButtonText}>{loading ? 'Posting...' : 'Post Event'}</Text>
                </TouchableOpacity>
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    input: {
        marginBottom: 16,
    },
    gridRow: {
        flexDirection: 'row',
        width: '100%',
    },
    flexInput: {
        flex: 1,
    },
    categorySection: {
        marginVertical: 12,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 16,
        marginLeft: 4,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    categoryScroll: {
        paddingRight: 20,
        gap: 12,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        marginRight: 8,
        elevation: 2,
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
        fontSize: 14,
        fontWeight: '600',
        paddingRight: 8,
    },
    categoryChipTextSelected: {
        color: 'white',
        fontWeight: 'bold',
    },
    postButton: {
        marginTop: 20,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    postButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    thumbnailSection: { marginVertical: 24 },
    thumbnailContainer: { height: 220, borderRadius: 28, overflow: 'hidden', borderWidth: 1.5, position: 'relative', elevation: 4 },
    thumbnailImage: { width: '100%', height: '100%' },
    thumbnailOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
    shuffleButton: { position: 'absolute', bottom: 20, right: 20, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 6 },
    shuffleText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    suggestionSection: { marginTop: 20 },
    suggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },
    suggestionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    suggestionScroll: { gap: 12, paddingRight: 20 },
    suggestionItem: { width: 84, height: 84, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
    suggestionImage: { width: '100%', height: '100%' },
    checkBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    hintContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 8, opacity: 0.7 },
    thumbnailHint: { fontSize: 12, flex: 1, fontWeight: '500' },
});
