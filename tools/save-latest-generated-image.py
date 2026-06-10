from pathlib import Path
import sys
from PIL import Image, ImageOps


def latest_generated_image() -> Path:
    root = Path.home() / ".codex" / "generated_images"
    candidates = []
    for pattern in ("*.png", "*.jpg", "*.jpeg", "*.webp"):
        candidates.extend(root.rglob(pattern))
    if not candidates:
        raise SystemExit(f"No generated images found under {root}")
    return max(candidates, key=lambda item: item.stat().st_mtime)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: save-latest-generated-image.py <output-jpg>")

    source = latest_generated_image()
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img = ImageOps.fit(img, (1280, 720), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        img.save(output, "JPEG", quality=88, optimize=True, progressive=True)

    print(f"saved {output.resolve()}")
    print(f"source {source.resolve()}")
    print(f"bytes {output.stat().st_size}")


if __name__ == "__main__":
    main()
