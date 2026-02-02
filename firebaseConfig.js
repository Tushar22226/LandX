// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "[GCP_API_KEY]",
    authDomain: ".firebaseapp.com",
    projectId: "-12345",
    storageBucket: "-12345.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const database = getDatabase(app);
export default app;
