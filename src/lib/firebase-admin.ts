
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Make the credential fetching explicit. This can help in some environments.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin SDK initialized explicitly using Application Default Credentials.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
  }
}

export const adminAuth = admin.auth();
