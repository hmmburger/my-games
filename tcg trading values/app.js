// TCG Price Tracker App - Now with REAL PriceCharting data!

// State
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let currentCards = [];
let allSets = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadTrendingCards();
    loadSets();
    loadFlipOpportunities();
    loadWatchlist();
    initSearch();
    initModal();
    initScraperTest();
});

// Test if scraper works
function initScraperTest() {
    console.log('Checking if PriceCharting scraper works...');

    // Try to fetch from PriceCharting
    fetch('https://www.pricecharting.com/search?q=charizard&type=pokemon')
        .then(response => {
            console.log('Response status:', response.status);
            if (response.ok) {
                console.log('✅ Direct access might work!');
                return response.text();
            } else {
                console.log('❌ Got blocked or redirected');
                throw new Error('Blocked');
            }
        })
        .then(html => {
            console.log('Got HTML, length:', html.length);
        })
        .catch(error => {
            console.log('Fetch failed:', error.message);
            console.log('This usually means CORS is blocking us');
        });
}

// Navigation
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;

            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Real PriceCharting data fetching (via our server)
async function fetchFromPriceCharting(searchTerm) {
    try {
        const url = `http://localhost:3002/api/search?q=${encodeURIComponent(searchTerm)}`;
        console.log('Fetching from server:', url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Got ${data.cards.length} cards from server`);
            return data.cards;
        } else {
            console.error('Server error:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

// Parse PriceCharting HTML to extract card data
function parsePriceChartingHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const cards = [];

    // PriceCharting uses tables for their listings
    const table = doc.querySelector('#price_table');
    if (!table) {
        console.log('No price table found');
        return [];
    }

    const rows = table.querySelectorAll('tr[id^="product-"]');

    rows.forEach((row, index) => {
        try {
            const nameCell = row.querySelector('td[class*="product-name"]');
            const linkEl = nameCell?.querySelector('a');

            if (!linkEl) return;

            const name = linkEl.textContent.trim();
            const productUrl = linkEl.href;
            const productId = row.id?.replace('product-', '') || `pc-${index}`;

            // Get prices from the row
            const cells = row.querySelectorAll('td');
            let ungradedPrice = '0';
            let psa9Price = '0';
            let psa10Price = '0';

            // Extract numeric prices from cells
            cells.forEach(cell => {
                const text = cell.textContent.trim();
                const priceMatch = text.match(/\$?([\d,]+\.?\d*)/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                    // Try to identify which price this is based on position/context
                }
            });

            // Parse the name to get card info
            const cardInfo = parseCardName(name);

            cards.push({
                id: productId,
                name: cardInfo.name,
                set: cardInfo.set || 'Unknown',
                setNumber: cardInfo.number || '',
                imageUrl: `https://www.pricecharting.com/images/item-pic/${productId}.jpg`,
                prices: {
                    ungraded: extractPrice(cells, 'used'),
                    psa9: extractPrice(cells, 'psa9'),
                    psa10: extractPrice(cells, 'psa10')
                },
                productUrl: productUrl
            });
        } catch (error) {
            console.error('Error parsing row:', error);
        }
    });

    return cards;
}

// Extract price from table cells
function extractPrice(cells, type) {
    try {
        // PriceCharting columns vary, try to find the right one
        for (let cell of cells) {
            const text = cell.textContent.trim();
            if (text.includes('$') || text.match(/^\d+\.?\d*$/)) {
                const price = parseFloat(text.replace(/[\$]/g, '').replace(/,/g, ''));
                if (!isNaN(price) && price > 0) {
                    return price;
                }
            }
        }
        return 0;
    } catch (error) {
        return 0;
    }
}

// Parse card name like "Charizard (Base Set 4/102)"
function parseCardName(fullName) {
    const name = fullName.split('(')[0].trim();
    const setMatch = fullName.match(/\(([^)]+)\)/);
    const set = setMatch ? setMatch[1] : 'Unknown';

    const numberMatch = fullName.match(/(\d+\/\d+)/);
    const number = numberMatch ? numberMatch[1] : '';

    return { name, set, number };
}

