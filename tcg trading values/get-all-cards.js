// Get ALL Pokemon Cards from ALL Sets
// This will take a few minutes - grab a snack! 🍕

const fetch = require('node-fetch');
const fs = require('fs');

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_TCG_API_KEY || ''; // Get free key at pokemontcg.io

let totalCards = 0;
let totalSets = 0;
let skippedSets = 0;
const allCards = [];

/**
 * Get all Pokemon card sets
 */
async function getAllSets() {
    try {
        console.log('📚 Fetching all sets...');

        const headers = {};
        if (API_KEY) {
            headers['X-Api-Key'] = API_KEY;
        }

        // Fetch all sets (the API paginates, so we need to get all pages)
        let allSets = [];
        let page = 1;
        const pageSize = 250;

        while (true) {
            const response = await fetch(
                `${API_BASE}/sets?page=${page}&pageSize=${pageSize}`,
                { headers }
            );

            if (!response.ok) {
                console.error(`❌ Error fetching sets: ${response.status}`);
                break;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                break;
            }

            allSets = allSets.concat(data.data);
            console.log(`   Page ${page}: ${data.data.length} sets`);

            if (data.data.length < pageSize) {
                break;
            }

            page++;
            await sleep(100); // Small delay
        }

        console.log(`✅ Found ${allSets.length} total sets!\n`);
        return allSets;

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return [];
    }
}

/**
 * Get all cards from a specific set
 */
async function getCardsFromSet(set, index, total) {
    try {
        const setName = set.name;
        const setId = set.id;

        console.log(`[${index + 1}/${total}] 📦 ${setName} (${set.series || 'Unknown'}) - ${set.total || '?'} cards`);

        const headers = {};
        if (API_KEY) {
            headers['X-Api-Key'] = API_KEY;
        }

        // The API has a limit, so we need to paginate
        let page = 1;
        const pageSize = 250;
        let setCardCount = 0;
        let allSetCards = [];

        while (true) {
            try {
                const response = await fetch(
                    `${API_BASE}/cards?q=set.id:${setId}&page=${page}&pageSize=${pageSize}&orderBy=number`,
                    { headers }
                );

                if (!response.ok) {
                    if (response.status === 429) {
                        console.log(`   ⏸️ Rate limited! Waiting 10 seconds...`);
                        await sleep(10000);
                        continue;
                    }
                    console.log(`   ⚠️ Error: HTTP ${response.status}`);
                    break;
                }

                const data = await response.json();

                if (!data.data || data.data.length === 0) {
                    break;
                }

                const cards = data.data.map(card => ({
                    id: card.id,
                    name: card.name,
                    set: setName,
                    setId: setId,
                    setSeries: set.series || 'Unknown',
                    setReleaseDate: set.releaseDate || '',
                    setNumber: card.number || '?',
                    imageUrl: card.images?.large || card.images?.small || '',
                    rarity: card.rarity || 'Unknown',
                    prices: estimatePrices(card, setName),
                    types: card.types || [],
                    hp: card.hp || null,
                    artist: card.artist || 'Unknown',
                    supertype: card.supertype || 'Pokémon'
                }));

                allSetCards = allSetCards.concat(cards);
                setCardCount += cards.length;

                console.log(`   Page ${page}: ${cards.length} cards`);

                if (data.data.length < pageSize) {
                    break;
                }

                page++;
                await sleep(50); // Small delay between pages

            } catch (error) {
                console.log(`   ⚠️ Error on page ${page}: ${error.message}`);
                break;
            }
        }

        console.log(`   ✅ Total: ${setCardCount} cards from ${setName}\n`);
        return allSetCards;

    } catch (error) {
        console.error(`   ❌ Error getting cards from set: ${error.message}\n`);
        return [];
    }
}

/**
 * Estimate prices based on card attributes
 */
