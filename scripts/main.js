/* Dark Mode Logic */
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (systemPrefersDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }
}

// Initialize theme immediately
initTheme();

// URL Cleanup: Clean index.html from URL
if (window.location.pathname.endsWith("index.html")) {
  const newPath = window.location.pathname.substring(
    0,
    window.location.pathname.lastIndexOf("index.html"),
  );
  window.history.replaceState(null, "", newPath);
}

// Listen for system preference changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      // Only update if no manual override
      const newTheme = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      updateThemeIcon(newTheme);
    }
  });

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const themeIcon = document.getElementById("theme-icon");
  if (themeIcon) {
    themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
}

// Theme toggle logic moved to setupThemeToggle
/* End Dark Mode Logic */
/* End Dark Mode Logic */

document.addEventListener("DOMContentLoaded", () => {
  // Set initial icon state immediately
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "light";
  updateThemeIcon(currentTheme);

  loadConfig();
});

function setupThemeToggle() {
  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    // Remove old listener if exists to be safe, though a fresh element won't have one
    themeToggleBtn.removeEventListener("click", toggleTheme);
    themeToggleBtn.addEventListener("click", toggleTheme);
  }
}

function updateMetaTags(title, description, keywords, image) {
  // Update Title
  if (title) document.title = title;

  // Update Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  if (description) metaDesc.content = description;

  // Update Keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement("meta");
    metaKeywords.name = "keywords";
    document.head.appendChild(metaKeywords);
  }
  if (keywords) metaKeywords.content = keywords;

  // Update OG Tags (Social Media)
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement("meta");
    ogTitle.setAttribute("property", "og:title");
    document.head.appendChild(ogTitle);
  }
  if (title) ogTitle.content = title;

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement("meta");
    ogDesc.setAttribute("property", "og:description");
    document.head.appendChild(ogDesc);
  }
  if (description) ogDesc.content = description;

  // Update OG Image
  if (image) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    ogImage.content = image.startsWith("http")
      ? image
      : window.location.origin +
        "/" +
        image.replace(/^\.\//, "").replace(/^\.\.\//, "");
  }
}

let enableRedirection = true; // Default

