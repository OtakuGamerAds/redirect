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
