(function () {
  var CATALOG_BASE = window.__STUFF_CATALOG_BASE__;
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
  var activeFilterPlatforms = new Set();
  var activeFilterMaturities = new Set();

  var PLATFORM_SVG = {
    linux:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12.504 0q-.232 0-.48.021c-4.226.333-3.105 4.807-3.17 6.298c-.076 1.092-.3 1.953-1.05 3.02c-.885 1.051-2.127 2.75-2.716 4.521c-.278.832-.41 1.684-.287 2.489a.4.4 0 0 0-.11.135c-.26.268-.45.6-.663.839c-.199.199-.485.267-.797.4c-.313.136-.658.269-.864.68c-.09.189-.136.394-.132.602c0 .199.027.4.055.536c.058.399.116.728.04.97c-.249.68-.28 1.145-.106 1.484c.174.334.535.47.94.601c.81.2 1.91.135 2.774.6c.926.466 1.866.67 2.616.47c.526-.116.97-.464 1.208-.946c.587-.003 1.23-.269 2.26-.334c.699-.058 1.574.267 2.577.2c.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071s1.592-.536 2.257-1.306c.631-.765 1.683-1.084 2.378-1.503c.348-.199.629-.469.649-.853c.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926c-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.36.36 0 0 0-.19-.064c.431-1.278.264-2.55-.173-3.694c-.533-1.41-1.465-2.638-2.175-3.483c-.796-1.005-1.576-1.957-1.56-3.368c.026-2.152.236-6.133-3.544-6.139m.529 3.405h.013c.213 0 .396.062.584.198c.19.135.33.332.438.533c.105.259.158.459.166.724c0-.02.006-.04.006-.06v.105l-.004-.021l-.004-.024a1.8 1.8 0 0 1-.15.706a.95.95 0 0 1-.213.335a1 1 0 0 0-.088-.042c-.104-.045-.198-.064-.284-.133a1.3 1.3 0 0 0-.22-.066c.05-.06.146-.133.183-.198q.08-.193.088-.402v-.02a1.2 1.2 0 0 0-.061-.4c-.045-.134-.101-.2-.183-.333c-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 0 0-.205.334a1.2 1.2 0 0 0-.09.4v.019q.002.134.02.267c-.193-.067-.438-.135-.607-.202a2 2 0 0 1-.018-.2v-.02a1.8 1.8 0 0 1 .15-.768a1.08 1.08 0 0 1 .43-.533a1 1 0 0 1 .594-.2zm-2.962.059h.036c.142 0 .27.048.399.135c.146.129.264.288.344.465c.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024c-.152.055-.274.135-.393.2q.018-.136.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.6.6 0 0 0-.166-.267a.25.25 0 0 0-.183-.064h-.021c-.071.006-.13.04-.186.132a.55.55 0 0 0-.12.27a1 1 0 0 0-.023.33v.015c.012.135.037.2.08.334c.046.134.098.2.166.268q.014.014.034.024c-.07.057-.117.07-.176.136a.3.3 0 0 1-.131.068a2.6 2.6 0 0 1-.275-.402a1.8 1.8 0 0 1-.155-.667a1.8 1.8 0 0 1 .08-.668a1.4 1.4 0 0 1 .283-.535c.128-.133.26-.2.418-.2m1.37 1.706c.332 0 .733.065 1.216.399c.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.57.57 0 0 1 .016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465c-.276.135-.588.292-1.012.267a1.1 1.1 0 0 1-.448-.067a4 4 0 0 1-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71q-.104-.403.193-.6c.224-.135.38-.271.483-.336c.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601c.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473c.286.534.855 1.659 1.102 3.024c.156-.005.33.018.513.064c.646-1.671-.546-3.467-1.089-3.966c-.22-.2-.232-.335-.123-.335c.59.534 1.365 1.572 1.646 2.757c.13.535.16 1.104.021 1.67c.067.028.135.06.205.067c1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224c-.915-.4-1.646-.336-1.77.465c-.008.043-.013.066-.018.135c-.068.023-.139.053-.209.064c-.43.268-.662.669-.793 1.187c-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35c-1.5 1.072-3.58 1.538-5.348.334a2.7 2.7 0 0 0-.402-.533a1.5 1.5 0 0 0-.275-.333c.182 0 .338-.03.465-.067a.62.62 0 0 0 .314-.334c.108-.267 0-.697-.345-1.163s-.931-.995-1.788-1.521c-.63-.4-.986-.87-1.15-1.396c-.165-.534-.143-1.085-.015-1.645c.245-1.07.873-2.11 1.274-2.763c.107-.065.037.135-.408.974c-.396.751-1.14 2.497-.122 3.854a8.1 8.1 0 0 1 .647-2.876c.564-1.278 1.743-3.504 1.836-5.268c.048.036.217.135.289.202c.218.133.38.333.59.465c.21.201.477.335.876.335q.058.005.11.006c.412 0 .73-.134.997-.268c.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377c.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876c.085.4.154.78.409 1.066c.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595c-.63.401-1.746.712-2.457 1.57c-.618.737-1.37 1.14-2.036 1.191c-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69c.176-.668.428-1.344.463-1.897c.037-.714.076-1.335.195-1.814c.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01q.08 0 .157.014c.376.055.706.333 1.023.752l.91 1.664l.003.003c.243.533.754 1.064 1.189 1.637c.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294c-.645.135-1.52.002-2.395-.464c-.968-.536-2.118-.469-2.857-.602q-.553-.1-.723-.4c-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118c-.055-.401-.083-.71.043-.94c.16-.334.396-.4.69-.533c.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838c.19-.201.38-.336.663-.336m7.159-9.074c-.435.201-.945.535-1.488.535c-.542 0-.97-.267-1.28-.466c-.154-.134-.28-.268-.373-.335c-.164-.134-.144-.333-.074-.333c.109.016.129.134.199.2c.096.066.215.2.36.333c.292.2.68.467 1.167.467c.485 0 1.053-.267 1.398-.466c.195-.135.445-.334.648-.467c.156-.136.149-.267.279-.267c.128.016.034.134-.147.332a8 8 0 0 1-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05c.074-.043.18-.027.26.004c.063 0 .16.067.15.135c-.006.049-.085.066-.135.066c-.055 0-.092-.043-.141-.068c-.052-.018-.146-.008-.163-.065m-.551 0c-.02.058-.113.049-.166.066c-.047.025-.086.068-.14.068c-.05 0-.13-.02-.136-.068c-.01-.066.088-.133.15-.133c.08-.031.184-.047.259-.005c.019.009.036.03.03.05v.02h.003z"/></svg>',
    web:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.45 2.1 1.17 2.83l-.83.1zm6.9.15c-.64-.28-1.34-.43-2.05-.43-.63 0-1.23.12-1.79.33L14.5 17H13v-3.09l3.24-3.24c.27.53.44 1.13.44 1.77 0 1.41-.73 2.66-1.85 3.42l.06.1zM12 4c1.66 0 3.12.82 4.02 2.07L12 11V4zm0 16c-1.66 0-3.12-.82-4.02-2.07L12 13v7z"/></svg>',
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

  function playHref(gameKey, version, maturity) {
    var u = new URL("play.html", window.location.href);
    u.searchParams.set("game", gameKey);
    u.searchParams.set("version", version);
    u.searchParams.set("maturity", maturity);
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

  function toolbarIconSvg(p) {
    return PLATFORM_SVG[p].replace(/width="20"/, 'width="18"').replace(/height="20"/, 'height="18"');
  }

  function rowItemKey(tr) {
    return tr.dataset.gameKey + "\0" + tr.dataset.maturity;
  }

  function applyRowFilters() {
    var platOn = activeFilterPlatforms.size > 0;
    var matOn = activeFilterMaturities.size > 0;
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
      row.hidden = !(okPlat && okMat);
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
  }

  function mountCatalogToolbar() {
    if (!toolbarEl) return;
    activeFilterPlatforms.clear();
    activeFilterMaturities.clear();
    toolbarEl.innerHTML = "";
    toolbarEl.hidden = false;

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
        });

        platGroup.appendChild(btn);
      })(uiPlatformOrder[pi]);
    }

    left.appendChild(platLabel);
    left.appendChild(platGroup);

    var right = document.createElement("div");
    right.className = "catalog-toolbar-right";

    var matLabel = document.createElement("span");
    matLabel.className = "catalog-toolbar-label";
    matLabel.textContent = "Channel";

    var matGroup = document.createElement("div");
    matGroup.className = "catalog-toolbar-toggles";
    matGroup.setAttribute("role", "group");
    matGroup.setAttribute("aria-label", "Filter released vs prototype");

    [["released", "Released"], ["prototype", "Prototype"]].forEach(function (pair) {
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
          syncFilterButtonPressedStates();
          applyRowFilters();
        });
        matGroup.appendChild(btn);
      })(mat, label);
    });

    right.appendChild(matLabel);
    right.appendChild(matGroup);

    toolbarEl.appendChild(left);
    toolbarEl.appendChild(right);
  }

  function hasPlayable(info, platform) {
    return !!(info && info.play_url && (platform === "wasm" || platform === "web"));
  }

  function buildIconRow() {
    var parts = [];
    for (var i = 0; i < uiPlatformOrder.length; i++) {
      var p = uiPlatformOrder[i];
      parts.push(
        '<span class="plat-icon" data-plat="' +
          escapeAttr(p) +
          '">' +
          PLATFORM_SVG[p] +
          "</span>"
      );
    }
    return '<div class="plat-icons" aria-hidden="true">' + parts.join("") + "</div>";
  }

  function updateRow(tr, itemsByKey) {
    var g = itemsByKey[rowItemKey(tr)];
    if (!g) return;

    var gameKey = tr.dataset.gameKey;
    var maturity = tr.dataset.maturity;
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
      playA.href = playHref(gameKey, ver, maturity);
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
      el.classList.toggle("plat-icon--avail", avail);
      el.classList.toggle("plat-icon--selected", avail && sel);
    }
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
    if (PAGE_SECTION === "apps") {
      return "No apps in catalog yet. Publish apps (e.g. SpacetimeDB Chat workflow) with AWS OIDC configured.";
    }
    return "No game builds in catalog yet. Run game CI (non-PR) with AWS OIDC configured.";
  }

  async function load() {
    var base = catalogBaseTrimmed();
    var releasedUrl = base + "/" + PAGE_SECTION + "/released/catalog.json";
    var prototypeUrl = base + "/" + PAGE_SECTION + "/prototype/catalog.json";

    var releasedDoc = await fetchCatalogJson(releasedUrl);
    var prototypeDoc = await fetchCatalogJson(prototypeUrl);

    if (!releasedDoc && !prototypeDoc) {
      showStatus("Nothing Available", true);
      return;
    }

    var rows = [];
    function collect(doc, maturity) {
      if (!doc) return;
      var bucket = doc[ROOT_KEY] || {};
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
          gameKey: gameKey,
          maturity: maturity,
          g: g,
          name: name,
          verKeys: verKeys,
        });
      }
    }

    collect(releasedDoc, "released");
    collect(prototypeDoc, "prototype");

    rows.sort(function (a, b) {
      var c = a.name.localeCompare(b.name);
      if (c !== 0) return c;
      if (a.maturity === b.maturity) return 0;
      return a.maturity === "released" ? -1 : 1;
    });

    if (rows.length === 0) {
      showStatus(emptyMessage(), false);
      return;
    }

    var itemsByKey = Object.create(null);
    for (var ri = 0; ri < rows.length; ri++) {
      var r = rows[ri];
      itemsByKey[r.gameKey + "\0" + r.maturity] = r.g;
    }

    statusEl.hidden = true;
    mountCatalogToolbar();

    var frag = document.createDocumentFragment();

    for (var rj = 0; rj < rows.length; rj++) {
      var item = rows[rj];
      var tr = document.createElement("tr");
      tr.className = "catalog-row";
      tr.dataset.gameKey = item.gameKey;
      tr.dataset.maturity = item.maturity;
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
    applyRowFilters();

    rowsEl.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || (!t.classList.contains("js-version") && !t.classList.contains("js-platform"))) return;
      var row = t.closest("tr.catalog-row");
      if (row) updateRow(row, itemsByKey);
    });
  }

  load();
})();
