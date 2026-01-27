/* Dark Mode Logic */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}

// Initialize theme immediately
initTheme();

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) { // Only update if no manual override
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set initial icon state
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeIcon(currentTheme);
    
    // Add event listener to toggle button if it exists
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
});
/* End Dark Mode Logic */

document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
});

let enableRedirection = true; // Default

async function loadConfig() {
  try {
    // Determine path to config based on current location
    // Robust check: Look at how main.js was imported in the HTML.
    // If imported as "../scripts/main.js", we are in a subdirectory.
    let isPagesDir = false;
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
        const src = script.getAttribute("src");
        if (src && src.includes("scripts/main.js") && src.startsWith("../")) {
            isPagesDir = true;
            break;
        }
    }

    // Cache busting: Append timestamp to force fresh fetch
    const configPath =
      (isPagesDir ? "../config/site-data.json" : "config/site-data.json") +
      "?t=" +
      new Date().getTime();

    const response = await fetch(configPath);
    if (!response.ok) throw new Error("Failed to load config");
    const data = await response.json();

    // Read feature flag
    if (typeof data.enable_redirect_feature !== "undefined") {
      enableRedirection = data.enable_redirect_feature;
    }

    if (data.collaborators) {
        window.siteCollaborators = data.collaborators;
    }

    populateContent(data, isPagesDir);
    generateNav(data.nav, isPagesDir);
    generateHomeNav(data.nav);

    // Check for Videos Page (matches both /videos/ and videos.html for backward compat)
    if (window.location.pathname.includes("videos/") || window.location.pathname.includes("videos.html")) {
      // Dynamically set page title from nav config
      // Look for nav item with "videos/" OR "videos.html"
      const videosNav = data.nav.find((item) => item.url.includes("videos/") || item.url.includes("videos.html"));
      const pageTitle = document.getElementById("page-title");
      if (videosNav && pageTitle) {
        pageTitle.textContent = videosNav.text;
      }
      loadRobloxMaps(isPagesDir); 
    }

    if (window.location.pathname.includes("article/") || window.location.pathname.includes("article.html")) {
        loadArticlePage(isPagesDir);
    }
  } catch (error) {
    console.error("Error loading site data:", error);
  }
}

