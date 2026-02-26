import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function SecurityScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user, updateUserPassword, deleteUserAccount, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handlePasswordUpdate = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all password fields.");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match.");
            return;
        }

        setUpdating(true);
        try {
            await updateUserPassword(newPassword);
            Alert.alert("Success", "Your password has been updated.");
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/requires-recent-login') {
                Alert.alert("Verification Needed", "This action requires recent authentication. Please log out and log back in to change your password.");
            } else {
                Alert.alert("Error", error.message);
            }
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAccount = () => {
        const confirmDelete = () => {
            Alert.alert(
                "Delete Account",
                "Are you absolutely sure? This action is permanent and will delete all your data including tickets and profile information.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete My Account",
                        style: "destructive",
                        onPress: async () => {
                            setDeleting(true);
                            try {
                                await deleteUserAccount();
                                navigation.replace('Welcome');
                            } catch (error) {
                                console.error("Error deleting account:", error);
                                if (error.code === 'auth/requires-recent-login') {
                                    Alert.alert("Verification Needed", "This action requires recent authentication. Please log out and log back in to delete your account.");
                                } else {
                                    Alert.alert("Error", error.message);
                                }
                            } finally {
                                setDeleting(false);
                            }
                        }
                    }
                ]
            );
        };

        // Web fallback for Alert confirmation
        if (Platform.OS === 'web') {
            if (window.confirm("Are you absolutely sure? This action is permanent and will delete all your data including tickets and profile information.")) {
                confirmDelete();
            }
        } else {
            confirmDelete();
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Security & Privacy</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: '#f59e0b15' }]}>
                            <MaterialCommunityIcons name="lock-reset" size={24} color="#f59e0b" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Change Password</Text>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="New Password"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Confirm New Password"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: colors.primary }]}
                            onPress={handlePasswordUpdate}
                            disabled={updating}
                        >
                            {updating ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.btnText}>Update Password</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: '#ef444415' }]}>
                            <MaterialCommunityIcons name="account-remove-outline" size={24} color="#ef4444" />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Danger Zone</Text>
                    </View>
                    <Text style={[styles.dangerDesc, { color: colors.textSecondary }]}>
                        Deleting your account will remove all your data from EventSphere. This action cannot be undone.
                    </Text>
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]}
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                    >
                        {deleting ? <ActivityIndicator color="#ef4444" size="small" /> : <Text style={[styles.btnText, { color: '#ef4444' }]}>Delete Account</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>Your connection to EventSphere is encrypted.</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    backBtn: { padding: 4 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 17, fontWeight: 'bold' },
    form: { gap: 12 },
    input: { height: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
    btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    dangerDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20, opacity: 0.8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, opacity: 0.6 },
    infoText: { fontSize: 13, fontWeight: '500' }
});
