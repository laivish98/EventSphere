import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('userTheme');
            if (savedTheme !== null) {
                setIsDarkMode(savedTheme === 'dark');
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    };

    const toggleTheme = async () => {
        try {
            const newMode = !isDarkMode;
            setIsDarkMode(newMode);
            await AsyncStorage.setItem('userTheme', newMode ? 'dark' : 'light');
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    };

    const theme = {
        isDarkMode,
        colors: isDarkMode ? darkColors : lightColors,
        toggleTheme
    };

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

const darkColors = {
    background: '#0F172A', // Deep Slate
    surface: '#1E293B',    // Slate 800
    surfaceLight: '#334155', // Slate 700
    surfaceDeep: '#020617', // Extremely deep Slate
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#F8FAFC',       // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    primary: '#135bec',    // Premium Royal Blue
    primaryLight: '#3b82f6',
    primaryGlow: 'rgba(19, 91, 236, 0.4)',
    accent: '#10B981',     // Emerald
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    card: '#1E293B',
    glass: 'rgba(30, 41, 59, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.15)',
    shadow: '#000000',
    iridescent: ['rgba(255,255,255,0.1)', 'transparent', 'rgba(255,255,255,0.05)'],
};

const lightColors = {
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    surfaceLight: '#F1F5F9', // Slate 100
    surfaceDeep: '#E2E8F0', // Slate 200
    border: 'rgba(0, 0, 0, 0.05)',
    text: '#0F172A',       // Slate 900
    textSecondary: '#64748B', // Slate 500
    primary: '#135bec',    // Consistent Royal Blue
    primaryLight: '#2563EB',
    primaryGlow: 'rgba(37, 99, 235, 0.15)',
    accent: '#059669',     // Emerald
    success: '#059669',
    error: '#DC2626',
    warning: '#D97706',
    card: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(19, 91, 236, 0.1)',
    shadow: '#64748B',
    iridescent: ['rgba(19, 91, 236, 0.05)', 'transparent', 'rgba(19, 91, 236, 0.02)'],
};
