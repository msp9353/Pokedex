# Pokédex Scanner

A mobile-first GitHub Pages web app that lets you:

- Search for a Pokémon by name or National Pokédex number.
- Tap the camera button and photograph a Pokémon name.
- Run OCR directly in the browser with Tesseract.js.
- Fuzzy-match imperfect OCR results to a Pokémon.
- Open the matching Pokémon's official page on Pokémon.com.
- Keep a small list of recent searches.
- Add the site to your phone's home screen as a PWA.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `pokemon-pokedex`.
2. Upload all files in this folder to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. Save.
6. After GitHub finishes deploying, open the Pages URL on your phone.

## Phone setup

On iPhone or Android, open the GitHub Pages URL in your browser and use the browser's **Add to Home Screen** option.

The site includes a web app manifest and a service worker for the app shell. OCR itself still needs the Tesseract.js library and therefore may need an internet connection the first time it is used.

## How it works

### Search

The app loads the Pokémon name list from PokeAPI and uses it only to identify the Pokémon. Once a match is found, the app attempts to load the official Pokémon.com page inside an iframe:

`https://www.pokemon.com/us/pokedex/<pokemon-name>`

### Important embedding limitation

Pokémon.com currently sends `X-Frame-Options: SAMEORIGIN`, which means browsers can prevent a GitHub Pages site from embedding the page. The app therefore attempts the iframe first and provides a fallback button to open the official page directly if the browser blocks it. This restriction is imposed by Pokémon.com and cannot be bypassed by JavaScript in a normal GitHub Pages site.

### Camera OCR

The camera button uses a mobile `<input type="file" accept="image/*" capture="environment">`.

That means:
- On a phone, it can offer the rear camera.
- On desktop, it can choose an image file.
- No camera stream or backend server is required.

Tesseract.js performs OCR in the browser. The result is then compared against Pokémon names with exact matching and Levenshtein-distance fuzzy matching.

## Files

- `index.html` — UI and layout
- `app.js` — search, OCR, matching, recent searches
- `manifest.json` — installable web-app metadata
- `sw.js` — basic app-shell caching
- `icon.svg` — Poké Ball app icon

## Notes

This is an unofficial fan project. Pokémon and Pokémon character names are trademarks of their respective owners.

The app links to Pokémon.com rather than copying Pokémon.com's page content.

## Future ideas

Possible additions:

- Scan directly from a live camera view.
- Scan Pokémon cards and crop to the name area automatically.
- Show a confirmation screen when OCR has multiple plausible matches.
- Add a "Back" button to return to the scanner.
- Add favorites / team slots.
- Add a quick Pokémon type chart.
- Cache the full Pokémon name list locally.
- Add home-screen icons for iOS/Android.
