/*
  firebase.example.js
  - Copy this file to firebase-config.js and replace the config fields with
    your Firebase project's config (from Firebase console).
  - This project uses Firebase Firestore (collection 'loadouts') and Storage.

  Example:
  window.FIREBASE_CONFIG = {
    apiKey: "...",
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-app",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "...",
    appId: "..."
  };
*/
// Do not overwrite an existing firebase config injected by firebase-config.js
if(typeof window.FIREBASE_CONFIG === 'undefined'){
  window.FIREBASE_CONFIG = null;
}