function estimatePrices(card, setName) {
    const rarity = (card.rarity || '').toLowerCase();
    const name = card.name || '';

    let basePrice = 0.50; // Default

    // Rarity multipliers
    if (rarity.includes('rare holo')) basePrice = 8;
    else if (rarity.includes('rare ultra') || rarity.includes('rare secret')) basePrice = 40;
    else if (rarity.includes('rare ace')) basePrice = 50;
    else if (rarity.includes('legend')) basePrice = 60;
    else if (rarity.includes('gx') || rarity.includes('ex')) basePrice = 25;
    else if (rarity.includes('vmax') || rarity.includes('vstar')) basePrice = 35;
    else if (rarity.includes('v') && rarity.includes('alt')) basePrice = 45;
    else if (rarity.includes('v')) basePrice = 15;
    else if (rarity.includes('rare')) basePrice = 4;
    else if (rarity.includes('uncommon')) basePrice = 0.30;
    else if (rarity.includes('common')) basePrice = 0.10;

    // Set bonuses (older sets = more valuable)
    if (setName.includes('Base') || setName.includes('Jungle') || setName.includes('Fossil')) {
        basePrice *= 8;
    } else if (setName.includes('Neo') || setName.includes('Rocket') || setName.includes('Gym')) {
        basePrice *= 4;
    } else if (setName.includes(' Expedition') || setName.includes('Aquapolis') || setName.includes('Skyridge')) {
        basePrice *= 3;
    } else if (setName.includes('Ruby') || setName.includes('Sapphire') || setName.includes('Emerald')) {
        basePrice *= 2;
    }

    // Character bonuses
    const superPopular = ['Charizard', 'Pikachu', 'Mewtwo', 'Lugia', 'Rayquaza', 'Gengar', 'Umbreon'];
    const popular = ['Eevee', 'Mew', 'Celebi', 'Snorlax', 'Dragonite', 'Blastoise', 'Venusaur', 'Lucario'];

    if (superPopular.some(pn => name.toLowerCase().includes(pn.toLowerCase()))) {
        basePrice *= 3;
    } else if (popular.some(pn => name.toLowerCase().includes(pn.toLowerCase()))) {
        basePrice *= 1.5;
    }

    // Calculate prices
    const ungraded = Math.round(basePrice * 10) / 10;
    const psa9 = Math.round(ungraded * 3.5);
    const psa10 = Math.round(ungraded * 15);

    return {
        ungraded: ungraded,
        psa9: psa9,
        psa10: psa10
    };
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save progress to file
 */
function saveProgress() {
    const progress = {
        totalCards: totalCards,
        totalSets: totalSets,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync('scraping-progress.json', JSON.stringify(progress, null, 2));
}

/**
 * Save cards to file
 */
function saveCards(cards, filename) {
    fs.writeFileSync(filename, JSON.stringify(cards, null, 2));
    console.log(`💾 Saved ${cards.length} cards to ${filename}`);
}

/**
 * Save as database format
 */
function saveAsDatabase(cards) {
    const dbContent = `// Auto-generated from Pokemon TCG API
// Generated: ${new Date().toISOString()}
// Total Cards: ${cards.length}

const cardDatabase = ${JSON.stringify(cards, null, 4)};

module.exports = cardDatabase;
`;

    fs.writeFileSync('complete-card-database.js', dbContent);
    console.log(`✅ Database saved to complete-card-database.js`);
}

/**
 * Main scraping function
 */
async function scrapeAllCards() {
    console.log(`
╔════════════════════════════════════════╗
║  Pokemon TCG Complete Scraper 🚀      ║
╠════════════════════════════════════════╣
║  This will take a few minutes...       ║
║  Time to grab a snack! 🍕              ║
╚════════════════════════════════════════╝
`);

    const startTime = Date.now();

    // Get all sets
    const sets = await getAllSets();

    if (sets.length === 0) {
        console.error('❌ No sets found! Exiting.');
        return;
    }

    // Sort sets by release date (newest first)
    sets.sort((a, b) => {
        const dateA = new Date(a.releaseDate || '2000-01-01');
        const dateB = new Date(b.releaseDate || '2000-01-01');
        return dateB - dateA;
    });

    console.log(`🎯 Starting to scrape ${sets.length} sets...\n`);

    // Process each set
    for (let i = 0; i < sets.length; i++) {
        const set = sets[i];

        // Skip some very large sets if you want (optional)
        // if (set.total > 300) {
        //     console.log(`[${i + 1}/${sets.length}] ⏭️ Skipping ${set.name} (${set.total} cards - too large)\n`);
        //     skippedSets++;
        //     continue;
        // }

        const cards = await getCardsFromSet(set, i, sets.length);
        allCards.push(...cards);
        totalCards += cards.length;
        totalSets++;

        // Save progress every 5 sets
        if ((i + 1) % 5 === 0) {
            saveProgress();
            saveCards(allCards, 'all-cards-partial.json');
            console.log(`📊 Progress: ${totalCards} cards from ${totalSets} sets\n`);
        }

        // Small delay between sets to be nice to the API
        await sleep(200);
    }

    // Final save
    console.log(`\n✨ Scraping complete!`);
    console.log(`📊 Stats:`);
    console.log(`   - Total Sets: ${totalSets}`);
    console.log(`   - Total Cards: ${totalCards}`);
    console.log(`   - Skipped Sets: ${skippedSets}`);

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`   - Time: ${Math.floor(duration / 60)}m ${duration % 60}s`);

    // Save everything
    saveCards(allCards, 'all-pokemon-cards.json');
    saveAsDatabase(allCards);
    saveProgress();

    console.log(`\n🎉 All done! Your database is ready!`);
}

// Run it!
scrapeAllCards().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
