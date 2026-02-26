# Firebase Setup Instructions

To fix the "API Key not valid" error, you need to connect the app to your own Firebase project.

## Step 1: Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **"Add project"** and follow the setup steps (you can disable Google Analytics for now).

## Step 2: Register a Web App
1. On the project overview page, click the **Web icon (`</>`)** to add an app.
2. Give it a name (e.g., "EventSphere").
3. Click **"Register app"**.

## Step 3: Copy Configuration
1. You will see a code block with `const firebaseConfig = { ... }`.
2. Copy the content inside the `{ }` brackets. It should look like this:
   ```javascript
   apiKey: "AIzaSy...",
   authDomain: "eventsphere-123.firebaseapp.com",
   projectId: "eventsphere-123",
   storageBucket: "eventsphere-123.appspot.com",
   messagingSenderId: "123456789",
   appId: "1:123456789:web:abcdef"
   ```

## Step 4: Update Your Code
1. Open the file `src/services/firebase.js` in your project.
2. Replace the placeholder `firebaseConfig` values with the ones you copied.

## Step 5: Enable Authentication & Database
1. In Firebase Console, go to **Build > Authentication**.
2. Click **"Get Started"**, select **"Email/Password"**, enabling it, and click **"Save"**.
3. Go to **Build > Firestore Database**.
4. Click **"Create Database"**, choose a location, and select **"Start in test mode"**.
5. Go to **Build > Storage**.
6. Click **"Get Started"**, select **"Start in test mode"** (or use the default rules but change `allow read, write: if false;` to `allow read, write: if request.auth != null;`).
7. Choose a location (same as Firestore).
8. **Crucial**: Verify the bucket name in the Storage tab title (e.g., `gs://eventsphere-e0b76.firebasestorage.app`). If it ends in `.appspot.com` instead, update `src/services/firebase.js`.

## Step 6: Restart App
1. In your terminal, verify the changes.
2. Reload the app in Expo Go (shake usage phone or press `r` in terminal).
