import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // In production, use service account credentials from environment variables
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PROJECT_ID) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // In development, you might use a service account JSON file
    // For now, throw an error if credentials are not properly configured
    throw new Error('Firebase Admin SDK credentials not configured. Please set FIREBASE_ADMIN_* environment variables.');
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

// Verify ID Token function
export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    return null;
  }
}

// Optional: Function to create custom claims
export async function setCustomUserClaims(uid: string, claims: Record<string, any>) {
  try {
    await adminAuth.setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    return false;
  }
}

// Optional: Function to get user by email
export async function getUserByEmail(email: string) {
  try {
    const user = await adminAuth.getUserByEmail(email);
    return user;
  } catch (error) {
    return null;
  }
}