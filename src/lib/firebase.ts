// This is set here as per explicit user instruction.
// The recommended practice is to use a .env file.
process.env.NEXT_PUBLIC_GOOGLE_API_KEY = "AIzaSyBgfyihL-nscgamTVLNwwOqVTkIM2yEY5s";

// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration is now hardcoded here
// to ensure it is available in the browser environment.
const firebaseConfig = {
  apiKey: "AIzaSyASlqu0spRbYI3FglqZKJF8lplFvpr5cR0",
  authDomain: "smack-marks-portal.firebaseapp.com",
  projectId: "smack-marks-portal",
  storageBucket: "smack-marks-portal.appspot.com",
  messagingSenderId: "424036907971",
  appId: "1:424036907971:web:e32094cee5841f25125b76"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);
console.log("Firebase initialized successfully with embedded configuration.");


export { app, auth, db, storage };
