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

            {/* Custom Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? "white" : colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Post New Event</Text>
                <View style={{ width: 40 }} />{/* Spacer */}
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
                    placeholderTextColor={colors.textSecondary}
                    theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
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
                    placeholderTextColor={colors.textSecondary}
                    theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
                />
                <TextInput
                    label="Date (e.g., 25 OCT 2024)"
                    value={date}
                    onChangeText={setDate}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    placeholderTextColor={colors.textSecondary}
                    theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
                />
                <TextInput
                    label="Venue / Location"
                    value={venue}
                    onChangeText={setVenue}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    placeholderTextColor={colors.textSecondary}
                    theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
                />

                <TextInput
                    label="Department"
                    placeholder="e.g. Computer Science, Cultural Committee"
                    value={department}
                    onChangeText={setDepartment}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    mode="outlined"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                    textColor={colors.text}
                    placeholderTextColor={colors.textSecondary}
                    theme={{ colors: { text: colors.text, placeholder: colors.textSecondary, primary: colors.primary, outline: colors.border } }}
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
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    input: {
        marginBottom: 16,
    },
    categorySection: {
        marginBottom: 20,
        marginTop: 4,
    },
    sectionLabel: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
    },
    categoryScroll: {
        paddingRight: 20,
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: 'rgba(25, 34, 51, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(35, 47, 72, 0.5)',
        marginRight: 10,
    },
    categoryChipSelected: {
        backgroundColor: '#135bec',
        borderColor: '#135bec',
        elevation: 6,
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    iconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    iconCircleActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    categoryChipText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600',
        paddingRight: 12,
    },
    categoryChipTextSelected: {
        color: 'white',
        fontWeight: '700',
    },
    postButton: {
        marginTop: 30,
        backgroundColor: '#135bec',
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#135bec',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    postButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    thumbnailSection: { marginBottom: 30 },
    thumbnailContainer: { height: 200, borderRadius: 24, overflow: 'hidden', borderWidth: 1, position: 'relative' },
    thumbnailImage: { width: '100%', height: '100%' },
    thumbnailOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
    shuffleButton: { position: 'absolute', bottom: 16, right: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 4 },
    shuffleText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    suggestionSection: { marginTop: 16 },
    suggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 4 },
    suggestionLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    suggestionScroll: { gap: 10, paddingRight: 20 },
    suggestionItem: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWeight: 1, borderColor: 'transparent' },
    suggestionImage: { width: '100%', height: '100%' },
    checkBadge: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    hintContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 8 },
    thumbnailHint: { fontSize: 12, flex: 1 },
});
