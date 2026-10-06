(() => {
  "use strict";

  const POKEDEX_BASE = "https://www.pokemon.com/us/pokedex/";
  const POKEAPI_LIST = "https://pokeapi.co/api/v2/pokemon?limit=2000";

  const $ = (id) => document.getElementById(id);
  const search = $("search");
  const form = $("searchForm");
  const status = $("status");
  const result = $("result");
  const pokemonName = $("pokemonName");
  const pokemonMeta = $("pokemonMeta");
  const openButton = $("openButton");
  const pokemonScreenshot = $("pokemonScreenshot");
  const screenshotLoading = $("screenshotLoading");
  const embedFallback = $("embedFallback");
  const debugScreenshotLink = $("debugScreenshotLink");
  const cameraButton = $("cameraButton");
  const scanModal = $("scanModal");
  const closeModal = $("closeModal");
  const imageInput = $("imageInput");
  const chooseImage = $("chooseImage");
  const scanPreview = $("scanPreview");
  const scanBox = $("scanBox");
  const progress = $("progress");
  const progressBar = $("progressBar");
  const runAgain = $("runAgain");
  const recentSection = $("recentSection");
  const recentList = $("recentList");

  let pokemonList = [];
  let selectedPokemon = null;
  let worker = null;
  let loadingList = null;

  const aliases = new Map([
    ["mr mime", "mr-mime"],
    ["mrmime", "mr-mime"],
    ["mime jr", "mime-jr"],
    ["mimejr", "mime-jr"],
    ["farfetchd", "farfetchd"],
    ["farfetch'd", "farfetchd"],
    ["sirfetchd", "sirfetchd"],
    ["sirfetch'd", "sirfetchd"],
    ["type null", "type-null"],
    ["typenull", "type-null"],
    ["jangmo o", "jangmo-o"],
    ["jangmoo", "jangmo-o"],
    ["hakamo o", "hakamo-o"],
    ["hakamo-o", "hakamo-o"],
    ["kommo o", "kommo-o"],
    ["kommoo", "kommo-o"],
    ["great tusk", "great-tusk"],
    ["scream tail", "scream-tail"],
    ["brute bonnet", "brute-bonnet"],
    ["flutter mane", "flutter-mane"],
    ["slither wing", "slither-wing"],
    ["sandy shocks", "sandy-shocks"],
    ["iron treads", "iron-treads"],
    ["iron bundle", "iron-bundle"],
    ["iron hands", "iron-hands"],
    ["iron jugulis", "iron-jugulis"],
    ["iron moth", "iron-moth"],
    ["iron thorns", "iron-thorns"],
    ["roaring moon", "roaring-moon"],
    ["walking wake", "walking-wake"],
    ["gouging fire", "gouging-fire"],
    ["raging bolt", "raging-bolt"],
    ["iron boulder", "iron-boulder"],
    ["iron crown", "iron-crown"],
    ["mr rime", "mr-rime"],
    ["nidoran female", "nidoran-f"],
    ["nidoran male", "nidoran-m"],
    ["flabebe", "flabebe"]
  ]);

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/♀/g, " female ")
      .replace(/♂/g, " male ")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  function displayName(slug) {
    return slug
      .split("-")
      .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
      .join(" ");
  }

  function slugFromName(name) {
    const raw = String(name || "").trim().toLowerCase();
    const alias = aliases.get(raw) || aliases.get(normalize(raw));
    if (alias) return alias;
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    if (a.length > b.length) [a, b] = [b, a];

    let prev = Array.from({length: a.length + 1}, (_, i) => i);
    for (let j = 1; j <= b.length; j++) {
      const curr = [j];
      for (let i = 1; i <= a.length; i++) {
        curr[i] = Math.min(
          curr[i - 1] + 1,
          prev[i] + 1,
          prev[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = curr;
    }
    return prev[a.length];
  }

  async function loadPokemonList() {
    if (pokemonList.length) return pokemonList;
    if (loadingList) return loadingList;

    loadingList = fetch(POKEAPI_LIST)
      .then(r => {
        if (!r.ok) throw new Error("Could not load Pokémon list.");
        return r.json();
      })
      .then(data => {
        pokemonList = data.results.map((p, index) => ({
          name: p.name,
          id: index + 1,
          normalized: normalize(p.name)
        }));
        return pokemonList;
      })
      .catch(() => {
        // Fallback for the most common searches if the name list cannot be loaded.
        pokemonList = [
          "bulbasaur","ivysaur","venusaur","charmander","charmeleon","charizard",
          "squirtle","wartortle","blastoise","pikachu","raichu","eevee","vaporeon",
          "jolteon","flareon","espeon","umbreon","leafeon","glaceon","sylveon",
          "mewtwo","mew","gengar","lucario","greninja","snorlax","dragonite",
          "garchomp","scizor","metagross","rayquaza","gardevoir","gallade",
          "zoroark","ceruledge","miraidon","koraidon"
        ].map((name, i) => ({name, id: i + 1, normalized: normalize(name)}));
        return pokemonList;
      });

    return loadingList;
  }

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = "status" + (type ? ` ${type}` : "");
  }

  function pokemonUrl(slug) {
    return `${POKEDEX_BASE}${encodeURIComponent(slug)}`;
  }

  async function findPokemon(input) {
    const raw = String(input || "").trim();
    if (!raw) return null;

    const list = await loadPokemonList();
    const slug = slugFromName(raw);
    const normalized = normalize(raw);

    if (/^\d{1,4}$/.test(raw)) {
      const id = Number(raw);
      const byId = list.find(p => p.id === id);
      if (byId) return byId;
    }

    const exact = list.find(p =>
      p.name === slug ||
      p.normalized === normalized ||
      normalize(p.name) === normalize(slug)
    );
    if (exact) return exact;

    const tokens = normalized.split(/(?=[a-z])|[^a-z0-9]+/).filter(Boolean);
    const candidates = [];
    const textVariants = [normalized, ...raw.toLowerCase().split(/\s+/).map(normalize).filter(Boolean)];

    for (const variant of textVariants) {
      if (!variant) continue;
      for (const p of list) {
        const distance = levenshtein(variant, p.normalized);
        const maxLen = Math.max(variant.length, p.normalized.length);
        const ratio = 1 - distance / Math.max(1, maxLen);
        candidates.push({p, distance, ratio});
      }
    }

    candidates.sort((a, b) => b.ratio - a.ratio || a.distance - b.distance);
    const best = candidates[0];
    if (!best) return null;

    const threshold = best.p.normalized.length <= 5 ? 0.68 : 0.62;
    return best.ratio >= threshold ? best.p : null;
  }

  async function searchPokemon(input, source = "typed") {
    const value = String(input || "").trim();
    if (!value) {
      setStatus("Enter a Pokémon name or number.", "error");
      search.focus();
      return;
    }

    setStatus(source === "ocr" ? "Matching the scanned text…" : "Finding Pokémon…");
    result.classList.remove("show");

    try {
      const pokemon = await findPokemon(value);
      if (!pokemon) {
        setStatus(`I couldn't match “${value}” to a Pokémon.`, "error");
        return;
      }

      selectedPokemon = pokemon;
      search.value = displayName(pokemon.name);
      pokemonName.textContent = displayName(pokemon.name);
      pokemonMeta.textContent =
        `National Pokédex #${String(pokemon.id).padStart(4, "0")} • ${pokemon.name}`;

      // Pokémon.com blocks cross-origin iframes. Instead, render a live
      // screenshot of the official page through Thum.io, which can be
      // displayed as a normal image on GitHub Pages.
      embedFallback.hidden = true;
      screenshotLoading.hidden = false;
      pokemonScreenshot.style.visibility = "hidden";
      const screenshot = screenshotUrl(pokemon.name);
      debugScreenshotLink.href = screenshot;
      pokemonScreenshot.src = screenshot;
      result.classList.add("show");

      setStatus(
        source === "ocr" && value.toLowerCase() !== pokemon.name.toLowerCase()
          ? `OCR read “${value}” → ${displayName(pokemon.name)}`
          : "Loading the official Pokémon.com Pokédex…",
        "success"
      );
      saveRecent(pokemon);
    } catch (err) {
      setStatus("Something went wrong while finding that Pokémon.", "error");
    }
  }

  function screenshotUrl(slug) {
    const target = pokemonUrl(slug);
    return `https://image.thum.io/get/?url=${encodeURIComponent(target)}`;
  }

  function openSelected() {
    if (!selectedPokemon) return;
    window.location.href = pokemonUrl(selectedPokemon.name);
  }

  pokemonScreenshot.addEventListener("load", () => {
    screenshotLoading.hidden = true;
    pokemonScreenshot.style.visibility = "visible";
  });

  pokemonScreenshot.addEventListener("error", () => {
    screenshotLoading.hidden = true;
    pokemonScreenshot.style.visibility = "hidden";
    embedFallback.hidden = false;
    setStatus("The screenshot service did not return an image. Try the direct screenshot link below.", "error");
  });

  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem("pokemon-recent") || "[]");
    } catch {
      return [];
    }
  }

  function saveRecent(pokemon) {
    try {
      let items = getRecent().filter(x => x.name !== pokemon.name);
      items.unshift({name: pokemon.name, id: pokemon.id});
      items = items.slice(0, 6);
      localStorage.setItem("pokemon-recent", JSON.stringify(items));
      renderRecent();
    } catch {}
  }

  function renderRecent() {
    const items = getRecent();
    recentSection.hidden = !items.length;
    recentList.innerHTML = "";
    items.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "recent-item";
      button.innerHTML = `<strong>${displayName(item.name)}</strong><span>#${String(item.id).padStart(4, "0")}</span>`;
      button.addEventListener("click", () => searchPokemon(item.name));
      recentList.appendChild(button);
    });
  }

  function openScanner() {
    scanModal.classList.add("show");
    scanBox.textContent = "Take a photo of a Pokémon name, or choose an existing photo. For best results, fill the frame with the name and use good lighting.";
    progress.classList.remove("show");
    progressBar.style.width = "0%";
    runAgain.hidden = true;
  }

  function closeScanner() {
    scanModal.classList.remove("show");
    imageInput.value = "";
    scanPreview.src = "";
    scanPreview.classList.remove("show");
  }

  async function preprocessImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d", {willReadFrequently: true});
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Mild contrast/grayscale preprocessing helps OCR on screenshots and cards.
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = d[i + 1] = d[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function scanImage(file) {
    if (!file) return;
    scanPreview.src = URL.createObjectURL(file);
    scanPreview.classList.add("show");
    scanBox.textContent = "Reading text from the image…";
    progress.classList.add("show");
    progressBar.style.width = "5%";
    chooseImage.disabled = true;

    try {
      if (!window.Tesseract) throw new Error("OCR library failed to load.");

      if (!worker) {
        worker = await Tesseract.createWorker("eng", 1, {
          logger: message => {
            if (typeof message.progress === "number") {
              progressBar.style.width = `${Math.round(message.progress * 100)}%`;
            }
            if (message.status) {
              scanBox.textContent = message.status.charAt(0).toUpperCase() + message.status.slice(1) + "…";
            }
          }
        });
      }

      const canvas = await preprocessImage(file);
      const ret = await worker.recognize(canvas);
      const text = (ret.data.text || "").replace(/\s+/g, " ").trim();

      progressBar.style.width = "100%";

      if (!text) {
        scanBox.textContent = "No readable text found. Try a closer, sharper photo.";
        return;
      }

      scanBox.textContent = `Detected: “${text.slice(0, 120)}${text.length > 120 ? "…" : ""}”`;

      // Search the whole OCR result first, then individual words/phrases.
      let match = await findPokemon(text);

      if (!match) {
        const pieces = text
          .split(/[,|•:;/\\\n]+/)
          .flatMap(x => x.trim().split(/\s{2,}/))
          .map(x => x.trim())
          .filter(Boolean)
          .slice(0, 25);

        for (const piece of pieces) {
          match = await findPokemon(piece);
          if (match) break;
        }
      }

      if (match) {
        closeScanner();
        await searchPokemon(text, "ocr");
      } else {
        scanBox.textContent = `I read “${text.slice(0, 100)}${text.length > 100 ? "…" : ""}”, but couldn't identify a Pokémon. Try a photo focused tightly on the name.`;
        runAgain.hidden = false;
      }
    } catch (err) {
      console.error(err);
      scanBox.textContent = "OCR could not run. Check your connection and try again.";
      runAgain.hidden = false;
    } finally {
      chooseImage.disabled = false;
    }
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    searchPokemon(search.value);
  });

  openButton.addEventListener("click", openSelected);
  cameraButton.addEventListener("click", openScanner);

  closeModal.addEventListener("click", closeScanner);
  chooseImage.addEventListener("click", () => imageInput.click());
  runAgain.addEventListener("click", () => imageInput.click());

  imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (file) scanImage(file);
  });

  document.querySelectorAll("[data-name]").forEach(button => {
    button.addEventListener("click", () => searchPokemon(button.dataset.name));
  });

  scanModal.addEventListener("click", e => {
    if (e.target === scanModal) closeScanner();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && scanModal.classList.contains("show")) closeScanner();
  });

  renderRecent();
  loadPokemonList().catch(() => {});

  // Register the service worker when hosted on HTTPS (including GitHub Pages).
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
