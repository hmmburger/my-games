// PriceCharting Server-Side Scraper
// Fetches real Pokemon card prices from PriceCharting.com

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://www.pricecharting.com';

/**
 * Search PriceCharting for Pokemon cards
 */
async function searchPriceCharting(query) {
    try {
        console.log(`🔍 Searching for: ${query}`);

        // Try multiple approaches
        const results = await Promise.allSettled([
            trySearchAPI(query),
            trySearchPage(query),
            tryAlternateSearch(query)
        ]);

        // Get first successful result
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.length > 0) {
                console.log(`✅ Found ${result.value.length} cards`);
                return result.value;
            }
        }

        console.log(`⚠️ No results found from any method`);
        return [];

    } catch (error) {
        console.error(`❌ Error searching: ${error.message}`);
        return [];
    }
}

/**
 * Try using PriceCharting's product API
 */
async function trySearchAPI(query) {
    try {
        console.log('  📡 Trying API...');
        // PriceCharting has multiple API endpoints
        const apiUrls = [
            `https://www.pricecharting.com/api/product?name=${encodeURIComponent(query)}&type=card`,
            `https://api.pricecharting.com/v1/product?q=${encodeURIComponent(query)}&category=pokemon`,
            `https://www.pricecharting.com/api/products?t=${encodeURIComponent(query)}`
        ];

        for (const apiUrl of apiUrls) {
            try {
                const response = await fetch(apiUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const text = await response.text();
                    console.log('  📦 API Response:', text.substring(0, 200));

                    try {
                        const data = JSON.parse(text);
                        if (data && (data.products || data.length)) {
                            const products = data.products || data;
                            return products.map(product => ({
                                name: product['product-name'] || product.name || product.title,
                                pricechartingUrl: product.url || '',
                                usedPrice: product['used-price'] || product.used_price || product.usedPrice || 'N/A',
                                newPrice: product['new-price'] || product.new_price || product.newPrice || 'N/A',
                                usedPriceNum: parsePrice(product['used-price'] || product.used_price || product.usedPrice),
                                newPriceNum: parsePrice(product['new-price'] || product.new_price || product.newPrice)
                            }));
                        }
                    } catch (e) {
                        // Not valid JSON, continue
                    }
                }
            } catch (e) {
                // Try next URL
            }
        }

        return [];

    } catch (error) {
        console.log('  ❌ API failed:', error.message);
        return [];
    }
}

/**
 * Try scraping the search page
 */
