// Pokemon TCG API Scraper
// Uses the free Pokemon TCG API at https://api.pokemontcg.io

const fetch = require('node-fetch');
const fs = require('fs');

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_TCG_API_KEY || ''; // Optional: get free key at pokemontcg.io

/**
 * Search for Pokemon cards using the official API
 */
async function searchPokemonCards(query, maxResults = 20) {
    try {
        console.log(`🔍 Searching Pokemon TCG API for: ${query}`);

        const headers = {};
        if (API_KEY) {
            headers['X-Api-Key'] = API_KEY;
        }

        const response = await fetch(
            `${API_BASE}/cards?q=name:${encodeURIComponent(query)}*&orderBy=popularity&pageSize=${maxResults}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data) {
            console.log('No cards found');
            return [];
        }

        console.log(`✅ Found ${data.data.length} cards from Pokemon TCG API`);

        // Convert to our format with estimated prices
        const cards = data.data.map(card => {
            const prices = estimatePrices(card);
            return {
                id: card.id,
                name: card.name,
                set: card.set?.name || 'Unknown',
                setNumber: card.number || '?',
                imageUrl: card.images?.large || card.images?.small || '',
                rarity: card.rarity || 'Unknown',
                prices: prices,
                types: card.types || [],
                hp: card.hp || null,
                artist: card.artist || 'Unknown',
                tcgUrl: `https://pokemontcg.io/${card.id}`
            };
        });

        return cards;

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return [];
    }
}

/**
 * Get cards from a specific set
 */
async function getCardsBySet(setId, maxCards = 50) {
    try {
        console.log(`📚 Fetching set: ${setId}`);

        const headers = {};
        if (API_KEY) {
            headers['X-Api-Key'] = API_KEY;
        }

        const response = await fetch(
            `${API_BASE}/cards?q=set.id:${setId}&orderBy=number&pageSize=${maxCards}`,
            { headers }
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        console.log(`✅ Found ${data.data.length} cards in set`);

        return data.data.map(card => ({
            id: card.id,
            name: card.name,
            set: card.set?.name || 'Unknown',
            setNumber: card.number || '?',
            imageUrl: card.images?.large || card.images?.small || '',
            rarity: card.rarity || 'Unknown',
            prices: estimatePrices(card),
            types: card.types || [],
            hp: card.hp || null
        }));

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return [];
    }
}

/**
 * Get popular/valuable cards
 */
async function getPopularCards() {
    try {
        console.log('🔥 Fetching popular cards...');

        // Search for high-value cards
        const valuableSearches = [
            'Charizard',
            'Pikachu',
            'Mewtwo',
            'Lugia',
            'Rayquaza',
            'Gengar',
            'Eevee',
            'Umbreon',
            'Espeon'
        ];

        const allCards = [];

        for (const search of valuableSearches) {
            const cards = await searchPokemonCards(search, 10);
            allCards.push(...cards);
            await sleep(200); // Small delay between requests
        }

        // Remove duplicates and sort
        const uniqueCards = [...new Map(allCards.map(c => [c.id, c])).values()];
        uniqueCards.sort((a, b) => b.prices.ungraded - a.prices.ungraded);

        console.log(`\n📊 Total unique popular cards: ${uniqueCards.length}`);

        return uniqueCards.slice(0, 100); // Top 100

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return [];
    }
}

/**
 * Estimate prices based on card attributes
 * Uses real market knowledge to approximate values
 */
function estimatePrices(card) {
    const rarity = (card.rarity || '').toLowerCase();
    const set = card.set?.name || '';
    const name = card.name || '';

    let basePrice = 1; // Default

    // Rarity multipliers
    if (rarity.includes('rare holo')) basePrice = 10;
    else if (rarity.includes('rare ultra') || rarity.includes('gx') || rarity.includes('vmax')) basePrice = 30;
    else if (rarity.includes('rare secret')) basePrice = 80;
    else if (rarity.includes('rare')) basePrice = 5;
    else if (rarity.includes('uncommon')) basePrice = 0.50;
    else if (rarity.includes('common')) basePrice = 0.10;

    // Set bonuses (older sets = more valuable)
    if (set.includes('Base') || set.includes('Jungle') || set.includes('Fossil')) {
        basePrice *= 10;
    } else if (set.includes('Neo') || set.includes('Rocket')) {
        basePrice *= 5;
    } else if (set.includes('EX') || set.includes('LV.X')) {
        basePrice *= 3;
    }

    // Character bonuses
    const popularNames = ['Charizard', 'Pikachu', 'Mewtwo', 'Lugia', 'Rayquaza', 'Gengar', 'Umbreon', 'Eevee'];
    const isPopular = popularNames.some(pn => name.toLowerCase().includes(pn.toLowerCase()));
    if (isPopular) {
        basePrice *= 2;
    }

    // Calculate prices
    const ungraded = Math.round(basePrice * 10) / 10;
    const psa9 = Math.round(ungraded * 4);
    const psa10 = Math.round(ungraded * 20);

    return {
        ungraded: ungraded,
        psa9: psa9,
        psa10: psa10
    };
}

/**
 * Save cards to file
 */
function saveToFile(cards, filename) {
    fs.writeFileSync(filename, JSON.stringify(cards, null, 2));
    console.log(`💾 Saved ${cards.length} cards to ${filename}`);
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Update server database file
 */
function updateServerDatabase(cards) {
    const serverContent = `// Auto-generated card database from Pokemon TCG API
// Generated: ${new Date().toISOString()}

const cardDatabase = ${JSON.stringify(cards, null, 4)};

module.exports = cardDatabase;
`;

    fs.writeFileSync('card-database.js', serverContent);
    console.log(`✅ Updated card-database.js for server`);
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'search' && args[1]) {
        const cards = await searchPokemonCards(args[1], 20);
        saveToFile(cards, 'search-results.json');

    } else if (command === 'set' && args[1]) {
        const cards = await getCardsBySet(args[1], 100);
        saveToFile(cards, `set-${args[1]}.json`);

    } else if (command === 'popular') {
        const cards = await getPopularCards();
        saveToFile(cards, 'popular-cards.json');
        updateServerDatabase(cards);

    } else if (command === 'charizard') {
        // Quick demo
        const cards = await searchPokemonCards('Charizard', 20);
        console.log('\n🎴 Charizard Cards Found:');
        cards.forEach(card => {
            console.log(`  - ${card.name} (${card.set}) - $${card.prices.ungraded}`);
        });
        saveToFile(cards, 'charizard-cards.json');

    } else {
        console.log(`
🎴 Pokemon TCG API Scraper

Usage:
  node tcg-api-scraper.js search "card name"     Search for cards
  node tcg-api-scraper.js set base1-1           Get cards from a set
  node tcg-api-scraper.js popular               Get popular/valuable cards
  node tcg-api-scraper.js charizard             Quick demo

Examples:
  node tcg-api-scraper.js search "Charizard"
  node tcg-api-scraper.js popular

Note: Get free API key at https://pokemontcg.io (optional but recommended)
Set environment variable: export POKEMON_TCG_API_KEY=your_key_here
        `);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    searchPokemonCards,
    getCardsBySet,
    getPopularCards,
    estimatePrices
};
