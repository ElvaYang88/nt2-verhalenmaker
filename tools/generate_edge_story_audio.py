# -*- coding: utf-8 -*-
"""
Generate Dutch story audio for De finale Verhalenmaker using Microsoft Edge neural voices via edge-tts.
This script is intended to run on the user's Windows computer with internet access.
"""
import asyncio
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

try:
    import edge_tts
except Exception as exc:
    print("ERROR: edge-tts is not installed or could not be imported.")
    print("Install with: python -m pip install edge-tts")
    raise

VOICE = os.environ.get("NT2_TTS_VOICE", "nl-NL-ColetteNeural")
RATE = os.environ.get("NT2_TTS_RATE", "-4%")
PITCH = os.environ.get("NT2_TTS_PITCH", "+0Hz")
MAX_RETRIES = 3

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
AUDIO_ROOT = ROOT / "assets" / "audio"


def story_slug(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def js_string_decode(raw: str) -> str:
    # Decode a JavaScript double-quoted string body as JSON string.
    return json.loads('"' + raw + '"')


def extract_stories(html: str):
    stories = []

    # 1) Stories in the initial const stories = { ... } object.
    const_match = re.search(r"const\s+stories\s*=\s*\{(.*?)\n\s*\};\s*\n\s*function\s+inferScene", html, re.S)
    if const_match:
        const_body = const_match.group(1)
        # Split on top-level-ish story entries: "1-Title": { ... pages: [ ... ] ... }
        starts = list(re.finditer(r'\n\s*"([^"]+)"\s*:\s*\{', const_body))
        for i, start in enumerate(starts):
            key = start.group(1)
            end = starts[i + 1].start() if i + 1 < len(starts) else len(const_body)
            block = const_body[start.start():end]
            texts = [js_string_decode(m.group(1)) for m in re.finditer(r'text\s*:\s*"((?:\\.|[^"\\])*)"', block)]
            if texts:
                stories.append((key, texts))

    # 2) Stories later added with stories["..."] = makeStory(...)
    for match in re.finditer(r'stories\["([^"]+)"\]\s*=\s*makeStory\((.*?)\n\s*\);', html, re.S):
        key = match.group(1)
        body = match.group(2)
        texts = [js_string_decode(m.group(1)) for m in re.finditer(r'text\s*:\s*"((?:\\.|[^"\\])*)"', body)]
        if texts:
            # Avoid duplicates if a key has already been found.
            if not any(existing_key == key for existing_key, _ in stories):
                stories.append((key, texts))

    return stories


def prepare_text_for_audio(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    # Small oral-friendly replacements. Keep the written story unchanged.
    text = text.replace("Mila", "Mila")
    return text


async def generate_one(text: str, out_file: Path):
    out_file.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = out_file.with_suffix(".tmp.mp3")
    if tmp_file.exists():
        tmp_file.unlink()
    communicate = edge_tts.Communicate(
        text=prepare_text_for_audio(text),
        voice=VOICE,
        rate=RATE,
        pitch=PITCH,
    )
    await communicate.save(str(tmp_file))
    if not tmp_file.exists() or tmp_file.stat().st_size < 1500:
        raise RuntimeError(f"Audio file too small or missing: {tmp_file}")
    tmp_file.replace(out_file)


async def main():
    if not INDEX.exists():
        raise SystemExit(f"index.html not found at {INDEX}")

    html = INDEX.read_text(encoding="utf-8")
    stories = extract_stories(html)
    total_pages = sum(len(pages) for _, pages in stories)
    if total_pages < 80:
        raise SystemExit(f"Only found {total_pages} story pages. Something is wrong with story extraction.")

    print(f"Voice: {VOICE}")
    print(f"Rate: {RATE}; Pitch: {PITCH}")
    print(f"Stories found: {len(stories)}")
    print(f"Story pages to generate: {total_pages}")
    print("This can take 10-30 minutes depending on internet speed. Please keep this window open.")

    generated = 0
    failed = []
    start_time = time.time()

    for story_index, (key, pages) in enumerate(stories, start=1):
        slug = story_slug(key)
        for page_index, text in enumerate(pages, start=1):
            out_file = AUDIO_ROOT / slug / f"page-{page_index:02d}.mp3"
            label = f"[{generated + 1}/{total_pages}] {key} page {page_index}"
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    print(label + f" - generating (attempt {attempt})")
                    await generate_one(text, out_file)
                    generated += 1
                    break
                except Exception as exc:
                    print(f"  failed: {exc}")
                    if attempt == MAX_RETRIES:
                        failed.append((key, page_index, str(exc)))
                    else:
                        await asyncio.sleep(2 + attempt)

    elapsed = int(time.time() - start_time)
    print(f"Generated {generated}/{total_pages} audio files in {elapsed} seconds.")
    if failed:
        print("FAILED ITEMS:")
        for key, page, err in failed:
            print(f"- {key} page {page}: {err}")
        raise SystemExit("Some audio files failed. Please run the script again; it will overwrite/generate again.")

    marker = ROOT / "AUDIO_VOICE_INFO.txt"
    marker.write_text(
        f"Generated with edge-tts\nVoice: {VOICE}\nRate: {RATE}\nPitch: {PITCH}\nStory pages: {total_pages}\n",
        encoding="utf-8",
    )
    print("All audio generated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
