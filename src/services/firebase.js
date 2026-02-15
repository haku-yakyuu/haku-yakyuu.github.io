import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAQ-6I_pabYdSfgnFxHDfIASXhI-_VP1-8",
    authDomain: "haku-2026.firebaseapp.com",
    projectId: "haku-2026",
    storageBucket: "haku-2026.firebasestorage.app",
    messagingSenderId: "313413580011",
    appId: "1:313413580011:web:c435ef8062f2d2520cbaae",
    measurementId: "G-10VRR3HQJF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
