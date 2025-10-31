import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAkPDboCcqA3r00-2yGejkFFGRBpmXJtIU",
  authDomain: "new-hackspire.firebaseapp.com",
  projectId: "new-hackspire",
  storageBucket: "new-hackspire.firebasestorage.app",
  messagingSenderId: "774940017429",
  appId: "1:774940017429:web:0bd5a03fb0f5a6aa9b1f1c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);