
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // On App Hosting, initializeApp() automatically discovers credentials.
    // No need to specify them manually.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export const adminAuth = admin.auth();
