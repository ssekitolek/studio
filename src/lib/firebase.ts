// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration is read from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Check that all config values are present before initializing
const isConfigValid = Object.values(firebaseConfig).every(Boolean);

if (isConfigValid) {
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);

      console.log("Firebase initialized successfully with environment variables.");

    } catch (error) {
        console.error("Firebase SDK Initialization Error:", error);
        // Fallback to null services on error
        // @ts-ignore
        app = null;
        // @ts-ignore
        auth = null;
        // @ts-ignore
        db = null;
        // @ts-ignore
        storage = null;
    }
} else {
    console.warn("Firebase configuration from .env file is missing or incomplete. Firebase services will be disabled. Please check your .env file for NEXT_PUBLIC_FIREBASE_* variables.");
    // @ts-ignore
    app = null;
    // @ts-ignore
    auth = null;
    // @ts-ignore
    db = null;
    // @ts-ignore
    storage = null;
}

export { app, auth, db, storage };
