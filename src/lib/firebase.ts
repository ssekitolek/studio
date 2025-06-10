
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
  configErrorMessage = `Firebase is not configured. Missing NEXT_PUBLIC_ environment variables for: ${unconfiguredKeys.join(', ')}.`;
}

// Check specifically for placeholder projectId
if (firebaseConfigValues.projectId && placeholderProjectIds.includes(firebaseConfigValues.projectId.toLowerCase())) {
  isConfigurationValid = false;
  configErrorMessage = (configErrorMessage ? configErrorMessage + " " : "") + // Append to existing message if any
                       `CRITICAL_CONFIG_ERROR: Your Firebase projectId ('${firebaseConfigValues.projectId}') is a placeholder. You MUST replace NEXT_PUBLIC_FIREBASE_PROJECT_ID with your actual Firebase Project ID from the Firebase Console.`;
} else if (!firebaseConfigValues.projectId && !unconfiguredKeys.includes("projectId")) {
  // This case handles if projectId was initially set but then cleared, or if the env var name is misspelled
  isConfigurationValid = false;
  configErrorMessage = (configErrorMessage ? configErrorMessage + " " : "") + // Append
                       `CRITICAL_CONFIG_ERROR: Firebase projectId (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid. Please ensure it is correctly set in your .env file.`;
}


let app: FirebaseApp | null = null;
let db: Firestore | null = null; // Initialize as null, explicitly

if (!isConfigurationValid) {
  const fullErrorMessage = `Firebase Initialization Failed due to Configuration Issues: ${configErrorMessage} Firebase features will be unavailable. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env file. Without correct configuration, the application cannot connect to your database.`;
  
  console.error(`SERVER_FATAL_CONFIG_ERROR: ${fullErrorMessage}`); // Log this regardless of environment for visibility

  // On the server, if config is invalid, `db` will remain null.
  // Actions should check for `db === null` and handle it.
  // Throwing an error here might stop the server prematurely during development.
  // The key is that `db` remains null, and subsequent operations fail predictably.

} else {
  // Proceed with initialization only if configuration is valid
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfigValues);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    // console.log("Firebase initialized successfully with projectId:", firebaseConfigValues.projectId); // Keep this commented unless actively debugging
  } catch (error) {
    const initErrorMsg = `Firebase SDK Initialization Error: ${error instanceof Error ? error.message : String(error)}. This occurred even with seemingly valid config. Firestore (db) will be NULL. Config used: ${JSON.stringify(firebaseConfigValues)}`;
    console.error(`SERVER_SDK_INIT_ERROR: ${initErrorMsg}`);
    app = null; // Ensure app and db are null on error
    db = null;
    // Server will continue, but `db` is null. Client-side also gets null `db`.
  }
}

// Add a final check and log if db is still null after attempting initialization
// This helps confirm the state of `db` post-attempt.
if (db === null) {
    if (isConfigurationValid) {
        // This case is bad: config seemed ok, but SDK init failed or didn't set db.
        console.error("POST_INIT_CHECK_FAIL: Firestore 'db' instance is unexpectedly null after initialization attempt, despite configuration appearing valid. This indicates a deeper issue with Firebase SDK or setup.");
    } else {
        // This case is expected: config was bad, so db is null.
        console.warn("POST_INIT_CHECK_INFO: Firestore 'db' instance is null due to prior configuration errors. This is expected. Firebase operations will fail.");
    }
}


export { app, db };