async function loadConfig() {
  try {
    // Determine path to config based on current location
    // Robust check: Look at how main.js was imported in the HTML.
    // If imported as "../scripts/main.js", we are in a subdirectory.
    let isPagesDir = false;
    const scripts = document.getElementsByTagName("script");
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

    // Apply Site-Wide SEO (Homepage & Fallback)
    // Only apply if we are NOT on an article page (which handles its own SEO)
    if (!window.location.pathname.includes("article/")) {
      const pageTitle = data.profile.name;
      const pageDesc = data.profile.intro_text;
      const pageImage = data.profile.avatar_url;
      // Default keywords for main pages
      const pageKeywords =
        "rahumi, رحومي, roblox, روبلوكس, games, العاب, secrets, اسرار";

      updateMetaTags(pageTitle, pageDesc, pageKeywords, pageImage);
    }

    // Inject Header first so Nav can be populated
    generateHeader(isPagesDir);

    populateContent(data, isPagesDir);
    generateNav(data.nav, isPagesDir);
    generateHomeNav(data.nav);
    generateFooter(isPagesDir);

    // Setup Theme Toggle Listener AFTER header is injected
    setupThemeToggle();

    // Check for Videos Page (matches both /videos/ and videos.html for backward compat)
    if (
      window.location.pathname.includes("videos/") ||
      window.location.pathname.includes("videos.html")
    ) {
      // Dynamically set page title from nav config
      // Look for nav item with "videos/" OR "videos.html"
      const videosNav = data.nav.find(
        (item) =>
          item.url.includes("videos/") || item.url.includes("videos.html"),
      );
      const pageTitle = document.getElementById("page-title");
      if (videosNav && pageTitle) {
        pageTitle.textContent = videosNav.text;
      }
      loadRobloxMaps(isPagesDir);
    }

    if (
      window.location.pathname.includes("article/") ||
      window.location.pathname.includes("article.html")
    ) {
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
    if (item.url.includes("videos.html") || item.url.includes("videos/")) {
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

  // Directly find the Videos item
  const videosItem = navItems.find(
    (item) => item.url.includes("videos/") || item.url.includes("videos.html"),
  );

  if (videosItem) {
    const a = document.createElement("a");
    a.href = videosItem.url;

    // Apply styling and animation class directly
    a.className = "btn videos-btn-animate";
    a.style.width = "100%";
    a.style.display = "block";
    a.style.textAlign = "center";

    // Add text and icon
    a.innerHTML = `${videosItem.text} <i class="fas fa-gamepad" style="margin-right: 0.5rem;"></i>`;

    container.appendChild(a);
  }
}

function generateHeader(isPagesDir) {
  // Check if header already exists to avoid duplicates
  if (document.querySelector("nav.navbar")) return;

  // Exclude Redirect Page from having a header
  if (window.location.pathname.includes("/redirect/")) return;

  const nav = document.createElement("nav");
  nav.className = "navbar";

  const container = document.createElement("div");
  container.className = "container";

  // Logo Section
  const logoWrapper = document.createElement("div");
  logoWrapper.className = "logo-wrapper";
  logoWrapper.style.display = "flex";
  logoWrapper.style.alignItems = "center";
  logoWrapper.style.gap = "1rem";

  const logoDiv = document.createElement("a");
  logoDiv.className = "logo";
  logoDiv.textContent = "رحومي - Rahumi";
  logoDiv.href = isPagesDir ? "../" : "./";
  logoDiv.style.textDecoration = "none";
  logoDiv.style.color = "var(--primary-color)"; // Ensure color is maintained

  const themeBtn = document.createElement("button");
  themeBtn.id = "theme-toggle";
  themeBtn.className = "btn";
  themeBtn.style.padding = "0.5rem 1rem";
  themeBtn.style.color = "white";
  themeBtn.setAttribute("aria-label", "تبديل المظهر");

  const themeIcon = document.createElement("i");
  themeIcon.id = "theme-icon";
  themeIcon.className = "fas fa-moon"; // Default, updated by setupThemeToggle/updateThemeIcon

  themeBtn.appendChild(themeIcon);
  logoWrapper.appendChild(logoDiv);
  logoWrapper.appendChild(themeBtn);

  // Nav List
  const ul = document.createElement("ul");
  ul.className = "nav-links";
  ul.id = "nav-list";

  // Menu Toggle (Hamburger) - Semantic Button
  const menuToggle = document.createElement("button");
  menuToggle.className = "menu-toggle";
  menuToggle.textContent = "☰";
  menuToggle.setAttribute("aria-label", "القائمة");
  // Reset button styles to match previous look
  menuToggle.style.background = "none";
  menuToggle.style.border = "none";
  menuToggle.style.color = "inherit";
  menuToggle.style.padding = "0";
  menuToggle.style.font = "inherit";

  container.appendChild(logoWrapper);
  container.appendChild(ul);
  container.appendChild(menuToggle);
  nav.appendChild(container);

  // Prepend to body
  document.body.insertBefore(nav, document.body.firstChild);
}

function generateFooter(isPagesDir) {
  // Check if footer already exists to avoid duplicates
  if (document.querySelector("footer.site-footer")) return;

  const footer = document.createElement("footer");
  footer.className = "site-footer";

  const prefix = isPagesDir ? "../" : "";
  const date = new Date().getFullYear();

  footer.innerHTML = `
    <div style="margin-bottom: 0.5rem;">
      <a href="${prefix}privacy/">سياسة الخصوصية</a>
      <span style="opacity: 0.3; margin: 0 5px;">|</span>
      <a href="${prefix}terms/">شروط الاستخدام</a>
      <span style="opacity: 0.3; margin: 0 5px;">|</span>
      <a href="${prefix}contact/">اتصل بنا</a>
    </div>
    <div style="font-size: 0.85em; opacity: 0.8;">
      &copy; ${date} رحومي - جميع الحقوق محفوظة
    </div>
  `;

  document.body.appendChild(footer);
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

    const response = await fetch(configPath);
    if (!response.ok)
      throw new Error(
        `Failed to load links from ${configPath}: ${response.status} ${response.statusText}`,
      );

    allMapsDataFull = await response.json();

    // Render Buttons from Keys (sorted by list_number)
    renderChannelButtons();

    // Default to first key if not set (first by list_number)
    const sortedKeys = Object.keys(allMapsDataFull).sort((a, b) => {
      return (
        (allMapsDataFull[a].list_number ?? 999) -
        (allMapsDataFull[b].list_number ?? 999)
      );
    });
    if (!currentChannel && sortedKeys.length > 0) {
      currentChannel = sortedKeys[0];
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
    // Access the links array from the structured format
    allMapsData = allMapsDataFull[currentChannel].links;
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

async function fetchVideoTitle(videoUrl) {
  return TitleUtils.fetchVideoTitle(videoUrl);
}

async function fetchChannelInfo(handle) {
  return TitleUtils.fetchChannelInfo(handle);
}

function formatTitleWithBadges(title) {
  return TitleUtils.formatTitleWithBadges(title);
}

async function processBadges(container) {
  return TitleUtils.processBadges(container);
}

function updateBadgeUI(badge, name, avatar, url) {
  return TitleUtils.updateBadgeUI(badge, name, avatar, url);
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
      const isPagesDir =
        path.includes("/videos/") ||
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
  title.innerHTML = "Loading...";
  title.style.margin = "0";
  title.style.lineHeight = "1.8";
  title.classList.add("map-title");

  processBadges(title);

  // Async fetch title
  fetchVideoTitle(item.video_link).then((fetchedTitle) => {
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

  // Sort channels by list_number
  const sortedKeys = Object.keys(allMapsDataFull).sort((a, b) => {
    return (
      (allMapsDataFull[a].list_number ?? 999) -
      (allMapsDataFull[b].list_number ?? 999)
    );
  });

  sortedKeys.forEach((key) => {
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
  return TitleUtils.getYouTubeThumbnail(url);
}

function getVideoId(url) {
  return TitleUtils.getVideoId(url);
}

function getRobloxPlaceId(url) {
  return TitleUtils.getRobloxPlaceId(url);
}

// Function to get game name
async function getRobloxGameName(placeId) {
  // We use a public proxy to bypass CORS restrictions
  // 'corsproxy.io' was blocked (403), switching to 'api.codetabs.com'
  const proxy = "https://api.codetabs.com/v1/proxy?quest=";

  try {
    // Step 1: Get the Universe ID from the Place ID
    const universeUrl = `https://apis.roblox.com/universes/v1/places/${placeId}/universe`;
    const universeResponse = await fetch(
      proxy + encodeURIComponent(universeUrl),
    );

    if (!universeResponse.ok) throw new Error("Failed to get Universe ID");
    const universeData = await universeResponse.json();
    const universeId = universeData.universeId;

    // Step 2: Get the Game Name using the Universe ID
    const gameUrl = `https://games.roblox.com/v1/games?universeIds=${universeId}`;
    const gameResponse = await fetch(proxy + encodeURIComponent(gameUrl));

    if (!gameResponse.ok) throw new Error("Failed to get Game Details");
    const gameData = await gameResponse.json();

    return gameData.data[0].name;
  } catch (error) {
    console.warn("Error fetching Roblox game name:", error.message);
    return null;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* Article Page Logic */
let player;
let youtubeApiPromise = null;

function loadYouTubeApi() {
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return youtubeApiPromise;
}

async function loadArticlePage(isPagesDir) {
  const loader = document.getElementById("article-loader");
  const view = document.getElementById("article-view");

  try {
    // Get ID from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) throw new Error("No video ID specified");

    // Load Links
    const configPath =
      (isPagesDir ? `../${CONFIG_FILE}` : CONFIG_FILE) +
      "?t=" +
      new Date().getTime();
    const response = await fetch(configPath);
    if (!response.ok) throw new Error("Failed to load links config");
    const linksData = await response.json();

    // Find Item (Search all channels)
    let item = null;
    for (const channel in linksData) {
      const found = linksData[channel].links.find(
        (i) => getVideoId(i.video_link) === id,
      );
      if (found) {
        item = found;
        break;
      }
    }

    if (!item) throw new Error("Video not found in database");

    // Update Metadata
    document.title = `Loading... - رحومي`;

    // Fetch Game Name dynamically if possible (Progressive Enhancement Pattern)
    const placeId = getRobloxPlaceId(item.map_link);
    const gameNamePromise = placeId
      ? getRobloxGameName(placeId).catch(() => "Roblox Game")
      : Promise.resolve("Roblox Game");

    // Async fetch accurate title if possible
    fetchVideoTitle(item.video_link).then(async (fetchedTitle) => {
      const finalTitle = fetchedTitle || "فيديو روبلوكس";
      const gameName = await gameNamePromise;

      const pageTitle = `${finalTitle} - رحومي`;
      const description = `استمتع بمشاهدة ${finalTitle} وتعرف على ${gameName}. تابعنا على رحومي (Rahumi) للمزيد من فيديوهات ومابات روبلوكس الممتعة!`;
      const keywords = `rahumi, رحومي, roblox, روبلوكس, ${gameName}, ${finalTitle}, video, فيديو`;
      // Use standard avatar for articles, or could use video thumbnail if available
      const image = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

      updateMetaTags(pageTitle, description, keywords, image);
    });

    // Setup Video with YouTube API
    await loadYouTubeApi();

    // Add origin to enablejsapi for security/reliability
    const origin = window.location.origin;
    const embedUrl = `https://www.youtube.com/embed/${id}?enablejsapi=1&origin=${origin}&rel=0`;
    const iframe = document.getElementById("video-embed");
    iframe.src = embedUrl;

    // Ensure allow attribute has autoplay permissions (critical for programmatic play)
    if (
      !iframe.getAttribute("allow") ||
      !iframe.getAttribute("allow").includes("autoplay")
    ) {
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      );
    }

    // Initialize Player
    if (player) {
      try {
        player.destroy();
      } catch (e) {
        console.warn("Error destroying player", e);
      }
    }

    player = new YT.Player("video-embed", {
      events: {
        onReady: (event) => {
          // Player ready
        },
      },
    });

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
    let mdPath = `../assets/articles/${id}.md?t=${new Date().getTime()}`;

    try {
      const mdResponse = await fetch(mdPath);
      if (!mdResponse.ok) {
        // If not found, just hide content and swallow error
        document.getElementById("article-content").style.display = "none";
      } else {
        let mdText = await mdResponse.text();

        // Process Timestamps: (m:ss) -> Link
        // Regex matches (m:ss) or (mm:ss) or (h:mm:ss) inside parentheses
        const timestampRegex = /\((\d{1,2}:\d{2}(?::\d{2})?)\)/g;
        mdText = mdText.replace(timestampRegex, (match, time) => {
          return `<a href="#" class="timestamp-link" data-time="${time}">(${time})</a>`;
        });

        // Convert Markdown to HTML
        if (typeof marked !== "undefined") {
          const contentDiv = document.getElementById("article-content");
          let parsedHtml = marked.parse(mdText);

          // Progressive Enhancement: Replace placeholder with a hook AFTER parsing
          // This ensures the span is not escaped by the markdown parser.
          parsedHtml = parsedHtml.replace(
            /\$\{GAME_NAME\}/g,
            `
                        <span class="dynamic-game-name youtuber-badge" style="cursor: pointer; text-decoration: none;" onclick="scrollToPlayButton(event)">
                            <i class="fas fa-gamepad" style="margin-left:5px;"></i>
                            <span class="game-name-text">جاري تحميل اسم اللعبة...</span>
                        </span>
                    `,
          );

          contentDiv.innerHTML = parsedHtml;
          contentDiv.style.display = "block";

          // Update hooks when API returns
          gameNamePromise.then((name) => {
            if (name && name !== "Roblox Game") {
              const targets = document.querySelectorAll(
                ".dynamic-game-name .game-name-text",
              );
              targets.forEach((el) => (el.textContent = name));
            }
          });

          // Add click listeners to timestamps
          contentDiv.querySelectorAll(".timestamp-link").forEach((link) => {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              const timeStr = link.getAttribute("data-time");
              const parts = timeStr.split(":").map(Number);
              let seconds = 0;
              if (parts.length === 2) {
                seconds = parts[0] * 60 + parts[1];
              } else if (parts.length === 3) {
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
              }

              if (player && typeof player.loadVideoById === "function") {
                const playerState = player.getPlayerState();
                // -1 (unstarted), 5 (video cued)

                if (playerState === -1 || playerState === 5) {
                  // If unstarted, seekTo might not start playback reliably in all browsers/contexts.
                  // loadVideoById forces a reload/start at the specific time.
                  player.loadVideoById({
                    videoId: id,
                    startSeconds: seconds,
                  });
                } else {
                  // If already active, just seek and ensure playing.
                  // Order: seek then play seems safer to ensure "play" is the final command,
                  // but we previously tried play then seek.
                  // Let's do seek then play.
                  player.seekTo(seconds, true);
                  player.playVideo();
                }

                // Scroll video into view
                const videoWrapper = document.querySelector(".video-wrapper");
                if (videoWrapper) {
                  videoWrapper.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }
            });
          });
        } else {
          console.error("Marked library not loaded");
          document.getElementById("article-content").style.display = "none";
        }
      }
    } catch (e) {
      console.warn("Could not load article markdown:", e);
      document.getElementById("article-content").style.display = "none";
    }

    // Show Content (Even if article is missing)
    if (loader) loader.style.display = "none";
    if (view) view.style.display = "block";
  } catch (err) {
    console.error("Error loading article:", err);
    if (loader) {
      loader.innerHTML = `
                <div style="color: var(--text-color); text-align: center;">
                    <h3>عذراً!</h3>
                    <p>${err.message}</p>
                    <a href="${isPagesDir ? "../videos/" : "videos/"}" class="btn" style="margin-top: 1rem;">العودة للفيديوهات</a>
                </div>
            `;
    }
  }
}

function scrollToPlayButton(event) {
  if (event) event.stopPropagation();

  const playBtn = document.getElementById("game-play-btn");
  if (!playBtn) return;

  // Smooth scroll to button
  playBtn.scrollIntoView({ behavior: "smooth", block: "center" });

  // Add temporary animation class
  playBtn.classList.add("pulse-once");

  // Remove class after animation completes (3 iterations of 0.5s = 1.5s)
  setTimeout(() => {
    playBtn.classList.remove("pulse-once");
  }, 1500);
}
