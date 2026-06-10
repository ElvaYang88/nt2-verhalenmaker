import asyncio
import json
import os
import unicodedata
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
PROMPTS = ROOT / "assets" / "storybook" / "prompts.json"
OUT_ROOT = ROOT / "assets" / "word-audio"
VOICE = "nl-NL-FennaNeural"
RATE = "-16%"
FORCE = os.environ.get("FORCE_WORD_AUDIO") == "1"


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    out = []
    last_dash = False
    for char in text.lower():
        if char.isalnum():
            out.append(char)
            last_dash = False
        elif not last_dash:
            out.append("-")
            last_dash = True
    return "".join(out).strip("-")


async def synthesize(word: str, out_file: Path) -> int:
    out_file.parent.mkdir(parents=True, exist_ok=True)
    text = f"{word.strip()}"
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(str(out_file))
    return out_file.stat().st_size


async def main() -> None:
    pages = json.loads(PROMPTS.read_text(encoding="utf-8"))
    words = sorted({word.strip() for page in pages for word in page.get("targets", []) if word.strip()}, key=str.lower)
    total = len(words)
    for idx, word in enumerate(words, start=1):
        out_file = OUT_ROOT / f"{slugify(word)}.mp3"
        if not FORCE and out_file.exists() and out_file.stat().st_size > 1000:
            print(f"{idx:02d}/{total} exists {out_file.relative_to(ROOT)}")
            continue
        size = await synthesize(word, out_file)
        print(f"{idx:02d}/{total} wrote  {out_file.relative_to(ROOT)} {size // 1024} KB")
        await asyncio.sleep(0.12)


if __name__ == "__main__":
    asyncio.run(main())
