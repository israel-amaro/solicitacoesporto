import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyC6ic-LlcpSMkzqk9UfNk7d32h2Tor_oOI",
  authDomain: "chamados-adm-porto.firebaseapp.com",
  projectId: "chamados-adm-porto",
  storageBucket: "chamados-adm-porto.firebasestorage.app",
  messagingSenderId: "577242263343",
  appId: "1:577242263343:web:b63d34e98f5ee178333bda",
  measurementId: "G-M01W587JNN"
};

let appInstance: FirebaseApp;
const existingApps = getApps();
const matchingApp = existingApps.find(a => a.options.projectId === firebaseConfig.projectId);

if (matchingApp) {
  appInstance = matchingApp;
} else if (existingApps.length === 0) {
  appInstance = initializeApp(firebaseConfig);
} else {
  // If default app has different project, initialize named app or re-use matching
  try {
    appInstance = initializeApp(firebaseConfig, 'chamados-adm-porto-app');
  } catch {
    appInstance = getApp('chamados-adm-porto-app');
  }
}

export const firebaseApp = appInstance;
export const db = getFirestore(firebaseApp);
export default firebaseApp;
