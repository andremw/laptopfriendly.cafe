// Replace with your Google Sheets API key and Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID';
const API_KEY = 'AIzaSyAjz8JGNba0raBjuvJhbw0C5LeA7bLBM14';

async function fetchCafes() {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSFvLd2tOTDsWRnff1_Q45swX5Y5GVAWr_iv5B-qsUSOoWmQY1asnQvW0gWKi1jPCF3VrMiO2Pnl2Mp/pub?gid=1925930486&single=true&output=csv';

    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        if (!response.body) throw new Error('Response body is null');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let headers = null;
        const cafes = [];

        // Process the stream
        while (true) {
            const {done, value} = await reader.read();

            if (done) {
                // Process any remaining data in buffer
                if (buffer) {
                    const row = parseCSVRow(buffer);
                    if (row.some(cell => cell.trim() !== '')) {
                        cafes.push(createCafeObject(headers, row));
                    }
                }
                break;
            }

            // Add new chunk to buffer and split into lines
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split(/\r?\n/);

            // Keep the last partial line in buffer
            buffer = lines.pop() || '';

            // Process complete lines
            for (const line of lines) {
                if (!line.trim()) continue;

                const row = parseCSVRow(line);
                if (!headers) {
                    headers = row;
                } else if (row.some(cell => cell.trim() !== '')) {
                    cafes.push(createCafeObject(headers, row));
                }
            }
        }

        return cafes;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

function parseCSVRow(line) {
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
}

function createCafeObject(headers, row) {
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
}

function createStars(rating, type) {
    const numRating = parseInt(rating);
    if (numRating === 0) {
        return `<span class="no-rating">None</span>`;
    }
    const stars = '★'.repeat(numRating) + '☆'.repeat(5 - numRating);
    return stars;
}

function renderCafe(cafe) {
    const template = document.getElementById('cafe-card-template');
    if (!template?.content) {
        console.error('Template not found');
        return document.createElement('div');
    }

    // Convert the Node to Element so we can use querySelector
    const card = document.createElement('div');
    card.appendChild(template.content.cloneNode(true));

    // Set name and location
    const nameElement = card.querySelector('.cafe-name');
    const locationElement = card.querySelector('.cafe-location');
    if (nameElement) nameElement.textContent = cafe.name;
    if (locationElement) locationElement.textContent = cafe.location;

    // Set ratings with stars
    const wifiStars = card.querySelector('.wifi-stars');
    const powerStars = card.querySelector('.power-stars');
    if (wifiStars) wifiStars.innerHTML = createStars(cafe.wifi, 'wifi');
    if (powerStars) powerStars.innerHTML = createStars(cafe.power, 'power');

    // Add appropriate classes for styling
    if (wifiStars && parseInt(cafe.wifi) === 0) wifiStars.classList.add('has-no-rating');
    if (powerStars && parseInt(cafe.power) === 0) powerStars.classList.add('has-no-rating');

    // Set other ratings
    const noiseStars = card.querySelector('.noise-stars');
    const coffeeStars = card.querySelector('.coffee-stars');
    const tempStars = card.querySelector('.temperature-stars');
    const comfortStars = card.querySelector('.comfort-stars');

    if (noiseStars) noiseStars.textContent = createStars(cafe.noise);
    if (coffeeStars) coffeeStars.textContent = createStars(cafe.coffee);
    if (tempStars) tempStars.textContent = createStars(cafe.temperature);
    if (comfortStars) comfortStars.textContent = createStars(cafe.comfort);

    // Add map link if available
    if (cafe.mapUrl) {
        const header = card.querySelector('.cafe-header');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => window.open(cafe.mapUrl, '_blank'));
        }
    }

    // Add comments if available
    if (cafe.comments) {
        const detailsContent = card.querySelector('.details-content');
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

    // Return the card's first child since we wrapped it
    return card.firstElementChild;
}

function initializeHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

async function initializeApp() {
    try {
        initializeHeader();
        const cafeList = document.getElementById('cafeList');
        if (!cafeList) {
            console.error('Cafe list container not found');
            return;
        }

        // Add skeletons
        const skeletonTemplate = document.getElementById('skeleton-template');
        if (skeletonTemplate instanceof HTMLTemplateElement) {
            for (let i = 0; i < 6; i++) {
                cafeList.appendChild(skeletonTemplate.content.cloneNode(true));
            }
        }

        // Start loading cafes
        const cafes = await fetchCafes();

        // Clear skeletons
        cafeList.innerHTML = '';

        // Add real cafe cards
        cafes.forEach(cafe => {
            cafeList.appendChild(renderCafe(cafe));
        });

        // Initialize filters
        initializeFilters(cafes);

    } catch (error) {
        console.error('Error loading cafes:', error);
        const cafeList = document.getElementById('cafeList');
        if (cafeList) {
            cafeList.innerHTML = `
                <div class="error-state">
                    <p>Failed to load cafes. Please try again later.</p>
                </div>
            `;
        }
    }
}

function initializeFilters(cafes) {
    const filterButtons = document.querySelectorAll('.quick-filters button');
    const searchInput = document.querySelector('.search-bar input');
    let activeFilters = new Set();
    let searchTerm = '';

    if (searchInput instanceof HTMLInputElement) {
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value.toLowerCase();
            filterCafes(cafes, searchTerm, activeFilters);
        });
    }

    filterButtons.forEach(button => {
        if (button instanceof HTMLElement) {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;

                // Toggle filter
                if (activeFilters.has(filter)) {
                    activeFilters.delete(filter);
                    button.classList.remove('active');
                } else {
                    activeFilters.add(filter);
                    button.classList.add('active');
                }

                filterCafes(cafes, searchTerm, activeFilters);
            });
        }
    });
}

function filterCafes(cafes, searchTerm, activeFilters) {
    const cafeList = document.getElementById('cafeList');
    if (!cafeList) {
        console.error('Cafe list container not found');
        return;
    }

    // Clear the current list
    cafeList.innerHTML = '';

    let filteredCafes = cafes;

    // Apply search filter if there's a search term
    if (searchTerm.trim()) {
        filteredCafes = filteredCafes.filter(cafe => {
            const name = cafe.name?.toLowerCase() || '';
            const location = cafe.location?.toLowerCase() || '';
            return name.includes(searchTerm) || location.includes(searchTerm);
        });
    }

    // Apply quick filters
    if (activeFilters.size > 0) {
        filteredCafes = filteredCafes.filter(cafe => {
            if (activeFilters.has('wifi')) {
                if (parseInt(cafe.wifi && cafe.wifi) < 4) return false;
            }
            if (activeFilters.has('quiet')) {
                if (parseInt(cafe.noise && cafe.noise) < 3) return false;
            }
            if (activeFilters.has('power')) {
                if (cafe.power && parseInt(cafe.power) < 3) return false;
            }
            return true;
        });
    }

    // Show no results message if nothing matches
    if (filteredCafes.length === 0) {
        cafeList.innerHTML = `
            <div class="no-results">
                <p>No cafes found matching your criteria</p>
            </div>
        `;
        return;
    }

    // Show matching cafes
    filteredCafes.forEach(cafe => {
        cafeList.appendChild(renderCafe(cafe));
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);