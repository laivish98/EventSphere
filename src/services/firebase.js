import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCeCjgPIs67YzNUpvzaSwzqV8FbJFmaFSo",
  authDomain: "eventsphere-e0b76.firebaseapp.com",
  projectId: "eventsphere-e0b76",
  storageBucket: "eventsphere-e0b76.firebasestorage.app",
  messagingSenderId: "675243081753",
  appId: "1:675243081753:web:b69427b990b758cf48ea88",
  measurementId: "G-RQFE6L0JVB"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence based on platform
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });

export const db = getFirestore(app);
export const storage = getStorage(app);
