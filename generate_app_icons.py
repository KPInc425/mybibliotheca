#!/usr/bin/env python3
"""
Script to generate Android app icons from bo-app-logo.png
This script creates all the required icon sizes for Android apps.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFilter
import math

def create_adaptive_icon(foreground_path, output_path, size):
    """
    Create an adaptive icon with the foreground image centered on a background.
    Android adaptive icons require both foreground and background layers.
    """
    # Create background (solid color or gradient)
    background = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    
    # Load and resize foreground image
    foreground = Image.open(foreground_path).convert('RGBA')
    
    # Calculate scaling to fit within the safe area (66% of icon size)
    safe_area = int(size * 0.66)
    foreground.thumbnail((safe_area, safe_area), Image.Resampling.LANCZOS)
    
    # Center the foreground on the background
    bg_center = size // 2
    fg_center = foreground.size[0] // 2
    fg_offset = bg_center - fg_center
    
    # Paste foreground onto background
    background.paste(foreground, (fg_offset, fg_offset), foreground)
    
    return background

def create_regular_icon(foreground_path, output_path, size):
    """
    Create a regular icon by scaling the image to the required size.
    """
    icon = Image.open(foreground_path).convert('RGBA')
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    return icon

def main():
    # Android icon sizes
    icon_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    
    # Adaptive icon sizes (for newer Android versions)
    adaptive_sizes = {
        'mipmap-anydpi-v26': 108  # This will be scaled automatically
    }
    
    # Input logo file
    logo_path = 'app/static/bo-app-logo.png'
    
    if not os.path.exists(logo_path):
        print(f"Error: Logo file not found at {logo_path}")
        sys.exit(1)
    
    # Android resources directory
    android_res_dir = 'android/app/src/main/res'
    
    print("Generating Android app icons...")
    
    # Generate regular icons
    for folder, size in icon_sizes.items():
        folder_path = os.path.join(android_res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Create regular launcher icon
        icon = create_regular_icon(logo_path, os.path.join(folder_path, 'ic_launcher.png'), size)
        icon.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        
        # Create round launcher icon
        round_icon = create_regular_icon(logo_path, os.path.join(folder_path, 'ic_launcher_round.png'), size)
        round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
        
        print(f"Generated {folder}/ic_launcher.png ({size}x{size})")
        print(f"Generated {folder}/ic_launcher_round.png ({size}x{size})")
    
    # Generate adaptive icons
    for folder, size in adaptive_sizes.items():
        folder_path = os.path.join(android_res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Create adaptive icon foreground
        foreground = create_adaptive_icon(logo_path, os.path.join(folder_path, 'ic_launcher_foreground.png'), size)
        foreground.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')
        
        print(f"Generated {folder}/ic_launcher_foreground.png ({size}x{size})")
    
    # Create adaptive icon XML files
    adaptive_icon_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>'''
    
    # Create colors.xml for adaptive icon background
    colors_xml = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>'''
    
    # Save adaptive icon XML
    adaptive_icon_path = os.path.join(android_res_dir, 'mipmap-anydpi-v26', 'ic_launcher.xml')
    with open(adaptive_icon_path, 'w') as f:
        f.write(adaptive_icon_xml)
    
    # Save round adaptive icon XML
    round_adaptive_icon_path = os.path.join(android_res_dir, 'mipmap-anydpi-v26', 'ic_launcher_round.xml')
    with open(round_adaptive_icon_path, 'w') as f:
        f.write(adaptive_icon_xml.replace('ic_launcher_foreground', 'ic_launcher_foreground'))
    
    # Save colors.xml
    colors_path = os.path.join(android_res_dir, 'values', 'colors.xml')
    os.makedirs(os.path.dirname(colors_path), exist_ok=True)
    with open(colors_path, 'w') as f:
        f.write(colors_xml)
    
    print("Generated adaptive icon XML files")
    print("Generated colors.xml")
    print("\nIcon generation complete!")

if __name__ == '__main__':
    main() 