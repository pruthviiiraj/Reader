# Readalong

Reads articles, PDFs, Word documents and Obsidian notes aloud in a natural voice (Kokoro) while highlighting each word.
Installs on a Mac (Dock) and iPhone (home screen). The voice runs on the device itself, so no server or laptop is needed and saved documents work offline.

## Files

This repository is the whole app: plain static files, no build step.

- `index.html`, `app.css`, `app.js`: the library, the reader and playback
- `tts-worker.js`: the Kokoro voice, running in the background on the GPU (WebGPU) or the CPU (WebAssembly)
- `sw.js`, `manifest.webmanifest`, `icons/`: installing and offline use

## Run it locally

```
python3 -m http.server 8766 --directory .
```

Then open http://localhost:8766.

## Install

- **iPhone:** open the hosted link in Safari, tap Share, then Add to Home Screen.
- **Mac:** open it in Safari and choose File › Add to Dock (or use Chrome's install button).

The first launch downloads the voice once: 163 MB on iPhone, 310 MB on Mac.

## Notes

- Links are fetched directly when a site allows it, otherwise through the free r.jina.ai reader. Pages behind a login can't be fetched; copy the text and paste it instead.
- References, "See also", "Notes", figure captions, links, email addresses and ads are left out automatically. Greyed-out parts can be switched back on.
