from pathlib import Path
from PIL import Image, ImageOps


ROOT = Path("assets/storybook")
MAX_WIDTH = 1280
QUALITY = 86


def optimize_image(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        if img.width > MAX_WIDTH:
            height = round(img.height * (MAX_WIDTH / img.width))
            img = img.resize((MAX_WIDTH, height), Image.Resampling.LANCZOS)
        temp = path.with_suffix(".tmp.jpg")
        img.save(temp, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    temp.replace(path)
    return before, path.stat().st_size


def main() -> None:
    total_before = 0
    total_after = 0
    count = 0
    for image_path in sorted(ROOT.rglob("page-*.jpg")):
        before, after = optimize_image(image_path)
        total_before += before
        total_after += after
        count += 1
    saved = total_before - total_after
    print(f"optimized {count} images")
    print(f"before {total_before} bytes")
    print(f"after  {total_after} bytes")
    print(f"saved  {saved} bytes")


if __name__ == "__main__":
    main()
