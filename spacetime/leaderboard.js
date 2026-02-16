// Leaderboard Display Logic
let scores = [];
let refreshInterval = null;

// Load scores on page load
window.onload = function() {
    loadScores();

    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(() => {
        loadScores();
    }, 30000);
};

// Clean up interval when page unloads
window.onbeforeunload = function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
};

async function loadScores() {
    const loadingDiv = document.getElementById('loading');
    const leaderboardDiv = document.getElementById('leaderboard');

    loadingDiv.style.display = 'block';
    leaderboardDiv.style.display = 'none';

    const result = await getTopScores(100);

    if (result.success) {
        scores = result.scores;
        displayScores(scores);
    } else {
        loadingDiv.textContent = 'Failed to load scores. Refresh to try again!';
    }
}

function displayScores(scores) {
    const loadingDiv = document.getElementById('loading');
    const leaderboardDiv = document.getElementById('leaderboard');

    loadingDiv.style.display = 'none';
    leaderboardDiv.style.display = 'block';
    leaderboardDiv.innerHTML = '';

    if (scores.length === 0) {
        leaderboardDiv.innerHTML = '<div class="no-scores">No scores yet! Be the first to play!</div>';
        return;
    }

    scores.forEach((score, index) => {
        const rank = index + 1;
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';

        // Add special classes for top 3
        if (rank === 1) scoreItem.classList.add('top-1');
        if (rank === 2) scoreItem.classList.add('top-2');
        if (rank === 3) scoreItem.classList.add('top-3');

        // Trophy emojis for top 3
        let rankEmoji = rank;
        if (rank === 1) rankEmoji = '🥇';
        if (rank === 2) rankEmoji = '🥈';
        if (rank === 3) rankEmoji = '🥉';

        scoreItem.innerHTML = `
            <div class="rank">${rankEmoji}</div>
            <div class="player-info">
                <div class="player-name">${escapeHtml(score.username)}</div>
                <div class="score-date">${formatDate(score.timestamp)}</div>
            </div>
            <div class="score-right">
                <div class="score-coins">💰 ${score.coins}</div>
                <div class="score-waves">🌊 Wave ${score.waves}</div>
            </div>
        `;

        leaderboardDiv.appendChild(scoreItem);
    });
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Format date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            if (diffMinutes === 0) {
                return 'Just now';
            }
            return diffMinutes + 'm ago';
        }
        return diffHours + 'h ago';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return diffDays + ' days ago';
    } else {
        return date.toLocaleDateString();
    }
}
