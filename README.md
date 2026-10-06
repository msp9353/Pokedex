# Pokédex Scanner

A mobile-first GitHub Pages Pokédex with text search and camera OCR.

## Features
- Search by Pokémon name or National Pokédex number.
- Camera/photo OCR using Tesseract.js in the browser.
- Fuzzy matching for imperfect OCR.
- Pokémon-style detail page rendered directly in the app.
- Official artwork, types, Pokédex description, profile data, abilities, base stats, weaknesses, evolution chain, and previous/next navigation.
- Button to open the corresponding official Pokémon.com page.
- Recent searches saved locally.
- No backend required.

## Deploy
Upload the files to a GitHub repository and enable GitHub Pages for the branch/folder containing `index.html`.

The app uses the public PokéAPI service for Pokémon data and sprites and Tesseract.js from jsDelivr for OCR.
