import asyncio
import json
import os
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
PROMPTS = ROOT / "assets" / "storybook" / "prompts.json"
OUT_ROOT = ROOT / "assets" / "audio"
VOICE = "nl-NL-FennaNeural"
RATE = "-10%"
FORCE = os.environ.get("FORCE_AUDIO") == "1"


async def synthesize(text: str, out_file: Path) -> int:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(out_file))
    return out_file.stat().st_size


async def main() -> None:
    pages = json.loads(PROMPTS.read_text(encoding="utf-8"))
    front_four = [p for p in pages if str(p.get("storyKey", ""))[0] in "1234"]
    total = len(front_four)
    for idx, page in enumerate(front_four, start=1):
        story_slug = page["storySlug"]
        page_no = int(page["page"])
        out_file = OUT_ROOT / story_slug / f"page-{page_no:02d}.mp3"
        if not FORCE and out_file.exists() and out_file.stat().st_size > 1000:
            size = out_file.stat().st_size
            print(f"{idx:02d}/{total} exists {out_file.relative_to(ROOT)} {size // 1024} KB")
            continue
        text = page["text"]
        size = await synthesize(text, out_file)
        print(f"{idx:02d}/{total} wrote  {out_file.relative_to(ROOT)} {size // 1024} KB")
        await asyncio.sleep(0.25)


if __name__ == "__main__":
    asyncio.run(main())
