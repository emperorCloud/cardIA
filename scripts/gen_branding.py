# scripts/gen_branding.py
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/claude/jessy-cardia/app"
os.makedirs(OUT, exist_ok=True)

BLUE = (8, 95, 255)
VIOLET = (104, 92, 246)
CYAN = (6, 214, 160)
DARK = (8, 16, 32)
WHITE = (255, 255, 255)


def find_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def diagonal_gradient(size, c1, c2):
    w, h = size
    base = Image.new("RGB", (w, h), c1)
    top = Image.new("RGB", (w, h), c2)
    mask = Image.new("L", (w, h))
    mdata = []
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            mdata.append(int(255 * t))
    mask.putdata(mdata)
    base.paste(top, (0, 0), mask)
    return base


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return mask


def make_icon(size):
    img = diagonal_gradient((size, size), BLUE, VIOLET).convert("RGBA")
    mask = rounded_mask((size, size), int(size * 0.22))
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, (0, 0), mask)

    draw = ImageDraw.Draw(canvas)
    font = find_font(int(size * 0.46))
    text = "IA"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] - size * 0.02),
        text,
        font=font,
        fill=WHITE,
    )
    # cyan accent dot, top-right, evokes the AI/circuit mark from the brand board
    r = size * 0.055
    cx, cy = size * 0.78, size * 0.24
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CYAN)
    return canvas


# --- App icons (Next.js app-router auto convention) ---
make_icon(512).save(f"{OUT}/icon.png")
make_icon(180).save(f"{OUT}/apple-icon.png")

# --- favicon.ico (multi-resolution) ---
sizes = [16, 32, 48, 64]
imgs = [make_icon(s) for s in sizes]
imgs[-1].save(
    f"{OUT}/favicon.ico",
    format="ICO",
    sizes=[(s, s) for s in sizes],
)

# --- Open Graph share image (1200x630) ---
og = diagonal_gradient((1200, 630), DARK, (13, 23, 48)).convert("RGBA")
draw = ImageDraw.Draw(og)

# Badge (rounded gradient square) with "IA"
badge_size = 140
badge = make_icon(badge_size)
badge_pos = (110, 245)
og.paste(badge, badge_pos, badge)

title_font = find_font(74)
sub_font = find_font(30)
foot_font = find_font(24)

draw.text((280, 255), "Card", font=title_font, fill=WHITE)
bbox = draw.textbbox((280, 255), "Card", font=title_font)
draw.text((bbox[2], 255), "IA", font=title_font, fill=VIOLET)

draw.text((284, 345), "L'IA africaine au service de vos idées.", font=sub_font, fill=(220, 224, 240))
draw.text((284, 390), "Un assistant intelligent, pensé et conçu en Afrique.", font=sub_font, fill=(150, 158, 190))

draw.text((284, 470), "Propulsé par CARDIT", font=foot_font, fill=CYAN)

og.convert("RGB").save(f"{OUT}/opengraph-image.png", quality=95)
og.convert("RGB").save(f"{OUT}/twitter-image.png", quality=95)

print("Assets generated:", os.listdir(OUT))
