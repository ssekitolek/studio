
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const unconfiguredKeys: string[] = [];
const placeholderProjectIds = ["your_project_id", "your-project-id", "YOUR_PROJECT_ID", "<YOUR_PROJECT_ID>", "firebase-project-id", "yourprojectid", "nextjs-firebase-project-id"];

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
  console.error(`SERVER_CONFIG_ERROR_MISSING_KEYS: ${configErrorMessage}`);
}

if (firebaseConfigValues.projectId && placeholderProjectIds.includes(firebaseConfigValues.projectId.toLowerCase())) {
  isConfigurationValid = false;
  const placeholderError = `CRITICAL_CONFIG_ERROR: Your Firebase projectId ('${firebaseConfigValues.projectId}') is a placeholder. You MUST replace NEXT_PUBLIC_FIREBASE_PROJECT_ID with your actual Firebase Project ID from the Firebase Console.`;
  configErrorMessage = (configErrorMessage ? configErrorMessage + " " : "") + placeholderError;
  console.error(`SERVER_CONFIG_ERROR_PLACEHOLDER_ID: ${placeholderError}`);
} else if (!firebaseConfigValues.projectId && !unconfiguredKeys.includes("projectId")) {
  isConfigurationValid = false;
  const missingIdError = `CRITICAL_CONFIG_ERROR: Firebase projectId (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid. Please ensure it is correctly set in your .env file.`;
  configErrorMessage = (configErrorMessage ? configErrorMessage + " " : "") + missingIdError;
}


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (!isConfigurationValid) {
  const fullErrorMessage = `Firebase Initialization Failed due to Configuration Issues: ${configErrorMessage} Firebase features will be unavailable. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env file. Without correct configuration, the application cannot connect to your database.`;
  console.error(`SERVER_FATAL_CONFIG_ERROR_SUMMARY: ${fullErrorMessage}`); 
} else {
  try {
    if (!getApps().length) {
      console.log("Initializing Firebase app with config:", firebaseConfigValues);
      app = initializeApp(firebaseConfigValues);
    } else {
      app = getApp();
      console.log("Using existing Firebase app.");
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log(`Auth, Firestore (db), and Storage (storage) instances obtained. Project ID: ${app.options.projectId}`);
  } catch (error) {
    const initErrorMsg = `Firebase SDK Initialization Error: ${error instanceof Error ? error.message : String(error)}. This occurred even with seemingly valid config. All services will be NULL. Config used: ${JSON.stringify(firebaseConfigValues)}`;
    console.error(`SERVER_SDK_INIT_ERROR: ${initErrorMsg}`);
    app = null;
    auth = null; 
    db = null;
    storage = null;
  }
}

if (auth === null || db === null || storage === null) {
    if (isConfigurationValid) { // If config was thought to be valid, but services are still null
        console.error("POST_INIT_CHECK_FAIL: One or more Firebase services (Auth, Firestore, Storage) are unexpectedly null after initialization attempt, despite configuration appearing valid. This indicates a deeper issue with Firebase SDK or setup, or an unhandled error during service initialization.");
    } else { // If config was invalid, this is expected
        console.warn("POST_INIT_CHECK_INFO: One or more Firebase services are null due to prior configuration errors. This is expected. Firebase operations will fail.");
    }
} else {
    console.info(`Firebase services initialized successfully for project: ${firebaseConfigValues.projectId}.`);
    console.info("APP_INFO: For full functionality, ensure your Firebase database contains the required collections (e.g., 'teachers', 'students') and your Firebase Authentication has users created for each role.");
}

export { app, auth, db, storage };