function populateContent(data, isPagesDir) {
  // Populate simple text fields with data-key attribute
  const elements = document.querySelectorAll("[data-key]");
  // const isPagesDir passed as argument now

  elements.forEach((el) => {
    const key = el.getAttribute("data-key");
    // Traverse object path (e.g. "profile.name")
    const value = key.split(".").reduce((obj, k) => obj && obj[k], data);

    if (value) {
      if (el.tagName === "IMG") {
        // Adjust image path if in pages dir
        let src = value;
        if (isPagesDir && !value.startsWith("http")) {
          // Assuming local assets
          src = "../" + value;
        }
        el.src = src;
      } else if (el.tagName === "A") {
        // Check for email by key name OR content format
        if (key.includes("email") || value.includes("@")) {
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
  const container = document.getElementById("social-links-container");
  if (!container || !links) return;

  container.innerHTML = "";

  // Icon Mapping
  // Ensure these match the JSON keys EXACTLY
  const iconMap = {
    انستقرام: "fab fa-instagram",
    تيكتوك: "fab fa-tiktok",
    فيسبوك: "fab fa-facebook-f",
    تويتش: "fab fa-twitch",
    تويتر: "fab fa-twitter",
    "قناتي الأساسية": "fab fa-youtube",
    "قناتي السولو": "fab fa-youtube",
  };

  for (const [key, value] of Object.entries(links)) {
    // Skip if not a string
    if (typeof value !== "string") continue;

    // FILTER: Skip email from social buttons (using the clean key 'ads_email')
    if (key === "ads_email") continue;

    const a = document.createElement("a");
    a.className = "btn";
    a.style.display = "flex";
    a.style.alignItems = "center";
    a.style.gap = "0.5rem";
    a.style.width = "100%"; // Full width in the column
    a.style.justifyContent = "center"; // Center text/icon

    // Add Icon if exists
    if (iconMap[key]) {
      const i = document.createElement("i");
      i.className = iconMap[key];
      a.appendChild(i);
    }

    const span = document.createElement("span");
    span.textContent = key;
    a.appendChild(span);

    a.href = value;
    a.target = "_blank";

    container.appendChild(a);
  }
}

function generateNav(navItems, isPagesDir) {
  const navList = document.getElementById("nav-list");
  if (!navList) return;

  navList.innerHTML = ""; // Clear existing

  // Get current page filename
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  navItems.forEach((item) => {
    const li = document.createElement("li");
    const a = document.createElement("a");

    // Adjust URL based on current depth
    let finalUrl = item.url;
    if (isPagesDir) {
       // If we are in a subdir, we need to go up one level for everything
       // except if the url is meant to be absolute (http) which is not the case for nav items usually
       if (!item.url.startsWith("http")) {
            finalUrl = "../" + item.url;
       }
    } else {
      // In root, use canonical
    }

    a.href = finalUrl;
    a.textContent = item.text;

    // Special styling for Videos link to match toggle button
    if (item.url.includes("videos.html")) {
        a.classList.add("btn");
        a.style.padding = "0.5rem 1rem";
        a.style.color = "white";
        a.style.display = "inline-flex";
        a.style.alignItems = "center";
        
        // Ensure no default hover color override issues if needed, but btn class handles most
        // We might want to ensure it looks distinct or exactly like the toggle?
        // The user said "become a button box too", generic .btn class does this with primary color.
    }

    // Simple active check
    if (
      window.location.href.endsWith(finalUrl) ||
      (finalUrl === "./" && window.location.pathname.endsWith("/")) ||
      (finalUrl.endsWith("/") && window.location.pathname.includes(finalUrl))
    ) {
      a.classList.add("active");
    }

    li.appendChild(a);
    navList.appendChild(li);
  });

  // Mobile Menu Toggle
  const menuToggle = document.querySelector(".menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      navList.style.display =
        navList.style.display === "flex" ? "none" : "flex";
      if (navList.style.display === "flex") {
        navList.style.flexDirection = "column";
        navList.style.position = "absolute";
        navList.style.top = "100%";
        navList.style.left = "0";
        navList.style.width = "100%";
        navList.style.backgroundColor = "var(--surface-color)";
        navList.style.padding = "1rem";
        navList.style.boxShadow = "var(--shadow-md)";
      }
    });
  }
}

function generateHomeNav(navItems) {
  const container = document.getElementById("home-nav-links");
  if (!container) return;

  container.innerHTML = "";

  navItems.forEach((item) => {
    // Skip "Home" button for homepage nav
    if (item.url === "index.html" || item.url === "./") return;

    const a = document.createElement("a");
    a.href = item.url;
    // Add text
    a.textContent = item.text;

    a.className = "btn";
    a.style.width = "100%";
    a.style.display = "block";
    a.style.textAlign = "center";

    // Add special animation class for Videos link + Joystick Emoji
    if (item.url.includes("videos.html")) {
      a.classList.add("videos-btn-animate");
      a.innerHTML = `${item.text} <span style="margin-right: 0.5rem;">🎮</span>`;
    }

    container.appendChild(a);
  });
}

// Variables for infinite scroll
let loadedCount = 0;
const BATCH_SIZE = 10;
let allMapsData = [];
let observer = null;
let isLoading = false;

const CONFIG_FILE = "config/links.json";

let currentChannel = null;
let allMapsDataFull = {};

async function loadRobloxMaps(isPagesDir) {
  const grid = document.getElementById("maps-grid");
  if (!grid) return;

  await fetchAndRenderMaps(isPagesDir);
  setupIntersectionObserver();
}

async function fetchAndRenderMaps(isPagesDir) {
  const grid = document.getElementById("maps-grid");
  if (!grid) return;

  grid.innerHTML = '<p style="text-align:center; width:100%;">Loading...</p>';

  try {
    const configPath =
      (isPagesDir ? `../${CONFIG_FILE}` : CONFIG_FILE) +
      "?t=" +
      new Date().getTime();

    console.log("Fetching maps from:", configPath);

    const response = await fetch(configPath);
    if (!response.ok)
      throw new Error(
        `Failed to load links from ${configPath}: ${response.status} ${response.statusText}`,
      );

    allMapsDataFull = await response.json();

    // Render Buttons from Keys
    renderChannelButtons();

    // Default to first key if not set
    const keys = Object.keys(allMapsDataFull);
    if (!currentChannel && keys.length > 0) {
      currentChannel = keys[0];
    }

    // Update selection UI
    updateChannelButtons();

    // Initial Render
    resetAndRender();
  } catch (err) {
    console.error("Error loading maps:", err);
    grid.innerHTML = `<div style="text-align:center; padding: 2rem; color: red;">
            <p><strong>Failed to load maps</strong></p>
            <p>Error: ${err.message}</p>
            <p>Please check console for more details.</p>
        </div>`;
  }
}

function resetAndRender() {
  const grid = document.getElementById("maps-grid");
  if (!grid) return;

  grid.innerHTML = ""; // Clear existing content
  loadedCount = 0;

  if (currentChannel && allMapsDataFull[currentChannel]) {
    allMapsData = allMapsDataFull[currentChannel];
    appendMaps(); // Load first batch
  } else {
    grid.innerHTML = "<p>No channels found.</p>";
  }
}

function appendMaps() {
  if (isLoading) return;
  if (loadedCount >= allMapsData.length) return; // All loaded

  isLoading = true;
  const grid = document.getElementById("maps-grid");

  // Calculate slice
  const startIndex = loadedCount;
  const endIndex = Math.min(loadedCount + BATCH_SIZE, allMapsData.length);
  const batchItems = allMapsData.slice(startIndex, endIndex);

  // Render Items
  batchItems.forEach((item) => {
    const card = createMapCard(item);
    grid.appendChild(card);
  });

  loadedCount += batchItems.length;
  isLoading = false;

  // Provide visual feedback if we reached the end
  if (loadedCount >= allMapsData.length) {
    const endMsg = document.getElementById("end-of-list-msg");
    if (!endMsg) {
      const p = document.createElement("p");
      p.id = "end-of-list-msg";
      p.textContent = "No more maps to load.";
      p.style.textAlign = "center";
      p.style.width = "100%";
      p.style.padding = "2rem";
      p.style.color = "var(--text-light)";
      grid.parentNode.appendChild(p);
    }
  }
}

const videoTitleCache = {};
const channelDataCache = {};
const channelFetchPromises = {};

async function fetchVideoTitle(videoUrl) {
    if (!videoUrl) return null;
    if (videoTitleCache[videoUrl]) return videoTitleCache[videoUrl];

    try {
        const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        if (data.title) {
            videoTitleCache[videoUrl] = data.title;
            return data.title;
        }
    } catch (error) {
        console.warn("Failed to fetch video title for:", videoUrl, error);
    }
    return null;
}

// Fetch channel info using microlink.io
async function fetchChannelInfo(handle) {
    if (channelDataCache[handle]) return channelDataCache[handle];
    if (channelFetchPromises[handle]) return channelFetchPromises[handle];

    const fetchPromise = (async () => {
        const channelUrl = `https://www.youtube.com/@${handle}`;
        try {
            const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(channelUrl)}`);
            if (!response.ok) throw new Error("Microlink fetch failed");
            
            const json = await response.json();
            if (json.status === 'success' && json.data) {
                const info = {
                    name: json.data.author || json.data.title || handle,
                    url: json.data.url || channelUrl,
                    image: json.data.image ? json.data.image.url : null,
                    logo: json.data.logo ? json.data.logo.url : null
                };
                // Prefer logo/image
                info.avatar = info.image || info.logo || `https://unavatar.io/youtube/@${handle}`;
                
                channelDataCache[handle] = info;
                return info;
            }
        } catch (error) {
            console.warn("Error fetching channel info for", handle, error);
        }
        
        // Fallback if failed
        const fallbackInfo = {
            name: handle,
            url: channelUrl,
            avatar: `https://unavatar.io/youtube/@${handle}`
        };
        channelDataCache[handle] = fallbackInfo;
        return fallbackInfo;
    })();

    channelFetchPromises[handle] = fetchPromise;
    
    // Clear promise from cache when done (optional, but data cache handles future requests)
    // We keep it simple: channelDataCache takes precedence, so next call returns data immediately.
    
    return fetchPromise;
}

function formatTitleWithBadges(title) {
    if (!title) return "";
    
    // Clean up title (remove specific phrases)
    // Phrases: "روبولكس : ", " في لعبة روبلوكس", " في روبلوكس", "روبلوكس: ", "روبلوكس ولكن ", "روبلوكس : ولكن ", "روبلوكس "
    let cleaned = title.replace(/روبولكس : /g, "") // Handle typo version just in case
                       .replace(/روبلوكس : ولكن /g, "")
                       .replace(/روبلوكس : /g, "") // Correct spelling with space before colon
                       .replace(/روبلوكس: /g, "")
                       .replace(/روبلوكس ولكن /g, "")
                       .replace(/روبلوكس /g, "")
                       .replace(/ في لعبة روبلوكس/g, "")
                       .replace(/ في روبلوكس/g, "");
    
    // Clean potential leftover starting punctuation like ": " or " :"
    cleaned = cleaned.trim().replace(/^[:\s-]+/g, "").trim();

    // Regex to find @Handle (alphanumeric, underscore, dot, hyphen)
    // Matches @FollowedByChars until a space or end of string or non-handle char
    const regex = /@([a-zA-Z0-9_.-]+)/g;

    return cleaned.replace(regex, (match, handle) => {
        // Return a placeholder badge that we will hydrate asynchronously
        // We use a specific class and data attribute to find it later
        return `<a href="https://www.youtube.com/@${handle}" target="_blank" class="youtuber-badge pending-badge" data-handle="${handle}" onclick="event.stopPropagation();">
            <i class="fab fa-youtube" style="margin-left:5px; color: #ff0000;"></i>
            <span>${handle}</span>
        </a>`;
    });
}

async function processBadges(container) {
    const badges = container.querySelectorAll('.youtuber-badge.pending-badge');
    
    for (const badge of badges) {
        const handle = badge.dataset.handle;
        
        // Remove pending class to avoid double processing if called multiple times
        badge.classList.remove('pending-badge');
        
        // Check manual overrides first
        if (window.siteCollaborators && window.siteCollaborators[`@${handle}`]) {
            const data = window.siteCollaborators[`@${handle}`];
            updateBadgeUI(badge, data.name, data.avatar, data.url);
            continue;
        }

        // Fetch dynamic data
        fetchChannelInfo(handle).then(info => {
             updateBadgeUI(badge, info.name, info.avatar, info.url);
        });
    }
}

function updateBadgeUI(badge, name, avatar, url) {
    badge.href = url;
    
    let content = "";
    if (avatar) {
        content += `<img src="${avatar}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />`;
        content += `<i class="fab fa-youtube fallback-icon" style="display:none; margin-left:5px; color: #ff0000;"></i>`;
    } else {
        content += `<i class="fab fa-youtube" style="margin-left:5px; color: #ff0000;"></i>`;
    }
    content += `<span>${name}</span>`;
    
    badge.innerHTML = content;
}

function createMapCard(item) {
  const card = document.createElement("div");
  card.className = "map-card";
  card.style.padding = "0";
  card.style.overflow = "hidden";
  card.style.cursor = "pointer";
  card.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
  
  // Hover effect to indicate clickable
  card.onmouseenter = () => {
      card.style.transform = "translateY(-5px)";
      card.style.boxShadow = "var(--shadow-lg)";
  };
  card.onmouseleave = () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "var(--shadow-md)";
  };

  // Click Action
  const videoId = getVideoId(item.video_link);
  if (videoId) {
      card.onclick = () => {
          // Check if we are in a subdirectory (like /videos/)
          // Foolproof check: explicitly check path segments
          const path = window.location.pathname;
          // If we are in /videos/, /about/, /contact/, /article/, /redirect/
          const isPagesDir = path.includes("/videos/") || 
                             path.includes("/about/") || 
                             path.includes("/contact/") || 
                             path.includes("/article/") || 
                             path.includes("/redirect/");

          const target = isPagesDir ? "../article/" : "article/";
          window.location.href = `${target}?id=${videoId}`;
      };
  }

  // 1. Thumbnail
  const thumbUrl = getYouTubeThumbnail(item.video_link);
  if (thumbUrl) {
    const imgContainer = document.createElement("div");
    imgContainer.style.width = "100%";
    imgContainer.style.aspectRatio = "16 / 9";
    imgContainer.style.overflow = "hidden";
    imgContainer.style.position = "relative";

    const img = document.createElement("img");
    img.src = thumbUrl;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    imgContainer.appendChild(img);

    card.appendChild(imgContainer);
  }

  const infoDiv = document.createElement("div");
  infoDiv.style.padding = "1.5rem";
  infoDiv.style.width = "100%";
  infoDiv.style.display = "flex";
  infoDiv.style.flexDirection = "column";
  infoDiv.style.alignItems = "center";
  infoDiv.style.gap = "1rem";

  // Title
  const title = document.createElement("h3");
  // Use innerHTML to allow badges
  title.innerHTML = 'Loading...';
  title.style.margin = "0";
  title.style.lineHeight = "1.8"; 
  title.classList.add("map-title"); 
  
  processBadges(title);

  // Async fetch title
  fetchVideoTitle(item.video_link).then(fetchedTitle => {
      if (fetchedTitle) {
          title.innerHTML = formatTitleWithBadges(fetchedTitle);
          processBadges(title);
      }
  });

  infoDiv.appendChild(title);
  
  // Buttons removed as requested

  card.appendChild(infoDiv);
  return card;
}

