import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, query, where, serverTimestamp, updateDoc, Timestamp, deleteDoc, onSnapshot, runTransaction, orderBy, limit } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDSinGJdNw52fXfnUUwNWKYJmpOLs4DasA",
  authDomain: "poultry-e0c80.firebaseapp.com",
  projectId: "poultry-e0c80",
  storageBucket: "poultry-e0c80.firebasestorage.app",
  messagingSenderId: "466297998023",
  appId: "1:466297998023:web:996281e9ab0af2e1268ce2"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  Timestamp,
  deleteDoc,
  onSnapshot,
  runTransaction,
  orderBy,
  limit
}
