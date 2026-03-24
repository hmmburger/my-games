// Pokemon TCG Server - Using scraped Pokemon TCG API data

const express = require('express');
const fetch = require('node-fetch');
const cardDatabase = require('./complete-card-database.js');

const app = express();
const PORT = 3002;

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// Serve static files
app.use(express.static(__dirname));

// Search endpoint - search local database
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase().trim();
        if (!query) {
            return res.json({ success: true, cards: cardDatabase.slice(0, 12) });
        }

        console.log(`Searching for: ${query}`);

        // Search local database
        const results = cardDatabase.filter(card =>
            card.name.toLowerCase().includes(query) ||
            card.set.toLowerCase().includes(query)
        );

        console.log(`Found ${results.length} cards`);

        res.json({
            success: true,
            query: query,
            cards: results
        });

    } catch (error) {
        console.error('Search error:', error);
        res.json({
            success: false,
            error: error.message,
            cards: []
        });
    }
});

// Get trending cards
app.get('/api/trending', async (req, res) => {
    try {
        // Return top cards sorted by price
        const trending = [...cardDatabase]
            .sort((a, b) => b.prices.ungraded - a.prices.ungraded)
            .slice(0, 12);

        res.json({
            success: true,
            cards: trending
        });

    } catch (error) {
        console.error('Trending error:', error);
        res.json({
            success: false,
            error: error.message,
            cards: []
        });
    }
});

// Get all sets
app.get('/api/sets', async (req, res) => {
    try {
        const sets = [...new Set(cardDatabase.map(card => card.set))];

        const setInfo = sets.map(setName => {
            const cardsInSet = cardDatabase.filter(card => card.set === setName);
            return {
                name: setName,
                cards: cardsInSet.length,
                year: cardsInSet[0]?.imageUrl.includes('base1') ? '1999' : '2000+'
            };
        });

        res.json({
            success: true,
            sets: setInfo
        });

    } catch (error) {
        console.error('Sets error:', error);
        res.json({
            success: false,
            error: error.message,
            sets: []
        });
    }
});

// Get cards by set
app.get('/api/set/:setName', async (req, res) => {
    try {
        const setName = req.params.setName;
        const cards = cardDatabase.filter(card => card.set === setName);

        res.json({
            success: true,
            setName: setName,
            cards: cards
        });

    } catch (error) {
        console.error('Set error:', error);
        res.json({
            success: false,
            error: error.message,
            cards: []
        });
    }
});

// Get all cards (for browse)
app.get('/api/cards', async (req, res) => {
    try {
        res.json({
            success: true,
            cards: cardDatabase
        });

    } catch (error) {
        console.error('Cards error:', error);
        res.json({
            success: false,
            error: error.message,
            cards: []
        });
    }
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   TCG Price Server Running! 🚀        ║
╠════════════════════════════════════════╣
║   Local: http://localhost:${PORT}           ║
║   Cards: ${cardDatabase.length} cards in database        ║
╚════════════════════════════════════════╝
    `);
});
