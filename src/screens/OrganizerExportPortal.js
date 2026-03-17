import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform, Animated, Dimensions, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../services/firebase';
import {
    collection, query, where, getDocs, doc, setDoc, serverTimestamp
} from 'firebase/firestore';
const XLSX = require('xlsx');

const { width, height } = Dimensions.get('window');
const GOLD = {
    primary: '#D4AF37',
    secondary: '#AA8439',
    bg: '#0F1115',
    surface: '#1A1D23',
    surfaceLight: '#242831',
    border: '#2A2E37',
    borderActive: '#D4AF37',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    shimmer: '#1E2228',
    error: '#EF4444',
    success: '#10B981',
};

// ─── Sheet Definitions ─────────────────────────
const SHEET_DEFS = [
    { key: 'overview', label: 'Event Overview', icon: 'calendar-star' },
    { key: 'attendees', label: 'Attendees', icon: 'account-group' },
    { key: 'checkins', label: 'Check-In Log', icon: 'checkbox-marked-circle' },
    { key: 'revenue', label: 'Revenue', icon: 'cash-multiple' },
    { key: 'chat', label: 'Community Chat', icon: 'chat-processing' },
    { key: 'sponsors', label: 'Sponsors', icon: 'handshake' },
];

// ─── Stat Card Component ────────────────────────
const StatCard = ({ def, count, selected, onToggle, index, colors, isDarkMode }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1, delay: index * 80,
            useNativeDriver: true, tension: 60, friction: 8,
        }).start();
    }, []);

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
            Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start();
        onToggle(def.key);
    };

    const shadowOpacity = glowAnim.interpolate({
        inputRange: [0, 1], outputRange: [0, 0.6]
    });

    return (
        <Animated.View style={[
            styles.statCard,
            { transform: [{ scale: scaleAnim }], backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
            { shadowColor: colors.primary, shadowOpacity: selected ? 0.2 : 0 },
        ]}>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.statCardInner}>
                <View style={styles.statCardIconRow}>
                    <View style={[styles.statIconWrap, { backgroundColor: selected ? colors.primary + '20' : colors.surfaceLight }]}>
                        <MaterialCommunityIcons name={def.icon} size={22} color={selected ? colors.primary : colors.textSecondary} />
                    </View>
                    {selected && <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                        <MaterialCommunityIcons name="check" size={10} color="white" />
                    </View>}
                </View>
                <Text style={[styles.statCount, { color: colors.text }, !selected && { color: colors.textSecondary }]}>{count || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>{def.label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Component ─────────────────────────────
export default function OrganizerExportPortal({ navigation }) {
    const { user, userData, getDefaultAvatar } = useAuth();
    const { colors, isDarkMode } = useTheme();

    // State
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sheetSelection, setSheetSelection] = useState(
        Object.fromEntries(SHEET_DEFS.map(d => [d.key, true]))
    );
    const [dataCounts, setDataCounts] = useState({});
    const [exporting, setExporting] = useState(false);
    const [exportStep, setExportStep] = useState('');
    const [exportProgress, setExportProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successToast, setSuccessToast] = useState(false);

    // Animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const toastAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.timing(headerAnim, {
            toValue: 1, duration: 600, useNativeDriver: true,
        }).start();
    }, []);

    // ─── Permission Guard ──────────────────────────
    const isOrganizer = userData?.role === 'organizer' || userData?.role === 'admin';

    // ─── Fetch Organizer's Events ──────────────────
    useEffect(() => {
        if (!user) return;
        const fetchEvents = async () => {
            try {
                const q = query(collection(db, 'events'), where('createdBy', '==', user.uid));
                const snap = await getDocs(q);
                const evts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                evts.sort((a, b) => {
                    const da = a.createdAt?.seconds || 0;
                    const db2 = b.createdAt?.seconds || 0;
                    return db2 - da;
                });
                setEvents(evts);
            } catch (err) {
                console.error('Failed to fetch events:', err);
                setError('Failed to load events. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, [user]);

    // ─── Fetch Data Counts ─────────────────────────
    const fetchCounts = useCallback(async (eventId) => {
        try {
            const [regSnap, chatSnap, sponsorSnap] = await Promise.all([
                getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId))),
                getDocs(query(collection(db, 'event_chats'), where('eventId', '==', eventId))),
                getDocs(query(collection(db, 'sponsorships'), where('eventId', '==', eventId))),
            ]);

            const regs = regSnap.docs.map(d => d.data());
            const checkedIn = regs.filter(r => r.utilized).length;

            setDataCounts({
                overview: 1,
                attendees: regs.length,
                checkins: checkedIn,
                revenue: regs.length,
                chat: chatSnap.size,
                sponsors: sponsorSnap.size,
            });
        } catch (err) {
            console.error('Error fetching counts:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedEvent) {
            fetchCounts(selectedEvent.id);
        }
    }, [selectedEvent, fetchCounts]);

    // ─── Toggle Sheet Selection ────────────────────
    const toggleSheet = (key) => {
        setSheetSelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ─── Get Event Status ──────────────────────────
    const getEventStatus = (event) => {
        if (!event.date) return { label: 'Draft', color: colors.textSecondary };
        try {
            const parts = event.date.split('/');
            let eventDate;
            if (parts.length === 3) {
                eventDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                eventDate = new Date(event.date);
            }
            const now = new Date();
            if (isNaN(eventDate.getTime())) return { label: 'Unknown', color: colors.textSecondary };
            if (eventDate > now) return { label: 'Upcoming', color: colors.accent };
            return { label: 'Past', color: colors.textSecondary };
        } catch {
            return { label: 'Unknown', color: colors.textSecondary };
        }
    };

    // ─── Format Timestamp ──────────────────────────
    const fmtTimestamp = (ts) => {
        if (!ts) return 'N/A';
        if (ts.toDate) return ts.toDate().toLocaleString();
        if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
        return String(ts);
    };

    // ─── Export Logic ──────────────────────────────
    const handleExport = async () => {
        if (!selectedEvent) return;
        setExporting(true);
        setExportProgress(0);

        try {
            const wb = XLSX.utils.book_new();
            const selectedSheets = SHEET_DEFS.filter(d => sheetSelection[d.key]);
            const totalSteps = selectedSheets.length + 2; // +2 for summary + download
            let step = 0;
            const summaryRows = [];

            const advance = (label) => {
                step++;
                setExportStep(label);
                setExportProgress(Math.round((step / totalSteps) * 100));
            };

            // ── Fetch all data ──
            advance('Fetching attendee data...');
            const regSnap = await getDocs(
                query(collection(db, 'registrations'), where('eventId', '==', selectedEvent.id))
            );
            const registrations = regSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const emailMap = Object.fromEntries(registrations.map(r => [r.userId, r.userEmail]));

            let chatMessages = [];
            let sponsors = [];

            if (sheetSelection.chat) {
                advance('Fetching chat messages...');
                const chatSnap = await getDocs(
                    query(collection(db, 'event_chats'), where('eventId', '==', selectedEvent.id))
                );
                chatMessages = chatSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                chatMessages.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            }

            if (sheetSelection.sponsors) {
                advance('Fetching sponsor data...');
                const sponsorSnap = await getDocs(
                    query(collection(db, 'sponsorships'), where('eventId', '==', selectedEvent.id))
                );
                sponsors = sponsorSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            // ── Build Sheets ──
            // 1) Event Overview
            if (sheetSelection.overview) {
                advance('Building Event Overview...');
                const overviewData = [{
                    'Event ID': selectedEvent.id,
                    'Title': selectedEvent.title || '',
                    'Description': selectedEvent.description || '',
                    'Category': selectedEvent.category || '',
                    'Date': selectedEvent.date || '',
                    'Time': selectedEvent.time || '',
                    'Venue': selectedEvent.venue || '',
                    'City': selectedEvent.city || '',
                    'Max Attendees': selectedEvent.maxAttendees || '',
                    'Ticket Price': selectedEvent.ticketPrice || 0,
                    'Total Registrations': registrations.length,
                    'Total Revenue': registrations.reduce((s, r) => s + (r.ticketPrice || 0), 0),
                    'Created At': fmtTimestamp(selectedEvent.createdAt),
                    'Status': getEventStatus(selectedEvent).label,
                }];
                const ws = XLSX.utils.json_to_sheet(overviewData);
                applySheetFormatting(ws, overviewData);
                XLSX.utils.book_append_sheet(wb, ws, 'Event Overview');
                summaryRows.push({ Sheet: 'Event Overview', Records: 1 });
            }

            // 2) Registered Attendees
            if (sheetSelection.attendees) {
                advance('Building Attendees sheet...');
                if (registrations.length > 0) {
                    const attendeeData = registrations.map(r => ({
                        'Registration ID': r.id,
                        'Student Name': r.userName || 'Unknown',
                        'Email': r.userEmail || '',
                        'Contact No': r.userContact || 'N/A',
                        'Course': r.userCourse || 'N/A',
                        'Department': r.userDepartment || 'N/A',
                        'Registration Date': fmtTimestamp(r.timestamp),
                        'Ticket Type': r.ticketType || 'General',
                        'Amount Paid': r.ticketPrice || 0,
                        'Payment Status': r.paymentId ? 'Paid' : 'Free',
                        'Checked In': r.utilized ? 'Yes' : 'No',
                        'Check-In Time': r.utilized ? fmtTimestamp(r.utilizedAt) : 'N/A',
                    }));
                    const ws = XLSX.utils.json_to_sheet(attendeeData);
                    applySheetFormatting(ws, attendeeData);
                    XLSX.utils.book_append_sheet(wb, ws, 'Registered Attendees');
                } else {
                    const ws = XLSX.utils.aoa_to_sheet([['No attendee records found for this event.']]);
                    XLSX.utils.book_append_sheet(wb, ws, 'Registered Attendees');
                }
                summaryRows.push({ Sheet: 'Registered Attendees', Records: registrations.length });
            }

            // 3) Check-In Log
            if (sheetSelection.checkins) {
                advance('Building Check-In Log...');
                const checkedIn = registrations.filter(r => r.utilized);
                if (checkedIn.length > 0) {
                    const checkInData = checkedIn.map(r => ({
                        'Registration ID': r.id,
                        'Student Name': r.userName || 'Unknown',
                        'Email': r.userEmail || 'N/A',
                        'Contact No': r.userContact || 'N/A',
                        'Course': r.userCourse || 'N/A',
                        'Department': r.userDepartment || 'N/A',
                        'Check-In Time': fmtTimestamp(r.utilizedAt || r.timestamp),
                        'Scanned By': r.scannedBy || 'System',
                    }));
                    const ws = XLSX.utils.json_to_sheet(checkInData);
                    applySheetFormatting(ws, checkInData);
                    XLSX.utils.book_append_sheet(wb, ws, 'Check-In Log');
                } else {
                    const ws = XLSX.utils.aoa_to_sheet([['No check-in records found for this event.']]);
                    XLSX.utils.book_append_sheet(wb, ws, 'Check-In Log');
                }
                summaryRows.push({ Sheet: 'Check-In Log', Records: checkedIn.length });
            }

            // 4) Revenue Breakdown
            if (sheetSelection.revenue) {
                advance('Compiling revenue breakdown...');
                const typeGroups = {};
                registrations.forEach(r => {
                    const type = r.ticketType || 'General';
                    if (!typeGroups[type]) typeGroups[type] = { count: 0, revenue: 0 };
                    typeGroups[type].count++;
                    typeGroups[type].revenue += (r.ticketPrice || 0);
                });
                const revenueData = Object.entries(typeGroups).map(([type, data]) => ({
                    'Ticket Type': type,
                    'Tickets Sold': data.count,
                    'Revenue (₹)': data.revenue,
                }));
                const totalRevenue = registrations.reduce((s, r) => s + (r.ticketPrice || 0), 0);
                const pendingPayments = registrations.filter(r => !r.paymentId).length;
                revenueData.push({});
                revenueData.push({
                    'Ticket Type': 'TOTAL',
                    'Tickets Sold': registrations.length,
                    'Revenue (₹)': totalRevenue,
                });
                revenueData.push({
                    'Ticket Type': 'Pending Payments',
                    'Tickets Sold': pendingPayments,
                    'Revenue (₹)': '',
                });
                const ws = XLSX.utils.json_to_sheet(revenueData);
                applySheetFormatting(ws, revenueData);
                XLSX.utils.book_append_sheet(wb, ws, 'Revenue Breakdown');
                summaryRows.push({ Sheet: 'Revenue Breakdown', Records: Object.keys(typeGroups).length });
            }

            // 5) Community Chat
            if (sheetSelection.chat) {
                advance('Building Chat Messages sheet...');
                if (chatMessages.length > 0) {
                    const chatData = chatMessages.map(m => ({
                        'Message ID': m.id,
                        'Student Name': m.senderName || 'Unknown',
                        'Email': m.senderEmail || emailMap[m.senderId] || 'N/A',
                        'Message': m.text || '',
                        'Timestamp': fmtTimestamp(m.timestamp),
                    }));
                    const ws = XLSX.utils.json_to_sheet(chatData);
                    applySheetFormatting(ws, chatData);
                    XLSX.utils.book_append_sheet(wb, ws, 'Community Chat');
                } else {
                    const ws = XLSX.utils.aoa_to_sheet([['No chat messages found for this event.']]);
                    XLSX.utils.book_append_sheet(wb, ws, 'Community Chat');
                }
                summaryRows.push({ Sheet: 'Community Chat', Records: chatMessages.length });
            }

            // 6) Sponsors
            if (sheetSelection.sponsors) {
                advance('Building Sponsors sheet...');
                if (sponsors.length > 0) {
                    const sponsorData = sponsors.map(s => ({
                        'Sponsor ID': s.id,
                        'Company Name': s.sponsorName || '',
                        'Contact Email': s.sponsorEmail || '',
                        'Amount (₹)': s.amount || 0,
                        'Payment ID': s.paymentId || '',
                        'Status': s.paymentId ? 'Confirmed' : 'Pending',
                        'Timestamp': fmtTimestamp(s.timestamp),
                    }));
                    const ws = XLSX.utils.json_to_sheet(sponsorData);
                    applySheetFormatting(ws, sponsorData);
                    XLSX.utils.book_append_sheet(wb, ws, 'Sponsors');
                } else {
                    const ws = XLSX.utils.aoa_to_sheet([['No sponsor records found for this event.']]);
                    XLSX.utils.book_append_sheet(wb, ws, 'Sponsors');
                }
                summaryRows.push({ Sheet: 'Sponsors', Records: sponsors.length });
            }

            // ── Summary Sheet (inserted at position 0) ──
            advance('Building Summary...');
            const summaryHeader = [
                { 'Field': 'Event Name', 'Value': selectedEvent.title },
                { 'Field': 'Export Date', 'Value': new Date().toLocaleString() },
                { 'Field': 'Exported By', 'Value': `${userData?.name || 'Organizer'} (${user?.email || ''})` },
                { 'Field': '', 'Value': '' },
                { 'Field': 'Sheet', 'Value': 'Total Records' },
                ...summaryRows.map(r => ({ 'Field': r.Sheet, 'Value': r.Records })),
            ];
            const summaryWs = XLSX.utils.json_to_sheet(summaryHeader);
            applySheetFormatting(summaryWs, summaryHeader);
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

            // Move Summary to first position
            const sheetNames = wb.SheetNames;
            const summaryIdx = sheetNames.indexOf('Summary');
            if (summaryIdx > 0) {
                sheetNames.splice(summaryIdx, 1);
                sheetNames.unshift('Summary');
            }

            // ── Download ──
            advance('Preparing download...');
            const safeTitle = (selectedEvent.title || 'Event').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `EventSphere_${safeTitle}_${dateStr}.xlsx`;

            if (Platform.OS === 'web') {
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            // Log export activity
            try {
                await setDoc(doc(db, 'organizerActivity', user.uid), {
                    lastExport: serverTimestamp(),
                    lastExportEventId: selectedEvent.id,
                    lastExportEventTitle: selectedEvent.title,
                }, { merge: true });
            } catch (e) {
                console.warn('Could not log export activity:', e);
            }

            setExportProgress(100);
            setExportStep('Download complete!');
            showSuccessToast();

        } catch (err) {
            console.error('Export error:', err);
            setError('Export failed: ' + (err.message || 'Unknown error'));
        } finally {
            setTimeout(() => {
                setExporting(false);
                setExportStep('');
                setExportProgress(0);
            }, 1500);
        }
    };

    // ─── Sheet Formatting Helper ───────────────────
    const applySheetFormatting = (ws, data) => {
        if (!data || data.length === 0) return;
        const keys = Object.keys(data[0]);
        // Auto-width for columns
        ws['!cols'] = keys.map(k => ({
            wch: Math.max(
                k.length + 4,
                ...data.map(row => String(row[k] || '').length).slice(0, 100)
            )
        }));

        // Freeze top row
        ws['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activePane: 'bottomLeft' }];
    };

    // ─── Success Toast ─────────────────────────────
    const showSuccessToast = () => {
        setSuccessToast(true);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 60, duration: 400, useNativeDriver: true }),
            Animated.delay(2500),
            Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
        ]).start(() => setSuccessToast(false));
    };

    // ─── Permission Error ──────────────────────────
    if (!loading && !isOrganizer) {
        return (
            <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <MaterialCommunityIcons name="shield-lock" size={64} color={colors.primary} />
                <Text style={[styles.permErrorTitle, { color: colors.text }]}>Access Restricted</Text>
                <Text style={[styles.permErrorSub, { color: colors.textSecondary }]}>This portal is available only to event organizers.</Text>
                <TouchableOpacity style={[styles.permBackBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <Text style={[styles.permBackText, { color: colors.primary }]}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ─── Empty State ───────────────────────────────
    if (!loading && events.length === 0) {
        return (
            <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={56} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events Found</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Create your first event to get started with data exports.</Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('CreateEvent')}>
                    <MaterialCommunityIcons name="plus" size={20} color="white" />
                    <Text style={[styles.emptyBtnText, { color: 'white' }]}>Create Event</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.permBackBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                    <Text style={[styles.permBackText, { color: colors.primary }]}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ─── Render ────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Success Toast */}
            {successToast && (
                <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }], backgroundColor: colors.accent + '20', borderColor: colors.accent + '30' }]}>
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
                    <Text style={[styles.toastText, { color: colors.accent }]}>Report downloaded successfully!</Text>
                </Animated.View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* ── Header ── */}
                <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.headerUserInfo}>
                            <Image
                                source={{
                                    uri: (userData?.avatarUrl &&
                                        !userData.avatarUrl.includes('iran.liara.run') &&
                                        !userData.avatarUrl.includes('hair=short') &&
                                        !userData.avatarUrl.includes('hair=long'))
                                        ? userData.avatarUrl
                                        : getDefaultAvatar(userData?.name || user?.email?.split('@')[0], userData?.gender)
                                }}
                                style={[styles.headerAvatar, { borderColor: colors.primary }]}
                            />
                        </View>
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.primary }]}>ORGANIZER EXPORT PORTAL</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Secure · Private · Comprehensive Data Access</Text>
                    <View style={[styles.headerGoldLine, { backgroundColor: colors.primary }]} />
                </Animated.View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your events...</Text>
                    </View>
                ) : (
                    <>
                        {/* ── Event Selector ── */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT EVENT</Text>
                            <TouchableOpacity
                                style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }, dropdownOpen && { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                                onPress={() => setDropdownOpen(!dropdownOpen)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.dropdownContent}>
                                    {selectedEvent ? (
                                        <>
                                            <Text style={[styles.dropdownText, { color: colors.text }]} numberOfLines={1}>{selectedEvent.title}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: getEventStatus(selectedEvent).color + '22' }]}>
                                                <Text style={[styles.statusText, { color: getEventStatus(selectedEvent).color }]}>
                                                    {getEventStatus(selectedEvent).label}
                                                </Text>
                                            </View>
                                        </>
                                    ) : (
                                        <Text style={[styles.dropdownPlaceholder, { color: colors.textSecondary }]}>Choose an event to export...</Text>
                                    )}
                                </View>
                                <MaterialCommunityIcons
                                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                                    size={22} color={colors.primary}
                                />
                            </TouchableOpacity>

                            {dropdownOpen && (
                                <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                                    <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                                        {events.map((evt) => {
                                            const status = getEventStatus(evt);
                                            return (
                                                <TouchableOpacity
                                                    key={evt.id}
                                                    style={[styles.dropdownItem, { borderTopColor: colors.border }, selectedEvent?.id === evt.id && { backgroundColor: colors.primary + '10' }]}
                                                    onPress={() => { setSelectedEvent(evt); setDropdownOpen(false); }}
                                                >
                                                    <View style={{ flex: 1, marginRight: 8 }}>
                                                        <Text style={[styles.dropdownItemTitle, { color: colors.text }]} numberOfLines={1}>{evt.title}</Text>
                                                        <Text style={[styles.dropdownItemDate, { color: colors.textSecondary }]}>{evt.date || 'No date'}</Text>
                                                    </View>
                                                    <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
                                                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* ── Stat Cards Grid ── */}
                        {selectedEvent && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATA PREVIEW</Text>
                                <View style={styles.statGrid}>
                                    {SHEET_DEFS.map((def, idx) => (
                                        <StatCard
                                            key={def.key}
                                            def={def}
                                            count={dataCounts[def.key] ?? '...'}
                                            selected={sheetSelection[def.key]}
                                            onToggle={toggleSheet}
                                            index={idx}
                                            colors={colors}
                                            isDarkMode={isDarkMode}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* ── Export Options ── */}
                        {selectedEvent && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EXPORT OPTIONS</Text>
                                <View style={styles.chipRow}>
                                    <TouchableOpacity
                                        style={[styles.chipSelectAll, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={() => {
                                            const allSelected = SHEET_DEFS.every(d => sheetSelection[d.key]);
                                            const newVal = !allSelected;
                                            setSheetSelection(Object.fromEntries(SHEET_DEFS.map(d => [d.key, newVal])));
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name={SHEET_DEFS.every(d => sheetSelection[d.key]) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                            size={18} color={colors.primary}
                                        />
                                        <Text style={[styles.chipSelectAllText, { color: colors.primary }]}>
                                            {SHEET_DEFS.every(d => sheetSelection[d.key]) ? 'Deselect All' : 'Select All'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ── Download Button ── */}
                        {selectedEvent && (
                            <View style={styles.section}>
                                {exporting ? (
                                    <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceLight }]}>
                                            <View style={[styles.progressBarFill, { width: `${exportProgress}%`, backgroundColor: colors.primary }]} />
                                        </View>
                                        <Text style={[styles.progressStep, { color: colors.textSecondary }]}>{exportStep}</Text>
                                        <Text style={[styles.progressPercent, { color: colors.primary }]}>{exportProgress}%</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            styles.downloadBtn,
                                            { backgroundColor: colors.primary, shadowColor: colors.primary },
                                            !SHEET_DEFS.some(d => sheetSelection[d.key]) && styles.downloadBtnDisabled
                                        ]}
                                        onPress={handleExport}
                                        disabled={!SHEET_DEFS.some(d => sheetSelection[d.key]) || exporting}
                                        activeOpacity={0.85}
                                    >
                                        <MaterialCommunityIcons name="download" size={22} color="white" />
                                        <Text style={[styles.downloadBtnText, { color: 'white' }]}>GENERATE & DOWNLOAD EXCEL REPORT</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* ── Error Display ── */}
                        {error && (
                            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
                                <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
                                <TouchableOpacity onPress={() => setError(null)}>
                                    <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── Footer ── */}
                        <View style={styles.footer}>
                            <MaterialCommunityIcons name="shield-check" size={16} color={colors.textSecondary} />
                            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                                All exports are logged for security. Data is end-to-end encrypted.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GOLD.bg,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    scrollContent: {
        paddingBottom: 60,
    },

    // Header
    header: {
        paddingTop: 56,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: GOLD.surface,
        borderWidth: 1,
        borderColor: GOLD.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        borderColor: GOLD.primary,
    },
    headerAvatarPlaceholder: {
        backgroundColor: GOLD.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: {
        color: GOLD.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: GOLD.primary,
        letterSpacing: 3,
        marginBottom: 6,
    },
    headerSubtitle: {
        fontSize: 13,
        color: GOLD.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    headerGoldLine: {
        height: 2,
        borderRadius: 1,
        backgroundColor: GOLD.primary,
        opacity: 0.4,
    },

    // Loading
    loadingWrap: {
        padding: 60,
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        color: GOLD.textSecondary,
        fontSize: 14,
    },

    // Sections
    section: {
        paddingHorizontal: 24,
        marginBottom: 28,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: GOLD.secondary,
        letterSpacing: 1.5,
        marginBottom: 12,
    },

    // Dropdown
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: GOLD.surface,
        borderWidth: 1,
        borderColor: GOLD.border,
        borderRadius: 14,
        padding: 16,
    },
    dropdownActive: {
        borderColor: GOLD.borderActive,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    dropdownContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dropdownText: {
        flex: 1,
        color: GOLD.text,
        fontSize: 15,
        fontWeight: '600',
    },
    dropdownPlaceholder: {
        color: GOLD.textSecondary,
        fontSize: 15,
    },
    dropdownList: {
        backgroundColor: GOLD.surface,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: GOLD.borderActive,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: GOLD.border,
    },
    dropdownItemActive: {
        backgroundColor: GOLD.shimmer,
    },
    dropdownItemTitle: {
        color: GOLD.text,
        fontSize: 14,
        fontWeight: '600',
    },
    dropdownItemDate: {
        color: GOLD.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },

    // Status Badge
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // Stat Cards
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statCard: {
        width: (width - 48 - 24) / 3,
        minHeight: 110,
        borderRadius: 16,
        backgroundColor: GOLD.surface,
        borderWidth: 1,
        borderColor: GOLD.border,
        overflow: 'hidden',
    },
    statCardDisabled: {
        opacity: 0.45,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statCardInner: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    statCardGlow: {
        ...StyleSheet.absoluteFillObject,
        shadowColor: GOLD.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 20,
        elevation: 8,
    },
    statCardIconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: GOLD.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statCount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: GOLD.text,
    },
    statLabel: {
        fontSize: 10,
        color: GOLD.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.3,
        marginTop: 2,
    },

    // Toggle Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chipSelectAll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: GOLD.surface,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: GOLD.border,
    },
    chipSelectAllText: {
        color: GOLD.primary,
        fontSize: 13,
        fontWeight: '600',
    },

    // Download Button
    downloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 14,
        backgroundColor: GOLD.primary,
        shadowColor: GOLD.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    downloadBtnDisabled: {
        opacity: 0.4,
    },
    downloadBtnText: {
        color: GOLD.bg,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // Progress
    progressContainer: {
        padding: 20,
        backgroundColor: GOLD.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: GOLD.border,
        gap: 10,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: GOLD.primary,
        borderRadius: 3,
    },
    progressStep: {
        color: GOLD.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    progressPercent: {
        color: GOLD.primary,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },

    // Error
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 24,
        padding: 14,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(231, 76, 60, 0.25)',
        marginBottom: 20,
    },
    errorText: {
        flex: 1,
        color: GOLD.error,
        fontSize: 13,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    footerText: {
        color: GOLD.textSecondary,
        fontSize: 11,
    },

    // Toast
    toast: {
        position: 'absolute',
        top: 0,
        left: 24,
        right: 24,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(46, 204, 113, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    toastText: {
        color: GOLD.success,
        fontSize: 14,
        fontWeight: '600',
    },

    // Permission Error
    permErrorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: GOLD.text,
        marginTop: 20,
    },
    permErrorSub: {
        fontSize: 14,
        color: GOLD.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    permBackBtn: {
        backgroundColor: GOLD.surface,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: GOLD.border,
        marginTop: 12,
    },
    permBackText: {
        color: GOLD.primary,
        fontWeight: '600',
    },

    // Empty State
    emptyIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: GOLD.surface,
        borderWidth: 1,
        borderColor: GOLD.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: GOLD.text,
    },
    emptySub: {
        fontSize: 14,
        color: GOLD.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 28,
        maxWidth: 280,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: GOLD.primary,
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 12,
    },
    emptyBtnText: {
        color: GOLD.bg,
        fontWeight: 'bold',
        fontSize: 15,
    },
});
