import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

/**
 * A reusable promotional banner component designed to highlight key features or sections.
 * 
 * @param {Object} props
 * @param {string} props.title - The main heading of the banner.
 * @param {string} props.description - A short sub-text description.
 * @param {string} props.icon - MaterialCommunityIcons icon name.
 * @param {string} props.buttonText - Text to display on the action button.
 * @param {Function} props.onPress - Callback for when the banner is pressed.
 * @param {Array<string>} [props.gradientColors] - Optional colors for the banner gradient background.
 */
export default function PromotionalBanner({
    title,
    description,
    icon = 'star-four-points',
    buttonText = 'Explore',
    onPress,
    gradientColors
}) {
    const { isDarkMode, colors } = useTheme();

    // Default gradient to brand primary, adjusted for dark/light mode
    const defaultGradient = isDarkMode
        ? ['#1e1b4b', '#312e81', '#4338ca']
        : ['#e0e7ff', '#c7d2fe', '#a5b4fc'];

    const activeGradient = gradientColors || defaultGradient;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.container}
            onPress={onPress}
        >
            <ExpoGradient
                colors={activeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Background design accents */}
            <View style={styles.accentCircleTop} />
            <View style={styles.accentCircleBottom} />

            <BlurView
                intensity={isDarkMode ? 40 : 20}
                tint={isDarkMode ? 'dark' : 'light'}
                style={[styles.glassMorphism, { borderColor: colors.glassBorder }]}
            >
                <View style={styles.content}>
                    <View style={styles.textContainer}>
                        <View style={styles.titleRow}>
                            <MaterialCommunityIcons
                                name={icon}
                                size={22}
                                color={isDarkMode ? '#ffffff' : colors.primary}
                                style={styles.icon}
                            />
                            <Text style={[styles.title, { color: isDarkMode ? '#ffffff' : colors.text }]}>
                                {title}
                            </Text>
                        </View>
                        {description ? (
                            <Text style={[styles.description, { color: isDarkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                                {description}
                            </Text>
                        ) : null}

                        <View style={[styles.actionButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : colors.primary }]}>
                            <Text style={[styles.actionText, { color: isDarkMode ? '#ffffff' : '#ffffff' }]}>
                                {buttonText}
                            </Text>
                            <MaterialCommunityIcons name="arrow-right" size={16} color="#ffffff" />
                        </View>
                    </View>
                </View>
            </BlurView>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width - 48, // 24 padding on each side
        alignSelf: 'center',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        elevation: 8,
        ...Platform.select({
            web: { boxShadow: '0 8px 16px rgba(0,0,0,0.15)' },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 15,
            }
        })
    },
    glassMorphism: {
        padding: 20,
        borderWidth: 1,
    },
    accentCircleTop: {
        position: 'absolute',
        top: -40,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    accentCircleBottom: {
        position: 'absolute',
        bottom: -50,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        gap: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    icon: {
        marginBottom: 2,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        marginBottom: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        marginTop: 4,
    },
    actionText: {
        fontSize: 13,
        fontWeight: 'bold',
    }
});
