
import { initializeApp, getApps, cert, App } from "firebase-admin/app";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  throw new Error("The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for admin operations.");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountKey);
} catch (e) {
  throw new Error("Failed to parse the FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string.");
}

const apps = getApps();
const app: App = !apps.length
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : apps[0];

export { app };
