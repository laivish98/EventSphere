import React from 'react';
import { StyleSheet, Platform, View, Text } from 'react-native';

const EventMap = ({ event }) => {
    // Basic coordinates for Delhi/NCR fallback
    const defaultCoords = {
        latitude: event.latitude || 28.7501, // DTU Default
        longitude: event.longitude || 77.1177,
    };

    const MapView = require('react-native-maps').default;
    return (
        <MapView
            style={styles.map}
            initialRegion={{
                ...defaultCoords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
        >
            <Marker
                coordinate={defaultCoords}
                title={event.title}
                description={event.venue || event.location}
            />
        </MapView>
    );
};

const styles = StyleSheet.create({
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default EventMap;
