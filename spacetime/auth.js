console.log('🔥 AUTH.JS LOADING!');
alert('🔥 auth.js is running!'); // DEBUG - remove this later!

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBiKZFuPPnJhOck1LGweKnjLmsjKSLldPg",
    authDomain: "leaderboard-spacetime.firebaseapp.com",
    databaseURL: "https://leaderboard-spacetime-default-rtdb.firebaseio.com",
    projectId: "leaderboard-spacetime",
    storageBucket: "leaderboard-spacetime.firebasestorage.app",
    messagingSenderId: "532901733142",
    appId: "1:532901733142:web:4f76b496b06c0f9cbb6637"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Auth State Management
let currentUser = null;

// Track last submission time for rate limiting
let lastSubmissionTime = 0;
const SUBMISSION_COOLDOWN = 60000; // 60 seconds

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    console.log('=== AUTH STATE CHANGED ===');
    console.log('User:', user);
    currentUser = user;
    updateAuthUI();
    // Check for gifted coins when user logs in
    if (user) {
        console.log('User is logged in, checking for gifts...');
        checkForGiftedCoins();
    } else {
        console.log('No user logged in');
    }
});

function updateAuthUI() {
    const loggedOutView = document.getElementById('logged-out-view');
    const loggedInView = document.getElementById('logged-in-view');
    const currentUsername = document.getElementById('current-username');
    const submitBtn = document.getElementById('submit-score-btn');
    const loginPrompt = document.getElementById('login-prompt');

    if (currentUser) {
        // User is logged in
        if (loggedOutView) loggedOutView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';
        if (currentUsername) currentUsername.textContent = currentUser.displayName || currentUser.email;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'SUBMIT SCORE';
        }
        if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
        // User is logged out
        if (loggedOutView) loggedOutView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'LOG IN TO SUBMIT';
        }
        if (loginPrompt) loginPrompt.style.display = 'block';
    }
}

// Sign Up Function
async function signUp(username, password) {
    try {
        // Check if username is taken
        const usernameRef = database.ref('usernames/' + username.toLowerCase());
        const snapshot = await usernameRef.once('value');

        if (snapshot.exists()) {
            return { success: false, message: 'Username already taken!' };
        }

        // Create a fake email for Firebase Auth (username@spacetime.game)
        const email = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@spacetime.game';

        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update profile with display name
        await user.updateProfile({ displayName: username });

        // Reserve the username in database
        await usernameRef.set({
            uid: user.uid,
            username: username,
            createdAt: Date.now()
        });

        // Create user profile in database
        await database.ref('users/' + user.uid).set({
            username: username,
            createdAt: Date.now(),
            scoreCount: 0
        });

        return { success: true, message: 'Account created! Welcome ' + username + '!' };
    } catch (error) {
        console.error('Signup error:', error);
        let message = 'Signup failed!';
        switch(error.code) {
            case 'auth/weak-password':
                message = 'Password should be at least 6 characters!';
                break;
            case 'auth/email-already-in-use':
                message = 'Username already taken!';
                break;
            default:
                message = error.message;
        }
        return { success: false, message: message };
    }
}

// Log In Function
async function logIn(username, password) {
    try {
        // Convert username to fake email format
        const email = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@spacetime.game';

        await auth.signInWithEmailAndPassword(email, password);
        return { success: true, message: 'Welcome back!' };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Invalid username or password!' };
    }
}

// Log Out Function
async function logOut() {
    try {
        await auth.signOut();
        return { success: true, message: 'Logged out successfully!' };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, message: 'Logout failed!' };
    }
}

// Submit Score to Database
async function submitScore(coins, waves) {
    if (!currentUser) {
        return { success: false, message: 'You must be logged in to submit scores!' };
    }

    // Check if user is banned
    const username = currentUser.displayName || 'Anonymous';
    const banCheck = await checkIfBanned(username.toLowerCase());
    if (banCheck.isBanned) {
        return { success: false, message: 'You are banned from submitting scores!' };
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastSubmissionTime < SUBMISSION_COOLDOWN) {
        const remaining = Math.ceil((SUBMISSION_COOLDOWN - (now - lastSubmissionTime)) / 1000);
        return { success: false, message: `Please wait ${remaining} seconds before submitting again!` };
    }

    // Score validation
    if (waves < 1) {
        return { success: false, message: 'You must survive at least 1 wave!' };
    }

    if (coins > 10000) {
        return { success: false, message: 'Score too high! Max is 10,000 coins.' };
    }

    // Check for reasonable coins-to-waves ratio
    const maxCoinsForWaves = waves * 1500;
    if (coins > maxCoinsForWaves) {
        return { success: false, message: `Score suspicious! Max ${maxCoinsForWaves} coins for ${waves} waves.` };
    }

    try {
        // Get username from current user
        const username = currentUser.displayName || 'Anonymous';

        // Create score entry
        const scoreData = {
            username: username,
            coins: coins,
            waves: waves,
            timestamp: Date.now(),
            uid: currentUser.uid
        };

        // Save to database
        const newScoreRef = await database.ref('scores').push(scoreData);

        // Update user's score count
        await database.ref('users/' + currentUser.uid).transaction((user) => {
            if (user) {
                user.scoreCount = (user.scoreCount || 0) + 1;
            }
            return user;
        });

        lastSubmissionTime = now;

        return {
            success: true,
            message: `Score submitted! ${coins} coins - Good luck on the leaderboard!`,
            scoreId: newScoreRef.key
        };
    } catch (error) {
        console.error('Score submission error:', error);
        return { success: false, message: 'Failed to submit score. Try again!' };
    }
}

