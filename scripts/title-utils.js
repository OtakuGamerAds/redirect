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

  function createBadgeHtml({
    tag = "span",
    href = null,
    className = "youtuber-badge",
    extraClasses = "",
    dataAttributes = {},
    onclick = "",
    style = "",
    iconClass = "fas fa-gamepad",
    iconColor = "", // e.g. '#ff0000'
    iconImage = "", // URL for image icon
    iconStyle = "",
    text = "",
    textClass = "",
    target = "",
  }) {
    const el = document.createElement(tag);
    el.className = `${className} ${extraClasses}`.trim();

    if (href && tag === "a") {
      el.href = href;
    }

    if (target && tag === "a") {
      el.target = target;
    }

    if (onclick) {
      el.setAttribute("onclick", onclick);
    }

    if (style) {
      el.setAttribute("style", style);
    }

    // Add data attributes
    Object.keys(dataAttributes).forEach((key) => {
      el.dataset[key] = dataAttributes[key];
    });

    let combinedIconStyle = iconStyle;
    if (iconColor) {
      combinedIconStyle += ` color: ${iconColor};`;
    }

    let innerStyles = combinedIconStyle
      ? ` style="${combinedIconStyle.trim()}"`
      : "";

    let iconHtml = "";
    if (iconImage) {
      iconHtml = `<img src="${iconImage}" alt=""${innerStyles}>`;
    } else if (iconClass) {
      iconHtml = `<i class="${iconClass}"${innerStyles}></i>`;
    }

    // For spacing after icon if it exists
    // If we have explicit margin style, we might not want the space?
    // The original code had `margin-left:5px` AND likely a space in HTML (newline/indentation).
    // But `margin-left` in RTL handles the spacing.
    // I'll keep the space as it acts as a safe fallback, web browsers collapse multiple spaces/margins reasonably well for this case usually.
    // Actually, `<i ...></i> <span>` vs `<i ...></i><span>`
    // The original was:
    // <i ...></i>
    // <span ...>
    // That implies whitespace (newline) which renders as a space.
    if (iconHtml) {
      iconHtml += " ";
    }

    // Wrap text if class provided
    let textHtml = text;
    if (textClass) {
      textHtml = `<span class="${textClass}">${text}</span>`;
    } else {
      textHtml = `<span>${text}</span>`;
    }

    el.innerHTML = `${iconHtml}${textHtml}`;

    // Return outerHTML
    return el.outerHTML;
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
      return createBadgeHtml({
        tag: "a",
        href: `https://www.youtube.com/@${handle}`,
        target: "_blank",
        extraClasses: "pending-badge",
        dataAttributes: { handle: handle },
        onclick: "event.stopPropagation();",
        iconClass: "fab fa-youtube",
        iconColor: "#ff0000",
        iconStyle: "margin-left:5px;",
        text: handle,
      });
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
   * Fetches video title via YouTube oEmbed
   */
  async function fetchVideoTitle(videoUrl) {
    if (!videoUrl) return null;

    // Check if we already have a cached result for this EXACT url
    // Note: We might want to invalidate cache if it was "Loading..." but here we store final titles
    if (videoTitleCache[videoUrl]) return videoTitleCache[videoUrl];

    try {
      // Use YouTube's official oEmbed endpoint
      // Add a timestamp to bypass browser/CDN caching of previous "404" or "private" responses
      const cacheBuster = new Date().getTime();
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json&t=${cacheBuster}`;

      const response = await fetch(oembedUrl);

      if (!response.ok) {
        // If 401/403/404, it might be private or deleted.
        // We can throw or just return null.
        // If it was private and is now public, the cache buster should help us get the 200 OK.
        throw new Error(`oEmbed failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.title) {
        videoTitleCache[videoUrl] = data.title;
        return data.title;
      }
    } catch (error) {
      console.warn("Failed to fetch video title for:", videoUrl, error);

      // Fallback: Try noembed as a backup (sometimes useful if official endpoint is quirky,
      // though usually official is better for "just turned public" scenarios)
      try {
        const response = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}&t=${new Date().getTime()}`,
        );
        const data = await response.json();
        if (data.title) {
          videoTitleCache[videoUrl] = data.title;
          return data.title;
        }
      } catch (e) {
        // ignore fallback error
      }
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
    createBadgeHtml,
  };
})();

// Export for module use if needed, but also attach to window for general scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = TitleUtils;
}
window.TitleUtils = TitleUtils;
