/* ==========================================================================
   Namma Sami Namma Kovil - Dashboard Logic & Fast Search Engine
   ========================================================================== */

let allData = [];
let filteredData = [];

let currentPage = 1;
let pageSize = 48;
let selectedLetter = "";
let selectedRegion = "";
let selectedDistrict = "";
let searchQuery = "";

// DOM Elements
const loadingSpinner = document.getElementById('loading-spinner');
const cardsGrid = document.getElementById('cards-grid');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const filterRegion = document.getElementById('filter-region');
const filterDistrict = document.getElementById('filter-district');
const filterPageSize = document.getElementById('filter-page-size');
const resultsCount = document.getElementById('results-count');
const alphabetBar = document.getElementById('alphabet-bar');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const pageInfo = document.getElementById('page-info');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statUnique = document.getElementById('stat-unique');
const statDistricts = document.getElementById('stat-districts');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalName = document.getElementById('modal-name');
const modalRegion = document.getElementById('modal-region');
const modalDistrict = document.getElementById('modal-district');
const modalUnion = document.getElementById('modal-union');
const modalMeaning = document.getElementById('modal-meaning');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const toast = document.getElementById('toast');

let activeItemForModal = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadDataset();
    setupEventListeners();
});

// Load JSON Dataset
async function loadDataset() {
    try {
        const response = await fetch('namma_sami_namma_kovil_full.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allData = await response.json();
        
        // Calculate Stats
        const uniqueNames = new Set(allData.map(d => d.name)).size;
        const uniqueDistricts = new Set(allData.map(d => d.district).filter(Boolean)).size;

        statTotal.textContent = allData.length.toLocaleString();
        statUnique.textContent = uniqueNames.toLocaleString();
        statDistricts.textContent = uniqueDistricts.toLocaleString();

        // Populate Dropdowns
        populateFilters();

        // Initial Filter & Render
        filteredData = allData;
        loadingSpinner.style.display = 'none';
        cardsGrid.style.display = 'grid';
        pagination.style.display = 'flex';

        renderPage();
    } catch (err) {
        console.error('Failed to load dataset:', err);
        loadingSpinner.innerHTML = `
            <div style="color:#ef4444; font-weight:600; text-align:center;">
                <p>Error loading dataset: ${err.message}</p>
                <button onclick="location.reload()" style="margin-top:12px; padding:8px 16px; background:var(--accent-primary); border:none; border-radius:6px; color:#fff; cursor:pointer;">Retry</button>
            </div>
        `;
    }
}

// Populate Region & District Dropdowns
function populateFilters() {
    const regions = Array.from(new Set(allData.map(d => d.region).filter(Boolean))).sort();
    const districts = Array.from(new Set(allData.map(d => d.district).filter(Boolean))).sort();

    regions.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        filterRegion.appendChild(opt);
    });

    districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        filterDistrict.appendChild(opt);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Search input debounce
    let searchDebounceTimer;
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        searchClear.style.display = searchQuery ? 'block' : 'none';
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            applyFilters();
        }, 150);
    });

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        applyFilters();
    });

    // Dropdown filters
    filterRegion.addEventListener('change', (e) => {
        selectedRegion = e.target.value;
        applyFilters();
    });

    filterDistrict.addEventListener('change', (e) => {
        selectedDistrict = e.target.value;
        applyFilters();
    });

    filterPageSize.addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value, 10);
        currentPage = 1;
        renderPage();
    });

    // Quick Tamil Letter Chip Filter
    alphabetBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip-btn');
        if (!chip) return;

        document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
        chip.classList.add('active');

        selectedLetter = chip.dataset.letter || "";
        applyFilters();
    });

    // Pagination Controls
    btnPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    btnNext.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    // Modal Close
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Copy Meaning Button
    modalCopyBtn.addEventListener('click', () => {
        if (activeItemForModal && activeItemForModal.meaning) {
            copyToClipboard(activeItemForModal.meaning);
        }
    });
}

