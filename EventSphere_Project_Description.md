# EventSphere Project Documentation

## 1. Project Overview
**EventSphere** is a comprehensive, cross-platform event management application built with React Native and Expo. It allows users to discover, register for, and manage events, while providing organizers with robust tools to create events, track analytics, scan tickets, and manage attendees. The app heavily leverages Firebase for backend services (Authentication, Firestore Database) and integrates Razorpay for processing payments.

## 2. Technology Stack
*   **Core Framework**: React Native (v0.81.5), Expo (v54.x)
*   **Web Support**: `react-native-web`, `@expo/metro-runtime`
*   **Navigation**: `@react-navigation/native`, `@react-navigation/native-stack`
*   **UI Library**: React Native Paper (`react-native-paper`), `react-native-vector-icons`, `react-native-safe-area-context`
*   **Backend & Auth**: Firebase v12.x (Auth, Firestore)
*   **Payment Gateway**: Razorpay (`react-native-razorpay`)
*   **Media & Hardware**: 
    *   Expo Camera / Barcode Scanner (for QR code ticket scanning)
    *   Expo Image Picker (for event/profile images)
    *   React Native Maps (for event location)
    *   QR Code SVG (`react-native-qrcode-svg`) for generating ticket QR codes.
*   **File Handling & Sharing**: `expo-file-system`, `expo-sharing`, `html2canvas`, `react-native-view-shot`, `xlsx` (Excel exports for organizers).

## 3. Folder Structure
The source code is organized primarily under the `src/` directory:

```
EventSphere/
├── assets/                  # App icons, splash screens, and localized image assets
├── src/
│   ├── components/          # Reusable UI components (e.g., EventMap, PromotionalBanner)
│   ├── config/              # Configuration files (e.g., razorpayConfig.js)
│   ├── context/             # React Context providers (AuthContext.js, ThemeContext.js)
│   ├── data/                # Static data or placeholder content
│   ├── navigation/          # Routing logic (AppNavigator.js defining the stack)
│   ├── screens/             # All application screens (Login, Home, Dashboard, etc.)
│   ├── services/            # External service integrations (firebase.js, ImageSearchService.js)
│   ├── utils/               # Helper utilities (dateUtils.js)
│   └── theme.js             # Global UI theme and styling definitions
├── App.js                   # Application entry point, wraps app in providers Contexts
├── app.json                 # Expo configuration
└── package.json             # Project dependencies and scripts
```

## 4. Key Core Features (By Area)

### User Authentication & Profiling (`AuthContext.js`)
*   **Sign Up / Login**: Standard Email/Password authentication powered by Firebase.
*   **Roles**: System supports differentiating between regular users and organizers.
*   **Profile Avatars**: Automatically generates avatars using Dicebear UI or UI-Avatars as fallbacks.
*   **Account Management**: Includes functionalities to edit profiles, update passwords, and delete accounts natively.

### Event Discovery & Participation
*   **Home Screen**: Displays available events, promotional banners, and provides search functionality.
*   **Event Details**: Shows comprehensive information about an event, including a Map component (`EventMap`) for location viewing.
*   **Ticketing**: Users can register for events and receive digital tickets. A QR code is generated for each ticket (`TicketScreen.js`).
*   **Event Chat**: Real-time community engagement and chat within an event's scope (`EventChatScreen.js`).
*   **Sponsorship**: Contains functional flows for registering as an event sponsor (`SponsorRegistrationScreen.js`).

### Organizer Capabilities
*   **Event Management**: Organizers can create (`CreateEventScreen`) and edit events (`EditEventScreen`).
*   **Organizer Dashboard**: Analytics dashboard featuring real-time check-ins, revenue tracking, and insights (`OrganizerDashboardScreen.js`).
*   **Ticket Scanning**: Integrated `ScanTicketScreen` utilizes the device camera to scan attendee QR codes and validate them against Firebase records.
*   **Export Portal**: Organizers can export attendee lists or analytics (`OrganizerExportPortal.js`) using libraries like `xlsx`.
*   **Certificates**: Ability to issue digital certificates for attendees (`CertificateScreen.js`).

## 5. Navigation Flow (`AppNavigator.js`)
The App uses a React Navigation Native Stack setup. The primary linked and registered routes are:
*   `Welcome` -> `Login` / `Signup` -> `Home`
*   **Standard User Flow**: `Home` -> `EventDetails` -> `Ticket` -> `EventChat` / `Certificate`
*   **Organizer Flow**: `CreateEvent` / `EditEvent` <-> `OrganizerDashboard` <-> `ScanTicket` / `OrganizerExportPortal`
*   **Account Settings**: `Profile` -> `EditProfile` / `FollowList` / `Security` / `About` / `HelpCenter`

Deep linking is configured, supporting local and Vercel deployed web URLs.

## 6. External Integrations
1.  **Firebase**: Acts as the primary backend handling Auth and Firestore (NoSQL database).
2.  **Razorpay**: Payment gateway integration handled through `razorpayConfig.js` for buying tickets or registering as a sponsor.
3.  **Expo APIs**: Deep integration with Expo device capabilities (Camera, ImagePicker, Sharing, FileSystem).

## 7. Development & Web Considerations
*   The application includes specific shims in `App.js` to suppress non-critical warnings regarding `aria-hidden` and deprecated react-native-web prop types, ensuring a cleaner console during web development.
*   Web builds are supported (`expo start --web`), leveraging `@expo/metro-runtime` and `react-native-web`.
