/**
 * Firebase Configuration Example
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to firebase-config.js (in the same directory)
 * 2. Replace the placeholder values with your actual Firebase project credentials
 * 3. firebase-config.js is git-ignored to keep your credentials safe
 * 
 * To get your Firebase config:
 * 1. Go to Firebase Console (https://console.firebase.google.com)
 * 2. Select your project
 * 3. Click the gear icon (Project Settings)
 * 4. Scroll down to "Your apps" and select your web app
 * 5. Copy the firebaseConfig object
 */

export const firebaseConfig = {
    // Firebase Core Configuration
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",

    // GitHub Integration (for triggering the build action)
    // Create a Personal Access Token at: https://github.com/settings/tokens
    // Required scopes: repo, workflow
    githubOwner: "YOUR_GITHUB_USERNAME",
    githubRepo: "YOUR_REPO_NAME",
    githubPat: "YOUR_PERSONAL_ACCESS_TOKEN"
};
