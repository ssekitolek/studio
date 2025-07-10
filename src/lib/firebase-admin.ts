
import { initializeApp, getApps, cert, App } from "firebase-admin/app";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  // Instead of throwing an error, we can log a warning.
  // This allows parts of the app that don't need admin to function.
  console.warn("The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Admin operations will fail.");
}

let serviceAccount;
if (serviceAccountKey) {
  try {
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch (e) {
    console.error("Failed to parse the FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string. Admin operations will fail.", e);
  }
}

const apps = getApps();
// Initialize the app only if the service account is available
const app: App = !apps.length && serviceAccount
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : apps[0];

export { app };
