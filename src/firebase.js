// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDsbCsHihXwT2lg0K1ELt11hVkabFz-f88",
  authDomain: "tripmaster-4ef1b.firebaseapp.com",
  projectId: "tripmaster-4ef1b",
  storageBucket: "tripmaster-4ef1b.firebasestorage.app",
  messagingSenderId: "722374270630",
  appId: "1:722374270630:web:ad15bdf6ebb3c6ab8e5e67",
  measurementId: "G-ESQHHXEW9Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
