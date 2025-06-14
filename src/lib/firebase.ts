
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
  configErrorMessage = (configErrorMessage ? configErrorMessage + " " : "") + 
                       `CRITICAL_CONFIG_ERROR: Your Firebase projectId ('${firebaseConfigValues.projectId}') is a placeholder. You MUST replace NEXT_PUBLIC_FIREBASE_PROJECT_ID with your actual Firebase Project ID from the Firebase Console.`;
} else if (!firebaseConfigValues.projectId && !unconfiguredKeys.includes("projectId")) {
  // This case handles if projectId was initially set but then cleared, or if the env var name is misspelled
  isConfigurationValid = false;
  configErrorMessage = (configErrorMessage ? configErrorMessage + " " : "") +
                       `CRITICAL_CONFIG_ERROR: Firebase projectId (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing or invalid. Please ensure it is correctly set in your .env file.`;
}


let app: FirebaseApp | null = null;
let db: Firestore | null = null; // Initialize as null, explicitly

if (!isConfigurationValid) {
  const fullErrorMessage = `Firebase Initialization Failed due to Configuration Issues: ${configErrorMessage} Firebase features will be unavailable. Ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env file. Without correct configuration, the application cannot connect to your database.`;
  
  console.error(`SERVER_FATAL_CONFIG_ERROR: ${fullErrorMessage}`); 

} else {
  // Proceed with initialization only if configuration is valid
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfigValues);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
  } catch (error) {
    const initErrorMsg = `Firebase SDK Initialization Error: ${error instanceof Error ? error.message : String(error)}. This occurred even with seemingly valid config. Firestore (db) will be NULL. Config used: ${JSON.stringify(firebaseConfigValues)}`;
    console.error(`SERVER_SDK_INIT_ERROR: ${initErrorMsg}`);
    app = null; 
    db = null;
  }
}

if (db === null) {
    if (isConfigurationValid) {
        console.error("POST_INIT_CHECK_FAIL: Firestore 'db' instance is unexpectedly null after initialization attempt, despite configuration appearing valid. This indicates a deeper issue with Firebase SDK or setup.");
    } else {
        console.warn("POST_INIT_CHECK_INFO: Firestore 'db' instance is null due to prior configuration errors. This is expected. Firebase operations will fail.");
    }
} else {
    console.log(`Firebase and Firestore (db) initialized successfully. Project ID: ${firebaseConfigValues.projectId || 'NOT_CONFIGURED_CORRECTLY'}`);
    console.info("APP_INFO: For full functionality, ensure your Firestore database contains the 'markSubmissions' collection and a 'settings' collection with a 'general' document.");
}


export { app, db };

    
