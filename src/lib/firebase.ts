import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig.js';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Initialize Firestore with specific databaseId (supports default or named database)
 */
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

/**
 * Initialize Firebase Authentication.
 */
export const auth = getAuth(app);

/**
 * Diagnostic connection check.
 */
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[firebase] Please check your Firebase configuration or internet connection.');
    }
  }
}

// Initial diagnostic call
if (typeof window !== 'undefined') {
  testFirestoreConnection().catch(() => {});
}

export default app;
