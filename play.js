(function () {
  var CATALOG_URL = window.__STUFF_CATALOG_URL__;
  if (!CATALOG_URL) {
    console.error("play.js: set window.__STUFF_CATALOG_URL__ before loading");
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var gameKey = params.get("game");
  var versionRaw = params.get("version");
  var version = versionRaw != null ? String(versionRaw).trim() : "";

  var statusEl = document.getElementById("status");
  var frameHost = document.getElementById("frameHost");
  var iframe = document.getElementById("game");

  function fail(msg) {
    document.title = "Cannot play — nicapotato";
    statusEl.hidden = false;
    statusEl.textContent = msg;
    frameHost.style.display = "none";
  }

  if (!gameKey || !version) {
    fail("Missing query params. Use ?game=mindsweeper&version=YOUR_VERSION or version=latest. Use the browser back button to return.");
    return;
  }

  function pickPlayPlatform(platforms) {
    if (!platforms) return null;
    if (platforms.wasm && platforms.wasm.play_url) return platforms.wasm;
    if (platforms.web && platforms.web.play_url) return platforms.web;
    return null;
  }

  function highestVersionKey(versionsObj) {
    var keys = Object.keys(versionsObj || {});
    if (!keys.length) return null;
    keys.sort(function (a, b) {
      return b.localeCompare(a, undefined, { numeric: true });
    });
    return keys[0];
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

    var resolvedVersion = version;
    if (version.toLowerCase() === "latest") {
      var pick = highestVersionKey(g.versions);
      if (!pick) {
        fail("No versions published for this game.");
        return;
      }
      resolvedVersion = pick;
    }

    var v = (g.versions && g.versions[resolvedVersion]) || null;
    if (!v) {
      fail("Unknown version for this game: " + version);
      return;
    }
    var play = pickPlayPlatform(v.platforms);
    if (!play || !play.play_url) {
      fail("No browser play_url (wasm or web) for this version.");
      return;
    }

    document.title =
      (g.display_name || gameKey) + " — " + resolvedVersion + " — nicapotato";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.src = play.play_url;
  })();
})();
