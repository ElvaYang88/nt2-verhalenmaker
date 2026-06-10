# Natural Audio Options Without an API Key

The app currently supports browser speech synthesis through Web Speech API:

- Works without a Gemini/OpenAI API key.
- Quality depends on the browser and installed system voices.
- Microsoft Edge and Chrome usually provide the best Dutch voices on Windows.
- The app now makes browser speech the primary reading button: `Lees voor (browserstem)`.

For more natural classroom audio without exposing an API key:

1. Pre-generate Dutch audio files once and store them locally under `assets/audio/<story-slug>/page-XX.mp3`.
2. Update the app to play local audio first, then fall back to browser speech.
3. Optional: install Dutch neural voices in Windows/Edge if available, then the browser voice will sound more natural without app-level API keys.

For truly consistent natural TTS across all student devices, a local audio pack is the most stable option.
