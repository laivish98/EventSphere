/**
 * Utility for parsing and comparing dates in the EventSphere app.
 * Expected format: "DD MON YYYY" or "DD MON"
 */

const MONTHS = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
};

/**
 * Checks if an event date has passed.
 * @param {string} dateString - The date string from Firestore (e.g., "25 OCT 2024")
 * @returns {boolean} - True if the date is in the past.
 */
export const isEventPast = (dateString) => {
    if (!dateString) return false;

    const parts = dateString.trim().split(' ');
    if (parts.length < 2) return false;

    const day = parseInt(parts[0]);
    const monthStr = parts[1].toUpperCase();
    const month = MONTHS[monthStr];

    if (month === undefined) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const eventYear = parts.length > 2 ? parseInt(parts[2]) : currentYear;

    // Create event date at the end of the day (23:59:59)
    const eventDate = new Date(eventYear, month, day, 23, 59, 59);

    // If no year was provided and the date seems to be in the past, assume it was for this year.
    // However, if it's very far in the past (e.g., Dec in Jan), it might be for the previous year, 
    // but typically events are forward-looking.

    return eventDate < now;
};

/**
 * Generates a Google Calendar link for an event.
 */
export const getGoogleCalendarUrl = (event) => {
    if (!event || !event.date) return null;

    const parts = event.date.trim().split(' ');
    if (parts.length < 2) return null;

    const day = parts[0].padStart(2, '0');
    const month = (MONTHS[parts[1].toUpperCase()] + 1).toString().padStart(2, '0');
    const now = new Date();
    const year = parts.length > 2 ? parts[2] : now.getFullYear().toString();

    // Format: YYYYMMDD
    const dateFormatted = `${year}${month}${day}`;

    // Default times: 10:00 AM to 02:00 PM
    const startTime = `${dateFormatted}T100000Z`;
    const endTime = `${dateFormatted}T140000Z`;

    const title = encodeURIComponent(event.title || 'EventSphere Event');
    const details = encodeURIComponent(event.description || 'Join us for this exciting event!');
    const location = encodeURIComponent(event.venue || '');

    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
};
