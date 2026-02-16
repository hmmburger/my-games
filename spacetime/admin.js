// Admin Panel Logic
const ADMIN_PASSWORD = 'NoMoreHackers';
window.adminLoggedIn = window.adminLoggedIn || false;
let allScores = [];

// Check if already logged in (session storage)
window.onload = function() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    }
};

function attemptLogin() {
    const passwordInput = document.getElementById('admin-password');
    const errorDiv = document.getElementById('login-error');
    const password = passwordInput.value;

    if (password === ADMIN_PASSWORD) {
        window.adminLoggedIn = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        passwordInput.value = '';
        showAdminPanel();
    } else {
        errorDiv.textContent = '❌ Incorrect password!';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Allow Enter key to submit login
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                attemptLogin();
            }
        });
    }
});

function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadAllScores();
}

async function loadAllScores() {
    const loadingDiv = document.getElementById('loading');
    const scoresListDiv = document.getElementById('scores-list');

    loadingDiv.style.display = 'block';
    scoresListDiv.innerHTML = '';

    const result = await getAllScores();

    if (result.success) {
        allScores = result.scores;
        displayScores(allScores);
        updateStats(allScores);
    } else {
        loadingDiv.textContent = 'Failed to load scores!';
    }
}

function displayScores(scores) {
    const loadingDiv = document.getElementById('loading');
    const scoresListDiv = document.getElementById('scores-list');

    loadingDiv.style.display = 'none';
    scoresListDiv.innerHTML = '';

    if (scores.length === 0) {
        scoresListDiv.innerHTML = '<div class="no-scores">No scores yet!</div>';
        return;
    }

    // Sort by timestamp (newest first)
    scores.sort((a, b) => b.timestamp - a.timestamp);

    scores.forEach((score) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.id = 'score-' + score.key;

        const dateStr = formatDate(score.timestamp);

        // Validate score
        const maxCoinsForWaves = score.waves * 1500;
        const isValid = score.coins <= 10000 && score.coins <= maxCoinsForWaves;
        const validationFlag = isValid ? '' : ' ⚠️ SUSPICIOUS';

        scoreItem.innerHTML = `
            <div class="score-info">
                <div class="player-name">${escapeHtml(score.username)}${validationFlag}</div>
                <div class="score-details">
                    📅 ${dateStr} | 🌊 Wave ${score.waves} | UID: ${score.uid ? score.uid.substring(0, 8) : 'unknown'}...
                </div>
            </div>
            <div class="score-value">💰 ${score.coins}</div>
            <button class="delete-btn" onclick="confirmDelete('${score.key}')">🗑️ DELETE</button>
        `;

        scoresListDiv.appendChild(scoreItem);
    });
}

function updateStats(scores) {
    // Total scores
    document.getElementById('total-scores').textContent = scores.length;

    // Unique players
    const uniquePlayers = new Set(scores.map(s => s.uid)).size;
    document.getElementById('unique-players').textContent = uniquePlayers;

    // High score
    const highScore = scores.length > 0 ? Math.max(...scores.map(s => s.coins)) : 0;
    document.getElementById('high-score').textContent = highScore;
}

function confirmDelete(scoreKey) {
    if (confirm('Are you sure you want to delete this score?')) {
        deleteScoreAndRefresh(scoreKey);
    }
}

