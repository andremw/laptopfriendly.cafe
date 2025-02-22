// Replace with your Google Sheets API key and Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID';
const API_KEY = 'AIzaSyAjz8JGNba0raBjuvJhbw0C5LeA7bLBM14';

async function fetchCafes() {
    // Get the published CSV URL from Google Sheets
    // File -> Share -> Publish to web -> Select sheet -> CSV format
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFvLd2tOTDsWRnff1_Q45swX5Y5GVAWr_iv5B-qsUSOoWmQY1asnQvW0gWKi1jPCF3VrMiO2Pnl2Mp/pub?gid=1925930486&single=true&output=csv';

    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        console.log('CSV Text:', csvText); // Debug log
        const parsed = parseCSV(csvText);
        console.log('Parsed Data:', parsed); // Debug log
        return parsed;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

function parseCSV(csvText) {
    // Log the raw CSV text
    console.log('Raw CSV text:', csvText);

    // Split into rows, handling both \r\n and \n
    const rows = csvText.split(/\r?\n/).map(row => {
        console.log('Processing row:', row);
        return row.split(',');
    });

    console.log('All rows:', rows);
    const [headers, ...data] = rows;
    console.log('Headers:', headers);
    console.log('Data rows:', data);

    // Map of original headers to clean property names
    const headerMap = {
        'cafe name': 'name',
        'city': 'location',
        'google maps link': 'mapUrl',
        'wifi quality': 'wifi',
        'comfort': 'comfort',
        'noise level': 'noise',
        'coffee quality': 'coffee',
        'food quality': 'food',
        'power outlets availability': 'power',
        'temperature': 'temperature',
        'comments': 'comments',
        'timestamp': 'timestamp'
    };

    // Remove empty rows and create objects with clean property names
    return data
        .filter(row => row.some(cell => cell.trim() !== ''))
        .map(row => {
            const cafe = {};
            headers.forEach((header, index) => {
                if (header && row[index]) {
                    const cleanHeader = header.replace(/['"]/g, '').trim().toLowerCase();
                    const propertyName = headerMap[cleanHeader] || cleanHeader;
                    const value = row[index].replace(/['"]/g, '').trim();
                    cafe[propertyName] = value;
                }
            });
            console.log('Created cafe object:', cafe);
            return cafe;
        });
}

function createRatingElement(rating, type) {
    const icons = {
        wifi: '⚡',
        power: '🔌',
        comfort: '🛋️',
        noise: '🔊',
        coffee: '☕',
        food: '🍽️',
        temperature: '🌡️'
    };

    return `${icons[type]} ${rating}/5`;
}

function renderCafe(cafe) {
    const template = document.getElementById('cafe-card-template');
    if (!template) {
        console.error('Template not found');
        return document.createElement('div');
    }

    const card = template.content.cloneNode(true);
    const nameElement = card.querySelector('.cafe-name');
    const locationElement = card.querySelector('.cafe-location');
    const ratingsElement = card.querySelector('.cafe-ratings');

    if (nameElement) nameElement.textContent = cafe.name;
    if (locationElement) locationElement.textContent = cafe.location;
    if (ratingsElement) {
        ratingsElement.innerHTML = `
            <div class="rating">${createRatingElement(cafe.wifi, 'wifi')}</div>
            <div class="rating">${createRatingElement(cafe.power, 'power')}</div>
            <div class="rating">${createRatingElement(cafe.noise, 'noise')}</div>
            <div class="rating">${createRatingElement(cafe.comfort, 'comfort')}</div>
            <div class="rating">${createRatingElement(cafe.coffee, 'coffee')}</div>
            <div class="rating">${createRatingElement(cafe.temperature, 'temperature')}</div>
        `;
    }

    return card;
}

async function initializeApp() {
    try {
        const cafes = await fetchCafes();
        console.log('Fetched Cafes:', cafes); // Debug log

        const cafeList = document.getElementById('cafeList');
        if (!cafeList) {
            console.error('Cafe list container not found');
            return;
        }

        cafes.forEach(cafe => {
            cafeList.appendChild(renderCafe(cafe));
        });

        // Initialize search
        const searchInput = document.querySelector('.search-bar input');
        if (!searchInput) {
            console.error('Search input not found');
            return;
        }

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterCafes(cafes, searchTerm);
        });

    } catch (error) {
        console.error('Error loading cafes:', error);
    }
}

function filterCafes(cafes, searchTerm) {
    const cafeList = document.getElementById('cafeList');
    if (!cafeList) {
        console.error('Cafe list container not found');
        return;
    }

    cafeList.innerHTML = '';

    cafes.filter(cafe =>
        cafe.name?.toLowerCase().includes(searchTerm) ||
        cafe.location?.toLowerCase().includes(searchTerm)
    ).forEach(cafe => {
        cafeList.appendChild(renderCafe(cafe));
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);