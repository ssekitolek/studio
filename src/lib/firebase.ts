// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration is now hardcoded here
// to ensure it is available in the browser environment.
const firebaseConfig = {
  apiKey: "AIzaSyAfdM4Rp7ciXyqStD-YWHB5inE01HqofTo",
  authDomain: "gradecentral-obel2.firebaseapp.com",
  projectId: "gradecentral-obel2",
  storageBucket: "gradecentral-obel2.appspot.com",
  messagingSenderId: "412269537227",
  appId: "1:412269537227:web:f07191757d4ce902a4384e"
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
