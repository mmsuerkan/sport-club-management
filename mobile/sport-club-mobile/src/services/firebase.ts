import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration - Android App
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCSC60komTpGpmewjTBHW06SfN8v1f-n1E",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "sportclubmanagement-2daba.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "sportclubmanagement-2daba",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "sportclubmanagement-2daba.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "289942747132",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:289942747132:android:b0099de0ee30439573a479"
};

// Debug: Log configuration to check if env vars are loaded
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase (prevent multiple initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with React Native persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };