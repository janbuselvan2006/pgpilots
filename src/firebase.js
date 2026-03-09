import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDIvLqFM0jMWJtPAMyOkU4HdrYJKsoknTo",
  authDomain: "new2-42396.firebaseapp.com",
  projectId: "new2-42396",
  storageBucket: "new2-42396.firebasestorage.app",
  messagingSenderId: "186741862906",
  appId: "1:186741862906:web:8cde0b14daba62f1823443",
  measurementId: "G-L54QPTCWPD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;