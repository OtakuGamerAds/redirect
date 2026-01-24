"""
Sort Videos by Channel Order

This script sorts your JSON files by the actual order videos appear
on the YouTube channel (newest first, just like the channel page).

Usage: python sort_by_channel_order.py

Features:
- Fetches video order directly from YouTube channel
- Assigns videos to correct JSON file based on which channel they belong to
- Sorts by channel order (newest to oldest)
- Preserves all existing video data

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
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_channel_video_order(channel_url, max_videos=300):
    """Get ordered list of video IDs from channel."""
    print(f"Fetching videos from: {channel_url}")
    
    result = subprocess.run(
        ['yt-dlp', '--flat-playlist', '--print', '%(id)s', channel_url, '--playlist-end', str(max_videos)],
        capture_output=True, text=True, timeout=120
    )
    
    video_ids = [vid.strip() for vid in result.stdout.strip().split('\n') if vid.strip()]
    print(f"Found {len(video_ids)} videos")
    return video_ids

def sort_videos_by_channel_order(input_file, output_file, channel_url):
    """Sort videos by their order on the channel."""
    print(f"\n{'='*60}")
    print(f"Processing: {input_file}")
    print(f"{'='*60}")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        videos = json.load(f)
    
    print(f"Loaded {len(videos)} videos from JSON")
    
    channel_order = get_channel_video_order(channel_url)
    position_map = {vid: idx for idx, vid in enumerate(channel_order)}
    
    for video in videos:
        video_id = extract_video_id(video.get('video_link', ''))
        pos = position_map.get(video_id, 999999)
        video['_channel_position'] = pos
        if pos == 999999:
            print(f"WARNING: Not in channel: {video.get('video_link', '')}")
    
    videos.sort(key=lambda x: x['_channel_position'])
    
    for video in videos:
        del video['_channel_position']
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(videos, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(videos)} videos to: {output_file}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_dir = os.path.join(script_dir, '..', 'config')
    
    # Main channel
    sort_videos_by_channel_order(
        os.path.join(config_dir, 'links_main.json'),
        os.path.join(config_dir, 'links_main.json'),
        'https://www.youtube.com/@Rahumi/videos'
    )
    
    # Extra channel  
    sort_videos_by_channel_order(
        os.path.join(config_dir, 'links_extra.json'),
        os.path.join(config_dir, 'links_extra.json'),
        'https://www.youtube.com/@RahumiExtra/videos'
    )
    
    print("\n" + "="*60)
    print("Done! Videos sorted by channel order.")
    print("="*60)

if __name__ == '__main__':
    main()
