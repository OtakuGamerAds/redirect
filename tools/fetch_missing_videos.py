"""
Fetch Missing Videos from Channel

This script fetches videos from a YouTube channel that are missing
from your JSON file and adds them with metadata.

Usage: python fetch_missing_videos.py

Features:
- Compares channel videos with existing JSON entries
- Fetches metadata for missing videos (title, Roblox link from description)
- Maintains channel order (newest first)
- Preserves existing video data

Requirements: pip install yt-dlp
"""

import json
import re
import subprocess
import os

def extract_video_id(url):
    """Extract video ID from a YouTube URL."""
    patterns = [
        r'youtu\.be/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_channel_videos(channel_url, max_videos=200):
    """Get ordered list of video IDs from channel."""
    print(f"Fetching videos from: {channel_url}")
    
    result = subprocess.run(
        ['yt-dlp', '--flat-playlist', '--print', '%(id)s', channel_url, '--playlist-end', str(max_videos)],
        capture_output=True, text=True, timeout=120
    )
    
    video_ids = [vid.strip() for vid in result.stdout.strip().split('\n') if vid.strip()]
    print(f"Found {len(video_ids)} videos")
    return video_ids

def get_video_info(video_id):
    """Get video metadata using yt-dlp JSON dump."""
    try:
        result = subprocess.run(
            ['yt-dlp', '--skip-download', '--dump-json', f'https://www.youtube.com/watch?v={video_id}'],
            capture_output=True, timeout=30
        )
        output = result.stdout.decode('utf-8', errors='replace')
        info = json.loads(output)
        return info.get('title'), info.get('description', '')
    except Exception as e:
        print(f"  Error fetching {video_id}: {e}")
        return None, None

def get_roblox_link(description):
    """Extract Roblox game link from description."""
    if not description:
        return None
    
    patterns = [
        r'(https?://www\.roblox\.com/games/\d+[^\s\n]*)',
        r'(https?://roblox\.com/games/\d+[^\s\n]*)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, description)
        if match:
            link = match.group(1).strip()
            link = link.split('"')[0].split("'")[0].split('<')[0]
            return link
    
    return "https://www.roblox.com"

def fetch_and_add_missing(json_file, channel_url):
    """Add missing videos from channel to JSON file."""
    print(f"\n{'='*60}")
    print(f"Processing: {json_file}")
    print(f"{'='*60}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        existing_videos = json.load(f)
    
    print(f"Existing videos: {len(existing_videos)}")
    
    # Map existing videos by ID
    existing_map = {}
    for video in existing_videos:
        video_id = extract_video_id(video.get('video_link', ''))
        if video_id:
            existing_map[video_id] = video
    
    # Get channel video order
    channel_videos = get_channel_videos(channel_url)
    
    # Build sorted list
    sorted_videos = []
    added = 0
    
    for i, video_id in enumerate(channel_videos):
        if video_id in existing_map:
            sorted_videos.append(existing_map[video_id])
            print(f"[{i+1}/{len(channel_videos)}] {video_id} - EXISTS")
        else:
            print(f"[{i+1}/{len(channel_videos)}] {video_id} - MISSING, fetching...")
            
            title, description = get_video_info(video_id)
            
            if title:
                roblox_link = get_roblox_link(description)
                new_video = {
                    "video_link": f"https://youtu.be/{video_id}",
                    "map_name": title,  # Will be replaced by Roblox name later
                    "map_link": roblox_link
                }
                sorted_videos.append(new_video)
                added += 1
                print(f"  Added: {title[:50]}")
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(sorted_videos, f, indent=2, ensure_ascii=False)
    
    print(f"\nTotal videos: {len(sorted_videos)}, Added: {added}")
    print(f"Saved to: {json_file}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_dir = os.path.join(script_dir, '..', 'config')
    
    # Main channel
    fetch_and_add_missing(
        os.path.join(config_dir, 'links_main.json'),
        'https://www.youtube.com/@Rahumi/videos'
    )
    
    # Extra channel
    fetch_and_add_missing(
        os.path.join(config_dir, 'links_extra.json'),
        'https://www.youtube.com/@RahumiExtra/videos'
    )
    
    print("\n" + "="*60)
    print("Done! Run fetch_roblox_names.js to get proper game names.")
    print("="*60)

if __name__ == '__main__':
    main()
