// PriceCharting Scraper
// This fetches real data from PriceCharting.com

const BASE_URL = 'https://www.pricecharting.com';

// Search for cards on PriceCharting
async function searchPriceCharting(query) {
    try {
        const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}&type= Pokemon Cards`;
        console.log('Searching:', searchUrl);

        // In a browser, we can try to fetch this
        const response = await fetch(searchUrl);
        const html = await response.text();

        // Parse the HTML to extract card data
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Try to find card listings
        const cards = [];

        // Look for table rows with card data
        const rows = doc.querySelectorAll('table tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const nameEl = cells[0].querySelector('a');
                const productName = nameEl ? nameEl.textContent.trim() : '';
                const productLink = nameEl ? nameEl.href : '';

                // Extract prices
                const usedPrice = cells[1].textContent.trim();
                const newPrice = cells[2].textContent.trim();

                if (productName) {
                    cards.push({
                        name: productName,
                        link: productLink,
                        usedPrice: usedPrice,
                        newPrice: newPrice
                    });
                }
            }
        });

        return cards;
    } catch (error) {
        console.error('Scraping error:', error);
        return [];
    }
}

// Get detailed prices for a specific card
async function getCardDetails(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract graded prices if available
        const gradedPrices = {};

        // Look for PSA prices
        const priceElements = doc.querySelectorAll('.price_data');
        priceElements.forEach(el => {
            const grade = el.querySelector('.grade_name')?.textContent;
            const price = el.querySelector('.price')?.textContent;
            if (grade && price) {
                gradedPrices[grade] = price;
            }
        });

        return gradedPrices;
    } catch (error) {
        console.error('Detail error:', error);
        return {};
    }
}

// Test the scraper
async function testScraper() {
    console.log('Testing PriceCharting scraper...');

    const results = await searchPriceCharting('Charizard');
    console.log('Found cards:', results);

    return results;
}

// Export for use
window.priceChartingScraper = {
    search: searchPriceCharting,
    getDetails: getCardDetails,
    test: testScraper
};
