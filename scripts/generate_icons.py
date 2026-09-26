#!/usr/bin/env python3
import os
import subprocess

WORKSPACE = "/home/beyensj/Documents/Personal/Privé/Projects/narababy"
PUBLIC_ICONS = os.path.join(WORKSPACE, "public/icons")
RES_DIR = os.path.join(WORKSPACE, "android/app/src/main/res")

os.makedirs(PUBLIC_ICONS, exist_ok=True)

# 1. Base Full SVG (Squircle background + white baby face)
SVG_FULL = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="terracottaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D67050" />
      <stop offset="100%" stop-color="#C25A38" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#terracottaGrad)" />
  <g fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <path d="
      M 246 140
      C 225 152 215 180 236 198
      C 255 214 278 196 270 172
      C 264 152 254 142 272 142
      C 334 142 376 190 376 262
      C 394 262 404 274 404 288
      C 404 302 392 314 372 314
      C 362 366 316 404 256 404
      C 196 404 150 366 140 314
      C 120 314 108 302 108 288
      C 108 274 118 262 136 262
      C 136 190 182 140 246 140 Z
    " stroke-width="17" />
    <path d="M 186 280 Q 212 302 238 280" stroke-width="17" />
    <path d="M 274 280 Q 300 302 326 280" stroke-width="17" />
    <path d="M 224 338 Q 256 362 288 338" stroke-width="16" />
  </g>
</svg>'''

# 2. Maskable PWA SVG (Squircle/full background with 20% safe zone margin for dynamic cropping)
SVG_MASKABLE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="terracottaGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D67050" />
      <stop offset="100%" stop-color="#C25A38" />
    </linearGradient>
  </defs>
  <!-- Full bleed background for maskable icon -->
  <rect width="512" height="512" fill="url(#terracottaGradMask)" />
  <!-- Scaled baby face inside 75% safe area -->
  <g transform="translate(64, 64) scale(0.75)" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <path d="
      M 246 140
      C 225 152 215 180 236 198
      C 255 214 278 196 270 172
      C 264 152 254 142 272 142
      C 334 142 376 190 376 262
      C 394 262 404 274 404 288
      C 404 302 392 314 372 314
      C 362 366 316 404 256 404
      C 196 404 150 366 140 314
      C 120 314 108 302 108 288
      C 108 274 118 262 136 262
      C 136 190 182 140 246 140 Z
    " stroke-width="17" />
    <path d="M 186 280 Q 212 302 238 280" stroke-width="17" />
    <path d="M 274 280 Q 300 302 326 280" stroke-width="17" />
    <path d="M 224 338 Q 256 362 288 338" stroke-width="16" />
  </g>
</svg>'''

# 3. Round Icon SVG (Circular background for circular launchers)
SVG_ROUND = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="terracottaGradRound" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D67050" />
      <stop offset="100%" stop-color="#C25A38" />
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="256" fill="url(#terracottaGradRound)" />
  <g transform="translate(38, 38) scale(0.85)" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <path d="
      M 246 140
      C 225 152 215 180 236 198
      C 255 214 278 196 270 172
      C 264 152 254 142 272 142
      C 334 142 376 190 376 262
      C 394 262 404 274 404 288
      C 404 302 392 314 372 314
      C 362 366 316 404 256 404
      C 196 404 150 366 140 314
      C 120 314 108 302 108 288
      C 108 274 118 262 136 262
      C 136 190 182 140 246 140 Z
    " stroke-width="17" />
    <path d="M 186 280 Q 212 302 238 280" stroke-width="17" />
    <path d="M 274 280 Q 300 302 326 280" stroke-width="17" />
    <path d="M 224 338 Q 256 362 288 338" stroke-width="16" />
  </g>
