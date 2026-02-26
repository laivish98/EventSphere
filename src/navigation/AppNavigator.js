import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import TicketScreen from '../screens/TicketScreen';
import ScanTicketScreen from '../screens/ScanTicketScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SponsorRegistrationScreen from '../screens/SponsorRegistrationScreen';
import OrganizerDashboardScreen from '../screens/OrganizerDashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EventChatScreen from '../screens/EventChatScreen';
import CertificateScreen from '../screens/CertificateScreen';
import EditEventScreen from '../screens/EditEventScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import AboutScreen from '../screens/AboutScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import SecurityScreen from '../screens/SecurityScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Welcome"
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
                <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
                <Stack.Screen name="Ticket" component={TicketScreen} />
                <Stack.Screen name="ScanTicket" component={ScanTicketScreen} />
                <Stack.Screen name="SponsorRegistration" component={SponsorRegistrationScreen} />
                <Stack.Screen name="OrganizerDashboard" component={OrganizerDashboardScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="EventChat" component={EventChatScreen} />
                <Stack.Screen name="Certificate" component={CertificateScreen} />
                <Stack.Screen name="EditEvent" component={EditEventScreen} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                <Stack.Screen name="FollowList" component={FollowListScreen} />
                <Stack.Screen name="About" component={AboutScreen} />
                <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
                <Stack.Screen name="Security" component={SecurityScreen} />
                {/* Add more screens here */}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
