import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EventMap = ({ event, openMaps, colors }) => {
    const venue = event.venue || event.location || 'Delhi';
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(venue)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    return (
        <View style={styles.container}>
            <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0, borderRadius: 20 }}
                src={embedUrl}
                allowFullScreen
            />
            <TouchableOpacity
                style={[styles.floatingButton, { backgroundColor: colors.primary }]}
                onPress={openMaps}
            >
                <MaterialCommunityIcons name="google-maps" size={20} color="white" />
                <Text style={styles.buttonText}>Open App</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
});

export default EventMap;
