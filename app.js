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
    const rows = csvText.split('\n').map(row => row.split(','));
    console.log('CSV Rows:', rows); // Debug log
    const [headers, ...data] = rows;
    console.log('Headers:', headers); // Debug log

    return data.filter(row => row.length === headers.length).map(row => {
        const cafe = {};
        headers.forEach((header, index) => {
            // Clean the header (remove quotes, spaces, and convert to lowercase)
            const cleanHeader = header.replace(/['"]/g, '').trim().toLowerCase();
            // Clean the value
            const value = row[index].replace(/['"]/g, '').trim();
            cafe[cleanHeader] = value;
        });
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