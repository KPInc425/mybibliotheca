#!/usr/bin/env python3
"""
Prepare Capacitor Assets
Creates properly sized source images for @capacitor/assets tool
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

def create_icon_only(source_path, output_path, size=1024):
    """Create icon-only.png (1024x1024) - full icon with background"""
    try:
        # Open the source image
        with Image.open(source_path) as source:
            # Convert to RGBA if not already
            if source.mode != 'RGBA':
                source = source.convert('RGBA')
            
            # Create background (teal color matching your theme)
            background_color = (38, 166, 154, 255)  # #26A69A
            icon = Image.new('RGBA', (size, size), background_color)
            
            # Calculate scaling to fit the logo within the icon
            source_width, source_height = source.size
            scale = min(size * 0.8 / source_width, size * 0.8 / source_height)
            new_width = int(source_width * scale)
            new_height = int(source_height * scale)
            
            # Resize the source image
            resized_source = source.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Calculate position to center the logo
            x = (size - new_width) // 2
            y = (size - new_height) // 2
            
            # Process the logo to make it highly visible
            enhanced_data = []
            for pixel in resized_source.getdata():
                r, g, b, a = pixel
                if a > 10:  # If pixel is not transparent
                    # Make dark colors much lighter for visibility
                    if r < 100 and g < 100 and b < 100:
                        # Very dark pixels - make them white
                        r = g = b = 255
                    elif r < 150 and g < 150 and b < 150:
                        # Dark pixels - make them light gray
                        r = g = b = 220
                    elif r < 200 and g < 200 and b < 200:
                        # Medium pixels - lighten them
                        r = min(255, r + 100)
                        g = min(255, g + 100)
                        b = min(255, b + 100)
                    # Keep bright colors as they are
                enhanced_data.append((r, g, b, a))
            
            # Create enhanced image
            enhanced_source = Image.new('RGBA', resized_source.size)
            enhanced_source.putdata(enhanced_data)
            
            # Paste the enhanced logo onto the background
            icon.paste(enhanced_source, (x, y), enhanced_source)
            
            # Save the icon
            icon.save(output_path, 'PNG')
            print(f"Created icon-only.png: {output_path}")
            
    except Exception as e:
        print(f"Error creating icon-only.png: {e}")

def create_icon_foreground(source_path, output_path, size=1024):
    """Create icon-foreground.png (1024x1024) - logo on transparent background"""
    try:
        # Open the source image
        with Image.open(source_path) as source:
            # Convert to RGBA if not already
            if source.mode != 'RGBA':
                source = source.convert('RGBA')
            
            # Create transparent background
            foreground = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            
            # Calculate scaling to fit within safe area (66% of icon size)
            safe_area = int(size * 0.66)
            source_width, source_height = source.size
            scale = min(safe_area / source_width, safe_area / source_height)
            new_width = int(source_width * scale)
            new_height = int(source_height * scale)
            
            # Resize the source image
            resized_source = source.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Calculate position to center the logo
            x = (size - new_width) // 2
            y = (size - new_height) // 2
            
            # Process the logo to make it highly visible on any background
            enhanced_data = []
            for pixel in resized_source.getdata():
                r, g, b, a = pixel
                if a > 10:  # If pixel is not transparent
                    # Make dark colors much lighter for visibility
                    if r < 100 and g < 100 and b < 100:
                        # Very dark pixels - make them dark gray (not white, for contrast)
                        r = g = b = 50
                    elif r < 150 and g < 150 and b < 150:
                        # Dark pixels - make them medium gray
                        r = g = b = 100
                    elif r < 200 and g < 200 and b < 200:
                        # Medium pixels - make them light gray
                        r = g = b = 150
                    # Keep bright colors as they are
                enhanced_data.append((r, g, b, a))
            
            # Create enhanced image
            enhanced_source = Image.new('RGBA', resized_source.size)
            enhanced_source.putdata(enhanced_data)
            
            # Paste the enhanced logo onto the foreground
            foreground.paste(enhanced_source, (x, y), enhanced_source)
            
            # Save the foreground
            foreground.save(output_path, 'PNG')
            print(f"Created icon-foreground.png: {output_path}")
            
    except Exception as e:
        print(f"Error creating icon-foreground.png: {e}")

def create_icon_background(output_path, size=1024):
    """Create icon-background.png (1024x1024) - solid teal background"""
    try:
        # Create a solid teal background
        background_color = (38, 166, 154, 255)  # #26A69A
        background = Image.new('RGBA', (size, size), background_color)
        background.save(output_path, 'PNG')
        print(f"Created icon-background.png: {output_path}")
        
    except Exception as e:
        print(f"Error creating icon-background.png: {e}")

def create_splash_screen(output_path, size=2732):
    """Create splash.png (2732x2732) - splash screen with logo"""
    try:
        # Create background (teal color)
        background_color = (38, 166, 154, 255)  # #26A69A
        splash = Image.new('RGBA', (size, size), background_color)
        
        # Add a large version of the logo in the center
        source_path = "app/static/bo-app-logo.png"
        if os.path.exists(source_path):
            with Image.open(source_path) as source:
                # Convert to RGBA if not already
                if source.mode != 'RGBA':
                    source = source.convert('RGBA')
                
                # Calculate scaling for splash screen (logo should be prominent)
                source_width, source_height = source.size
                scale = min(size * 0.4 / source_width, size * 0.4 / source_height)
                new_width = int(source_width * scale)
                new_height = int(source_height * scale)
                
                # Resize the source image
                resized_source = source.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Calculate position to center the logo
                x = (size - new_width) // 2
                y = (size - new_height) // 2
                
                # Process the logo to make it highly visible
                enhanced_data = []
                for pixel in resized_source.getdata():
                    r, g, b, a = pixel
                    if a > 10:  # If pixel is not transparent
                        # Make dark colors much lighter for visibility
                        if r < 100 and g < 100 and b < 100:
                            # Very dark pixels - make them white
                            r = g = b = 255
                        elif r < 150 and g < 150 and b < 150:
                            # Dark pixels - make them light gray
                            r = g = b = 220
                        elif r < 200 and g < 200 and b < 200:
                            # Medium pixels - lighten them
                            r = min(255, r + 100)
                            g = min(255, g + 100)
                            b = min(255, b + 100)
                        # Keep bright colors as they are
                    enhanced_data.append((r, g, b, a))
                
                # Create enhanced image
                enhanced_source = Image.new('RGBA', resized_source.size)
                enhanced_source.putdata(enhanced_data)
                
                # Paste the enhanced logo onto the splash screen
                splash.paste(enhanced_source, (x, y), enhanced_source)
        
        # Add app name text
        draw = ImageDraw.Draw(splash)
        try:
            # Try to use a system font
            font_size = size // 20
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Add "BookOracle" text below the logo
        text = "BookOracle"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = int(size * 0.7)  # Position below the logo
        
        # Draw white text
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
        
        # Save the splash screen
        splash.save(output_path, 'PNG')
        print(f"Created splash.png: {output_path}")
        
    except Exception as e:
        print(f"Error creating splash.png: {e}")

def create_splash_dark(output_path, size=2732):
    """Create splash-dark.png (2732x2732) - dark mode splash screen"""
    try:
        # Create dark background
        background_color = (33, 33, 33, 255)  # Dark gray
        splash = Image.new('RGBA', (size, size), background_color)
        
        # Add a large version of the logo in the center
        source_path = "app/static/bo-app-logo.png"
        if os.path.exists(source_path):
            with Image.open(source_path) as source:
                # Convert to RGBA if not already
                if source.mode != 'RGBA':
                    source = source.convert('RGBA')
                
                # Calculate scaling for splash screen
                source_width, source_height = source.size
                scale = min(size * 0.4 / source_width, size * 0.4 / source_height)
                new_width = int(source_width * scale)
                new_height = int(source_height * scale)
                
                # Resize the source image
                resized_source = source.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Calculate position to center the logo
                x = (size - new_width) // 2
                y = (size - new_height) // 2
                
                # Process the logo to make it highly visible on dark background
                enhanced_data = []
                for pixel in resized_source.getdata():
                    r, g, b, a = pixel
                    if a > 10:  # If pixel is not transparent
                        # Make dark colors much lighter for visibility on dark background
                        if r < 100 and g < 100 and b < 100:
                            # Very dark pixels - make them white
                            r = g = b = 255
                        elif r < 150 and g < 150 and b < 150:
                            # Dark pixels - make them light gray
                            r = g = b = 220
                        elif r < 200 and g < 200 and b < 200:
                            # Medium pixels - lighten them
                            r = min(255, r + 100)
                            g = min(255, g + 100)
                            b = min(255, b + 100)
                        # Keep bright colors as they are
                    enhanced_data.append((r, g, b, a))
                
                # Create enhanced image
                enhanced_source = Image.new('RGBA', resized_source.size)
                enhanced_source.putdata(enhanced_data)
                
                # Paste the enhanced logo onto the splash screen
                splash.paste(enhanced_source, (x, y), enhanced_source)
        
        # Add app name text
        draw = ImageDraw.Draw(splash)
        try:
            # Try to use a system font
            font_size = size // 20
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Add "BookOracle" text below the logo
        text = "BookOracle"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = int(size * 0.7)  # Position below the logo
        
        # Draw white text
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
        
        # Save the splash screen
        splash.save(output_path, 'PNG')
        print(f"Created splash-dark.png: {output_path}")
        
    except Exception as e:
        print(f"Error creating splash-dark.png: {e}")

def main():
    """Main function to create all required assets"""
    source_logo = "app/static/bo-app-logo.png"
    
    if not os.path.exists(source_logo):
        print(f"Source logo not found: {source_logo}")
        sys.exit(1)
    
    # Create assets directory if it doesn't exist
    assets_dir = "assets"
    os.makedirs(assets_dir, exist_ok=True)
    
    print("Creating Capacitor assets...")
    print("This will create the source images needed for @capacitor/assets tool")
    
    # Create all required assets
    create_icon_only(source_logo, os.path.join(assets_dir, "icon-only.png"))
    create_icon_foreground(source_logo, os.path.join(assets_dir, "icon-foreground.png"))
    create_icon_background(os.path.join(assets_dir, "icon-background.png"))
    create_splash_screen(os.path.join(assets_dir, "splash.png"))
    create_splash_dark(os.path.join(assets_dir, "splash-dark.png"))
    
    print("\nCapacitor assets created successfully!")
    print("Now you can run: npx capacitor-assets generate")
    print("This will generate all the required icon and splash screen assets for your native projects.")

if __name__ == "__main__":
    main() 