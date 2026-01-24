# Video Link Management Scripts

This folder contains scripts for managing the YouTube video and Roblox game links.

## Prerequisites

- **Node.js** (for fetching Roblox game names)
- **Python 3** with `yt-dlp` installed:
  ```bash
  pip install yt-dlp
  ```

## Scripts

### 1. `fetch_missing_videos.py`

Fetches videos from YouTube channels that are missing from your JSON files.

```bash
python tools/fetch_missing_videos.py
```

**What it does:**

- Compares videos on the channel with existing JSON entries
- Adds missing videos with their YouTube title and Roblox link (extracted from description)
- Maintains channel order (newest first)

**When to use:** After new videos are uploaded to the channels.

---

### 2. `sort_by_channel_order.py`

Sorts your JSON files to match the actual order on the YouTube channels.

```bash
python tools/sort_by_channel_order.py
```

**What it does:**

- Fetches the video order from each YouTube channel
- Sorts the JSON files to match (newest videos first)

**When to use:** If video order gets out of sync with the channel.

---

### 3. `fetch_roblox_names.js`

Fetches proper game names from Roblox game pages.

```bash
node tools/fetch_roblox_names.js
```

**What it does:**

- Visits each Roblox game URL
- Extracts the game title from the page
- Replaces YouTube video titles with proper Roblox game names
- Decodes HTML entities (emojis)

**When to use:** After adding new videos, to get proper game names.

---

## Typical Workflow

When new videos are uploaded:

1. **Fetch new videos:**

   ```bash
   python tools/fetch_missing_videos.py
   ```

2. **Get proper Roblox game names:**

   ```bash
   node tools/fetch_roblox_names.js
   ```

3. **Done!** Your JSON files are updated with new videos in the correct order.

---

## Configuration

The scripts are configured to use:

- **Main channel:** `@Rahumi` → `config/links_main.json`
- **Extra channel:** `@RahumiExtra` → `config/links_extra.json`

To change these, edit the channel URLs in the respective scripts.
