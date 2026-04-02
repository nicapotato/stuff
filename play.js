(function () {
  var CATALOG_BASE = window.__STUFF_CATALOG_BASE__;
  var PAGE_SECTION = window.__STUFF_PAGE_SECTION__ || "games";
  if (!CATALOG_BASE) {
    console.error("play.js: set window.__STUFF_CATALOG_BASE__ before loading");
    return;
  }

  var ROOT_KEY = PAGE_SECTION === "apps" ? "apps" : "games";

  function maturityFromPath() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var m = path.match(/\/(games|apps)\/(released|prototype|quickstart)\/play\.html$/i);
    return m ? m[2].toLowerCase() : null;
  }

  var params = new URLSearchParams(window.location.search);
  var gameKey = params.get("game");
  var versionRaw = params.get("version");
  var version = versionRaw != null ? String(versionRaw).trim() : "";
  var maturity = maturityFromPath();
  if (
    maturity !== "prototype" &&
    maturity !== "released" &&
    maturity !== "quickstart"
  )
    maturity = "released";

  var statusEl = document.getElementById("status");
  var frameHost = document.getElementById("frameHost");
  var iframe = document.getElementById("game");
  var playMetaEl = document.getElementById("playMeta");
  var playMetaMaturityEl = document.getElementById("playMetaMaturity");
  var playMetaVersionEl = document.getElementById("playMetaVersion");

  function maturityDisplayLabel(m) {
    if (m === "released") return "Released";
    if (m === "prototype") return "Prototype";
    if (m === "quickstart") return "Quickstart";
    return String(m || "");
  }

  function setPlayMetaVisible(show) {
    if (!playMetaEl) return;
    playMetaEl.hidden = !show;
    playMetaEl.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fail(msg) {
    setPlayMetaVisible(false);
    document.title = "Cannot play — nicapotato";
    statusEl.hidden = false;
    statusEl.classList.add("error", "banner--load-fail");
    statusEl.setAttribute("role", "alert");
    statusEl.innerHTML =
      '<div class="banner-error-title">ERROR</div>' +
      '<div class="banner-error-detail">' +
      escapeHtml(msg) +
      "</div>";
    frameHost.style.display = "none";
  }

  /**
   * When CORS allows it, HEAD verifies the asset exists before embedding.
   * If HEAD is blocked or unsupported (405), we still try the iframe.
   */
  async function verifyPlayUrlHead(url) {
    try {
      var res = await fetch(url, {
        method: "HEAD",
        mode: "cors",
        cache: "no-store",
      });
      if (res.status === 405 || res.status === 501) return null;
      return res.ok;
    } catch (e) {
      return null;
    }
  }

  if (!gameKey || !version) {
    fail(
      "Missing query params. Open this page from the catalog (Play link), or use e.g. games/quickstart/play.html?game=KEY&version=VERSION."
    );
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
    var base = String(CATALOG_BASE).replace(/\/+$/, "");
    var catalogUrl = base + "/" + PAGE_SECTION + "/" + maturity + "/catalog.json";
    var catalog;
    try {
      var res = await fetch(catalogUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      catalog = await res.json();
    } catch (e) {
      fail("Could not load catalog.");
      return;
    }

    var root = (catalog && catalog[ROOT_KEY]) || {};
    var g = root[gameKey] || null;
    if (!g) {
      fail("Unknown item: " + gameKey);
      return;
    }

    var resolvedVersion = version;
    if (version.toLowerCase() === "latest") {
      var pick = highestVersionKey(g.versions);
      if (!pick) {
        fail("No versions published.");
        return;
      }
      resolvedVersion = pick;
    }

    var v = (g.versions && g.versions[resolvedVersion]) || null;
    if (!v) {
      fail("Unknown version: " + version);
      return;
    }
    var play = pickPlayPlatform(v.platforms);
    if (!play || !play.play_url) {
      fail("No browser play_url (wasm or web) for this version.");
      return;
    }

    var playUrl = play.play_url;
    var headResult = await verifyPlayUrlHead(playUrl);
    if (headResult === false) {
      fail(
        "This web build failed to load (server returned an error). Check the link or try again later."
      );
      return;
    }

    document.title =
      (g.display_name || gameKey) + " — " + resolvedVersion + " — nicapotato";
    iframe.style.width = "100%";
    iframe.style.height = "100%";

    if (playMetaMaturityEl) playMetaMaturityEl.textContent = maturityDisplayLabel(maturity);
    if (playMetaVersionEl) playMetaVersionEl.textContent = resolvedVersion;
    setPlayMetaVisible(true);

    iframe.addEventListener(
      "error",
      function onIframeError() {
        iframe.removeEventListener("error", onIframeError);
        fail("The embedded page failed to load in the browser.");
      },
      { once: true }
    );

    iframe.src = playUrl;
  })();
})();
