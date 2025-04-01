// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBI4jlnbZMG0ckUR0qx9GkwS4VsJ3AGyGA",
  authDomain: "weekly-schedule-f8982.firebaseapp.com",
  projectId: "weekly-schedule-f8982",
  storageBucket: "weekly-schedule-f8982.appspot.com",  // fixed typo here
  messagingSenderId: "839992728946",
  appId: "1:839992728946:web:e4136bbd55f88dc3b511eb",
  measurementId: "G-WVZP5HLL1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
