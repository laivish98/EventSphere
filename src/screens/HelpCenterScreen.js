import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';

export default function HelpCenterScreen({ navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { user, userData } = useAuth();
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const FAQs = [
        { q: "How do I claim my certificate?", a: "Once an event organizer marks your ticket as 'Used' after you attend, a 'Claim Certificate' button will appear on your ticket in the 'My Tickets' section." },
        { q: "Can I cancel my registration?", a: "Currently, registrations are final to ensure fair capacity management. Please contact the event organizer directly for special cases." },
        { q: "How do I become an organizer?", a: "Organizer accounts are currently managed by university administrators. Contact your student council to request hosting permissions." },
        { q: "Where is my QR code?", a: "Your secure QR code is located inside each ticket in the 'My Tickets' tab. This code is unique to you and the event." }
    ];

    const handleSubmit = async () => {
        if (!subject || !description) {
            Alert.alert("Error", "Please fill in all fields before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'support_queries'), {
                userId: user.uid,
                userName: userData?.name || 'Unknown User',
                userEmail: user.email,
                subject,
                description,
                status: 'pending',
                timestamp: serverTimestamp()
            });

            Alert.alert("Success", "Your query has been submitted. Our team will get back to you via email soon.");
            setSubject('');
            setDescription('');
        } catch (error) {
            console.error("Error submitting query:", error);
            Alert.alert("Error", "Failed to submit query. Please try again later.");
        } finally {
            setSubmitting(false);
        }
    };

    const AccordionItem = ({ question, answer }) => {
        const [expanded, setExpanded] = useState(false);
        return (
            <TouchableOpacity
                style={[styles.faqItem, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.faqHeader}>
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{question}</Text>
                    <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                </View>
                {expanded && <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{answer}</Text>}
            </TouchableOpacity>
        );
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help Center</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FREQUENTLY ASKED</Text>
                <View style={styles.faqList}>
                    {FAQs.map((faq, index) => (
                        <AccordionItem key={index} question={faq.q} answer={faq.a} />
                    ))}
                </View>

                <View style={[styles.supportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.supportHeader}>
                        <View style={[styles.supportIcon, { backgroundColor: colors.primary + '15' }]}>
                            <MaterialCommunityIcons name="message-question-outline" size={24} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.supportTitle, { color: colors.text }]}>Still need help?</Text>
                            <Text style={[styles.supportSub, { color: colors.textSecondary }]}>Submit a query to our support team.</Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Subject"
                            placeholderTextColor={colors.textSecondary}
                            value={subject}
                            onChangeText={setSubject}
                        />
                        <TextInput
                            style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Describe your issue..."
                            placeholderTextColor={colors.textSecondary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.submitText}>Submit Query</Text>
                                    <MaterialCommunityIcons name="send" size={18} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
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
    sectionTitle: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
    faqList: { gap: 12, marginBottom: 32 },
    faqItem: { borderRadius: 16, borderWidth: 1, padding: 16 },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    faqQuestion: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 10 },
    faqAnswer: { fontSize: 14, lineHeight: 20, marginTop: 12, opacity: 0.8 },
    supportCard: { padding: 20, borderRadius: 24, borderWidth: 1 },
    supportHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    supportIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    supportTitle: { fontSize: 18, fontWeight: 'bold' },
    supportSub: { fontSize: 13, marginTop: 2 },
    form: { gap: 12 },
    input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
    textArea: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 15, minHeight: 120 },
    submitBtn: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
    submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