async function trySearchPage(query) {
    try {
        const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}&type=Pokemon+Cards`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) return [];

        const html = await response.text();
        const $ = cheerio.load(html);

        const cards = [];

        // Try multiple selectors
        const selectors = [
            'table tbody tr',
            '#search-results table tr',
            '.table-row',
            'tr[id*="product"]'
        ];

        for (const selector of selectors) {
            $(selector).each((i, element) => {
                const $row = $(element);
                const $cells = $row.find('td');

                if ($cells.length >= 3) {
                    const $nameLink = $cells.eq(0).find('a').first();
                    const name = $nameLink.text().trim();
                    const link = $nameLink.attr('href');
                    const usedPrice = $cells.eq(1).text().trim();
                    const newPrice = $cells.eq(2).text().trim();

                    if (name && !name.includes('PriceCharting')) {
                        cards.push({
                            name: name,
                            pricechartingUrl: link ? (link.startsWith('http') ? link : BASE_URL + link) : '',
                            usedPrice: usedPrice,
                            newPrice: newPrice,
                            usedPriceNum: parsePrice(usedPrice),
                            newPriceNum: parsePrice(newPrice)
                        });
                    }
                }
            });

            if (cards.length > 0) break;
        }

        return cards;

    } catch (error) {
        return [];
    }
}

/**
 * Try alternate URL format
 */
async function tryAlternateSearch(query) {
    try {
        const searchUrl = `${BASE_URL}/search-type-product?search-query=${encodeURIComponent(query)}&category=Pokemon+Cards`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) return [];

        const html = await response.text();
        const $ = cheerio.load(html);

        const cards = [];
        $('tr').each((i, element) => {
            const $row = $(element);
            const $link = $row.find('a').first();

            if ($link.length && $link.text().trim()) {
                const name = $link.text().trim();
                if (!name.includes('PriceCharting') && !name.includes('Home')) {
                    cards.push({
                        name: name,
                        pricechartingUrl: BASE_URL + $link.attr('href'),
                        usedPrice: 'N/A',
                        newPrice: 'N/A',
                        usedPriceNum: 0,
                        newPriceNum: 0
                    });
                }
            }
        });

        return cards;

    } catch (error) {
        return [];
    }
}

/**
 * Get detailed prices for a specific card page
 */
async function getCardDetails(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const details = {
            productName: $('h1').first().text().trim(),
            imageUrl: $('img.product-image').attr('src') || '',
            prices: {}
        };

        // Try to find graded prices
        $('.graded_price').each((i, el) => {
            const grade = $(el).find('.grade').text().trim();
            const price = $(el).find('.price').text().trim();
            if (grade && price) {
                details.prices[grade] = price;
            }
        });

        return details;

    } catch (error) {
        console.error(`❌ Error getting details: ${error.message}`);
        return null;
    }
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr) {
    if (!priceStr || priceStr === 'N/A') return 0;
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
}

/**
 * Scrape multiple popular Pokemon cards
 */
async function scrapePopularCards() {
    console.log('🚀 Starting PriceCharting scraper...\n');

    const popularSearches = [
        'Charizard Base Set',
        'Pikachu Base Set',
        'Blastoise Base Set',
        'Venusaur Base Set',
        'Mewtwo Base Set',
        'Charizard GX',
        'Charizard VMAX',
        'Umbreon VMAX',
        'Lugia Neo Genesis',
        'Celebi Expedition'
    ];

    const allCards = [];

    for (const search of popularSearches) {
        const cards = await searchPriceCharting(search);
        allCards.push(...cards);
        // Small delay to be nice to the server
        await sleep(1000);
    }

    // Remove duplicates
    const uniqueCards = [...new Map(allCards.map(card => [card.name, card])).values()];

    console.log(`\n📊 Total unique cards found: ${uniqueCards.length}`);

    return uniqueCards;
}

/**
 * Save scraped data to JSON file
 */
function saveToFile(data, filename = 'scraped-cards.json') {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Saved to ${filename}`);
}

/**
 * Convert scraped cards to database format
 */
function convertToDatabaseFormat(scrapedCards) {
    return scrapedCards.map((card, index) => {
        // Estimate PSA prices based on used price
        const usedPrice = card.usedPriceNum || 0;
        const psa9 = Math.round(usedPrice * 3.5);
        const psa10 = Math.round(usedPrice * 15);

        return {
            id: `scraped-${index}`,
            name: card.name,
            set: 'PriceCharting', // Would need to parse from name
            setNumber: '?',
            imageUrl: '', // PriceCharting doesn't easily expose images
            prices: {
                ungraded: usedPrice,
                psa9: psa9,
                psa10: psa10
            },
            rarity: 'Unknown',
            pricechartingUrl: card.pricechartingUrl
        };
    });
}

/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'search' && args[1]) {
        // Search for specific card
        const cards = await searchPriceCharting(args[1]);
        console.log('\n📋 Results:');
        console.log(JSON.stringify(cards, null, 2));
        saveToFile(cards, 'search-results.json');

    } else if (command === 'popular') {
        // Scrape popular cards
        const cards = await scrapePopularCards();
        saveToFile(cards, 'popular-cards.json');

        // Also convert to database format
        const dbCards = convertToDatabaseFormat(cards);
        saveToFile(dbCards, 'cards-for-database.json');

    } else {
        // Show help
        console.log(`
🎴 PriceCharting Scraper - Usage:

  node pricecharting-scraper.js search "card name"
     Search for a specific card

  node pricecharting-scraper.js popular
     Scrape popular Pokemon cards

Examples:
  node pricecharting-scraper.js search "Charizard Base Set"
  node pricecharting-scraper.js popular
        `);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    searchPriceCharting,
    getCardDetails,
    scrapePopularCards,
    convertToDatabaseFormat
};
