# Firebase Setup Guide

## Step 1: Enable Firestore & Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **coinsepetim-40a50**
3. On the left menu → **Build** → **Firestore Database**
   - Click **Create Database**
   - Choose region (any is fine)
   - Click **Create**
4. On the left menu → **Build** → **Storage**
   - Click **Get Started**
   - Click **Start in test mode**
   - Click **Create**

## Step 2: Add Permissive Rules (FOR TESTING ONLY)

### Firestore Rules
1. In Firebase Console → **Firestore Database** → **Rules** tab
2. Replace all text with:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**

### Storage Rules
1. In Firebase Console → **Storage** → **Rules** tab
2. Replace all text with:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**

## Step 3: Redeploy Site

- If using Netlify: drag-and-drop the Collection_site folder again, or push to git
- Wait 1–2 min for build to complete

## Step 4: Test

1. Open your deployed site URL
2. Go to **Create** page
3. Look at bottom-right corner for debug box — it should say **"Firebase: ready"**
4. Try uploading an image with a name
5. Go to **Loadouts** page — should show your upload
6. Try from another device — should see the same upload

## Step 5: Verify in Firebase Console

After upload:
- **Firestore Database** → **loadouts** collection should have a document
- **Storage** → **loadouts** folder should have an image file