function setupIntersectionObserver() {
  const options = {
    root: null, // viewport
    rootMargin: "0px",
    threshold: 0.1,
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        appendMaps();
      }
    });
  }, options);

  // Create a sentinel element
  const sentinel = document.createElement("div");
  sentinel.id = "scroll-sentinel";
  sentinel.style.height = "20px";
  sentinel.style.width = "100%";

  // Insert proper sentinel placement logic
  // We want the sentinel to be AFTER the grid.
  const grid = document.getElementById("maps-grid");
  if (grid) {
    grid.parentNode.appendChild(sentinel);
    observer.observe(sentinel);
  }
}

function renderChannelButtons() {
  const container = document.getElementById("channel-buttons-container");
  if (!container) return;

  container.innerHTML = "";

  Object.keys(allMapsDataFull).forEach((key) => {
    const btn = document.createElement("button");
    btn.textContent = key;
    btn.className = "btn";
    btn.style.transition = "all 0.3s ease";
    btn.dataset.channel = key;

    btn.onclick = () => switchChannel(key);

    container.appendChild(btn);
  });
}

function switchChannel(channel) {
  if (currentChannel === channel) return;
  currentChannel = channel;

  updateChannelButtons();

  // Remove "end of list" msg if exists
  const endMsg = document.getElementById("end-of-list-msg");
  if (endMsg) endMsg.remove();

  resetAndRender();
}

