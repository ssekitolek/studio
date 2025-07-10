
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;

if (!getApps().length) {
  if (!serviceAccountKey) {
    throw new Error("The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for admin operations.");
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e) {
    console.error("Failed to parse the FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string.", e);
    throw new Error("Firebase admin initialization failed due to invalid service account key.");
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { app, db };
