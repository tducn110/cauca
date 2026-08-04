import sys
from PIL import Image

def analyze(img_path):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()
    min_x, min_y = width, height
    max_x, max_y = 0, 0
    top_pixels = []
    bottom_pixels = []
    for y in range(height):
        for x in range(width):
            r,g,b,a = pixels[x,y]
            if a > 50:
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y
    top_bound = min_y + (max_y - min_y) * 0.15
    bottom_bound = max_y - (max_y - min_y) * 0.15
    for y in range(height):
        for x in range(width):
            r,g,b,a = pixels[x,y]
            if a > 50:
                if y <= top_bound:
                    top_pixels.append(x)
                if y >= bottom_bound:
                    bottom_pixels.append(x)
    eyelet_x = sum(top_pixels) / len(top_pixels) if top_pixels else (min_x + max_x) / 2
    bend_x = sum(bottom_pixels) / len(bottom_pixels) if bottom_pixels else (min_x + max_x) / 2
    print(f"[{img_path}]")
    print(f"BBox: X({min_x}, {max_x}) Y({min_y}, {max_y})")
    print(f"Eyelet approx: X={eyelet_x:.1f}, Y={min_y}")
    print(f"Bend approx: X={bend_x:.1f}, Y={max_y}")

if len(sys.argv) > 1:
    analyze(sys.argv[1])
else:
    analyze('public/hooks/hookplusgold.png')
