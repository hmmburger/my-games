# 🔥 Firebase Setup Guide for Spacetime Leaderboard

Hey Jonah! Before the leaderboard works, we need to set up Firebase (it's like a database in the cloud). Follow these steps:

---

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Create a project"** (or "Add project" if you already have one)
3. Name it something cool like `spacetime-leaderboard`
4. **Disable Google Analytics** (we don't need it for this)
5. Click **"Create project"**
6. Wait a minute for it to finish...

---

## Step 2: Enable Realtime Database

1. In your Firebase project, click **"Build"** on the left sidebar
2. Click **"Realtime Database"**
3. Click **"Create Database"**
4. Select any location (doesn't matter much)
5. Choose **"Start in test mode"** (we'll secure it later)
6. Click **"Enable"**

---

## Step 3: Get Your Firebase Config

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **</>** icon (web app)
5. Give it a name like "Spacetime Game"
6. **DON'T check** "Firebase Hosting" (unless you want to)
7. Click **"Register app"**
8. Copy the `firebaseConfig` object - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## Step 4: Update Your Game Files

1. Open `my-games/spacetime/auth.js` in your code editor
2. Replace the placeholder config with your actual config
3. Save the file!

**Before:**
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    // ... more placeholders
};
```

**After:**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCkx...",
    authDomain: "spacetime-leaderboard.firebaseapp.com",
    databaseURL: "https://spacetime-leaderboard-default-rtdb.firebaseio.com",
    projectId: "spacetime-leaderboard",
    // ... your actual values
};
```

---

## Step 5: Set Up Security Rules (IMPORTANT!)

This protects your database from hackers!

1. Go back to Firebase Console
2. Click **"Build"** → **"Realtime Database"**
3. Click the **"Rules"** tab at the top
4. Replace the rules with this:

```json
{
  "rules": {
    ".read": true,
    "scores": {
      ".write": "auth != null",
      ".validate": "newData.hasChildren(['username', 'coins', 'waves', 'timestamp', 'uid'])",
      "username": {
        ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 20"
      },
      "coins": {
        ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 10000"
      },
      "waves": {
        ".validate": "newData.isNumber() && newData.val() >= 1"
      },
      "timestamp": {
        ".validate": "newData.isNumber() && newData.val() <= now"
      },
      "uid": {
        ".validate": "newData.isString() && newData.val() === auth.uid"
      },
      "$scoreId": {
        ".validate": "newData.hasChildren(['username', 'coins', 'waves', 'timestamp', 'uid'])"
      }
    },
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "usernames": {
      ".write": "auth != null"
    }
  }
}
```

5. Click **"Publish"**

---

## Step 6: Enable Authentication

1. In Firebase Console, click **"Build"** → **"Authentication"**
2. Click **"Get Started"**
3. Click the **"Sign-in method"** tab
4. Click **"Email/Password"**
5. Enable it (toggle ON)
6. Click **"Save"**

---

## Step 7: Test It Out!

1. Open your game locally (just open `my-games/spacetime/index.html` in your browser)
2. Try to create an account on the start screen
3. Play a game and submit your score
4. Check if it appears on the leaderboard!

---

## 🔧 Troubleshooting

**"Error: The project X doesn't exist"**
→ Make sure you copied the config correctly in Step 4

**"Permission denied" error**
→ Check your Firebase Rules (Step 5) - make sure you published them!

**Scores not showing up**
→ Open browser console (F12) and look for error messages

**Can't log in**
→ Make sure you enabled Email/Password auth (Step 6)

---

## 🚀 Ready to Deploy?

Once it works locally:
1. Push your changes to GitHub
2. Your site will update automatically at `https://hmmburger.github.io/my-games/`

---

Need help? Just let me know! 🎮