// Apply All Search & Filter Rules
function applyFilters() {
    filteredData = allData.filter(item => {
        // Search Query Filter
        if (searchQuery) {
            const nameMatch = item.name.toLowerCase().includes(searchQuery);
            const mobileMatch = item.mobile.toLowerCase().includes(searchQuery);
            const districtMatch = item.district.toLowerCase().includes(searchQuery);
            const unionMatch = item.union.toLowerCase().includes(searchQuery);
            const meaningMatch = item.meaning.toLowerCase().includes(searchQuery);
            if (!nameMatch && !mobileMatch && !districtMatch && !unionMatch && !meaningMatch) {
                return false;
            }
        }

        // Region Filter
        if (selectedRegion && item.region !== selectedRegion) {
            return false;
        }

        // District Filter
        if (selectedDistrict && item.district !== selectedDistrict) {
            return false;
        }

        // Letter Filter
        if (selectedLetter) {
            if (!item.name.startsWith(selectedLetter)) {
                return false;
            }
        }

        return true;
    });

    currentPage = 1;
    renderPage();
}

// Render Current Page Grid
function renderPage() {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    currentPage = Math.min(currentPage, totalPages);

    resultsCount.innerHTML = `Showing <strong>${totalItems.toLocaleString()}</strong> matching names`;

    // Calculate Page Slice
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageItems = filteredData.slice(startIdx, endIdx);

    cardsGrid.innerHTML = '';

    if (pageItems.length === 0) {
        cardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i data-lucide="search-x" style="width:48px; height:48px; margin-bottom:12px; opacity:0.5;"></i>
                <h3 style="font-size:1.2rem; color:var(--text-main); margin-bottom:6px;">No names found</h3>
                <p>Try clearing filters or adjusting your search phrase.</p>
            </div>
        `;
    } else {
        pageItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'name-card';
            card.onclick = () => openModal(item);

            const displayMeaning = item.meaning || 'தமிழ் பொருள் இல்லை';

            card.innerHTML = `
                <div>
                    <div class="card-header">
                        <div class="card-title">${escapeHtml(item.name)}</div>
                        ${item.district ? `<div class="card-tag">${escapeHtml(item.district)}</div>` : ''}
                    </div>

                    <div class="card-details">
                        ${item.region ? `<div class="detail-row"><i data-lucide="map" style="width:14px; height:14px;"></i> ${escapeHtml(item.region)}</div>` : ''}
                        ${item.union ? `<div class="detail-row"><i data-lucide="navigation" style="width:14px; height:14px;"></i> ${escapeHtml(item.union)}</div>` : ''}
                        ${item.mobile ? `<div class="detail-row"><i data-lucide="phone" style="width:14px; height:14px;"></i> ${escapeHtml(item.mobile)}</div>` : ''}
                    </div>

                    <div class="card-meaning">${escapeHtml(displayMeaning)}</div>
                </div>

                <div class="card-footer">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Click to view details</span>
                    <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('${escapeJsString(displayMeaning)}')">
                        <i data-lucide="copy" style="width:14px; height:14px;"></i> Copy
                    </button>
                </div>
            `;
            cardsGrid.appendChild(card);
        });
    }

    // Update Pagination UI
    pageInfo.textContent = `Page ${currentPage.toLocaleString()} of ${totalPages.toLocaleString()}`;
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage >= totalPages;

    // Refresh Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Modal View
function openModal(item) {
    activeItemForModal = item;
    modalName.textContent = item.name;
    modalRegion.textContent = item.region ? `மண்டலம்: ${item.region}` : '';
    modalDistrict.textContent = item.district ? `மாவட்டம்: ${item.district}` : '';
    modalUnion.textContent = item.union ? `ஒன்றியம்: ${item.union}` : '';
    modalMeaning.textContent = item.meaning || 'தமிழ் பொருள் வழங்கப்படவில்லை.';

    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    activeItemForModal = null;
}

// Copy to Clipboard Utility
function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tamil Name Meaning copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Helper Encoders
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, ' ');
}
