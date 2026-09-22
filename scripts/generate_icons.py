import os
from PIL import Image, ImageDraw

os.makedirs('public/icons', exist_ok=True)

def generate_crisp_icons():
    # Supersampling factor 4
    SS = 4
    for size, name, maskable in [
        (192, 'icon-192.png', False),
        (512, 'icon-512.png', False),
        (512, 'icon-maskable.png', True),
    ]:
        big_size = size * SS
        img = Image.new('RGBA', (big_size, big_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        bg_color = (206, 107, 76, 255)
        cream_color = (250, 245, 238, 255)
        
        if maskable:
            draw.rectangle([0, 0, big_size, big_size], fill=bg_color)
            r_scale = 0.65
        else:
            radius = int(big_size * 0.22)
            margin = int(big_size * 0.04)
            draw.rounded_rectangle([margin, margin, big_size - margin, big_size - margin], radius=radius, fill=bg_color)
            r_scale = 0.78

        # Draw inner cream nesting heart/drop shape
        cx = big_size / 2.0
        cy = big_size / 2.0
        
        s = (big_size * r_scale) / 100.0
        ox = cx - 50.0 * s
        oy = cy - 50.0 * s
        
        def bezier(p0, p1, p2, p3, steps=30):
            pts = []
            for i in range(steps + 1):
                t = i / float(steps)
                x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
                y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
                pts.append((ox + x * s, oy + y * s))
            return pts
            
        curve1 = bezier((50, 24), (38, 24), (30, 34), (30, 46))
        curve2 = bezier((30, 46), (30, 62), (48, 76), (50, 78))
        curve3 = bezier((50, 78), (52, 76), (70, 62), (70, 46))
        curve4 = bezier((70, 46), (70, 34), (62, 24), (50, 24))
        
        all_pts = curve1 + curve2[1:] + curve3[1:] + curve4[1:]
        draw.polygon(all_pts, fill=cream_color)
        
        # Inner terracotta circle at (50, 46) radius 9
        icx = ox + 50 * s
        icy = oy + 46 * s
        ir = 9 * s
        draw.ellipse([icx - ir, icy - ir, icx + ir, icy + ir], fill=bg_color)
        
        # Downsample with Lanczos
        res = img.resize((size, size), Image.Resampling.LANCZOS)
        res.save(os.path.join('public/icons', name))
        print(f"Generated public/icons/{name} ({size}x{size})")

    # Android monochrome status bar badge (72x72, white with alpha)
    badge_size = 72 * SS
    bimg = Image.new('RGBA', (badge_size, badge_size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bimg)
    white = (255, 255, 255, 255)
    
    s = (badge_size * 0.85) / 100.0
    ox = (badge_size - 100.0 * s) / 2.0
    oy = (badge_size - 100.0 * s) / 2.0
    
    def b_bezier(p0, p1, p2, p3, steps=30):
        pts = []
        for i in range(steps + 1):
            t = i / float(steps)
            x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
            y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
            pts.append((ox + x * s, oy + y * s))
        return pts
        
    c1 = b_bezier((50, 24), (38, 24), (30, 34), (30, 46))
    c2 = b_bezier((30, 46), (30, 62), (48, 76), (50, 78))
    c3 = b_bezier((50, 78), (52, 76), (70, 62), (70, 46))
    c4 = b_bezier((70, 46), (70, 34), (62, 24), (50, 24))
    bdraw.polygon(c1 + c2[1:] + c3[1:] + c4[1:], fill=white)
    
    icx = ox + 50 * s
    icy = oy + 46 * s
    ir = 9 * s
    bdraw.ellipse([icx - ir, icy - ir, icx + ir, icy + ir], fill=(0, 0, 0, 0))
    
    res_badge = bimg.resize((72, 72), Image.Resampling.LANCZOS)
    res_badge.save('public/icons/badge-72.png')
    print("Generated public/icons/badge-72.png (72x72)")

if __name__ == '__main__':
    generate_crisp_icons()
