(function () {
  var CATALOG_BASE = window.__STUFF_CATALOG_BASE__;
  var UNIFIED_CATALOG = window.__STUFF_CATALOG_UNIFIED__ === true;
  var PAGE_SECTION = window.__STUFF_PAGE_SECTION__ || "games";
  if (!CATALOG_BASE) {
    console.error("catalog.js: set window.__STUFF_CATALOG_BASE__ before loading");
    return;
  }

  var ROOT_KEY = PAGE_SECTION === "apps" ? "apps" : "games";

  var statusEl = document.getElementById("status");
  var rowsEl = document.getElementById("rows");
  var toolbarEl = document.getElementById("catalog-toolbar");
  var catalogPlatformOrder = ["linux", "wasm", "web", "macos", "windows"];
  var uiPlatformOrder = ["linux", "web", "macos", "windows"];
  var MATURITY_VALUES = ["released", "prototype", "quickstart"];

  function maturityRank(m) {
    if (m === "released") return 0;
    if (m === "prototype") return 1;
    if (m === "quickstart") return 2;
    return 3;
  }
  var activeFilterPlatforms = new Set();
  var activeFilterMaturities = new Set();
  var activeFilterCategories = new Set();
  var searchQuery = "";
  var catalogSortState = { key: null, dir: 1 };
  var urlWriteSuppressed = false;

  var PLATFORM_SVG = {
    linux:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M13.281 11.156a.84.84 0 0 1 .375.297c.084.125.143.276.18.453.02.104.044.2.07.29a1.772 1.772 0 0 0 .219.476c.047.073.11.153.188.242.067.073.127.167.18.281a.793.793 0 0 1 .077.328.49.49 0 0 1-.093.305.944.944 0 0 1-.235.219c-.12.083-.245.156-.375.219-.13.062-.26.127-.39.195a3.624 3.624 0 0 0-.555.328c-.156.115-.313.26-.469.438a2.815 2.815 0 0 1-.625.523 1.471 1.471 0 0 1-.383.172c-.13.036-.26.06-.39.07-.302 0-.552-.052-.75-.156-.198-.104-.37-.294-.516-.57-.042-.079-.083-.128-.125-.149a.774.774 0 0 0-.203-.055L8.67 15c-.26-.02-.525-.031-.796-.031a4.28 4.28 0 0 0-.672.054c-.229.037-.456.081-.68.133-.046.01-.093.05-.14.117a1.7 1.7 0 0 1-.196.227 1.106 1.106 0 0 1-.335.219 1.475 1.475 0 0 1-.555.101c-.172 0-.357-.018-.555-.054a1.82 1.82 0 0 1-.531-.18 3.578 3.578 0 0 0-.953-.328c-.313-.057-.643-.11-.992-.156a3.392 3.392 0 0 1-.344-.063.774.774 0 0 1-.29-.133.705.705 0 0 1-.194-.219.78.78 0 0 1-.079-.351c0-.162.021-.318.063-.469.042-.15.065-.31.07-.476 0-.115-.008-.227-.023-.336a3.53 3.53 0 0 1-.032-.352c0-.265.063-.46.188-.586.125-.125.307-.224.547-.297a.99.99 0 0 0 .297-.148 2.27 2.27 0 0 0 .234-.203 1.86 1.86 0 0 0 .203-.242c.063-.089.133-.178.211-.266a.114.114 0 0 0 .024-.07c0-.063-.003-.123-.008-.18l-.016-.188c0-.354.055-.71.164-1.07.11-.36.253-.71.43-1.055a9.08 9.08 0 0 1 .594-.992c.218-.317.435-.612.648-.883a4.35 4.35 0 0 0 .68-1.203c.15-.416.229-.87.234-1.36 0-.207-.01-.413-.031-.616a6.122 6.122 0 0 1-.031-.625c0-.417.047-.792.14-1.125.094-.334.24-.62.438-.86s.456-.419.773-.539C7.474.075 7.854.01 8.296 0c.527 0 .946.104 1.259.313.312.208.552.481.718.82.167.338.274.716.32 1.133.048.416.074.838.079 1.265v.133c0 .214.002.404.008.57a2.527 2.527 0 0 0 .226.977c.073.161.182.336.328.523.25.329.506.66.766.993.26.333.497.677.71 1.03.214.355.389.725.524 1.11.136.386.206.802.211 1.25a3.3 3.3 0 0 1-.164 1.04zm-6.554-8.14c.072 0 .132.018.18.054a.357.357 0 0 1 .109.149.85.85 0 0 1 .054.187c.01.063.016.128.016.196a.282.282 0 0 1-.024.125.27.27 0 0 1-.07.086l-.094.078a.796.796 0 0 0-.093.093.428.428 0 0 1-.149.141 2.129 2.129 0 0 0-.18.117 1.31 1.31 0 0 0-.156.133.264.264 0 0 0-.07.195c0 .047.023.086.07.117a.704.704 0 0 1 .266.305c.052.12.11.237.172.352.062.114.143.21.242.289.099.078.253.117.46.117h.048c.208-.01.406-.065.594-.164.187-.099.375-.203.562-.313a.633.633 0 0 1 .102-.046.37.37 0 0 0 .101-.055l.57-.445a.926.926 0 0 0 .024-.102 2.75 2.75 0 0 0 .016-.11.236.236 0 0 0-.04-.14.4.4 0 0 0-.093-.094.34.34 0 0 0-.133-.054.909.909 0 0 1-.14-.04 1.083 1.083 0 0 1-.352-.14 1.457 1.457 0 0 0-.344-.156c-.02-.006-.036-.021-.047-.047a.983.983 0 0 1-.031-.094.23.23 0 0 1-.008-.102.126.126 0 0 0-.008-.078c0-.062.005-.127.016-.195a.551.551 0 0 1 .07-.195.417.417 0 0 1 .125-.14.411.411 0 0 1 .203-.056c.162 0 .279.06.352.18.073.12.112.25.117.39a.397.397 0 0 1-.039.18.379.379 0 0 0-.04.172c0 .042.014.07.04.086a.26.26 0 0 0 .102.031c.12 0 .197-.028.234-.085a.533.533 0 0 0 .062-.258c0-.12-.01-.253-.03-.399a1.32 1.32 0 0 0-.126-.406.969.969 0 0 0-.242-.313.574.574 0 0 0-.383-.124c-.27 0-.466.067-.586.203-.12.135-.182.338-.187.609 0 .078.005.156.015.234.01.079.016.157.016.235 0 .026-.003.039-.008.039a.218.218 0 0 1-.047-.016 4.263 4.263 0 0 1-.093-.039.774.774 0 0 0-.118-.039.514.514 0 0 0-.203-.008 1.007 1.007 0 0 1-.125.008c-.073 0-.11-.013-.11-.039 0-.078-.004-.177-.015-.297-.01-.12-.036-.24-.078-.36a.995.995 0 0 0-.156-.296c-.063-.078-.156-.12-.281-.125a.323.323 0 0 0-.227.086.905.905 0 0 0-.164.203.64.64 0 0 0-.086.266 5.4 5.4 0 0 1-.031.25 1.459 1.459 0 0 0 .07.406c.026.083.055.156.086.219.031.062.068.093.11.093.025 0 .06-.018.101-.054.042-.037.063-.07.063-.102 0-.016-.008-.026-.024-.031a.147.147 0 0 0-.047-.008c-.036 0-.068-.018-.094-.055a.468.468 0 0 1-.062-.125 5.144 5.144 0 0 1-.047-.148.564.564 0 0 1 .055-.398c.047-.084.133-.128.258-.133zM5.023 15.18c.125 0 .248-.01.368-.032a.97.97 0 0 0 .336-.125.614.614 0 0 0 .234-.242.943.943 0 0 0 .094-.375.816.816 0 0 0-.047-.273.963.963 0 0 0-.133-.25 2.763 2.763 0 0 0-.203-.281 2.763 2.763 0 0 1-.203-.282 62.93 62.93 0 0 1-.29-.43c-.093-.14-.187-.288-.28-.445a8.124 8.124 0 0 1-.235-.406 2.646 2.646 0 0 0-.266-.398 1.203 1.203 0 0 0-.218-.211.469.469 0 0 0-.29-.094.436.436 0 0 0-.296.11 2.26 2.26 0 0 0-.258.265 3.241 3.241 0 0 1-.297.305c-.11.099-.25.177-.422.234a.744.744 0 0 0-.312.172c-.073.073-.11.185-.11.336 0 .104.008.208.024.312.015.104.026.209.031.313 0 .14-.02.273-.063.398a1.157 1.157 0 0 0-.062.367c0 .141.05.24.148.297.1.058.211.097.336.117.157.027.305.047.446.063.14.016.278.04.414.07.135.032.27.065.406.102.135.036.279.094.43.172.03.015.078.034.14.054l.211.07c.078.027.151.048.219.063a.741.741 0 0 0 .148.024zm2.86-.938c.146 0 .302-.015.469-.047a3.54 3.54 0 0 0 .976-.336 2.59 2.59 0 0 0 .406-.257.222.222 0 0 0 .032-.047.305.305 0 0 0 .023-.063v-.008c.031-.114.057-.24.078-.375a8.63 8.63 0 0 0 .055-.414 8.98 8.98 0 0 1 .055-.414c.02-.135.039-.268.054-.398.021-.14.047-.276.078-.406.032-.13.073-.253.125-.368a1.03 1.03 0 0 1 .211-.304 1.54 1.54 0 0 1 .344-.25v-.016l-.008-.023a.29.29 0 0 1 .047-.149 1.4 1.4 0 0 1 .117-.164.582.582 0 0 1 .149-.133.946.946 0 0 1 .164-.078 9.837 9.837 0 0 0-.102-.375 4.938 4.938 0 0 1-.094-.375 7.126 7.126 0 0 0-.093-.476 2.954 2.954 0 0 0-.11-.36 1.317 1.317 0 0 0-.18-.32c-.077-.104-.174-.23-.288-.375a1.189 1.189 0 0 1-.118-.156.555.555 0 0 1-.046-.196 2.206 2.206 0 0 0-.047-.203 9.48 9.48 0 0 0-.242-.75 2.91 2.91 0 0 0-.172-.383 3.87 3.87 0 0 0-.172-.289c-.052-.078-.107-.117-.164-.117-.125 0-.274.05-.446.149-.171.099-.354.208-.546.328-.193.12-.38.232-.563.336-.182.104-.346.153-.492.148a.7.7 0 0 1-.43-.148 2.236 2.236 0 0 1-.36-.344c-.109-.13-.2-.242-.273-.336-.073-.094-.127-.146-.164-.156-.041 0-.065.031-.07.093a2.56 2.56 0 0 0-.008.211v.133c0 .032-.005.052-.016.063-.057.12-.12.237-.187.351-.068.115-.135.232-.203.352a1.611 1.611 0 0 0-.219.758c0 .078.005.156.016.234.01.078.036.154.078.227l-.016.03a1.31 1.31 0 0 1-.133.157 1.072 1.072 0 0 0-.132.164 2.796 2.796 0 0 0-.407.93c-.078.333-.12.672-.125 1.015 0 .089.006.178.016.266.01.089.016.177.016.266a.526.526 0 0 1-.008.086.525.525 0 0 0-.008.086.75.75 0 0 1 .313.109c.12.068.25.154.39.258.14.104.274.224.399.36.125.135.244.267.359.398.115.13.198.26.25.39.052.13.086.237.101.32a.444.444 0 0 1-.125.329.955.955 0 0 1-.312.203c.089.156.198.289.328.398.13.11.271.198.422.266.151.068.315.117.492.148.177.032.35.047.516.047zm3.133 1.11c.109 0 .216-.016.32-.047a1.65 1.65 0 0 0 .445-.203c.136-.089.26-.198.375-.329a3.07 3.07 0 0 1 .977-.75l.258-.117a2.18 2.18 0 0 0 .257-.133.962.962 0 0 0 .165-.132.256.256 0 0 0 .078-.188.295.295 0 0 0-.024-.117.58.58 0 0 0-.07-.117 5.136 5.136 0 0 1-.203-.305 1.978 1.978 0 0 1-.149-.297l-.125-.312a2.558 2.558 0 0 1-.11-.352.28.28 0 0 0-.054-.101.53.53 0 0 0-.46-.235.533.533 0 0 0-.266.07l-.266.149a7.335 7.335 0 0 1-.281.148.656.656 0 0 1-.297.07.411.411 0 0 1-.258-.077.636.636 0 0 1-.172-.211 2.218 2.218 0 0 1-.117-.258l-.094-.258a1.26 1.26 0 0 1-.14.188.666.666 0 0 0-.125.203c-.068.156-.11.33-.125.523-.026.302-.06.596-.102.883a4.7 4.7 0 0 1-.21.86 1.914 1.914 0 0 0-.063.273 2.88 2.88 0 0 0-.032.289c0 .255.079.466.235.633.156.166.367.25.633.25z"/></svg>',
    web:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="20" height="20" fill="none" aria-hidden="true"><circle cx="96" cy="96" r="74" stroke="currentColor" stroke-width="12"/><ellipse cx="96" cy="96" stroke="currentColor" stroke-width="12" rx="30" ry="74"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" d="M28 72h136M28 120h136"/></svg>',
    macos:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
    windows:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 3h8.5v8.5H3V3zm9.5 0H21v8.5h-8.5V3zM3 12.5h8.5V21H3v-8.5zm9.5 0H21V21h-8.5v-8.5z"/></svg>',
  };

  function catalogBaseTrimmed() {
    return String(CATALOG_BASE).replace(/\/+$/, "");
  }

  function showStatus(msg, isError) {
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle("error", !!isError);
  }

  function releasedAtMs(raw) {
    if (raw == null || raw === "") return 0;
    var t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  function formatReleased(raw) {
    if (raw == null || raw === "" || raw === "—") return "—";
    var d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 16).replace("T", " ");
    }
  }

  /** Play page lives at {category}/{maturity}/play.html relative to site root. */
  function playHref(category, gameKey, version, maturity) {
    var u = new URL(category + "/" + maturity + "/play.html", window.location.href);
    u.searchParams.set("game", gameKey);
    u.searchParams.set("version", version);
    return u.pathname + u.search + u.hash;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function versionHasZip(v) {
    var pl = (v && v.platforms) || {};
    for (var i = 0; i < catalogPlatformOrder.length; i++) {
      var info = pl[catalogPlatformOrder[i]];
      if (info && info.zip_url) return true;
    }
    return false;
  }

  function sortVersionsDesc(keys) {
    return keys.slice().sort(function (a, b) {
      return b.localeCompare(a, undefined, { numeric: true });
    });
  }

  function platformsWithZipForVersion(v) {
    var pl = (v && v.platforms) || {};
    var out = [];
    for (var i = 0; i < catalogPlatformOrder.length; i++) {
      var p = catalogPlatformOrder[i];
      if (pl[p] && pl[p].zip_url) out.push(p);
    }
    return out;
  }

  function filterTagsFromCatalogPlatforms(rawList) {
    var seen = Object.create(null);
    for (var i = 0; i < rawList.length; i++) {
      var k = rawList[i];
      if (k === "wasm" || k === "web") seen.web = true;
      else seen[k] = true;
    }
    var out = [];
    for (var j = 0; j < uiPlatformOrder.length; j++) {
      var u = uiPlatformOrder[j];
      if (seen[u]) out.push(u);
    }
    return out;
  }

  function platformsUnionForGame(g, verKeys) {
    var seen = Object.create(null);
    var versions = (g && g.versions) || {};
    for (var i = 0; i < verKeys.length; i++) {
      var list = platformsWithZipForVersion(versions[verKeys[i]]);
      for (var j = 0; j < list.length; j++) seen[list[j]] = true;
    }
    var raw = [];
    for (var k = 0; k < catalogPlatformOrder.length; k++) {
      if (seen[catalogPlatformOrder[k]]) raw.push(catalogPlatformOrder[k]);
    }
    return filterTagsFromCatalogPlatforms(raw);
  }

  function uiSlotHasCatalogZip(slot, catalogKeysWithZip) {
    if (slot === "web")
      return catalogKeysWithZip.indexOf("wasm") >= 0 || catalogKeysWithZip.indexOf("web") >= 0;
    return catalogKeysWithZip.indexOf(slot) >= 0;
  }

  function uiSlotMatchesPlatform(slot, selectedCatalogPlatform) {
    if (slot === "web")
      return selectedCatalogPlatform === "wasm" || selectedCatalogPlatform === "web";
    return selectedCatalogPlatform === slot;
  }

  function pickCatalogPlatformForUiSlot(slot, platformSel) {
    var opts = Array.prototype.map.call(platformSel.options, function (o) {
      return o.value;
    });
    if (slot === "web") {
      var order = ["wasm", "web"];
      var webOpts = [];
      for (var i = 0; i < order.length; i++) {
        if (opts.indexOf(order[i]) >= 0) webOpts.push(order[i]);
      }
      if (webOpts.length === 0) return null;
      if (webOpts.length === 1) return webOpts[0];
      var cur = platformSel.value;
      var curIdx = webOpts.indexOf(cur);
      if (curIdx >= 0) return webOpts[(curIdx + 1) % webOpts.length];
      return webOpts[0];
    }
    if (opts.indexOf(slot) >= 0) return slot;
    return null;
  }

  function toolbarIconSvg(p) {
    return PLATFORM_SVG[p].replace(/width="20"/, 'width="18"').replace(/height="20"/, 'height="18"');
  }

  function rowItemKey(tr) {
    return tr.dataset.category + "\0" + tr.dataset.gameKey + "\0" + tr.dataset.maturity;
  }

  function defaultSortDir(key) {
    return key === "released" ? -1 : 1;
  }

  function compareCatalogRows(trA, trB) {
    var key = catalogSortState.key;
    var dir = catalogSortState.dir;
    var c = 0;
    if (key === "title") {
      c = trA.dataset.sortTitle.localeCompare(trB.dataset.sortTitle, undefined, {
        sensitivity: "base",
      });
    } else if (key === "released") {
      var ma = parseInt(trA.dataset.sortReleased, 10) || 0;
      var mb = parseInt(trB.dataset.sortReleased, 10) || 0;
      c = ma < mb ? -1 : ma > mb ? 1 : 0;
    }
    if (c !== 0) return dir * c;
    var ca = trA.dataset.category.localeCompare(trB.dataset.category);
    if (ca !== 0) return ca;
    var ck = trA.dataset.gameKey.localeCompare(trB.dataset.gameKey);
    if (ck !== 0) return ck;
    return maturityRank(trA.dataset.maturity) - maturityRank(trB.dataset.maturity);
  }

  function applyCatalogSort() {
    if (!catalogSortState.key || !rowsEl) return;
    var rows = Array.prototype.slice.call(rowsEl.querySelectorAll("tr.catalog-row"));
    rows.sort(compareCatalogRows);
    for (var i = 0; i < rows.length; i++) rowsEl.appendChild(rows[i]);
    applyRowFilters();
  }

  function syncSortHeaderButtons() {
    var btns = document.querySelectorAll("table.catalog-table button.catalog-th-sort");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var k = b.getAttribute("data-sort-key");
      if (catalogSortState.key === k) {
        b.setAttribute("aria-sort", catalogSortState.dir === 1 ? "ascending" : "descending");
      } else {
        b.setAttribute("aria-sort", "none");
      }
    }
  }

  function onSortHeaderClick(ev) {
    var btn = ev.currentTarget;
    var key = btn.getAttribute("data-sort-key");
    if (!key) return;
    if (catalogSortState.key === key) catalogSortState.dir = -catalogSortState.dir;
    else {
      catalogSortState.key = key;
      catalogSortState.dir = defaultSortDir(key);
    }
    applyCatalogSort();
    syncSortHeaderButtons();
  }

  function mountCatalogSort() {
    var btns = document.querySelectorAll("table.catalog-table button.catalog-th-sort");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", onSortHeaderClick);
    }
    syncSortHeaderButtons();
  }

  /** URL: maturity, category, platform (comma-separated or repeated), q (title search). Omit maturity → default released only. */
  function parseListParam(sp, key) {
    var raw = sp.getAll(key);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var parts = String(raw[i]).split(",");
      for (var j = 0; j < parts.length; j++) {
        var s = parts[j].trim();
        if (s) out.push(s);
      }
    }
    return out;
  }

  function readFiltersFromUrl() {
    var sp = new URLSearchParams(window.location.search);

    activeFilterMaturities.clear();
    if (!sp.has("maturity")) {
      activeFilterMaturities.add("released");
    } else {
      var mv = parseListParam(sp, "maturity");
      var lower = mv.map(function (m) {
        return m.toLowerCase();
      });
      if (lower.indexOf("all") >= 0) {
        activeFilterMaturities.add("released");
        activeFilterMaturities.add("prototype");
        activeFilterMaturities.add("quickstart");
      } else {
        for (var mi = 0; mi < MATURITY_VALUES.length; mi++) {
          var t = MATURITY_VALUES[mi];
          if (lower.indexOf(t) >= 0) activeFilterMaturities.add(t);
        }
      }
      if (activeFilterMaturities.size === 0) activeFilterMaturities.add("released");
    }

    activeFilterCategories.clear();
    if (UNIFIED_CATALOG) {
      var cv = parseListParam(sp, "category");
      for (var ci = 0; ci < cv.length; ci++) {
        var c = cv[ci].toLowerCase();
        if (c === "games" || c === "apps") activeFilterCategories.add(c);
      }
    }

    activeFilterPlatforms.clear();
    var pv = parseListParam(sp, "platform");
    for (var pi = 0; pi < pv.length; pi++) {
      var p = pv[pi].toLowerCase();
      if (uiPlatformOrder.indexOf(p) >= 0) activeFilterPlatforms.add(p);
    }

    searchQuery = (sp.get("q") || "").trim();
  }

  function writeFiltersToUrl() {
    if (urlWriteSuppressed) return;
    var sp = new URLSearchParams(window.location.search);
    ["maturity", "category", "platform", "q"].forEach(function (k) {
      sp.delete(k);
    });

    var defaultMaturity =
      activeFilterMaturities.size === 1 && activeFilterMaturities.has("released");
    if (!defaultMaturity) {
      var mlist = [];
      if (activeFilterMaturities.has("released")) mlist.push("released");
      if (activeFilterMaturities.has("prototype")) mlist.push("prototype");
      if (activeFilterMaturities.has("quickstart")) mlist.push("quickstart");
      if (mlist.length) sp.set("maturity", mlist.join(","));
    }

    if (UNIFIED_CATALOG && activeFilterCategories.size > 0) {
      var clist = [];
      if (activeFilterCategories.has("games")) clist.push("games");
      if (activeFilterCategories.has("apps")) clist.push("apps");
      if (clist.length) sp.set("category", clist.join(","));
    }

    if (activeFilterPlatforms.size > 0) {
      var plist = [];
      for (var pi = 0; pi < uiPlatformOrder.length; pi++) {
        var plat = uiPlatformOrder[pi];
        if (activeFilterPlatforms.has(plat)) plist.push(plat);
      }
      if (plist.length) sp.set("platform", plist.join(","));
    }

    if (searchQuery) sp.set("q", searchQuery);

    var qs = sp.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      history.replaceState(null, "", url);
    }
  }

  function applyRowFilters() {
    var platOn = activeFilterPlatforms.size > 0;
    var matOn = activeFilterMaturities.size > 0;
    var catOn = activeFilterCategories.size > 0;
    var q = searchQuery.toLowerCase();
    var qOn = q.length > 0;
    var rows = rowsEl.querySelectorAll("tr.catalog-row");
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var okPlat = true;
      if (platOn) {
        var ups = (row.dataset.platformsUnion || "").split(",").filter(Boolean);
        okPlat = false;
        for (var j = 0; j < uiPlatformOrder.length; j++) {
          var plat = uiPlatformOrder[j];
          if (activeFilterPlatforms.has(plat) && ups.indexOf(plat) >= 0) {
            okPlat = true;
            break;
          }
        }
      }
      var okMat = true;
      if (matOn) okMat = activeFilterMaturities.has(row.dataset.maturity);
      var okCat = true;
      if (catOn) okCat = activeFilterCategories.has(row.dataset.category);
      var okQ = true;
      if (qOn) {
        var title = (row.dataset.sortTitle || "").toLowerCase();
        okQ = title.indexOf(q) >= 0;
      }
      row.hidden = !(okPlat && okMat && okCat && okQ);
    }
  }

  function syncFilterButtonPressedStates() {
    if (!toolbarEl) return;
    var platBtns = toolbarEl.querySelectorAll("button.plat-filter");
    for (var i = 0; i < platBtns.length; i++) {
      var b = platBtns[i];
      var pid = b.getAttribute("data-plat");
      b.setAttribute("aria-pressed", activeFilterPlatforms.has(pid) ? "true" : "false");
    }
    var matBtns = toolbarEl.querySelectorAll("button.mat-filter");
    for (var mi = 0; mi < matBtns.length; mi++) {
      var mb = matBtns[mi];
      var mid = mb.getAttribute("data-mat");
      mb.setAttribute("aria-pressed", activeFilterMaturities.has(mid) ? "true" : "false");
    }
    var catBtns = toolbarEl.querySelectorAll("button.cat-filter");
    for (var ci = 0; ci < catBtns.length; ci++) {
      var cb = catBtns[ci];
      var cid = cb.getAttribute("data-cat");
      cb.setAttribute("aria-pressed", activeFilterCategories.has(cid) ? "true" : "false");
    }
  }

  var searchDebounceTimer = null;
  var searchInputEl = null;

  function mountCatalogToolbar() {
    if (!toolbarEl) return;
    toolbarEl.innerHTML = "";
    toolbarEl.hidden = false;

    var rowWrap = document.createElement("div");
    rowWrap.className = "catalog-toolbar-row";

    var left = document.createElement("div");
    left.className = "catalog-toolbar-left";

    var platLabel = document.createElement("span");
    platLabel.className = "catalog-toolbar-label";
    platLabel.textContent = "Platforms";

    var platGroup = document.createElement("div");
    platGroup.className = "catalog-toolbar-toggles";
    platGroup.setAttribute("role", "group");
    platGroup.setAttribute("aria-label", "Filter by platform");

    for (var pi = 0; pi < uiPlatformOrder.length; pi++) {
      (function (plat) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "plat-filter";
        btn.setAttribute("data-plat", plat);
        btn.setAttribute("aria-pressed", "false");
        btn.title = "Toggle filter: " + plat;

        var iconSpan = document.createElement("span");
        iconSpan.setAttribute("aria-hidden", "true");
        iconSpan.innerHTML = toolbarIconSvg(plat);
        btn.appendChild(iconSpan);

        var nameSpan = document.createElement("span");
        nameSpan.textContent = plat;
        btn.appendChild(nameSpan);

        btn.addEventListener("click", function () {
          if (activeFilterPlatforms.has(plat)) activeFilterPlatforms.delete(plat);
          else activeFilterPlatforms.add(plat);
          syncFilterButtonPressedStates();
          applyRowFilters();
          writeFiltersToUrl();
        });

        platGroup.appendChild(btn);
      })(uiPlatformOrder[pi]);
    }

    left.appendChild(platLabel);
    left.appendChild(platGroup);

    var center = document.createElement("div");
    center.className = "catalog-toolbar-center";

    if (UNIFIED_CATALOG) {
      var catLabel = document.createElement("span");
      catLabel.className = "catalog-toolbar-label";
      catLabel.textContent = "Category";

      var catGroup = document.createElement("div");
      catGroup.className = "catalog-toolbar-toggles";
      catGroup.setAttribute("role", "group");
      catGroup.setAttribute("aria-label", "Filter games vs apps");

      [["games", "Games"], ["apps", "Apps"]].forEach(function (pair) {
        var cid = pair[0];
        var clab = pair[1];
        (function (catId, text) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "cat-filter";
          btn.setAttribute("data-cat", catId);
          btn.setAttribute("aria-pressed", "false");
          btn.title = "Toggle filter: " + text;
          btn.textContent = text;
          btn.addEventListener("click", function () {
            if (activeFilterCategories.has(catId)) activeFilterCategories.delete(catId);
            else activeFilterCategories.add(catId);
            syncFilterButtonPressedStates();
            applyRowFilters();
            writeFiltersToUrl();
          });
          catGroup.appendChild(btn);
        })(cid, clab);
      });

      center.appendChild(catLabel);
      center.appendChild(catGroup);
    }

    var matLabel = document.createElement("span");
    matLabel.className = "catalog-toolbar-label";
    matLabel.textContent = "Channel";

    var matGroup = document.createElement("div");
    matGroup.className = "catalog-toolbar-toggles";
    matGroup.setAttribute("role", "group");
    matGroup.setAttribute("aria-label", "Filter released, prototype, or quickstart");

    [
      ["released", "Released"],
      ["prototype", "Prototype"],
      ["quickstart", "Quickstart"],
    ].forEach(function (pair) {
      var mat = pair[0];
      var label = pair[1];
      (function (maturity, text) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mat-filter";
        btn.setAttribute("data-mat", maturity);
        btn.setAttribute("aria-pressed", "false");
        btn.title = "Toggle filter: " + text;
        btn.textContent = text;
        btn.addEventListener("click", function () {
          if (activeFilterMaturities.has(maturity)) activeFilterMaturities.delete(maturity);
          else activeFilterMaturities.add(maturity);
          if (activeFilterMaturities.size === 0) activeFilterMaturities.add("released");
          syncFilterButtonPressedStates();
          applyRowFilters();
          writeFiltersToUrl();
        });
        matGroup.appendChild(btn);
      })(mat, label);
    });

    center.appendChild(matLabel);
    center.appendChild(matGroup);

    var searchWrap = document.createElement("div");
    searchWrap.className = "catalog-toolbar-search";
    var searchLabel = document.createElement("label");
    searchLabel.className = "catalog-toolbar-label";
    searchLabel.setAttribute("for", "catalog-search-input");
    searchLabel.textContent = "Search";
    searchInputEl = document.createElement("input");
    searchInputEl.type = "search";
    searchInputEl.id = "catalog-search-input";
    searchInputEl.className = "catalog-search-input";
    searchInputEl.setAttribute("autocomplete", "off");
    searchInputEl.setAttribute("placeholder", "Filter by title…");
    searchInputEl.value = searchQuery;
    searchInputEl.addEventListener("input", function () {
      var v = searchInputEl.value;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        searchQuery = v.trim();
        applyRowFilters();
        writeFiltersToUrl();
      }, 200);
    });

    searchWrap.appendChild(searchLabel);
    searchWrap.appendChild(searchInputEl);

    rowWrap.appendChild(left);
    rowWrap.appendChild(center);
    rowWrap.appendChild(searchWrap);

    toolbarEl.appendChild(rowWrap);
    syncFilterButtonPressedStates();
  }

  function hasPlayable(info, platform) {
    return !!(info && info.play_url && (platform === "wasm" || platform === "web"));
  }

  function buildIconRow() {
    var parts = [];
    for (var i = 0; i < uiPlatformOrder.length; i++) {
      var p = uiPlatformOrder[i];
      var aria =
        p === "linux"
          ? "Linux"
          : p === "web"
            ? "Web or WASM"
            : p === "macos"
              ? "macOS"
              : "Windows";
      parts.push(
        '<button type="button" class="plat-icon" data-plat="' +
          escapeAttr(p) +
          '" aria-label="Select platform: ' +
          escapeAttr(aria) +
          '" title="Select ' +
          escapeAttr(aria) +
          '" disabled>' +
          PLATFORM_SVG[p] +
          "</button>"
      );
    }
    return '<div class="plat-icons" role="group" aria-label="Platform">' + parts.join("") + "</div>";
  }

  function updateRow(tr, itemsByKey) {
    var g = itemsByKey[rowItemKey(tr)];
    if (!g) return;

    var gameKey = tr.dataset.gameKey;
    var maturity = tr.dataset.maturity;
    var category = tr.dataset.category;
    var versionSel = tr.querySelector(".js-version");
    var platformSel = tr.querySelector(".js-platform");
    var ver = versionSel.value;
    var vData = (g.versions && g.versions[ver]) || {};
    var available = platformsWithZipForVersion(vData);
    var keepPlat = platformSel.value;

    while (platformSel.firstChild) platformSel.removeChild(platformSel.firstChild);
    for (var i = 0; i < available.length; i++) {
      var p = available[i];
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      platformSel.appendChild(opt);
    }

    if (keepPlat && available.indexOf(keepPlat) >= 0) {
      platformSel.value = keepPlat;
    } else if (available.length) {
      platformSel.value = available[0];
    }

    var plat = platformSel.value;
    var info = (vData.platforms && vData.platforms[plat]) || {};
    var sha = info.sha256 || "—";
    var released = vData.released_at || "—";

    tr.dataset.sortReleased = String(releasedAtMs(vData.released_at));
    tr.querySelector(".js-released").textContent = formatReleased(released);
    tr.querySelector(".js-sha-full").textContent = sha;

    var zipA = tr.querySelector(".js-zip");
    if (info.zip_url) {
      zipA.href = info.zip_url;
      zipA.hidden = false;
    } else {
      zipA.removeAttribute("href");
      zipA.hidden = true;
    }

    var playA = tr.querySelector(".js-play");
    var playDash = tr.querySelector(".js-play-dash");
    if (hasPlayable(info, plat)) {
      playA.href = playHref(category, gameKey, ver, maturity);
      playA.hidden = false;
      playDash.hidden = true;
    } else {
      playA.removeAttribute("href");
      playA.hidden = true;
      playDash.hidden = false;
    }

    var iconEls = tr.querySelectorAll(".plat-icon");
    for (var j = 0; j < iconEls.length; j++) {
      var el = iconEls[j];
      var slot = el.getAttribute("data-plat");
      var avail = uiSlotHasCatalogZip(slot, available);
      var sel = uiSlotMatchesPlatform(slot, plat);
      el.disabled = !avail;
      el.classList.toggle("plat-icon--avail", avail);
      el.classList.toggle("plat-icon--selected", avail && sel);
      el.setAttribute("aria-pressed", avail && sel ? "true" : "false");
    }

    if (catalogSortState.key === "released") applyCatalogSort();
  }

  async function fetchCatalogJson(url) {
    try {
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function emptyMessage() {
    if (UNIFIED_CATALOG) {
      return "No software in catalog yet. Publish games or apps with AWS OIDC configured.";
    }
    if (PAGE_SECTION === "apps") {
      return "No apps in catalog yet. Publish apps (e.g. SpacetimeDB Chat workflow) with AWS OIDC configured.";
    }
    return "No game builds in catalog yet. Run game CI (non-PR) with AWS OIDC configured.";
  }

  function collectIntoRows(doc, maturity, category, rows) {
    if (!doc) return;
    var rootKey = category === "apps" ? "apps" : "games";
    var bucket = doc[rootKey] || {};
    var gameKeys = Object.keys(bucket);
    for (var gi = 0; gi < gameKeys.length; gi++) {
      var gameKey = gameKeys[gi];
      var g = bucket[gameKey] || {};
      var name = g.display_name || gameKey;
      var versions = g.versions || {};
      var verKeys = sortVersionsDesc(
        Object.keys(versions).filter(function (vk) {
          return versionHasZip(versions[vk]);
        })
      );
      if (verKeys.length === 0) continue;
      rows.push({
        category: category,
        gameKey: gameKey,
        maturity: maturity,
        g: g,
        name: name,
        verKeys: verKeys,
      });
    }
  }

  async function load() {
    readFiltersFromUrl();
    var base = catalogBaseTrimmed();
    var rows = [];

    if (UNIFIED_CATALOG) {
      var tuples = [
        [base + "/games/released/catalog.json", "released", "games"],
        [base + "/games/prototype/catalog.json", "prototype", "games"],
        [base + "/games/quickstart/catalog.json", "quickstart", "games"],
        [base + "/apps/released/catalog.json", "released", "apps"],
        [base + "/apps/prototype/catalog.json", "prototype", "apps"],
        [base + "/apps/quickstart/catalog.json", "quickstart", "apps"],
      ];
      var docs = await Promise.all(
        tuples.map(function (t) {
          return fetchCatalogJson(t[0]);
        })
      );
      var anyDoc = false;
      for (var di = 0; di < docs.length; di++) {
        if (docs[di]) anyDoc = true;
        collectIntoRows(docs[di], tuples[di][1], tuples[di][2], rows);
      }
      if (!anyDoc) {
        showStatus("Nothing Available", true);
        return;
      }
    } else {
      var releasedDoc = await fetchCatalogJson(base + "/" + PAGE_SECTION + "/released/catalog.json");
      var prototypeDoc = await fetchCatalogJson(base + "/" + PAGE_SECTION + "/prototype/catalog.json");
      var quickstartDoc = await fetchCatalogJson(base + "/" + PAGE_SECTION + "/quickstart/catalog.json");

      if (!releasedDoc && !prototypeDoc && !quickstartDoc) {
        showStatus("Nothing Available", true);
        return;
      }

      var cat = PAGE_SECTION === "apps" ? "apps" : "games";
      collectIntoRows(releasedDoc, "released", cat, rows);
      collectIntoRows(prototypeDoc, "prototype", cat, rows);
      collectIntoRows(quickstartDoc, "quickstart", cat, rows);
    }

    rows.sort(function (a, b) {
      var c = a.name.localeCompare(b.name);
      if (c !== 0) return c;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return maturityRank(a.maturity) - maturityRank(b.maturity);
    });

    if (rows.length === 0) {
      showStatus(emptyMessage(), false);
      return;
    }

    var itemsByKey = Object.create(null);
    for (var ri = 0; ri < rows.length; ri++) {
      var r = rows[ri];
      itemsByKey[r.category + "\0" + r.gameKey + "\0" + r.maturity] = r.g;
    }

    statusEl.hidden = true;
    mountCatalogToolbar();

    var frag = document.createDocumentFragment();

    for (var rj = 0; rj < rows.length; rj++) {
      var item = rows[rj];
      var tr = document.createElement("tr");
      tr.className = "catalog-row";
      tr.dataset.category = item.category;
      tr.dataset.gameKey = item.gameKey;
      tr.dataset.maturity = item.maturity;
      tr.dataset.sortTitle = item.name;
      tr.dataset.sortReleased = "0";
      tr.dataset.platformsUnion = platformsUnionForGame(item.g, item.verKeys).join(",");

      var verOptions = "";
      for (var vi = 0; vi < item.verKeys.length; vi++) {
        var vk = item.verKeys[vi];
        verOptions += '<option value="' + escapeAttr(vk) + '">' + escapeHtml(vk) + "</option>";
      }
      var vid = "stuff-ver-" + rj;
      var pid = "stuff-plat-" + rj;

      tr.innerHTML =
        '<td class="cell-title">' +
        '<div class="cell-title-name">' +
        escapeHtml(item.name) +
        "</div>" +
        buildIconRow() +
        "</td>" +
        '<td class="cell-version">' +
        '<div class="catalog-inline">' +
        '<select id="' +
        vid +
        '" class="catalog-select js-version" aria-label="Version">' +
        verOptions +
        "</select>" +
        "</div>" +
        "</td>" +
        '<td class="cell-platform">' +
        '<div class="catalog-inline">' +
        '<select id="' +
        pid +
        '" class="catalog-select js-platform" aria-label="Platform"></select>' +
        "</div>" +
        "</td>" +
        '<td class="js-released">—</td>' +
        '<td class="sha"><code class="sha-full js-sha-full">—</code></td>' +
        '<td><a class="js-zip" href="#" download rel="noopener">ZIP</a></td>' +
        '<td class="cell-play"><a class="play-link js-play" href="#" hidden>Play in browser</a><span class="js-play-dash">—</span></td>';

      frag.appendChild(tr);
      updateRow(tr, itemsByKey);
    }

    rowsEl.appendChild(frag);
    mountCatalogSort();
    applyRowFilters();
    writeFiltersToUrl();

    window.addEventListener("popstate", function () {
      urlWriteSuppressed = true;
      readFiltersFromUrl();
      if (searchInputEl) searchInputEl.value = searchQuery;
      syncFilterButtonPressedStates();
      applyRowFilters();
      urlWriteSuppressed = false;
    });

    rowsEl.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || (!t.classList.contains("js-version") && !t.classList.contains("js-platform"))) return;
      var row = t.closest("tr.catalog-row");
      if (row) updateRow(row, itemsByKey);
    });

    rowsEl.addEventListener("click", function (ev) {
      var btn = ev.target.closest("button.plat-icon");
      if (!btn || btn.disabled) return;
      var row = btn.closest("tr.catalog-row");
      if (!row) return;
      var slot = btn.getAttribute("data-plat");
      var platformSel = row.querySelector(".js-platform");
      if (!platformSel) return;
      var pick = pickCatalogPlatformForUiSlot(slot, platformSel);
      if (pick == null || platformSel.value === pick) return;
      platformSel.value = pick;
      updateRow(row, itemsByKey);
    });
  }

  load();
})();
