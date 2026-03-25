(function () {
  var CATALOG_URL = window.__STUFF_CATALOG_URL__;
  if (!CATALOG_URL) {
    console.error("play.js: set window.__STUFF_CATALOG_URL__ before loading");
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var gameKey = params.get("game");
  var version = params.get("version");
  var wOverride = params.get("w");
  var hOverride = params.get("h");

  var titleEl = document.getElementById("title");
  var subtitleEl = document.getElementById("subtitle");
  var statusEl = document.getElementById("status");
  var frameHost = document.getElementById("frameHost");
  var iframe = document.getElementById("game");

  function fail(msg) {
    statusEl.hidden = false;
    statusEl.textContent = msg;
    titleEl.textContent = "Cannot play";
    subtitleEl.textContent = "";
    frameHost.style.display = "none";
  }

  if (!gameKey || !version) {
    fail(
      "Missing query params. Use ?game=mindsweeper&version=YOUR_VERSION (optional &w=…&h=… for iframe size)."
    );
    return;
  }

  function pickPlayPlatform(platforms) {
    if (!platforms) return null;
    if (platforms.wasm && platforms.wasm.play_url) return platforms.wasm;
    if (platforms.web && platforms.web.play_url) return platforms.web;
    return null;
  }

  (async function () {
    var catalog;
    try {
      var res = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      catalog = await res.json();
    } catch (e) {
      fail("Could not load catalog.");
      return;
    }

    var g = (catalog.games && catalog.games[gameKey]) || null;
    if (!g) {
      fail("Unknown game: " + gameKey);
      return;
    }
    var v = (g.versions && g.versions[version]) || null;
    if (!v) {
      fail("Unknown version for this game: " + version);
      return;
    }
    var play = pickPlayPlatform(v.platforms);
    if (!play || !play.play_url) {
      fail("No browser play_url (wasm or web) for this version.");
      return;
    }

    var iframeCfg = v.iframe || {};
    var w = Number(wOverride || iframeCfg.width || 800);
    var h = Number(hOverride || iframeCfg.height || 600);
    if (!Number.isFinite(w) || w < 200) w = 800;
    if (!Number.isFinite(h) || h < 200) h = 600;

    titleEl.textContent = (g.display_name || gameKey) + " — " + version;
    subtitleEl.textContent =
      "Iframe " +
      w +
      "×" +
      h +
      " px" +
      (wOverride || hOverride ? " (overridden via URL)" : " (from catalog; add ?w=&h= to override)");

    frameHost.style.width = w + "px";
    frameHost.style.height = h + "px";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.src = play.play_url;
  })();
})();
