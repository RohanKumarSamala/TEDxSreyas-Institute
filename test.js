const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyByVc_5VdZz4jzIexcgQBUrqpCZWGDn1j8",
  authDomain: "tedxsreyas-1c936.firebaseapp.com",
  projectId: "tedxsreyas-1c936",
  storageBucket: "tedxsreyas-1c936.firebasestorage.app",
  messagingSenderId: "480734384253",
  appId: "1:480734384253:web:319c483a4267ff84e02114",
  measurementId: "G-BDR5M1DYE9"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

async function test() {
  try {
    const snap = await getDocs(collection(db, 'ticket_slabs'));
    console.log("Success! Docs found:", snap.docs.length);
  } catch (err) {
    console.error("Firebase SDK Error:", err.message);
  }
}
test();
