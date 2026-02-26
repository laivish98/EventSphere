import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import {
    collection, query, orderBy, onSnapshot,
    addDoc, serverTimestamp, where, getDocs, doc, getDoc
} from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';

export default function EventChatScreen({ route, navigation }) {
    const { colors, isDarkMode } = useTheme();
    const { eventId, eventTitle } = route.params || {};
    const { user, userData } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAttendee, setIsAttendee] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const flatListRef = useRef();

    useEffect(() => {
        if (!user || !eventId) {
            setVerifying(false);
            setLoading(false);
            return;
        }

        const checkAccess = async () => {
            try {
                // Check if user is attendee
                const qReg = query(
                    collection(db, 'registrations'),
                    where('eventId', '==', eventId),
                    where('userId', '==', user.uid)
                );
                const regSnap = await getDocs(qReg);

                // Check if user is organizer of this event
                const eventRef = doc(db, 'events', eventId);
                const eventSnap = await getDoc(eventRef);
                const isOrganizer = eventSnap.exists() && eventSnap.data().createdBy === user.uid;

                if (!regSnap.empty || isOrganizer) {
                    setIsAttendee(true);
                    startChatListener();
                } else {
                    Alert.alert('Access Denied', 'Only registered attendees and organizers can join this community chat.');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Error checking access:', error);
                setVerifying(false);
                setLoading(false);
                Alert.alert('Error', 'Wait, we couldn\'t verify your access. Please check your connection and try again.');
            } finally {
                setVerifying(false);
            }
        };

        const startChatListener = () => {
            const q = query(
                collection(db, 'event_chats'),
                where('eventId', '==', eventId)
            );

            const unsub = onSnapshot(q, (snap) => {
                const msgs = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort client-side to avoid missing index requirement
                msgs.sort((a, b) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    return timeA - timeB;
                });
                setMessages(msgs);
                setLoading(false);
            }, (error) => {
                console.error('Chat Listener Error:', error);
                // If it's a missing index error, the message will contain a link
                Alert.alert('Chat Error', 'Could not load messages. This might be due to a missing index or permissions. ' + error.message);
                setLoading(false);
            });
            return unsub;
        };

        checkAccess();
    }, [user, eventId]);

    // Previous useEffect removed to prevent double listeners or early starts

    const sendMessage = async () => {
        if (inputText.trim() === '' || !user) return;

        const messageData = {
            eventId,
            text: inputText.trim(),
            senderId: user.uid,
            senderName: userData?.name || 'Anonymous',
            timestamp: serverTimestamp(),
        };

        setInputText('');
        try {
            await addDoc(collection(db, 'event_chats'), messageData);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === user?.uid;
        return (
            <View style={[
                styles.messageWrapper,
                isMe ? styles.myMessageWrapper : styles.theirMessageWrapper
            ]}>
                {!isMe && <Text style={[styles.senderName, { color: colors.primary }]}>{item.senderName}</Text>}
                <View style={[
                    styles.messageBubble,
                    isMe ? [styles.myBubble, { backgroundColor: colors.primary }] : [styles.theirBubble, { backgroundColor: colors.surface, borderColor: colors.border }]
                ]}>
                    <Text style={[
                        styles.messageText,
                        isMe ? styles.myMessageText : [styles.theirMessageText, { color: colors.text }]
                    ]}>
                        {item.text}
                    </Text>
                </View>
                <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                    {item.timestamp?.toDate ?
                        item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                        'Sending...'}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={32} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{eventTitle || 'Event Chat'}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Event Community Chat</Text>
                </View>
            </View>

            {(!eventId || !user) && (
                <View style={styles.loadingContainer}>
                    <Text style={{ color: colors.textSecondary }}>Invalid Event Session</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.chatContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.textSecondary}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: colors.primary }, !inputText.trim() && { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <MaterialCommunityIcons name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    backBtn: {
        marginRight: 12,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatContent: {
        padding: 20,
        paddingBottom: 40,
    },
    messageWrapper: {
        marginBottom: 16,
        maxWidth: '80%',
    },
    myMessageWrapper: {
        alignSelf: 'flex-end',
    },
    theirMessageWrapper: {
        alignSelf: 'flex-start',
    },
    senderName: {
        color: '#135bec',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        marginLeft: 4,
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    myBubble: {
        backgroundColor: '#135bec',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: 'white',
    },
    theirMessageText: {
        color: '#e2e8f0',
    },
    timestamp: {
        color: '#64748b',
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 10,
        maxHeight: 100,
        borderWidth: 1,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#135bec',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    sendBtnDisabled: {
        backgroundColor: '#1e293b',
    },
});
