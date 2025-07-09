
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // On App Hosting, initializeApp() should automatically discover credentials.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully using default credentials.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export const adminAuth = admin.auth();
