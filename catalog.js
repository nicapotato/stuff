(function () {
  var CATALOG_URL = window.__STUFF_CATALOG_URL__;
  var PAGE_KIND = window.__STUFF_PAGE_KIND__ || "released";
  if (!CATALOG_URL) {
    console.error("catalog.js: set window.__STUFF_CATALOG_URL__ before loading");
    return;
  }

  var statusEl = document.getElementById("status");
  var rowsEl = document.getElementById("rows");
  var platformOrder = ["wasm", "web", "macos", "windows"];

  var PLATFORM_SVG = {
    wasm:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2l8 4v12l-8 4-8-4V6l8-4zm-6 5.2v7.6l6 3V10.2l-6-3zm8 10.6l6-3V7.2l-6 3v7.6z"/></svg>',
    web:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 .001 20A10 10 0 0 0 12 2Zm7.93 9h-3.12a15.6 15.6 0 0 0-.62-3.9A8.03 8.03 0 0 1 19.93 11ZM16.9 13a12.5 12.5 0 0 1-.4 3 8.03 8.03 0 0 1-6.5 0 12.5 12.5 0 0 1-.4-3h7.3ZM8.53 13H5.41a8.02 8.02 0 0 1 0-2h3.12a17.5 17.5 0 0 0 0 2Zm1.58-2a13.7 13.7 0 0 1 .22-2.5h3.34c.1.83.17 1.67.22 2.5H10.11Zm4.78 0c-.05-.83-.12-1.67-.22-2.5h-3.34c-.1.83-.17 1.67-.22 2.5h3.78ZM9.81 5.1A15.6 15.6 0 0 0 9.19 9H6.07a8.03 8.03 0 0 1 3.74-3.9ZM6.07 15h3.12c.18 1.35.45 2.65.81 3.9A8.03 8.03 0 0 1 6.07 15Zm2.34 3.9c.36-1.25.63-2.55.81-3.9h4.56c.18 1.35.45 2.65.81 3.9a8.03 8.03 0 0 1-6.18 0Zm6.89-3.9h3.12a8.02 8.02 0 0 1-3.74 3.9c.36-1.25.63-2.55.81-3.9Zm.62-5.9h3.12a8.03 8.03 0 0 0-3.74-3.9c.36 1.25.63 2.55.81 3.9Z"/></svg>',
    macos:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
    windows:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 5.548l7.548-1.05v7.255H3V5.548zm0 13.902l7.548 1.048v-7.2H3v6.152zm8.452 1.144L21 21.548V14.75h-9.548v5.844zm0-15.644L21 2.452V9.25h-9.548V4.95z"/></svg>',
  };

  function showStatus(msg, isError) {
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle("error", !!isError);
  }

  function shortSha(hex) {
    if (!hex || hex.length < 16) return hex || "—";
    return hex.slice(0, 8) + "…" + hex.slice(-6);
  }

  function playHref(gameKey, version) {
    var u = new URL("play.html", window.location.href);
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
    for (var i = 0; i < platformOrder.length; i++) {
      var info = pl[platformOrder[i]];
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
    for (var i = 0; i < platformOrder.length; i++) {
      var p = platformOrder[i];
      if (pl[p] && pl[p].zip_url) out.push(p);
    }
    return out;
  }

  function hasPlayable(info, platform) {
    return !!(info && info.play_url && (platform === "wasm" || platform === "web"));
  }

  function buildIconRow() {
    var parts = [];
    for (var i = 0; i < platformOrder.length; i++) {
      var p = platformOrder[i];
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

  function updateRow(tr, games) {
    var gameKey = tr.dataset.gameKey;
    var g = games[gameKey];
    if (!g) return;

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

    tr.querySelector(".js-released").textContent = released;
    var shaShort = tr.querySelector(".js-sha-short");
    shaShort.textContent = shortSha(sha);
    shaShort.setAttribute("title", sha);
    var copyBtn = tr.querySelector(".copy-sha");
    copyBtn.dataset.sha = sha;

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
      playA.href = playHref(gameKey, ver);
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
      var pid = el.getAttribute("data-plat");
      var avail = available.indexOf(pid) >= 0;
      el.classList.toggle("plat-icon--avail", avail);
      el.classList.toggle("plat-icon--selected", avail && pid === plat);
    }
  }

  async function load() {
    var catalog;
    try {
      var res = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      catalog = await res.json();
    } catch (e) {
      showStatus(
        "Could not load catalog from S3. Check CORS, the bucket URL, and that CI has published this catalog.",
        true
      );
      return;
    }

    var games = catalog.games || {};
    var gameKeys = Object.keys(games);
    var rows = [];

    for (var gi = 0; gi < gameKeys.length; gi++) {
      var gameKey = gameKeys[gi];
      var g = games[gameKey] || {};
      var name = g.display_name || gameKey;
      var versions = g.versions || {};
      var verKeys = sortVersionsDesc(Object.keys(versions).filter(function (vk) {
        return versionHasZip(versions[vk]);
      }));
      if (verKeys.length === 0) continue;
      rows.push({ gameKey: gameKey, g: g, name: name, verKeys: verKeys });
    }

    rows.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    if (rows.length === 0) {
      showStatus(
        PAGE_KIND === "prototype"
          ? "No prototype builds in catalog yet. Run mindsweeper-js CI (non-PR) with AWS OIDC configured."
          : "Catalog is empty. Publish released builds (all three platforms) with AWS OIDC configured.",
        false
      );
      return;
    }

    statusEl.hidden = true;
    var frag = document.createDocumentFragment();

    for (var ri = 0; ri < rows.length; ri++) {
      var item = rows[ri];
      var tr = document.createElement("tr");
      tr.className = "catalog-row";
      tr.dataset.gameKey = item.gameKey;

      var verOptions = "";
      for (var vi = 0; vi < item.verKeys.length; vi++) {
        var vk = item.verKeys[vi];
        verOptions += '<option value="' + escapeAttr(vk) + '">' + escapeHtml(vk) + "</option>";
      }
      var nVer = item.verKeys.length;
      var vid = "stuff-ver-" + ri;
      var pid = "stuff-plat-" + ri;
      var vcid = "stuff-vc-" + ri;

      tr.innerHTML =
        "<td>" +
        escapeHtml(item.name) +
        "</td>" +
        '<td class="cell-version">' +
        '<label class="catalog-field-label" for="' +
        vid +
        '">Version</label>' +
        '<select id="' +
        vid +
        '" class="catalog-select js-version" aria-describedby="' +
        vcid +
        '">' +
        verOptions +
        "</select>" +
        '<span class="version-meta" id="' +
        vcid +
        '">' +
        nVer +
        " version" +
        (nVer === 1 ? "" : "s") +
        " available</span>" +
        "</td>" +
        '<td class="cell-platform">' +
        buildIconRow() +
        '<label class="catalog-field-label" for="' +
        pid +
        '">Platform</label>' +
        '<select id="' +
        pid +
        '" class="catalog-select js-platform"></select>' +
        "</td>" +
        '<td class="js-released">—</td>' +
        '<td class="sha">' +
        '<span class="sha-short js-sha-short" title="">—</span>' +
        '<span class="actions">' +
        '<button type="button" class="btn copy-sha" data-sha="">Copy</button>' +
        "</span></td>" +
        '<td><a class="js-zip" href="#" download rel="noopener">ZIP</a></td>' +
        '<td class="cell-play"><a class="play-link js-play" href="#" hidden>Play in browser</a><span class="js-play-dash">—</span></td>';

      frag.appendChild(tr);
      updateRow(tr, games);
    }

    rowsEl.appendChild(frag);

    rowsEl.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || (!t.classList.contains("js-version") && !t.classList.contains("js-platform"))) return;
      var row = t.closest("tr.catalog-row");
      if (row) updateRow(row, games);
    });

    rowsEl.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".copy-sha");
      if (!btn || !btn.dataset.sha) return;
      navigator.clipboard.writeText(btn.dataset.sha).then(
        function () {
          btn.textContent = "Copied";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1500);
        },
        function () {}
      );
    });
  }

  load();
})();