// Get Top Scores from Database
async function getTopScores(limit = 100) {
    try {
        const snapshot = await database.ref('scores')
            .orderByChild('coins')
            .limitToLast(limit)
            .once('value');

        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push(childSnapshot.val());
        });

        // Sort descending (highest first)
        scores.sort((a, b) => b.coins - a.coins);

        return { success: true, scores: scores };
    } catch (error) {
        console.error('Error fetching scores:', error);
        return { success: false, scores: [] };
    }
}

// Get All Scores (for admin)
async function getAllScores() {
    try {
        const snapshot = await database.ref('scores').once('value');
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            const score = childSnapshot.val();
            score.key = childSnapshot.key;
            scores.push(score);
        });
        return { success: true, scores: scores };
    } catch (error) {
        console.error('Error fetching all scores:', error);
        return { success: false, scores: [] };
    }
}

// Delete Score (for admin)
async function deleteScore(scoreKey) {
    try {
        await database.ref('scores/' + scoreKey).remove();
        return { success: true, message: 'Score deleted!' };
    } catch (error) {
        console.error('Error deleting score:', error);
        return { success: false, message: 'Failed to delete score!' };
    }
}

// Helper: Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Helper: Check if user is logged in
function isLoggedIn() {
    return currentUser !== null;
}

// Helper: Get current username
function getCurrentUsername() {
    return currentUser ? (currentUser.displayName || 'Anonymous') : null;
}

// Check if user is banned
async function checkIfBanned(identifier) {
    try {
        const snapshot = await database.ref('banned/' + identifier).once('value');
        return { isBanned: snapshot.exists() };
    } catch (error) {
        console.error('Ban check error:', error);
        return { isBanned: false };
    }
}

// Get broadcast message
async function getBroadcastMessage() {
    try {
        const snapshot = await database.ref('broadcast').once('value');
        if (snapshot.exists() && snapshot.val().active) {
            return snapshot.val().message;
        }
        return null;
    } catch (error) {
        console.error('Error fetching broadcast:', error);
        return null;
    }
}

// Claim gifted coins
async function claimGiftedCoins(uid) {
    try {
        const snapshot = await database.ref('users/' + uid + '/giftBalance').once('value');

        if (snapshot.exists() && snapshot.val() !== 0) {
            const amount = snapshot.val();

            // Clear the gift balance
            await database.ref('users/' + uid + '/giftBalance').set(0);

            return { success: true, amount: amount };
        }

        return { success: false, amount: 0 };
    } catch (error) {
        console.error('Error claiming gift:', error);
        return { success: false, amount: 0 };
    }
}

// Check for gifted coins (when user logs in)
async function checkForGiftedCoins() {
    console.log('🎁 checkForGiftedCoins() called!');
    const user = auth.currentUser;

    if (!user) {
        console.log('❌ No user found, skipping gift check');
        return;
    }

    try {
        console.log('🔍 Checking Firebase for gifted coins...');
        console.log('User UID:', user.uid);

        const result = await claimGiftedCoins(user.uid);
        console.log('Claim result:', result);

        if (result.success && result.amount !== 0) {
            console.log('✅ Found gifted coins:', result.amount);

            // Get current total coins from localStorage
            let totalCoins = parseInt(localStorage.getItem('spacetime_coins')) || 0;
            console.log('Current coins before gift:', totalCoins);

            // Add or subtract coins from total
            totalCoins += result.amount;

            // Don't let total go below 0
            if (totalCoins < 0) totalCoins = 0;

            localStorage.setItem('spacetime_coins', totalCoins);
            console.log('New total coins:', totalCoins);

            // Update UI if elements exist
            const totalCoinsEl = document.getElementById('total-coins');
            if (totalCoinsEl) {
                totalCoinsEl.textContent = totalCoins;
                console.log('Updated UI with new coin total');
            }

            // Show notification
            if (result.amount > 0) {
                alert(`🎁 You received ${result.amount} gifted coins! Enjoy! 💰`);
            } else {
                alert(`💸 ${Math.abs(result.amount)} coins were removed from your account!`);
            }
        } else {
            console.log('ℹ️ No gifted coins found for this user');
        }
    } catch (error) {
        console.error('❌ Failed to check for gifts:', error);
    }
}
