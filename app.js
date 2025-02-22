// Replace with your Google Sheets API key and Sheet ID
const API_KEY = 'AIzaSyAjz8JGNba0raBjuvJhbw0C5LeA7bLBM14';

// Data Fetching Layer
const fetchCSV = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    if (!response.body) throw new Error('Response body is null');
    return response.body;
};

// CSV Parsing Layer
const parseCSVStream = async (readableStream) => {
    const reader = readableStream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let headers = null;
    const rows = [];

    while (true) {
        const {done, value} = await reader.read();

        if (done) {
            if (buffer) {
                const row = parseCSVRow(buffer);
                if (row.some(cell => cell.trim() !== '')) {
                    rows.push(row);
                }
            }
            break;
        }

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        lines.forEach(line => {
            if (!line.trim()) return;
            const row = parseCSVRow(line);
            if (!headers) {
                headers = row;
            } else {
                rows.push(row);
            }
        });
    }

    return { headers, rows };
};

const parseCSVRow = (line) => {
    const row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(field.trim());
            field = '';
        } else {
            field += char;
        }
    }
    row.push(field.trim());
    return row;
};

// Data Transformation Layer
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

const transformToObjects = ({ headers, rows }) => {
    return rows.map(row => {
        const cafe = {};
        headers.forEach((header, index) => {
            if (header && row[index]) {
                const cleanHeader = header.replace(/['"]/g, '').trim().toLowerCase();
                const propertyName = headerMap[cleanHeader] || cleanHeader;
                const value = row[index].replace(/['"]/g, '').trim();
                cafe[propertyName] = value;
            }
        });
        return cafe;
    });
};

// UI Rendering Layer
const createStars = (rating) => {
    const numRating = parseInt(rating);
    if (numRating === 0) {
        return `<span class="no-rating">None</span>`;
    }
    return '★'.repeat(numRating) + '☆'.repeat(5 - numRating);
};

const renderCafe = (cafe) => {
    const template = document.getElementById('cafe-card-template');
    if (!(template instanceof HTMLTemplateElement)) {
        console.error('Template not found');
        return null;
    }

    const card = template.content.cloneNode(true);
    const container = document.createElement('div');
    container.appendChild(card);

    // Set basic info
    container.querySelector('.cafe-name').textContent = cafe.name;
    container.querySelector('.cafe-location').textContent = cafe.location;

    // Set ratings
    const ratings = {
        wifi: container.querySelector('.wifi-stars'),
        power: container.querySelector('.power-stars'),
        noise: container.querySelector('.noise-stars'),
        coffee: container.querySelector('.coffee-stars'),
        temperature: container.querySelector('.temperature-stars'),
        comfort: container.querySelector('.comfort-stars')
    };

    Object.entries(ratings).forEach(([key, element]) => {
        if (element) {
            element.innerHTML = createStars(cafe[key]);
            if (parseInt(cafe[key]) === 0) {
                element.classList.add('has-no-rating');
            }
        }
    });

    // Add map link
    if (cafe.mapUrl) {
        const header = container.querySelector('.cafe-header');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => window.open(cafe.mapUrl, '_blank'));
        }
    }

    // Add comments
    if (cafe.comments) {
        const detailsContent = container.querySelector('.details-content');
        if (detailsContent) {
            const commentsDiv = document.createElement('div');
            commentsDiv.className = 'rating-group';
            commentsDiv.innerHTML = `
                <div class="rating-label">Comments</div>
                <p class="rating-note">${cafe.comments}</p>
            `;
            detailsContent.appendChild(commentsDiv);
        }
    }

    return container.firstElementChild;
};

// Filtering Layer
const filterCafes = (cafes, searchTerm = '', activeFilters = new Set()) => {
    return cafes
        .filter(cafe => {
            // Search filter
            if (searchTerm) {
                const name = cafe.name?.toLowerCase() || '';
                const location = cafe.location?.toLowerCase() || '';
                if (!name.includes(searchTerm) && !location.includes(searchTerm)) {
                    return false;
                }
            }

            // Quick filters
            if (activeFilters.has('wifi')) {
                const wifiRating = parseInt(cafe.wifi) || 0;
                if (wifiRating < 4) return false;
            }
            if (activeFilters.has('quiet')) {
                const noiseRating = parseInt(cafe.noise) || 0;
                if (noiseRating > 2) return false;
            }
            if (activeFilters.has('power')) {
                const powerRating = parseInt(cafe.power) || 0;
                if (powerRating === 0) return false;
            }

            return true;
        });
};

// UI State Management
const updateUI = (cafes, searchTerm, activeFilters) => {
    const cafeList = document.getElementById('cafeList');
    if (!cafeList) return;

    const filteredCafes = filterCafes(cafes, searchTerm, activeFilters);
    cafeList.innerHTML = '';

    if (filteredCafes.length === 0) {
        cafeList.innerHTML = `
            <div class="no-results">
                <p>No cafes found matching your criteria</p>
            </div>
        `;
        return;
    }

    filteredCafes
        .map(renderCafe)
        .filter(Boolean)
        .forEach(element => cafeList.appendChild(element));
};

// Main App
const initializeApp = async () => {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFvLd2tOTDsWRnff1_Q45swX5Y5GVAWr_iv5B-qsUSOoWmQY1asnQvW0gWKi1jPCF3VrMiO2Pnl2Mp/pub?gid=1925930486&single=true&output=csv';
    let cafes = [];
    let searchTerm = '';
    let activeFilters = new Set();

    try {
        // Add loading state
        const cafeList = document.getElementById('cafeList');
        if (cafeList) {
            const skeletonTemplate = document.getElementById('skeleton-template');
            if (skeletonTemplate instanceof HTMLTemplateElement) {
                for (let i = 0; i < 6; i++) {
                    cafeList.appendChild(skeletonTemplate.content.cloneNode(true));
                }
            }
        }

        const stream = await fetchCSV(SHEET_URL);
        const parsedData = await parseCSVStream(stream);
        cafes = transformToObjects(parsedData);

        // Initialize UI
        const searchInput = document.querySelector('.search-bar input');
        const filterButtons = document.querySelectorAll('.quick-filters button');

        if (searchInput instanceof HTMLInputElement) {
            searchInput.addEventListener('input', (e) => {
                if (e.target instanceof HTMLInputElement) {
                    searchTerm = e.target.value.toLowerCase();
                    updateUI(cafes, searchTerm, activeFilters);
                }
            });
        }

        filterButtons.forEach(button => {
            if (button instanceof HTMLButtonElement) {
                button.addEventListener('click', () => {
                    const filter = button.dataset.filter;
                    if (activeFilters.has(filter)) {
                        activeFilters.delete(filter);
                        button.classList.remove('active');
                    } else {
                        activeFilters.add(filter);
                        button.classList.add('active');
                    }
                    updateUI(cafes, searchTerm, activeFilters);
                });
            }
        });

        // Initial render
        updateUI(cafes, searchTerm, activeFilters);

    } catch (error) {
        console.error('Error:', error);
        const cafeList = document.getElementById('cafeList');
        if (cafeList) {
            cafeList.innerHTML = `
                <div class="error-state">
                    <p>Failed to load cafes. Please try again later.</p>
                    <p class="error-details">${error.message}</p>
                </div>
            `;
        }
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);