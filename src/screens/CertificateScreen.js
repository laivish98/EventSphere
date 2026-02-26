import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function CertificateScreen({ route, navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user } = useAuth();
    const { eventTitle, userName, date, university } = route.params;
    const [sending, setSending] = React.useState(false);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `I just received my certificate for participating in ${eventTitle} via EventSphere!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleSendToEmail = async () => {
        if (!user?.email) {
            alert("No email address found for your account.");
            return;
        }

        setSending(true);
        try {
            await addDoc(collection(db, 'mail'), {
                to: user.email,
                message: {
                    subject: `Your Certificate: ${eventTitle}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                            <h2 style="color: #135bec;">Congratulations, ${userName}!</h2>
                            <p>You have successfully received your Digital Certificate for participating in <strong>${eventTitle}</strong>.</p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                            <p><strong>Event:</strong> ${eventTitle}</p>
                            <p><strong>University:</strong> ${university}</p>
                            <p><strong>Date:</strong> ${date}</p>
                            <br />
                            <p>This certificate is verified by <strong>EventSphere</strong>.</p>
                        </div>
                    `
                },
                timestamp: serverTimestamp(),
                type: 'certificate_delivery'
            });
            alert("Success! Your certificate details have been sent to your email.");
        } catch (error) {
            console.error("Error triggering email:", error);
            alert("Failed to send email. Please try again later.");
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Digital Certificate</Text>
                <TouchableOpacity onPress={handleShare}>
                    <MaterialCommunityIcons name="share-variant" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.certificateContainer}>
                    <LinearGradient
                        colors={['#ffffff', '#f8fafc']}
                        style={styles.certificateCard}
                    >
                        {/* Decorative Border */}
                        <View style={styles.borderInner} />

                        <View style={styles.topSection}>
                            <MaterialCommunityIcons name="seal-variant" size={60} color={colors.primary} />
                            <Text style={styles.certHeading}>CERTIFICATE OF PARTICIPATION</Text>
                        </View>

                        <View style={styles.mainSection}>
                            <Text style={styles.certSub}>This is to certify that</Text>
                            <Text style={[styles.certName, { color: colors.primary }]}>{userName}</Text>
                            <Text style={styles.universityName}>{university}</Text>
                            <Text style={[styles.certSub, { marginTop: 12 }]}>has successfully participated in</Text>
                            <Text style={styles.certEvent}>{eventTitle}</Text>
                        </View>

                        <View style={styles.bottomSection}>
                            <View style={styles.divider} />
                            <Text style={styles.certDate}>{date}</Text>
                            <View style={styles.verifiedBadge}>
                                <MaterialCommunityIcons name="check-decagram" size={16} color={colors.primary} />
                                <Text style={[styles.verifiedText, { color: colors.primary }]}>EventSphere Verified</Text>
                            </View>
                            <View style={styles.signatureContainer}>
                                <Text style={styles.signatureText}>EventSphere</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={handleShare}
                    >
                        <MaterialCommunityIcons name="share-variant" size={20} color="white" />
                        <Text style={styles.btnText}>Share Certificate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderWidth: 1, borderColor: colors.border }]}
                        onPress={handleSendToEmail}
                        disabled={sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="email-outline" size={20} color={colors.text} />
                                <Text style={[styles.btnText, { color: colors.text }]}>Send to My Email</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    certificateContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    certificateCard: {
        backgroundColor: 'white',
        padding: 40,
        borderRadius: 4,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        alignItems: 'center',
        position: 'relative',
    },
    borderInner: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 2,
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    certHeading: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
        marginTop: 16,
        letterSpacing: 2,
    },
    mainSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    certSub: {
        fontSize: 12,
        color: '#64748b',
        marginVertical: 4,
    },
    certName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#135bec',
        marginTop: 12,
        marginBottom: 4,
        textAlign: 'center',
    },
    universityName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    certEvent: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginTop: 8,
        textAlign: 'center',
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
    },
    divider: {
        width: '80%',
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 16,
    },
    certDate: {
        fontSize: 12,
        color: '#1e293b',
        fontWeight: '600',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    signatureContainer: {
        marginTop: 20,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        width: 100,
        alignItems: 'center',
    },
    signatureText: {
        fontFamily: Platform.OS === 'ios' ? 'SnellRoundhand' : 'serif',
        fontSize: 14,
        color: '#111722',
        fontStyle: 'italic',
    },
    buttonGroup: {
        paddingHorizontal: 24,
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
