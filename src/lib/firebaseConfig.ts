import config from '../../firebase-applet-config.json';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

// Read from import.meta.env (VITE_FIREBASE_*) with fallback to user's budget-bridge-30b23 project config
export const firebaseConfig: FirebaseAppConfig = {
  apiKey: (import.meta.env?.VITE_FIREBASE_API_KEY as string) || config.apiKey || 'AIzaSyDX7zfEiKln8fqWtezDpnDxYocyMtjz2yc',
  authDomain: (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || config.authDomain || 'budget-bridge-30b23.firebaseapp.com',
  projectId: (import.meta.env?.VITE_FIREBASE_PROJECT_ID as string) || config.projectId || 'budget-bridge-30b23',
  storageBucket: (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || config.storageBucket || 'budget-bridge-30b23.firebasestorage.app',
  messagingSenderId: (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || config.messagingSenderId || '593670708915',
  appId: (import.meta.env?.VITE_FIREBASE_APP_ID as string) || config.appId || '1:593670708915:web:7fde30c7f67ac4c7d95ac6',
  firestoreDatabaseId: (import.meta.env?.VITE_FIREBASE_DATABASE_ID as string) || config.firestoreDatabaseId || '(default)',
  measurementId: (import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID as string) || config.measurementId || '',
  oAuthClientId: config.oAuthClientId || '',
  recaptchaSiteKey: config.recaptchaSiteKey || '',
};

export default firebaseConfig;
