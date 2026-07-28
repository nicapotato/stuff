/* Stuff /activity — version release timeline. Projects map to hues;
 * click toggles, double-click isolates, click isolated hue re-adds others,
 * Reset restores all. Markers: ★ major, ▲ minor, ● patch (vs prior release).
 * First released version after prototype history is marked Prototype → Released.
 * View modes: detail (every release) or year aggregation. Fails loudly when
 * catalogs cannot be loaded.
 */
(function () {
  "use strict";

  var CATALOG_BASE = window.__STUFF_CATALOG_BASE__;
  var catalogBaseOverride = new URLSearchParams(window.location.search).get("catalogBase");
  if (catalogBaseOverride) CATALOG_BASE = catalogBaseOverride;
  if (!CATALOG_BASE) {
    throw new Error("activity.js: set window.__STUFF_CATALOG_BASE__ before loading");
  }

  var statusEl = document.getElementById("status");
  var legendEl = document.getElementById("activityLegend");
  var resetBtn = document.getElementById("activityReset");
  var canvas = document.getElementById("activityChart");
  var tooltipEl = document.getElementById("activityTooltip");
  var viewDetailBtn = document.getElementById("viewDetail");
  var viewYearBtn = document.getElementById("viewYear");
  var filtersEl = document.getElementById("activityFilters");
  if (!statusEl || !legendEl || !resetBtn || !canvas || !tooltipEl) {
    throw new Error("activity.js: missing required DOM nodes");
  }
  if (!viewDetailBtn || !viewYearBtn) {
    throw new Error("activity.js: missing view mode controls");
  }
  if (!filtersEl) {
    throw new Error("activity.js: missing activityFilters container");
  }

  var ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("activity.js: canvas 2d context unavailable");

  // Quickstarts are omitted from activity (dedicated /quickstart/ table).
  var MATURITY_VALUES = ["released", "prototype"];
  var CATEGORY_VALUES = ["games", "apps"];

  /** @type {{key:string,name:string,hue:number,visible:boolean}[]} */
  var projects = [];
  /** @type {Record<string,{key:string,name:string,hue:number,visible:boolean}>} */
  var projectByKey = Object.create(null);
  /** @type {{t:number,iso:string,projectKey:string,name:string,version:string,maturity:string,category:string,bump:string,transition?:boolean}[]} */
  var events = [];
  /** When set, only this project is visible (double-click isolate). */
  var isolatedKey = null;
  /** "detail" = every release; "year" = one marker per project per calendar year. */
  var viewMode = "detail";
  var activeFilterCategories = new Set();
  var activeFilterMaturities = new Set();
  var urlWriteSuppressed = false;
  var clickTimer = null;
  var hoverEvent = null;
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var LABEL_CHARS = 35;
  var LABEL_FONT = "12px system-ui, -apple-system, sans-serif";

  var PAD = { top: 28, right: 24, bottom: 44, left: 280 };

  function showStatus(msg, isError) {
    statusEl.hidden = false;
    statusEl.classList.toggle("error", !!isError);
    statusEl.classList.toggle("banner--load-fail", !!isError);
    if (isError) {
      statusEl.innerHTML =
        '<div class="banner-error-title">ERROR</div>' +
        '<div class="banner-error-detail">' +
        escapeHtml(msg) +
        "</div>";
    } else {
      statusEl.textContent = msg;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function catalogBaseTrimmed() {
    return String(CATALOG_BASE).replace(/\/+$/, "");
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

  function releasedAtMs(raw) {
    if (raw == null || raw === "") return NaN;
    var t = new Date(raw).getTime();
    return Number.isNaN(t) ? NaN : t;
  }

  function hashHue(key) {
    var h = 0;
    for (var i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return h % 360;
  }

  function hueColor(hue, alpha) {
    return "hsla(" + hue + ", 72%, 62%, " + (alpha == null ? 1 : alpha) + ")";
  }

  /** Parse MAJOR.MINOR.PATCH prefix (e.g. 0.1.35 or 0.0.15-wasd-prototype). */
  function parseSemver(version) {
    var m = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return { major: +m[1], minor: +m[2], patch: +m[3] };
  }

  function bumpKind(prev, curr) {
    if (!curr) return "patch";
    if (!prev) return "major";
    if (curr.major !== prev.major) return "major";
    if (curr.minor !== prev.minor) return "minor";
    return "patch";
  }

  function annotateBumps(list) {
    var byProject = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      if (!byProject[ev.projectKey]) byProject[ev.projectKey] = [];
      byProject[ev.projectKey].push(ev);
    }
    var keys = Object.keys(byProject);
    for (var ki = 0; ki < keys.length; ki++) {
      var group = byProject[keys[ki]];
      group.sort(function (a, b) {
        if (a.t !== b.t) return a.t - b.t;
        return a.version.localeCompare(b.version, undefined, { numeric: true });
      });
      var prev = null;
      for (var gi = 0; gi < group.length; gi++) {
        var cur = parseSemver(group[gi].version);
        group[gi].bump = bumpKind(prev, cur);
        if (cur) prev = cur;
      }
    }
  }

  /**
   * Mark the first released version that follows at least one earlier prototype
   * build for the same project (prototype → release graduation).
   */
  function annotateTransitions(list) {
    var byProject = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      ev.transition = false;
      if (!byProject[ev.projectKey]) byProject[ev.projectKey] = [];
      byProject[ev.projectKey].push(ev);
    }
    var keys = Object.keys(byProject);
    for (var ki = 0; ki < keys.length; ki++) {
      var group = byProject[keys[ki]].slice().sort(function (a, b) {
        if (a.t !== b.t) return a.t - b.t;
        return a.version.localeCompare(b.version, undefined, { numeric: true });
      });
      var sawPrototype = false;
      var marked = false;
      for (var gi = 0; gi < group.length; gi++) {
        var cur = group[gi];
        if (cur.maturity === "prototype") {
          sawPrototype = true;
          continue;
        }
        if (!marked && sawPrototype && cur.maturity === "released") {
          cur.transition = true;
          marked = true;
        }
      }
    }
  }

  function maturityLabel(mat) {
    if (mat === "released") return "Released";
    if (mat === "prototype") return "Prototype";
    return String(mat || "");
  }

  function collectEvents(doc, maturity, category, out) {
    if (!doc) return;
    var rootKey = category === "apps" ? "apps" : "games";
    var bucket = doc[rootKey] || {};
    var keys = Object.keys(bucket);
    for (var i = 0; i < keys.length; i++) {
      var gameKey = keys[i];
      var g = bucket[gameKey] || {};
      var name = g.display_name || gameKey;
      var projectKey = category + "/" + gameKey;
      var versions = g.versions || {};
      var verKeys = Object.keys(versions);
      for (var vi = 0; vi < verKeys.length; vi++) {
        var version = verKeys[vi];
        var v = versions[version] || {};
        var t = releasedAtMs(v.released_at);
        if (Number.isNaN(t)) continue;
        out.push({
          t: t,
          iso: String(v.released_at),
          projectKey: projectKey,
          name: name,
          version: version,
          maturity: maturity,
          category: category,
          bump: "patch",
        });
      }
    }
  }

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
      var mv = parseListParam(sp, "maturity").map(function (m) {
        return m.toLowerCase();
      });
      if (mv.indexOf("all") >= 0) {
        for (var ai = 0; ai < MATURITY_VALUES.length; ai++) {
          activeFilterMaturities.add(MATURITY_VALUES[ai]);
        }
      } else {
        for (var mi = 0; mi < MATURITY_VALUES.length; mi++) {
          if (mv.indexOf(MATURITY_VALUES[mi]) >= 0) {
            activeFilterMaturities.add(MATURITY_VALUES[mi]);
          }
        }
      }
      if (activeFilterMaturities.size === 0) activeFilterMaturities.add("released");
    }

    activeFilterCategories.clear();
    var cv = parseListParam(sp, "category");
    if (cv.length === 0) {
      activeFilterCategories.add("games");
      activeFilterCategories.add("apps");
    } else {
      for (var ci = 0; ci < cv.length; ci++) {
        var c = cv[ci].toLowerCase();
        if (c === "games" || c === "apps") activeFilterCategories.add(c);
      }
      if (activeFilterCategories.size === 0) {
        activeFilterCategories.add("games");
        activeFilterCategories.add("apps");
      }
    }
  }

  function writeFiltersToUrl() {
    if (urlWriteSuppressed) return;
    var sp = new URLSearchParams(window.location.search);
    sp.delete("maturity");
    sp.delete("category");

    var defaultMaturity =
      activeFilterMaturities.size === 1 && activeFilterMaturities.has("released");
    if (!defaultMaturity) {
      var mlist = [];
      for (var mi = 0; mi < MATURITY_VALUES.length; mi++) {
        if (activeFilterMaturities.has(MATURITY_VALUES[mi])) mlist.push(MATURITY_VALUES[mi]);
      }
      if (mlist.length) sp.set("maturity", mlist.join(","));
    }

    var defaultCat =
      activeFilterCategories.size === 2 &&
      activeFilterCategories.has("games") &&
      activeFilterCategories.has("apps");
    if (!defaultCat && activeFilterCategories.size > 0) {
      var clist = [];
      for (var ci = 0; ci < CATEGORY_VALUES.length; ci++) {
        if (activeFilterCategories.has(CATEGORY_VALUES[ci])) clist.push(CATEGORY_VALUES[ci]);
      }
      if (clist.length) sp.set("category", clist.join(","));
    }

    var qs = sp.toString();
    var next = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    window.history.replaceState(null, "", next);
  }

  function syncFilterButtonPressedStates() {
    var mats = filtersEl.querySelectorAll("button.mat-filter");
    for (var i = 0; i < mats.length; i++) {
      var mid = mats[i].getAttribute("data-mat");
      mats[i].setAttribute(
        "aria-pressed",
        activeFilterMaturities.has(mid) ? "true" : "false"
      );
    }
    var cats = filtersEl.querySelectorAll("button.cat-filter");
    for (var ci = 0; ci < cats.length; ci++) {
      var cid = cats[ci].getAttribute("data-cat");
      cats[ci].setAttribute(
        "aria-pressed",
        activeFilterCategories.has(cid) ? "true" : "false"
      );
    }
  }

  function applyCatalogFilters() {
    if (isolatedKey && !projectsInFilter().some(function (p) {
      return p.key === isolatedKey;
    })) {
      isolatedKey = null;
      for (var i = 0; i < projects.length; i++) projects[i].visible = true;
    }
    hoverEvent = null;
    tooltipEl.hidden = true;
    mountLegend();
    syncFilterButtonPressedStates();
    syncResetEnabled();
    writeFiltersToUrl();
    draw();
  }

  function mountActivityFilters() {
    filtersEl.innerHTML = "";
    filtersEl.hidden = false;

    var row = document.createElement("div");
    row.className = "catalog-toolbar-row";

    var center = document.createElement("div");
    center.className = "catalog-toolbar-center";

    var catLabel = document.createElement("span");
    catLabel.className = "catalog-toolbar-label";
    catLabel.textContent = "Category";
    var catGroup = document.createElement("div");
    catGroup.className = "catalog-toolbar-toggles";
    catGroup.setAttribute("role", "group");
    catGroup.setAttribute("aria-label", "Filter games vs apps");
    [
      ["games", "Games"],
      ["apps", "Apps"],
    ].forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-filter";
      btn.setAttribute("data-cat", pair[0]);
      btn.setAttribute("aria-pressed", "false");
      btn.title = "Toggle filter: " + pair[1];
      btn.textContent = pair[1];
      btn.addEventListener("click", function () {
        if (activeFilterCategories.has(pair[0])) activeFilterCategories.delete(pair[0]);
        else activeFilterCategories.add(pair[0]);
        if (activeFilterCategories.size === 0) {
          activeFilterCategories.add("games");
          activeFilterCategories.add("apps");
        }
        applyCatalogFilters();
      });
      catGroup.appendChild(btn);
    });
    center.appendChild(catLabel);
    center.appendChild(catGroup);

    var matLabel = document.createElement("span");
    matLabel.className = "catalog-toolbar-label";
    matLabel.textContent = "Channel";
    var matGroup = document.createElement("div");
    matGroup.className = "catalog-toolbar-toggles";
    matGroup.setAttribute("role", "group");
    matGroup.setAttribute("aria-label", "Filter released or prototype");
    [
      ["released", "Released"],
      ["prototype", "Prototype"],
    ].forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mat-filter";
      btn.setAttribute("data-mat", pair[0]);
      btn.setAttribute("aria-pressed", "false");
      btn.title = "Toggle filter: " + pair[1];
      btn.textContent = pair[1];
      btn.addEventListener("click", function () {
        if (activeFilterMaturities.has(pair[0])) activeFilterMaturities.delete(pair[0]);
        else activeFilterMaturities.add(pair[0]);
        if (activeFilterMaturities.size === 0) activeFilterMaturities.add("released");
        applyCatalogFilters();
      });
      matGroup.appendChild(btn);
    });
    center.appendChild(matLabel);
    center.appendChild(matGroup);

    row.appendChild(center);
    filtersEl.appendChild(row);
    syncFilterButtonPressedStates();
  }

  function filteredEvents() {
    return events.filter(function (ev) {
      return (
        activeFilterCategories.has(ev.category) &&
        activeFilterMaturities.has(ev.maturity)
      );
    });
  }

  function projectsInFilter() {
    var seen = Object.create(null);
    var out = [];
    var filtered = filteredEvents();
    for (var i = 0; i < filtered.length; i++) {
      var key = filtered[i].projectKey;
      if (seen[key]) continue;
      seen[key] = true;
      var p = projectByKey[key];
      if (p) out.push(p);
    }
    out.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    return out;
  }

  function syncResetEnabled() {
    var inFilter = projectsInFilter();
    var allOn =
      inFilter.length > 0 &&
      inFilter.every(function (p) {
        return p.visible;
      });
    resetBtn.disabled = allOn && isolatedKey == null;
  }

  function setAllVisible() {
    isolatedKey = null;
    for (var i = 0; i < projects.length; i++) projects[i].visible = true;
    syncLegend();
    syncResetEnabled();
    draw();
  }

  function toggleProject(key) {
    var p = projectByKey[key];
    if (!p) return;
    if (isolatedKey === key) {
      setAllVisible();
      return;
    }
    if (isolatedKey != null) {
      isolatedKey = null;
      p.visible = !p.visible;
    } else {
      p.visible = !p.visible;
    }
    var any = projectsInFilter().some(function (x) {
      return x.visible;
    });
    if (!any) p.visible = true;
    syncLegend();
    syncResetEnabled();
    draw();
  }

  function isolateProject(key) {
    var p = projectByKey[key];
    if (!p) return;
    isolatedKey = key;
    for (var i = 0; i < projects.length; i++) {
      projects[i].visible = projects[i].key === key;
    }
    syncLegend();
    syncResetEnabled();
    draw();
  }

  function syncLegend() {
    var buttons = legendEl.querySelectorAll("button.activity-hue");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var key = btn.getAttribute("data-key");
      var p = projectByKey[key];
      if (!p) continue;
      btn.classList.toggle("is-off", !p.visible);
      btn.classList.toggle("is-isolated", isolatedKey === key);
      btn.setAttribute("aria-pressed", p.visible ? "true" : "false");
    }
  }

  function syncViewModeButtons() {
    viewDetailBtn.setAttribute("aria-pressed", viewMode === "detail" ? "true" : "false");
    viewYearBtn.setAttribute("aria-pressed", viewMode === "year" ? "true" : "false");
    viewDetailBtn.classList.toggle("is-active", viewMode === "detail");
    viewYearBtn.classList.toggle("is-active", viewMode === "year");
  }

  function setViewMode(mode) {
    if (mode !== "detail" && mode !== "year") {
      throw new Error("activity.js: invalid view mode " + mode);
    }
    if (viewMode === mode) return;
    viewMode = mode;
    hoverEvent = null;
    tooltipEl.hidden = true;
    syncViewModeButtons();
    draw();
  }

  function mountLegend() {
    legendEl.hidden = false;
    legendEl.innerHTML = "";
    var frag = document.createDocumentFragment();
    var list = projectsInFilter();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "activity-hue";
      btn.setAttribute("data-key", p.key);
      btn.setAttribute("aria-pressed", p.visible ? "true" : "false");
      btn.classList.toggle("is-off", !p.visible);
      btn.classList.toggle("is-isolated", isolatedKey === p.key);
      btn.title = "Click to toggle · double-click to isolate";
      btn.innerHTML =
        '<span class="activity-hue-swatch" style="background:' +
        hueColor(p.hue) +
        '"></span>' +
        '<span class="activity-hue-label">' +
        escapeHtml(p.name) +
        "</span>";

      (function (projectKey) {
        btn.addEventListener("click", function () {
          if (clickTimer) clearTimeout(clickTimer);
          clickTimer = setTimeout(function () {
            clickTimer = null;
            toggleProject(projectKey);
          }, 220);
        });
        btn.addEventListener("dblclick", function (ev) {
          ev.preventDefault();
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
          }
          isolateProject(projectKey);
        });
      })(p.key);

      frag.appendChild(btn);
    }
    legendEl.appendChild(frag);
  }

  function visibleProjects() {
    return projectsInFilter().filter(function (p) {
      return p.visible;
    });
  }

  function visibleRawEvents() {
    var list = filteredEvents().filter(function (ev) {
      var p = projectByKey[ev.projectKey];
      return p && p.visible;
    });
    // Recompute bumps within the active category/channel filter.
    // Keep transition flags from the full timeline (prototype history may be filtered out).
    var copies = list.map(function (ev) {
      return {
        t: ev.t,
        iso: ev.iso,
        projectKey: ev.projectKey,
        name: ev.name,
        version: ev.version,
        maturity: ev.maturity,
        category: ev.category,
        bump: ev.bump,
        transition: !!ev.transition,
      };
    });
    annotateBumps(copies);
    return copies;
  }

  /** Points actually plotted (raw releases, or one aggregated point per project-year). */
  function plotEvents() {
    var raw = visibleRawEvents();
    if (viewMode === "detail") return raw;

    // Group by project, then emit one point per calendar year. Bump is the net
    // change from the last version before that year to the last version in it.
    var byProject = Object.create(null);
    for (var i = 0; i < raw.length; i++) {
      var ev = raw[i];
      if (!byProject[ev.projectKey]) byProject[ev.projectKey] = [];
      byProject[ev.projectKey].push(ev);
    }

    var out = [];
    var projectKeys = Object.keys(byProject);
    for (var pi = 0; pi < projectKeys.length; pi++) {
      var group = byProject[projectKeys[pi]].slice().sort(function (a, b) {
        if (a.t !== b.t) return a.t - b.t;
        return a.version.localeCompare(b.version, undefined, { numeric: true });
      });
      var yearMap = Object.create(null);
      for (var gi = 0; gi < group.length; gi++) {
        var gEv = group[gi];
        var year = new Date(gEv.t).getUTCFullYear();
        if (!yearMap[year]) yearMap[year] = [];
        yearMap[year].push(gEv);
      }
      var years = Object.keys(yearMap)
        .map(function (y) {
          return +y;
        })
        .sort(function (a, b) {
          return a - b;
        });
      var prevSem = null;
      for (var yi = 0; yi < years.length; yi++) {
        var y = years[yi];
        var list = yearMap[y];
        var last = list[list.length - 1];
        var lastSem = parseSemver(last.version);
        var versions = list.map(function (e) {
          return e.version;
        });
        var yearTransition = false;
        for (var ti = 0; ti < list.length; ti++) {
          if (list[ti].transition) {
            yearTransition = true;
            break;
          }
        }
        out.push({
          t: last.t,
          iso: last.iso,
          projectKey: last.projectKey,
          name: last.name,
          version: last.version,
          maturity: last.maturity,
          category: last.category,
          bump: bumpKind(prevSem, lastSem),
          transition: yearTransition,
          year: y,
          versions: versions,
          aggregated: true,
        });
        if (lastSem) prevSem = lastSem;
      }
    }

    out.sort(function (a, b) {
      return a.t - b.t;
    });
    return out;
  }

  function measureLabelPad() {
    ctx.font = LABEL_FONT;
    var sample = new Array(LABEL_CHARS + 1).join("M");
    return Math.ceil(ctx.measureText(sample).width) + 20;
  }

  function layoutMetrics() {
    PAD.left = Math.max(280, measureLabelPad());
    var cssW = canvas.clientWidth || canvas.width / dpr;
    var lanes = Math.max(1, visibleProjects().length);
    var laneH = 36;
    var cssH = PAD.top + PAD.bottom + lanes * laneH;
    cssH = Math.max(280, Math.min(720, cssH));
    return { cssW: cssW, cssH: cssH, laneH: laneH, lanes: lanes };
  }

  function resizeCanvas() {
    var m = layoutMetrics();
    canvas.style.height = m.cssH + "px";
    canvas.width = Math.round(m.cssW * dpr);
    canvas.height = Math.round(m.cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return m;
  }

  function plotBounds(m) {
    return {
      x0: PAD.left,
      x1: m.cssW - PAD.right,
      y0: PAD.top,
      y1: m.cssH - PAD.bottom,
    };
  }

  function timeDomain(visibleEvents) {
    if (!visibleEvents.length) {
      var now = Date.now();
      return { t0: now - 86400000 * 30, t1: now };
    }
    var t0 = visibleEvents[0].t;
    var t1 = visibleEvents[0].t;
    for (var i = 1; i < visibleEvents.length; i++) {
      if (visibleEvents[i].t < t0) t0 = visibleEvents[i].t;
      if (visibleEvents[i].t > t1) t1 = visibleEvents[i].t;
    }
    if (viewMode === "year") {
      var y0 = new Date(t0).getUTCFullYear();
      var y1 = new Date(t1).getUTCFullYear();
      t0 = Date.UTC(y0, 0, 1);
      t1 = Date.UTC(y1, 11, 31, 23, 59, 59);
    }
    if (t0 === t1) {
      t0 -= 86400000 * 3;
      t1 += 86400000 * 3;
    } else {
      var pad = (t1 - t0) * 0.06;
      t0 -= pad;
      t1 += pad;
    }
    return { t0: t0, t1: t1 };
  }

  function xForTime(t, bounds, domain) {
    var span = domain.t1 - domain.t0;
    if (span <= 0) return bounds.x0;
    return bounds.x0 + ((t - domain.t0) / span) * (bounds.x1 - bounds.x0);
  }

  function formatTick(t) {
    var d = new Date(t);
    if (viewMode === "year") {
      return String(d.getUTCFullYear());
    }
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function truncateLabel(name) {
    var s = String(name);
    if (s.length <= LABEL_CHARS) return s;
    return s.slice(0, LABEL_CHARS - 1) + "…";
  }

  function starPath(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      var ox = x + Math.cos(a) * r;
      var oy = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      var a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
  }

  function trianglePath(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.9, y + r * 0.75);
    ctx.lineTo(x - r * 0.9, y + r * 0.75);
    ctx.closePath();
  }

  function drawTransitionHalo(x, y, r) {
    ctx.beginPath();
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 2;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1;
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMarker(ev, x, y, highlighted) {
    var p = projectByKey[ev.projectKey];
    var color = hueColor(p.hue, 0.95);
    if (ev.transition) {
      drawTransitionHalo(x, y, highlighted ? 11 : 9);
    }
    if (ev.bump === "major") {
      var majorR = highlighted ? 8 : 6;
      ctx.fillStyle = color;
      starPath(x, y, majorR);
      ctx.fill();
      if (highlighted) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        starPath(x, y, majorR);
        ctx.stroke();
      }
      return;
    }
    if (ev.bump === "minor") {
      var minorR = highlighted ? 5 : 3.5;
      ctx.fillStyle = color;
      trianglePath(x, y, minorR);
      ctx.fill();
      if (highlighted) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.25;
        trianglePath(x, y, minorR);
        ctx.stroke();
      }
      return;
    }
    // patch — filled circle (smaller than major/minor)
    var patchR = highlighted ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, patchR, 0, Math.PI * 2);
    ctx.fill();
    if (highlighted) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }

  function draw() {
    var m = resizeCanvas();
    var bounds = plotBounds(m);
    var vis = visibleProjects();
    var plotted = plotEvents();
    var domain = timeDomain(plotted);

    ctx.clearRect(0, 0, m.cssW, m.cssH);
    ctx.fillStyle = "#12161c";
    ctx.fillRect(0, 0, m.cssW, m.cssH);

    ctx.strokeStyle = "#2d3540";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bounds.x0, bounds.y0);
    ctx.lineTo(bounds.x0, bounds.y1);
    ctx.lineTo(bounds.x1, bounds.y1);
    ctx.stroke();

    var tickN =
      viewMode === "year"
        ? Math.max(1, new Date(domain.t1).getUTCFullYear() - new Date(domain.t0).getUTCFullYear())
        : Math.max(3, Math.min(7, Math.floor((bounds.x1 - bounds.x0) / 120)));
    if (viewMode === "year") tickN = Math.min(tickN, 12);

    ctx.fillStyle = "#9aa3ad";
    ctx.font = LABEL_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var ti = 0; ti <= tickN; ti++) {
      var tt = domain.t0 + ((domain.t1 - domain.t0) * ti) / tickN;
      var tx = xForTime(tt, bounds, domain);
      ctx.strokeStyle = "#222831";
      ctx.beginPath();
      ctx.moveTo(tx, bounds.y0);
      ctx.lineTo(tx, bounds.y1);
      ctx.stroke();
      ctx.fillStyle = "#9aa3ad";
      ctx.fillText(formatTick(tt), tx, bounds.y1 + 10);
    }

    var laneIndex = Object.create(null);
    for (var li = 0; li < vis.length; li++) laneIndex[vis[li].key] = li;

    var plotH = bounds.y1 - bounds.y0;
    var laneH = plotH / Math.max(1, vis.length);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var lj = 0; lj < vis.length; lj++) {
      var yp = bounds.y0 + laneH * (lj + 0.5);
      ctx.strokeStyle = "#1a2028";
      ctx.beginPath();
      ctx.moveTo(bounds.x0, yp);
      ctx.lineTo(bounds.x1, yp);
      ctx.stroke();
      ctx.fillStyle = hueColor(vis[lj].hue);
      ctx.font = LABEL_FONT;
      ctx.fillText(truncateLabel(vis[lj].name), bounds.x0 - 10, yp);
    }

    for (var ei = 0; ei < plotted.length; ei++) {
      var ev = plotted[ei];
      var lane = laneIndex[ev.projectKey];
      if (lane == null) continue;
      var x = xForTime(ev.t, bounds, domain);
      var y = bounds.y0 + laneH * (lane + 0.5);
      drawMarker(ev, x, y, hoverEvent === ev);
    }

    if (!plotted.length) {
      ctx.fillStyle = "#9aa3ad";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        "No visible releases — reset hues or enable a project.",
        (bounds.x0 + bounds.x1) / 2,
        (bounds.y0 + bounds.y1) / 2
      );
    }
  }

  function eventAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var m = layoutMetrics();
    var bounds = plotBounds(m);
    var vis = visibleProjects();
    var plotted = plotEvents();
    var domain = timeDomain(plotted);
    var laneIndex = Object.create(null);
    for (var i = 0; i < vis.length; i++) laneIndex[vis[i].key] = i;
    var plotH = bounds.y1 - bounds.y0;
    var laneH = plotH / Math.max(1, vis.length);
    var best = null;
    var bestD = 14;
    for (var ei = 0; ei < plotted.length; ei++) {
      var ev = plotted[ei];
      var lane = laneIndex[ev.projectKey];
      if (lane == null) continue;
      var px = xForTime(ev.t, bounds, domain);
      var py = bounds.y0 + laneH * (lane + 0.5);
      var d = Math.hypot(px - x, py - y);
      if (d < bestD) {
        bestD = d;
        best = ev;
      }
    }
    return best;
  }

  function showTooltip(ev, clientX, clientY) {
    if (!ev) {
      tooltipEl.hidden = true;
      return;
    }
    var when;
    try {
      when = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(ev.t));
    } catch (e) {
      when = ev.iso;
    }
    var bumpLabel =
      ev.bump === "major" ? "major ★" : ev.bump === "minor" ? "minor ▲" : "patch ●";
    var channelLine = ev.transition
      ? '<span class="activity-tooltip-transition">Prototype → Released</span>'
      : escapeHtml(maturityLabel(ev.maturity));
    var versionLine;
    if (ev.aggregated && ev.versions && ev.versions.length > 1) {
      versionLine =
        ev.year +
        " · " +
        ev.versions.length +
        " releases (highest: " +
        bumpLabel +
        ")<br>" +
        channelLine +
        "<br>" +
        escapeHtml(ev.versions.join(", "));
    } else {
      versionLine =
        escapeHtml(ev.version) +
        " · " +
        bumpLabel +
        "<br>" +
        channelLine +
        "<br>" +
        escapeHtml(when);
    }
    tooltipEl.hidden = false;
    tooltipEl.innerHTML =
      "<strong>" + escapeHtml(ev.name) + "</strong><br>" + versionLine;
    var wrap = canvas.parentElement.getBoundingClientRect();
    tooltipEl.style.left = clientX - wrap.left + 12 + "px";
    tooltipEl.style.top = clientY - wrap.top + 12 + "px";
  }

  canvas.addEventListener("mousemove", function (ev) {
    var hit = eventAt(ev.clientX, ev.clientY);
    if (hit !== hoverEvent) {
      hoverEvent = hit;
      draw();
    }
    showTooltip(hit, ev.clientX, ev.clientY);
    canvas.style.cursor = hit ? "pointer" : "default";
  });

  canvas.addEventListener("mouseleave", function () {
    hoverEvent = null;
    tooltipEl.hidden = true;
    draw();
  });

  resetBtn.addEventListener("click", function () {
    setAllVisible();
  });

  viewDetailBtn.addEventListener("click", function () {
    setViewMode("detail");
  });
  viewYearBtn.addEventListener("click", function () {
    setViewMode("year");
  });

  window.addEventListener("resize", function () {
    draw();
  });

  async function load() {
    readFiltersFromUrl();
    showStatus("Loading catalogs…", false);
    var base = catalogBaseTrimmed();
    var tuples = [
      [base + "/games/released/catalog.json", "released", "games"],
      [base + "/games/prototype/catalog.json", "prototype", "games"],
      [base + "/apps/released/catalog.json", "released", "apps"],
      [base + "/apps/prototype/catalog.json", "prototype", "apps"],
    ];

    var docs;
    try {
      docs = await Promise.all(
        tuples.map(function (t) {
          return fetchCatalogJson(t[0]);
        })
      );
    } catch (e) {
      showStatus("Failed to fetch catalogs: " + (e && e.message ? e.message : e), true);
      throw e;
    }

    var any = false;
    var collected = [];
    for (var i = 0; i < docs.length; i++) {
      if (docs[i]) any = true;
      collectEvents(docs[i], tuples[i][1], tuples[i][2], collected);
    }
    if (!any) {
      showStatus("Nothing Available", true);
      throw new Error("no catalogs returned");
    }
    // Same project/version can exist in prototype then later in released — keep one.
    var deduped = [];
    var seen = Object.create(null);
    var maturityPrefer = { released: 0, prototype: 1 };
    collected.sort(function (a, b) {
      var pa = maturityPrefer[a.maturity] != null ? maturityPrefer[a.maturity] : 9;
      var pb = maturityPrefer[b.maturity] != null ? maturityPrefer[b.maturity] : 9;
      if (pa !== pb) return pa - pb;
      return a.t - b.t;
    });
    for (var di = 0; di < collected.length; di++) {
      var ev = collected[di];
      var dk = ev.projectKey + "\0" + ev.version;
      if (seen[dk]) continue;
      seen[dk] = true;
      deduped.push(ev);
    }
    collected = deduped;
    if (!collected.length) {
      showStatus("No version releases with timestamps found in catalogs.", true);
      throw new Error("no dated version events");
    }

    annotateBumps(collected);
    annotateTransitions(collected);
    events = collected.sort(function (a, b) {
      return a.t - b.t;
    });

    var seen = Object.create(null);
    var list = [];
    for (var ei = 0; ei < events.length; ei++) {
      var ev = events[ei];
      if (seen[ev.projectKey]) continue;
      seen[ev.projectKey] = true;
      list.push({
        key: ev.projectKey,
        name: ev.name,
        hue: 0,
        visible: true,
      });
    }
    list.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    for (var pi = 0; pi < list.length; pi++) {
      list[pi].hue =
        list.length === 1 ? hashHue(list[pi].key) : Math.round((pi * 360) / list.length);
      projectByKey[list[pi].key] = list[pi];
    }
    projects = list;

    statusEl.hidden = true;
    mountActivityFilters();
    mountLegend();
    syncResetEnabled();
    syncViewModeButtons();
    writeFiltersToUrl();
    draw();

    window.addEventListener("popstate", function () {
      urlWriteSuppressed = true;
      readFiltersFromUrl();
      applyCatalogFilters();
      urlWriteSuppressed = false;
    });
  }

  load();
})();