function updateChannelButtons() {
  const container = document.getElementById("channel-buttons-container");
  if (!container) return;

  const buttons = container.querySelectorAll("button");
  buttons.forEach((btn) => {
    if (btn.dataset.channel === currentChannel) {
      btn.classList.add("active-channel");
    } else {
      btn.classList.remove("active-channel");
    }
  });
}

function getYouTubeThumbnail(url) {
  if (!url) return "";
  // Handle youtube.com and youtu.be
  let videoId = "";
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
  if (match) {
    videoId = match[1];
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return "";
}
// Helper to get raw video ID
function getVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
    return match ? match[1] : null;
}

/* Article Page Logic */
async function loadArticlePage(isPagesDir) {
    const loader = document.getElementById("article-loader");
    const view = document.getElementById("article-view");
    
    try {
        // Get ID from URL
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        
        if (!id) throw new Error("No video ID specified");
        
        // Load Links
        const configPath = (isPagesDir ? `../${CONFIG_FILE}` : CONFIG_FILE) + "?t=" + new Date().getTime();
        const response = await fetch(configPath);
        if (!response.ok) throw new Error("Failed to load links config");
        const linksData = await response.json();
        
        // Find Item (Search all channels)
        let item = null;
        for (const channel in linksData) {
            const found = linksData[channel].find(i => getVideoId(i.video_link) === id);
            if (found) {
                item = found;
                break;
            }
        }
        
        if (!item) throw new Error("Video not found in database");
        
        // Update Metadata
        document.title = `Loading... - رحومي`;
        // Async fetch accurate title if possible
        fetchVideoTitle(item.video_link).then(fetchedTitle => {
            if (fetchedTitle) {
               document.title = `${fetchedTitle} - رحومي`;
            }
        });

        // Setup Video
        const embedUrl = `https://www.youtube.com/embed/${id}`;
        document.getElementById("video-embed").src = embedUrl;
        
         // Setup Play Button
         const playBtn = document.getElementById("game-play-btn");
         const redirectPrefix = isPagesDir ? "../" : "";
         if (enableRedirection) {
             playBtn.href = `${redirectPrefix}redirect/?id=${id}`;
         } else {
             playBtn.href = item.map_link;
         }

         // Analytics Tracking
         playBtn.addEventListener("click", () => {
           if (typeof gtag === "function") {
             gtag("event", "play_game", {
               redirect_enabled: enableRedirection,
               destination_url: playBtn.href,
             });
           }
         });
        
        // Fetch Article Markdown
        let mdPath = `../assets/articles/${id}.md`;
        
        try {
            const mdResponse = await fetch(mdPath);
            if (!mdResponse.ok) {
                // If not found, just hide content and swallow error
                document.getElementById("article-content").style.display = 'none';
            } else {
                 const mdText = await mdResponse.text();
                 // Convert Markdown to HTML
                if (typeof marked !== 'undefined') {
                    document.getElementById("article-content").innerHTML = marked.parse(mdText);
                    document.getElementById("article-content").style.display = 'block';
                } else {
                    console.error("Marked library not loaded");
                    document.getElementById("article-content").style.display = 'none';
                }
            }
        } catch (e) {
            console.warn("Could not load article markdown:", e);
             document.getElementById("article-content").style.display = 'none';
        }

        // Show Content (Even if article is missing)
        if(loader) loader.style.display = "none";
        if(view) view.style.display = "block";
        
    } catch (err) {
        console.error("Error loading article:", err);
        if(loader) {
            loader.innerHTML = `
                <div style="color: var(--text-color); text-align: center;">
                    <h3>عذراً!</h3>
                    <p>${err.message}</p>
                    <a href="${isPagesDir ? '../videos/' : 'videos/'}" class="btn" style="margin-top: 1rem;">العودة للفيديوهات</a>
                </div>
            `;
        }
    }
}
