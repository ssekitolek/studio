
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
const unconfiguredKeys = Object.entries(firebaseConfigValues)
  .filter(([, value]) => !value) // Check for undefined, null, or empty string
  .map(([key]) => key);

if (unconfiguredKeys.length > 0) {
  const message = `Firebase is not configured. Missing environment variables for: ${unconfiguredKeys.join(', ')}. Please set them in your .env file.`;
  if (typeof window === 'undefined') { // Server-side
    console.error(`SERVER_ERROR: ${message}`);
    // Consider throwing an error if Firebase is absolutely critical for app start
    // throw new Error(message); 
  } else { // Client-side
    console.warn(`CLIENT_WARN: ${message}`);
  }
}

let app: FirebaseApp;
// Initialize db with a type assertion to allow it to be undefined initially if init fails
let db: Firestore = undefined!; 

try {
  if (typeof window !== 'undefined') { // Client-side
    if (!getApps().length) {
      if (firebaseConfigValues.projectId) { // Basic check before init
        app = initializeApp(firebaseConfigValues);
        db = getFirestore(app);
      } else {
        console.error("Firebase projectId is missing. Firebase will not be initialized on the client.");
      }
    } else {
      app = getApp();
      db = getFirestore(app);
    }
  } else { // Server-side
    if (!getApps().length) {
       if (firebaseConfigValues.projectId) { // Basic check before init
        app = initializeApp(firebaseConfigValues);
        db = getFirestore(app);
      } else {
        console.error("Firebase projectId is missing. Firebase will not be initialized on the server.");
        // throw new Error("Firebase projectId is missing. Cannot initialize Firebase on the server.");
      }
    } else {
      app = getApp();
      db = getFirestore(app);
    }
  }
} catch (error) {
  console.error("Failed to initialize Firebase app or Firestore:", error);
  console.error("Firebase config used:", firebaseConfigValues); 
  // db will remain undefined, and subsequent Firestore operations will likely fail,
  // which should be handled by the calling code (e.g., in server actions).
}

export { app, db };
