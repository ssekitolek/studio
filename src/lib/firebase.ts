
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
const unconfiguredKeys: string[] = [];
const placeholderProjectIds = ["your_project_id", "your-project-id", "YOUR_PROJECT_ID"];

for (const key in firebaseConfigValues) {
  if (!firebaseConfigValues[key as keyof typeof firebaseConfigValues]) {
    unconfiguredKeys.push(key);
  }
}

let isConfigurationValid = true;
let configErrorMessage = "";

if (unconfiguredKeys.length > 0) {
  isConfigurationValid = false;
  configErrorMessage = `Firebase is not configured. Missing environment variables for: ${unconfiguredKeys.join(', ')}. Please set them in your .env file.`;
}

if (firebaseConfigValues.projectId && placeholderProjectIds.includes(firebaseConfigValues.projectId.toLowerCase())) {
  isConfigurationValid = false;
  configErrorMessage = `Firebase projectId in .env appears to be a placeholder value ('${firebaseConfigValues.projectId}'). Please replace it with your actual Firebase Project ID.`;
} else if (!firebaseConfigValues.projectId && !unconfiguredKeys.includes("projectId")) {
  // This case handles if projectId was initially set but then cleared, or if the env var name is misspelled
  isConfigurationValid = false;
  configErrorMessage = `Firebase projectId is missing or invalid. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is correctly set in your .env file.`;
}


if (!isConfigurationValid) {
  if (typeof window === 'undefined') { // Server-side
    console.error(`SERVER_FATAL_ERROR: ${configErrorMessage}`);
    // For critical server functionality, ensure the app cannot start with invalid Firebase config.
    throw new Error(`CRITICAL_FIREBASE_CONFIG_ERROR: ${configErrorMessage}`);
  } else { // Client-side
    console.warn(`CLIENT_WARN: ${configErrorMessage}`);
    // On the client, you might allow the app to load but with Firebase features disabled/showing errors.
  }
}

let app: FirebaseApp;
// Initialize db with a type assertion to allow it to be undefined initially if init fails
let db: Firestore = undefined!; 

// Only attempt initialization if configuration is deemed valid so far
if (isConfigurationValid) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfigValues);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase app or Firestore:", error);
    console.error("Firebase config used:", firebaseConfigValues); 
    // db will remain undefined, and subsequent Firestore operations will likely fail.
    // If on server, this might be a place to throw to prevent app from running in a broken state.
    if (typeof window === 'undefined') {
        throw new Error(`Failed to initialize Firebase services on the server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} else if (typeof window !== 'undefined' && !db) {
    // If client-side and config was invalid, ensure db is explicitly not set up
    // to prevent further errors with an uninitialized db object.
    console.warn("Firebase Firestore (db) is not initialized due to configuration errors. Firebase features will be unavailable.");
}


export { app, db };