</svg>'''

# 4. Adaptive Foreground SVG (Transparent background, centered inside Android 108dp / safe 72dp)
SVG_FOREGROUND = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(85, 85) scale(0.66)" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <path d="
      M 246 140
      C 225 152 215 180 236 198
      C 255 214 278 196 270 172
      C 264 152 254 142 272 142
      C 334 142 376 190 376 262
      C 394 262 404 274 404 288
      C 404 302 392 314 372 314
      C 362 366 316 404 256 404
      C 196 404 150 366 140 314
      C 120 314 108 302 108 288
      C 108 274 118 262 136 262
      C 136 190 182 140 246 140 Z
    " stroke-width="20" />
    <path d="M 186 280 Q 212 302 238 280" stroke-width="20" />
    <path d="M 274 280 Q 300 302 326 280" stroke-width="20" />
    <path d="M 224 338 Q 256 362 288 338" stroke-width="19" />
  </g>
</svg>'''

# 5. Monochrome Badge SVG (White silhouette for Android status bar)
SVG_BADGE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(51, 51) scale(0.8)" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round">
    <path d="
      M 246 140
      C 225 152 215 180 236 198
      C 255 214 278 196 270 172
      C 264 152 254 142 272 142
      C 334 142 376 190 376 262
      C 394 262 404 274 404 288
      C 404 302 392 314 372 314
      C 362 366 316 404 256 404
      C 196 404 150 366 140 314
      C 120 314 108 302 108 288
      C 108 274 118 262 136 262
      C 136 190 182 140 246 140 Z
    " stroke-width="22" />
    <path d="M 186 280 Q 212 302 238 280" stroke-width="22" />
    <path d="M 274 280 Q 300 302 326 280" stroke-width="22" />
    <path d="M 224 338 Q 256 362 288 338" stroke-width="20" />
  </g>
</svg>'''

def save_and_render(svg_str, output_path, width, height):
    temp_svg = output_path + ".tmp.svg"
    with open(temp_svg, "w") as f:
        f.write(svg_str)
    subprocess.run(["magick", "-size", f"{width}x{height}", temp_svg, "-resize", f"{width}x{height}", output_path], check=True)
    os.remove(temp_svg)
    print(f"Generated {output_path} ({width}x{height})")

def main():
    print("--- 1. Generating Web / PWA Assets ---")
    # Save favicon.svg
    favicon_path = os.path.join(WORKSPACE, "public/favicon.svg")
    with open(favicon_path, "w") as f:
        f.write(SVG_FULL)
    print(f"Updated {favicon_path}")

    # PWA icons
    save_and_render(SVG_FULL, os.path.join(PUBLIC_ICONS, "icon-512.png"), 512, 512)
    save_and_render(SVG_FULL, os.path.join(PUBLIC_ICONS, "icon-192.png"), 192, 192)
    save_and_render(SVG_MASKABLE, os.path.join(PUBLIC_ICONS, "icon-maskable.png"), 512, 512)
    save_and_render(SVG_BADGE, os.path.join(PUBLIC_ICONS, "badge-72.png"), 72, 72)

    print("\n--- 2. Generating Android Launcher Assets ---")
    # Set background color
    bg_xml = os.path.join(RES_DIR, "values/ic_launcher_background.xml")
    with open(bg_xml, "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#CE6B4C</color>
</resources>
''')
    print(f"Updated {bg_xml} with #CE6B4C")

    # Android density tiers
    densities = [
        ("mipmap-mdpi", 48, 108),
        ("mipmap-hdpi", 72, 162),
        ("mipmap-xhdpi", 96, 216),
        ("mipmap-xxhdpi", 144, 324),
        ("mipmap-xxxhdpi", 192, 432),
    ]

    for folder, size, fg_size in densities:
        target_dir = os.path.join(RES_DIR, folder)
        os.makedirs(target_dir, exist_ok=True)

        # Legacy squircle icon
        save_and_render(SVG_FULL, os.path.join(target_dir, "ic_launcher.png"), size, size)
        # Round circular icon
        save_and_render(SVG_ROUND, os.path.join(target_dir, "ic_launcher_round.png"), size, size)
        # Adaptive foreground icon
        save_and_render(SVG_FOREGROUND, os.path.join(target_dir, "ic_launcher_foreground.png"), fg_size, fg_size)

    print("\n✅ All Web and Android app icons successfully generated!")

if __name__ == "__main__":
    main()
