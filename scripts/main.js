document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
});

async function loadConfig() {
    try {
        // Determine path to config based on current location
        const isPagesDir = window.location.pathname.includes('/pages/');
        const configPath = isPagesDir ? '../config/site-data.json' : 'config/site-data.json';

        const response = await fetch(configPath);
        if (!response.ok) throw new Error('Failed to load config');
        const data = await response.json();
        
        populateContent(data);
        generateNav(data.nav, isPagesDir);
        
        if (window.location.pathname.includes('roblox.html')) {
            loadRobloxMaps(isPagesDir);
        }
    } catch (error) {
        console.error('Error loading site data:', error);
    }
}

function populateContent(data) {
    // Populate simple text fields with data-key attribute
    const elements = document.querySelectorAll('[data-key]');
    const isPagesDir = window.location.pathname.includes('/pages/');

    elements.forEach(el => {
        const key = el.getAttribute('data-key');
        // Traverse object path (e.g. "profile.name")
        const value = key.split('.').reduce((obj, k) => obj && obj[k], data);
        
        if (value) {
            if (el.tagName === 'IMG') {
                // Adjust image path if in pages dir
                let src = value;
                if (isPagesDir && !value.startsWith('http')) { // Assuming local assets
                     src = '../' + value;
                }
                el.src = src;
            } else if (el.tagName === 'A') {
                 // Check for email by key name OR content format
                 if (key.includes('email') || value.includes('@')) {
                    el.href = `mailto:${value}`;
                    el.textContent = value;
                 } else {
                    el.href = value;
                    // Only set text if empty (or if it's a generic link we want to fill)
                    if (!el.textContent.trim()) {
                        el.textContent = value;
                    }
                 }
            } else {
                el.textContent = value;
            }
        }
    });


    generateSocialLinks(data.links);
}

function generateSocialLinks(links) {
    const container = document.getElementById('social-links-container');
    if (!container || !links) return;

    container.innerHTML = '';
    
    // Icon Mapping
    // Ensure these match the JSON keys EXACTLY
    const iconMap = {
        'انستقرام': 'fab fa-instagram',
        'تيكتوك': 'fab fa-tiktok',
        'فيسبوك': 'fab fa-facebook-f',
        'تويتش': 'fab fa-twitch',
        'تويتر': 'fab fa-twitter',
        'قناتي الأساسية': 'fab fa-youtube',
        'قناتي السولو': 'fab fa-youtube'
    };

    for (const [key, value] of Object.entries(links)) {
        // Skip if not a string
        if (typeof value !== 'string') continue;
        
        // FILTER: Skip email from social buttons (using the clean key 'ads_email')
        if (key === 'ads_email') continue;

        const a = document.createElement('a');
        a.className = 'btn';
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.gap = '0.5rem';
        a.style.width = '100%'; // Full width in the column
        a.style.justifyContent = 'center'; // Center text/icon
        
        // Add Icon if exists
        if (iconMap[key]) {
            const i = document.createElement('i');
            i.className = iconMap[key];
            a.appendChild(i);
        }

        const span = document.createElement('span');
        span.textContent = key;
        a.appendChild(span);
        
        a.href = value;
        a.target = '_blank';
        
        container.appendChild(a);
    }
}

function generateNav(navItems, isPagesDir) {
    const navList = document.getElementById('nav-list');
    if (!navList) return;
    
    navList.innerHTML = ''; // Clear existing
    
    // Get current page filename
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    navItems.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        // Adjust URL based on current depth
        let finalUrl = item.url;
        if (isPagesDir) {
            if (item.url.startsWith('pages/')) {
                finalUrl = item.url.replace('pages/', '');
            } else {
                finalUrl = '../' + item.url;
            }
        } else {
            // In root, use canonical (no change needed if JSON has pages/...)
        }

        a.href = finalUrl;
        a.textContent = item.text;
        
        // Simple active check
        if (window.location.href.endsWith(finalUrl) || (finalUrl === 'index.html' && window.location.pathname.endsWith('/'))) {
             a.classList.add('active');
        }
        
        li.appendChild(a);
        navList.appendChild(li);
    });

    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navList.style.display = navList.style.display === 'flex' ? 'none' : 'flex';
            if (navList.style.display === 'flex') {
                navList.style.flexDirection = 'column';
                navList.style.position = 'absolute';
                navList.style.top = '100%';
                navList.style.left = '0';
                navList.style.width = '100%';
                navList.style.backgroundColor = 'var(--surface-color)';
                navList.style.padding = '1rem';
                navList.style.boxShadow = 'var(--shadow-md)';
            }
        });
    }
}

// Variables for pagination
let currentMapsPage = 1;
const mapsPerPage = 5;
let allMapsData = [];