async function deleteScoreAndRefresh(scoreKey) {
    const result = await deleteScore(scoreKey);

    if (result.success) {
        // Remove from UI
        const scoreElement = document.getElementById('score-' + scoreKey);
        if (scoreElement) {
            scoreElement.style.opacity = '0.5';
            scoreElement.style.transform = 'scale(0.95)';
        }

        // Reload scores after a short delay
        setTimeout(() => {
            loadAllScores();
        }, 500);
    } else {
        alert('❌ Failed to delete score: ' + result.message);
    }
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// ========== ADMIN POWERS ==========

// Broadcast Message
async function broadcastMessage() {
    const messageInput = document.getElementById('broadcast-message');
    const statusDiv = document.getElementById('broadcast-status');
    const message = messageInput.value.trim();

    if (!message) {
        showStatus('broadcast-status', 'Please enter a message!', 'error');
        return;
    }

    try {
        await database.ref('broadcast').set({
            message: message,
            timestamp: Date.now(),
            active: true
        });

        messageInput.value = '';
        showStatus('broadcast-status', '✅ Message broadcasted to all players!', 'success');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    } catch (error) {
        showStatus('broadcast-status', '❌ Failed to broadcast: ' + error.message, 'error');
    }
}

// Clear Broadcast
async function clearBroadcast() {
    if (!confirm('Remove the broadcast message?')) {
        return;
    }

    try {
        await database.ref('broadcast').remove();
        showStatus('broadcast-status', '✅ Broadcast cleared!', 'success');

        setTimeout(() => {
            document.getElementById('broadcast-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        showStatus('broadcast-status', '❌ Failed to clear: ' + error.message, 'error');
    }
}

// Add Fake Score
async function addFakeScore() {
    const username = document.getElementById('fake-username').value.trim();
    const coins = parseInt(document.getElementById('fake-coins').value);
    const waves = parseInt(document.getElementById('fake-waves').value);

    if (!username || isNaN(coins) || isNaN(waves)) {
        showStatus('fake-status', '❌ Please fill all fields!', 'error');
        return;
    }

    if (waves < 1) {
        showStatus('fake-status', '❌ Waves must be at least 1!', 'error');
        return;
    }

    if (coins > 10000) {
        showStatus('fake-status', '❌ Max 10,000 coins!', 'error');
        return;
    }

    try {
        const fakeUid = 'fake_' + Date.now();
        const scoreData = {
            username: username,
            coins: coins,
            waves: waves,
            timestamp: Date.now(),
            uid: fakeUid
        };

        await database.ref('scores').push(scoreData);

        // Clear inputs
        document.getElementById('fake-username').value = '';
        document.getElementById('fake-coins').value = '';
        document.getElementById('fake-waves').value = '';

        showStatus('fake-status', '✅ Fake score added! Refreshing...', 'success');

        // Reload scores
        setTimeout(() => {
            loadAllScores();
            document.getElementById('fake-status').style.display = 'none';
        }, 1500);
    } catch (error) {
        showStatus('fake-status', '❌ Failed: ' + error.message, 'error');
    }
}

// Ban Player
async function banPlayer() {
    const identifier = document.getElementById('ban-username').value.trim();

    if (!identifier) {
        showStatus('ban-status', '❌ Please enter username or UID!', 'error');
        return;
    }

    try {
        // Add to banned list
        await database.ref('banned/' + identifier.toLowerCase()).set({
            identifier: identifier,
            timestamp: Date.now(),
            reason: 'Banned by admin'
        });

        document.getElementById('ban-username').value = '';
        showStatus('ban-status', '✅ Player banned!', 'success');

        setTimeout(() => {
            document.getElementById('ban-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        showStatus('ban-status', '❌ Failed: ' + error.message, 'error');
    }
}

// Unban Player
async function unbanPlayer() {
    const identifier = document.getElementById('ban-username').value.trim();

    if (!identifier) {
        showStatus('ban-status', '❌ Please enter username or UID!', 'error');
        return;
    }

    try {
        await database.ref('banned/' + identifier.toLowerCase()).remove();

        document.getElementById('ban-username').value = '';
        showStatus('ban-status', '✅ Player unbanned!', 'success');

        setTimeout(() => {
            document.getElementById('ban-status').style.display = 'none';
        }, 3000);
    } catch (error) {
        showStatus('ban-status', '❌ Failed: ' + error.message, 'error');
    }
}

// Load Banned List
async function loadBannedList() {
    const bannedListDiv = document.getElementById('banned-list');

    try {
        const snapshot = await database.ref('banned').once('value');

        if (!snapshot.exists()) {
            bannedListDiv.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No banned players</div>';
            return;
        }

        let html = '';
        snapshot.forEach((childSnapshot) => {
            const ban = childSnapshot.val();
            const date = new Date(ban.timestamp).toLocaleDateString();
            html += `
                <div class="banned-item">
                    <div>
                        <strong>${escapeHtml(ban.identifier)}</strong><br>
                        <span style="color: #888;">Banned: ${date}</span>
                    </div>
                    <button class="delete-btn" onclick="unbanPlayerByName('${ban.identifier}')">UNBAN</button>
                </div>
            `;
        });

        bannedListDiv.innerHTML = html;
    } catch (error) {
        bannedListDiv.innerHTML = '<div style="color: #ff0000; text-align: center;">Failed to load banned list</div>';
    }
}

// Unban by name (helper for list)
async function unbanPlayerByName(identifier) {
    if (confirm(`Unban ${identifier}?`)) {
        await database.ref('banned/' + identifier.toLowerCase()).remove();
        loadBannedList(); // Refresh list
    }
}

// Edit Score
function openEditModal(scoreKey) {
    const score = allScores.find(s => s.key === scoreKey);
    if (!score) return;

    document.getElementById('edit-score-key').value = scoreKey;
    document.getElementById('edit-username').value = score.username;
    document.getElementById('edit-coins').value = score.coins;
    document.getElementById('edit-waves').value = score.waves;

    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

async function saveEditedScore() {
    const scoreKey = document.getElementById('edit-score-key').value;
    const username = document.getElementById('edit-username').value.trim();
    const coins = parseInt(document.getElementById('edit-coins').value);
    const waves = parseInt(document.getElementById('edit-waves').value);

    if (!username || isNaN(coins) || isNaN(waves)) {
        alert('Please fill all fields!');
        return;
    }

    if (coins < 0 || coins > 10000) {
        alert('Coins must be between 0 and 10,000!');
        return;
    }

    if (waves < 1) {
        alert('Waves must be at least 1!');
        return;
    }

    try {
        await database.ref('scores/' + scoreKey).update({
            username: username,
            coins: coins,
            waves: waves
        });

        closeEditModal();
        loadAllScores(); // Refresh
    } catch (error) {
        alert('Failed to save: ' + error.message);
    }
}

// Update displayScores to add edit button
const originalDisplayScores = displayScores;
displayScores = function(scores) {
    originalDisplayScores(scores);

    // Add edit buttons to each score
    scores.forEach((score) => {
        const scoreElement = document.getElementById('score-' + score.key);
        if (scoreElement) {
            const deleteBtn = scoreElement.querySelector('.delete-btn');
            if (deleteBtn) {
                const editBtn = document.createElement('button');
                editBtn.className = 'delete-btn';
                editBtn.style.marginRight = '10px';
                editBtn.style.background = 'linear-gradient(180deg, #00ff00, #009900)';
                editBtn.textContent = '✏️ EDIT';
                editBtn.onclick = () => openEditModal(score.key);
                deleteBtn.parentNode.insertBefore(editBtn, deleteBtn);
            }
        }
    });
};

// Helper: Show status message
function showStatus(elementId, message, type) {
    const statusDiv = document.getElementById(elementId);
    statusDiv.textContent = message;
    statusDiv.className = 'message-status ' + type;
    statusDiv.style.display = 'block';
}
