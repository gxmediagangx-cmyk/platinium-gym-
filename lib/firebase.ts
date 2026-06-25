import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let firebaseError: string | null = null;

const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "your_api_key" && 
  !firebaseConfig.apiKey.includes("your_");

try {
  if (isConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    throw new Error("Firebase Credentials not defined or set as placeholder.");
  }
} catch (err: any) {
  firebaseError = err?.message || String(err);
  
  // Safe Mock Proxies to prevent top-level client imports or event bindings from crashing
  app = {} as any;
  auth = new Proxy({} as any, {
    get(target, prop) {
      if (prop === 'app') return app;
      // return empty mock function for auth listners
      return (...args: any[]) => {
        // Return dummy unsubscribe function
        return () => {};
      };
    }
  });
  db = new Proxy({} as any, {
    get(target, prop) {
      return {};
    }
  });
  storage = {} as any;
}

export { app, auth, db, storage, firebaseError };
export default app;