async function loadRobloxMaps(isPagesDir) {
    const grid = document.getElementById('maps-grid');
    const paginationControls = document.getElementById('pagination-controls');
    if (!grid) return;
    
    try {
        const configPath = isPagesDir ? '../config/links.json' : 'config/links.json';
        const response = await fetch(configPath);
        if (!response.ok) throw new Error('Failed to load links');
        
        // Load data once - expect Array
        allMapsData = await response.json();
        
        // Initial render
        renderMapsPage();
        
    } catch (err) {
        console.error('Error loading maps:', err);
        grid.innerHTML = '<p>Failed to load maps.</p>';
    }
}

function getYouTubeThumbnail(url) {
    if (!url) return '';
    // Handle youtube.com and youtu.be
    let videoId = '';
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
    if (match) {
        videoId = match[1];
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return ''; // Placeholder or fallback?
}

function renderMapsPage() {
    const grid = document.getElementById('maps-grid');
    const paginationControls = document.getElementById('pagination-controls');
    
    // Clear current
    grid.innerHTML = '';
    paginationControls.innerHTML = '';

    const totalItems = allMapsData.length;
    const totalPages = Math.ceil(totalItems / mapsPerPage);
    
    // Calculate slice
    const startIndex = (currentMapsPage - 1) * mapsPerPage;
    const endIndex = startIndex + mapsPerPage;
    const pageItems = allMapsData.slice(startIndex, endIndex);

    // Render Items
    pageItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'map-card';
        // Remove padding from card to let image fill top
        card.style.padding = '0'; 
        card.style.overflow = 'hidden'; // For image rounding
        
        // 1. Thumbnail
        const thumbUrl = getYouTubeThumbnail(item.video_link);
        if (thumbUrl) {
            const imgContainer = document.createElement('div');
            imgContainer.style.width = '100%';
            // imgContainer.style.height = '200px'; // REMOVED fixed height
            imgContainer.style.aspectRatio = '16 / 9'; // Force 16:9 ratio
            imgContainer.style.overflow = 'hidden';
            imgContainer.style.position = 'relative';

            const img = document.createElement('img');
            img.src = thumbUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover'; // Cover is fine now if ratio matches, but contain/fill ensures no crop if container is perfect. 
            // Since we set container to 16/9, and thumb is 16/9, cover is safe and handles slight variances.
            imgContainer.appendChild(img);
            
            // Map Name overlay or below? User said "video thumbnail as an image of the whole thing"
            // Let's put title below for clarity, or overlay. 
            // User said "below it there should be 2 buttons".
            // I'll put Title + Buttons in a content div below image.
            card.appendChild(imgContainer);
        }

        const infoDiv = document.createElement('div');
        infoDiv.style.padding = '1.5rem';
        infoDiv.style.width = '100%';
        infoDiv.style.display = 'flex';
        infoDiv.style.flexDirection = 'column';
        infoDiv.style.alignItems = 'center';
        infoDiv.style.gap = '1rem';

        // Title
        const title = document.createElement('h3');
        title.textContent = item.map_name;
        title.style.margin = '0';
        infoDiv.appendChild(title);

        // Buttons Container
        const btnsDiv = document.createElement('div');
        btnsDiv.style.display = 'flex';
        btnsDiv.style.gap = '1rem';
        btnsDiv.style.width = '100%';
        btnsDiv.style.justifyContent = 'center';

        // Watch Button
        const watchBtn = document.createElement('a');
        watchBtn.className = 'btn';
        watchBtn.textContent = 'شاهد';
        watchBtn.href = item.video_link;
        watchBtn.target = '_blank';
        watchBtn.style.backgroundColor = '#e74c3c'; // Youtube Red-ish
        watchBtn.style.flex = '1';
        watchBtn.style.textAlign = 'center';

        // Play Button (Redirect)
        const playBtn = document.createElement('a');
        playBtn.className = 'btn';
        playBtn.textContent = 'العب';
        // Use map_name as key. Ensure uniqueness or handle collision in real app.
        // Encoder might encode spacing, which is fine.
        playBtn.href = `redirect.html?key=${encodeURIComponent(item.map_name)}`;
        playBtn.style.flex = '1';
        playBtn.style.textAlign = 'center';

        btnsDiv.appendChild(watchBtn);
        btnsDiv.appendChild(playBtn);
        infoDiv.appendChild(btnsDiv);

        card.appendChild(infoDiv);
        grid.appendChild(card);
    });

    // Render Controls
    // Previous Button (< السابق)
    if (currentMapsPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '< السابق';
        prevBtn.className = 'btn'; 
        prevBtn.onclick = () => {
            currentMapsPage--;
            renderMapsPage();
            window.scrollTo(0, 0);
        };
        paginationControls.appendChild(prevBtn);
    }

    // Next Button (المزيد >)
    if (currentMapsPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'المزيد >';
        nextBtn.className = 'btn';
        nextBtn.onclick = () => {
            currentMapsPage++;
            renderMapsPage();
            window.scrollTo(0, 0);
        };
        paginationControls.appendChild(nextBtn);
    }
}
