
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // On App Hosting, initializeApp() should automatically discover credentials.
    // Explicitly providing the projectId can resolve ambiguity in some environments.
    admin.initializeApp({
      projectId: "smack-marks-portal",
    });
    console.log('Firebase Admin SDK initialized successfully for project smack-marks-portal.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export const adminAuth = admin.auth();
