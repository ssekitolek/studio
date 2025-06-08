
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

const unconfiguredKeys: string[] = [];
// Added more common placeholder variants
const placeholderProjectIds = ["your_project_id", "your-project-id", "YOUR_PROJECT_ID", "<YOUR_PROJECT_ID>", "firebase-project-id", "yourprojectid"];

for (const key in firebaseConfigValues) {
  if (!firebaseConfigValues[key as keyof typeof firebaseConfigValues]) {
    unconfiguredKeys.push(key);
  }
}

let isConfigurationValid = true;
let configErrorMessage = "";

if (unconfiguredKeys.length > 0) {
  isConfigurationValid = false;
  configErrorMessage = `Firebase is not configured. Missing NEXT_PUBLIC_ environment variables for: ${unconfiguredKeys.join(', ')}. Please set them in your .env file.`;
}

// Check specifically for placeholder projectId
if (firebaseConfigValues.projectId && placeholderProjectIds.includes(firebaseConfigValues.projectId.toLowerCase())) {
  isConfigurationValid = false;
  // Make error message more direct and actionable
  configErrorMessage = `CRITICAL_CONFIG_ERROR: Your Firebase projectId in .env is a placeholder: '${firebaseConfigValues.projectId}'. You MUST replace NEXT_PUBLIC_FIREBASE_PROJECT_ID with your actual Firebase Project ID from the Firebase Console.`;
} else if (!firebaseConfigValues.projectId && !unconfiguredKeys.includes("projectId")) {
  // This case handles if projectId was initially set but then cleared, or if the env var name is misspelled
  isConfigurationValid = false;
  configErrorMessage = `CRITICAL_CONFIG_ERROR: Firebase projectId (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid. Please ensure it is correctly set in your .env file.`;
}


let app: FirebaseApp | null = null;
let db: Firestore | null = null; // Initialize as null, explicitly

if (!isConfigurationValid) {
  const fullErrorMessage = `Firebase Initialization Failed: ${configErrorMessage} Firebase features will be unavailable. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env file. Without correct configuration, especially the Project ID, the application cannot connect to your database.`;
  
  if (typeof window === 'undefined') { // Server-side
    console.error(`SERVER_FATAL_ERROR: ${fullErrorMessage}`);
    // This error should stop the server build/start process or cause immediate failure on requests.
    throw new Error(fullErrorMessage);
  } else { // Client-side
    console.error(`CLIENT_FATAL_ERROR: ${fullErrorMessage}`);
    // The application on the client-side will proceed but 'db' will be null.
    // Operations relying on 'db' will fail.
  }
} else {
  // Proceed with initialization only if configuration is valid
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfigValues);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    // console.log("Firebase initialized successfully with projectId:", firebaseConfigValues.projectId);
  } catch (error) {
    const initErrorMsg = `Failed to initialize Firebase app or Firestore: ${error instanceof Error ? error.message : String(error)}. Config used: ${JSON.stringify(firebaseConfigValues)}`;
    console.error(initErrorMsg);
    app = null; // Ensure app and db are null on error
    db = null;
    if (typeof window === 'undefined') {
      // If server-side initialization fails even with seemingly valid config, throw.
      throw new Error(initErrorMsg);
    }
  }
}

export { app, db };