// Load trending cards (using real search for popular cards)
async function loadTrendingCards() {
    const container = document.getElementById('trending-cards');
    container.innerHTML = '<div class="loading">Fetching real prices from PriceCharting...</div>';

    try {
        const response = await fetch('http://localhost:3002/api/trending');
        const data = await response.json();

        if (data.success && data.cards.length > 0) {
            currentCards = data.cards;
            container.innerHTML = '';

            data.cards.forEach(card => {
                const cardEl = createCardElement(card);
                container.appendChild(cardEl);
            });

            return;
        }
    } catch (error) {
        console.error('Trending fetch error:', error);
    }

    // Show error if we couldn't get data
    container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <h3>🔴 Server Not Running</h3>
            <p style="color: #64748b; margin-bottom: 20px;">The backend server needs to be started!</p>

            <div style="background: #1e293b; color: #10b981; padding: 20px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 0.9rem; margin-bottom: 20px;">
                <strong>Step 1:</strong> Install dependencies<br>
                npm install<br><br>
                <strong>Step 2:</strong> Start the server<br>
                npm start<br><br>
                <strong>Step 3:</strong> Refresh this page
            </div>

            <p style="color: #64748b;">The server fetches data from PriceCharting and sends it to this website.</p>
        </div>
    `;
}

// Load demo data as fallback
function loadDemoData() {
    window.location.reload();
}

// Create card element
function createCardElement(card, showFlipInfo = false) {
    const div = document.createElement('div');
    div.className = 'card-item';
    div.dataset.cardId = card.id;

    const isWatched = watchlist.includes(card.id);

    const priceChange = Math.random() * 20 - 10; // Random for now

    div.innerHTML = `
        <div style="width: 100%; height: 300px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; text-align: center; padding: 20px;">
            <div>
                <strong>${card.name}</strong><br>
                <span style="font-size: 0.9rem;">${card.set}</span>
            </div>
        </div>
        <div class="card-info">
            <div class="card-name">${card.name}</div>
            <div class="card-set">${card.set}</div>
            <div class="prices-grid">
                <div class="price-item">
                    <span class="price-label">Ungraded</span>
                    <span class="price-value">$${card.prices.ungraded || 'N/A'}</span>
                </div>
                <div class="price-item">
                    <span class="price-label">PSA 9</span>
                    <span class="price-value">$${card.prices.psa9 || 'N/A'}</span>
                </div>
                <div class="price-item">
                    <span class="price-label">PSA 10</span>
                    <span class="price-value">$${card.prices.psa10 || 'N/A'}</span>
                </div>
                <div class="price-item">
                    <span class="price-label">Change</span>
                    <span class="price-value" style="color: ${priceChange >= 0 ? '#10b981' : '#ef4444'}">
                        ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}%
                    </span>
                </div>
            </div>
            ${showFlipInfo ? `
                <div class="flip-badge">Flip Opportunity!</div>
                <div class="profit-text">Potential profit: $${calculateFlipProfit(card).toFixed(0)}</div>
            ` : ''}
            <div class="card-actions">
                <button class="watchlist-btn ${isWatched ? 'active' : ''}" onclick="toggleWatchlist('${card.id}', event)">
                    ${isWatched ? '⭐' : '☆'}
                </button>
            </div>
        </div>
    `;

    div.addEventListener('click', (e) => {
        if (!e.target.classList.contains('watchlist-btn')) {
            showCardDetail(card);
        }
    });

    return div;
}

// Calculate flip profit
function calculateFlipProfit(card, gradingCost = 30) {
    const buyPrice = card.prices.ungraded || 0;
    const sellPrice = card.prices.psa9 || 0;
    const profit = sellPrice - buyPrice - gradingCost;
    return profit;
}

// Toggle watchlist
function toggleWatchlist(cardId, event) {
    event.stopPropagation();

    if (watchlist.includes(cardId)) {
        watchlist = watchlist.filter(id => id !== cardId);
    } else {
        watchlist.push(cardId);
    }

    localStorage.setItem('watchlist', JSON.stringify(watchlist));

    const btn = event.target;
    btn.classList.toggle('active');
    btn.textContent = watchlist.includes(cardId) ? '⭐' : '☆';

    if (document.getElementById('watchlist').classList.contains('active')) {
        loadWatchlist();
    }
}

// Load watchlist
function loadWatchlist() {
    const container = document.getElementById('watchlist-results');
    container.innerHTML = '';

    if (watchlist.length === 0) {
        container.innerHTML = '<p class="empty-state">No cards in your watchlist yet. Click the star icon on any card to add it!</p>';
        return;
    }

    const watchedCards = currentCards.filter(card => watchlist.includes(card.id));
    watchedCards.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
    });
}

// Load sets
function loadSets() {
    const container = document.getElementById('sets-grid');
    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #64748b;">Sets will be loaded when we connect to Pokemon TCG API</p>';
}

// Load flip opportunities
function loadFlipOpportunities() {
    const container = document.getElementById('flip-results');
    container.innerHTML = '<p style="padding: 40px; text-align: center; color: #64748b;">Flip finder needs real price data from PriceCharting</p>';
}

// Initialize search
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

// Perform search
async function performSearch() {
    const query = document.getElementById('search-input').value;
    const container = document.getElementById('search-results');

    if (!query.trim()) {
        container.innerHTML = '<p class="empty-state">Please enter a search term</p>';
        return;
    }

    container.innerHTML = '<div class="loading">Searching PriceCharting...</div>';

    const cards = await fetchFromPriceCharting(query);

    if (!cards || cards.length === 0) {
        container.innerHTML = `
            <p class="empty-state">
                No results found or couldn't connect to PriceCharting.<br>
                <small>(They block browser requests - need a server)</small>
            </p>
        `;
        return;
    }

    container.innerHTML = '';
    cards.forEach(card => {
        const cardEl = createCardElement(card);
        container.appendChild(cardEl);
    });
}

// Show card detail
function showCardDetail(card) {
    const modal = document.getElementById('card-modal');
    const body = document.getElementById('modal-body');

    body.innerHTML = `
        <div style="text-align: center;">
            <h2>${card.name}</h2>
            <p style="color: #64748b;">${card.set}</p>
        </div>

        <h3 style="margin-top: 30px; margin-bottom: 15px;">Current Prices</h3>
        <div class="prices-grid" style="grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div class="price-item" style="padding: 15px;">
                <span class="price-label">Ungraded</span>
                <span class="price-value" style="font-size: 1.5rem;">$${card.prices.ungraded || 'N/A'}</span>
            </div>
            <div class="price-item" style="padding: 15px;">
                <span class="price-label">PSA 9</span>
                <span class="price-value" style="font-size: 1.5rem;">$${card.prices.psa9 || 'N/A'}</span>
            </div>
            <div class="price-item" style="padding: 15px;">
                <span class="price-label">PSA 10</span>
                <span class="price-value" style="font-size: 1.5rem;">$${card.prices.psa10 || 'N/A'}</span>
            </div>
        </div>

        <div style="margin-top: 30px; text-align: center;">
            <a href="${card.productUrl || '#'}" target="_blank" class="btn-primary" style="display: inline-block; text-decoration: none;">
                View on PriceCharting →
            </a>
        </div>
    `;

    modal.classList.add('active');
}

// Initialize modal
function initModal() {
    const modal = document.getElementById('card-modal');
    const close = document.querySelector('.close');

    close.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}
