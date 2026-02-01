/**
 * Shared Utilities for Title Processing and Link Parsing
 */

const TitleUtils = (function () {
  const videoTitleCache = {};
  const channelDataCache = {};
  const channelFetchPromises = {};

  /**
   * Normalizes a YouTube link to the standard shorthand format
   */
  function normalizeYoutubeLink(url) {
    if (!url) return "";
    const match = url.match(
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
    );
    if (match && match[2].length === 11) {
      return `https://youtu.be/${match[2]}`;
    }
    return url;
  }

  /**
   * Extracts the Video ID from a YouTube link
   */
  function getVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&]+)/);
    return match ? match[1] : null;
  }

  /**
   * Gets the YouTube thumbnail URL
   */
  function getYouTubeThumbnail(url) {
    const videoId = getVideoId(url);
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : "";
  }

  /**
   * Extracts the Roblox Place ID from a link
   */
  function getRobloxPlaceId(url) {
    if (!url) return null;
    const match = url.match(/roblox\.com\/games\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Cleans a title (removes Roblox keywords) and replaces @handles with badges hurdles
   */
  function formatTitleWithBadges(title) {
    if (!title) return "";

    // Clean up phrases - order matters!
    let cleaned = title
      .replace(/روبولكس : /g, "")
      .replace(/روبلوكس : ولكن /g, "")
      .replace(/روبلوكس : /g, "")
      .replace(/روبلوكس: /g, "")
      .replace(/روبلوكس ولكن /g, "")
      .replace(/ في لعبة روبلوكس/g, "")
      .replace(/ في روبلوكس/g, "")
      .replace(/روبلوكس /g, "");

    // Clean up orphaned "في" that may be left behind after removing "روبلوكس"
    // This handles cases like "في أصعب ماب في روبلوكس" -> "في أصعب ماب في"
    cleaned = cleaned
      .replace(/ في\s*([!,.،؛:؟\s]|$)/g, " $1") // Remove trailing "في" before punctuation or end
      .trim()
      .replace(/^[:\s-]+/g, "")
      .trim();

    // Regex to find @Handle
    const regex = /@([a-zA-Z0-9_.-]+)/g;

    return cleaned.replace(regex, (match, handle) => {
      return `<a href="https://www.youtube.com/@${handle}" target="_blank" class="youtuber-badge pending-badge" data-handle="${handle}" onclick="event.stopPropagation();">
                    <i class="fab fa-youtube" style="margin-left:5px; color: #ff0000;"></i>
                    <span>${handle}</span>
                </a>`;
    });
  }

  /**
   * Fetches YouTube channel info via microlink.io
   */
  async function fetchChannelInfo(handle) {
    if (channelDataCache[handle]) return channelDataCache[handle];
    if (channelFetchPromises[handle]) return channelFetchPromises[handle];

    const fetchPromise = (async () => {
      const channelUrl = `https://www.youtube.com/@${handle}`;
      try {
        const response = await fetch(
          `https://api.microlink.io/?url=${encodeURIComponent(channelUrl)}`,
        );
        if (!response.ok) throw new Error("Microlink fetch failed");

        const json = await response.json();
        if (json.status === "success" && json.data) {
          const info = {
            name: json.data.author || json.data.title || handle,
            url: json.data.url || channelUrl,
            image: json.data.image ? json.data.image.url : null,
            logo: json.data.logo ? json.data.logo.url : null,
          };
          info.avatar =
            info.image || info.logo || `https://unavatar.io/youtube/@${handle}`;
          channelDataCache[handle] = info;
          return info;
        }
      } catch (error) {
        console.warn("Error fetching channel info for", handle, error);
      }

      const fallbackInfo = {
        name: handle,
        url: channelUrl,
        avatar: `https://unavatar.io/youtube/@${handle}`,
      };
      channelDataCache[handle] = fallbackInfo;
      return fallbackInfo;
    })();

    channelFetchPromises[handle] = fetchPromise;
    return fetchPromise;
  }

  /**
   * Updates badge UI with fetched channel info
   */
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

  /**
   * Processes all pending badges in a container
   */
  async function processBadges(container) {
    const badges = container.querySelectorAll(".youtuber-badge.pending-badge");

    for (const badge of badges) {
      const handle = badge.dataset.handle;
      badge.classList.remove("pending-badge");

      // Check manual overrides first
      if (window.siteCollaborators && window.siteCollaborators[`@${handle}`]) {
        const data = window.siteCollaborators[`@${handle}`];
        updateBadgeUI(badge, data.name, data.avatar, data.url);
        continue;
      }

      // Fetch dynamic data
      fetchChannelInfo(handle).then((info) => {
        updateBadgeUI(badge, info.name, info.avatar, info.url);
      });
    }
  }

  /**
   * Fetches video title via noembed
   */
  async function fetchVideoTitle(videoUrl) {
    if (!videoUrl) return null;
    if (videoTitleCache[videoUrl]) return videoTitleCache[videoUrl];

    try {
      const response = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`,
      );
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

  return {
    normalizeYoutubeLink,
    getVideoId,
    getYouTubeThumbnail,
    getRobloxPlaceId,
    formatTitleWithBadges,
    fetchChannelInfo,
    updateBadgeUI,
    processBadges,
    fetchVideoTitle,
  };
})();

// Export for module use if needed, but also attach to window for general scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = TitleUtils;
}
window.TitleUtils = TitleUtils;
