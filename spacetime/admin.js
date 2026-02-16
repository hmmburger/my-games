// Admin Panel Logic
const ADMIN_PASSWORD = 'NoMoreHackers';
let isLoggedIn = false;
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
        isLoggedIn = true;
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
