(() => {
  "use strict";

  const defaults = {
    showHomeFeed: false,
    showSuggestions: false,
    showShorts: false,
    showLeftMenu: false,
    showEndCards: false,
    autoplayNext: false,
    gridSize: "compact",
  };
  const gridSizes = ["compact", "large", "extra-large"];
  const labels = {
    showHomeFeed: "Home feed",
    showSuggestions: "Watch suggestions",
    showShorts: "Shorts",
    showLeftMenu: "Left menu",
    showEndCards: "End cards",
    autoplayNext: "Autoplay next video",
  };
  let settings = { ...defaults };
  let controls;
  let gridButtons;
  let searchTools;
  let lastPalette = "";
  const cardSelector = "ytd-search ytd-video-renderer, ytd-search yt-lockup-view-model, ytd-search ytd-channel-renderer";
  const pendingCards = new Set();
  const channelInfo = new Map();
  let cardFrame = 0;
  let dedupeFrame = 0;
  let prefetchFrame = 0;
  let searchAlignmentFrame = 0;

  const gridIcons = {
    compact: [0, 7, 14].flatMap((y) => [0, 7, 14].map((x) => pixelFramePath(x, y, 6, 1))).join(" "),
    large: [0, 11].flatMap((y) => [0, 11].map((x) => pixelFramePath(x, y, 9, 2))).join(" "),
    "extra-large": pixelFramePath(0, 0, 20, 2),
  };
  const filterIcon = `M1 5h3v2H1zM10 5h9v2h-9zM1 13h10v2H1zM17 13h2v2h-2z ${pixelFramePath(4, 3, 6, 2)} ${pixelFramePath(11, 11, 6, 2)}`;

  function pixelFramePath(x, y, size, border) {
    const step = size >= 10 ? 2 : 1;
    return `M${x + step} ${y}H${x + size - step}V${y + step}H${x + size}V${y + size - step}H${x + size - step}V${y + size}H${x + step}V${y + size - step}H${x}V${y + step}H${x + step}Z ` +
      `M${x + border} ${y + border}h${size - border * 2}v${size - border * 2}h${border * 2 - size}Z`;
  }

  function pixelIcon(path) {
    return `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="currentColor" fill-rule="evenodd" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
  }

  function loadChannelInfo(path) {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => finish(null), 32000);
      function finish(info) {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        resolve(info);
      }
      function onMessage(event) {
        if (event.source === window && event.origin === location.origin &&
            event.data?.type === "ytf-channel-info-response" && event.data.id === id) {
          finish(event.data.info);
        }
      }
      window.addEventListener("message", onMessage);
      window.postMessage({ type: "ytf-channel-info-request", id, path }, location.origin);
    });
  }

  function channelName(card, path) {
    const title = card.querySelector("#channel-title a")?.textContent.trim() ||
      card.querySelector("#channel-title")?.textContent.trim() ||
      card.querySelector("#subscribers")?.textContent.trim() || path.slice(1);
    const words = title.split(/\s+/);
    const middle = words.length / 2;
    if (words.length % 2 === 0 &&
        words.slice(0, middle).join(" ") === words.slice(middle).join(" ")) {
      return words.slice(0, middle).join(" ");
    }
    return title;
  }

  function decorateChannel(card) {
    const link = card.querySelector("#main-link[href]");
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !/^\/(?:@|channel\/|c\/|user\/)/.test(url.pathname)) return;

    let preview = card.querySelector(":scope > .ytf-channel-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "ytf-channel-preview";
      card.prepend(preview);
    }
    let hero = card.querySelector(".ytf-channel-hero");
    if (!hero) {
      hero = document.createElement("a");
      hero.className = "ytf-channel-hero";
      hero.setAttribute("aria-label", "Open channel");
    }
    if (hero.parentElement !== preview) preview.prepend(hero);
    const content = card.querySelector("#content-section");
    if (content && content.parentElement !== preview) preview.append(content);
    if (hero.href !== url.href) hero.href = url.href;

    let caption = card.querySelector(":scope > .ytf-channel-caption");
    if (!caption) {
      caption = document.createElement("div");
      caption.className = "ytf-channel-caption";
      const title = document.createElement("a");
      title.className = "ytf-channel-caption-title";
      const subtitle = document.createElement("div");
      subtitle.className = "ytf-channel-caption-subtitle";
      caption.append(title, subtitle);
      card.append(caption);
    }
    const title = caption.querySelector(".ytf-channel-caption-title");
    const subtitle = caption.querySelector(".ytf-channel-caption-subtitle");
    const name = channelName(card, url.pathname);
    const description = card.querySelector("#description")?.textContent.trim() || "";
    if (title.href !== url.href) title.href = url.href;
    if (title.textContent !== name) title.textContent = name;
    if (subtitle.textContent !== description) subtitle.textContent = description;

    if (card.dataset.ytfChannel === url.pathname) return;
    hero.replaceChildren();
    card.querySelector(".ytf-channel-video-count")?.remove();
    card.dataset.ytfChannel = url.pathname;

    if (!channelInfo.has(url.pathname)) {
      channelInfo.set(url.pathname, loadChannelInfo(url.pathname));
    }
    channelInfo.get(url.pathname).then((info) => {
      if (!info || card.dataset.ytfChannel !== url.pathname) return;
      if (typeof info.banner === "string" && /^https:\/\//.test(info.banner)) {
        const image = document.createElement("img");
        image.src = info.banner;
        image.alt = "";
        hero.replaceChildren(image);
      }
      if (info.videos) {
        const metadata = card.querySelector("#metadata");
        if (!metadata) return;
        let count = metadata.querySelector(".ytf-channel-video-count");
        if (!count) {
          count = document.createElement("span");
          count.className = "ytf-channel-video-count";
          metadata.append(count);
        }
        count.textContent = info.videos;
      }
      if (!description && typeof info.description === "string" &&
          !subtitle.textContent && info.description.trim()) {
        subtitle.textContent = info.description.trim();
      }
    });
  }

  function decorateResults(cards = document.querySelectorAll(cardSelector)) {
    if (location.pathname !== "/results") return;
    for (const card of cards) {
      if (!card.isConnected) continue;
      if (card.matches("ytd-channel-renderer")) {
        decorateChannel(card);
        continue;
      }
      const lockup = card.matches("yt-lockup-view-model");
      if (lockup) {
        const title = card.querySelector(".ytLockupMetadataViewModelTitle");
        const fullTitle = title?.textContent.trim();
        if (fullTitle && title.title !== fullTitle) title.title = fullTitle;
      }
      const wrapper = card.querySelector(
        lockup ? ".ytLockupViewModelMetadata" : ".text-wrapper"
      );
      const channel = card.querySelector(
        lockup
          ? ".ytContentMetadataViewModelMetadataRow:first-child a"
          : "#channel-info ytd-channel-name a"
      );
      if (!wrapper || !channel) continue;
      const metadata = lockup
        ? [...card.querySelectorAll(".ytContentMetadataViewModelMetadataRow:first-child .ytContentMetadataViewModelMetadataText")]
        : [...card.querySelectorAll("ytd-video-meta-block #metadata-line .inline-metadata-item")];
      const [viewsNode, dateNode] = lockup
        ? [metadata.find((node) => /\bviews?\b/i.test(node.textContent)),
          metadata.find((node) => /\b(?:ago|yesterday|today)\b/i.test(node.textContent))]
        : metadata;
      const name = channel.textContent.trim();
      const date = dateNode?.textContent.trim() || "";
      const rawViews = viewsNode?.textContent.trim() || "";
      const views = rawViews && (/view/i.test(rawViews) ? rawViews : `${rawViews} views`);
      const signature = [name, channel.getAttribute("href"), date, views].join("\n");
      if (card.dataset.ytfDetails === signature) continue;

      let details = wrapper.querySelector(".ytf-card-details");
      if (!details) {
        details = document.createElement("div");
        details.className = "ytf-card-details";
        wrapper.append(details);
      }
      const channelLink = document.createElement("a");
      channelLink.className = "ytf-card-channel";
      channelLink.href = channel.href;
      channelLink.textContent = name;
      const stats = document.createElement("div");
      stats.className = "ytf-card-stats";
      for (const value of [date, views]) {
        if (!value) continue;
        const item = document.createElement("span");
        item.textContent = value;
        stats.append(item);
      }
      details.replaceChildren(channelLink, stats);
      card.dataset.ytfDetails = signature;
    }
  }

  function dedupeResults() {
    if (location.pathname !== "/results") return;
    const seen = new Set();
    for (const card of document.querySelectorAll(
      "ytd-search #primary ytd-video-renderer, ytd-search #primary yt-lockup-view-model, ytd-search #primary ytd-channel-renderer"
    )) {
      let key;
      if (card.matches("ytd-channel-renderer")) {
        const link = card.querySelector("#main-link[href]");
        if (link) {
          const url = new URL(link.href);
          if (url.origin === location.origin) {
            const path = url.pathname.match(/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/)?.[0];
            if (path) key = `channel:${path.startsWith("/@") ? path.toLowerCase() : path}`;
          }
        }
      } else {
        const link = card.querySelector('a[href*="/watch?"]');
        const videoId = link && new URL(link.href).searchParams.get("v");
        if (videoId) key = `video:${videoId}`;
      }
      card.toggleAttribute("data-ytf-duplicate-result", !!key && seen.has(key));
      if (key) seen.add(key);
    }
  }

  function queueDedupe() {
    if (dedupeFrame || location.pathname !== "/results") return;
    dedupeFrame = requestAnimationFrame(() => {
      dedupeFrame = 0;
      dedupeResults();
    });
  }

  function queuePrefetch() {
    if (prefetchFrame || location.pathname !== "/results") return;
    prefetchFrame = requestAnimationFrame(() => {
      prefetchFrame = 0;
      const scroll = document.scrollingElement;
      if (scroll && scroll.scrollHeight < scroll.scrollTop + innerHeight * 1.75) {
        window.postMessage({ type: "ytf-prefetch-results" }, location.origin);
      }
    });
  }

  function queueCard(card) {
    if (!card || location.pathname !== "/results") return;
    pendingCards.add(card);
    if (cardFrame) return;
    cardFrame = requestAnimationFrame(() => {
      cardFrame = 0;
      decorateResults(pendingCards);
      pendingCards.clear();
    });
  }

  function observeChanges(records) {
    let alignSearch = false;
    for (const record of records) {
      const target = record.target.nodeType === Node.ELEMENT_NODE
        ? record.target : record.target.parentElement;
      if (location.pathname === "/results" && target?.closest("ytd-search, ytd-masthead")) {
        alignSearch = true;
      }
      if (location.pathname === "/results" && !target?.closest(".ytf-card-details")) {
        const card = target?.closest(cardSelector);
        queueCard(card);
        if (card && record.type === "attributes" && record.attributeName === "href") queueDedupe();
        for (const node of record.addedNodes || []) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (card) continue;
          if (node.matches(cardSelector)) {
            queueCard(node);
            continue;
          }
          if (node.closest("ytd-search") || node.matches("ytd-search, ytd-page-manager, ytd-app")) {
            for (const card of node.querySelectorAll(cardSelector)) queueCard(card);
          }
        }
        if ([...record.addedNodes, ...record.removedNodes].some((node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches("ytd-video-renderer, yt-lockup-view-model, ytd-channel-renderer, ytd-continuation-item-renderer") ||
           node.querySelector("ytd-video-renderer, yt-lockup-view-model, ytd-channel-renderer, ytd-continuation-item-renderer")))) {
          queueDedupe();
          queuePrefetch();
        }
      }
      if (location.pathname === "/watch" &&
          (target?.matches(".ytp-autonav-toggle-button") ||
           [...(record.addedNodes || [])].some((node) =>
             node.nodeType === Node.ELEMENT_NODE &&
             (node.matches(".ytp-autonav-toggle-button") || node.querySelector(".ytp-autonav-toggle-button"))))) {
        enforceAutoplay();
      }
    }
    if (location.pathname === "/results" && searchTools &&
        (searchTools.parentElement === controls || !searchTools.isConnected)) {
      placeSearchTools();
    }
    if (alignSearch) queueSearchAlignment();
  }

  async function syncTheme() {
    try {
      const url = `${chrome.runtime.getURL("palette.css")}?t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const palette = await response.text();
      if (palette === lastPalette) return;
      const colors = [...palette.matchAll(/(--ytf-[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)];
      if (colors.length < 10) return;
      for (const [, name, value] of colors) {
        document.documentElement.style.setProperty(name, value);
      }
      lastPalette = palette;
    } catch (_) {
      // Keep the last colors if the extension resource is temporarily unavailable.
    }
  }

  function makeLogo(element) {
    const url = chrome.runtime.getURL("logo.svg");
    element.style.maskImage = `url("${url}")`;
    element.style.webkitMaskImage = `url("${url}")`;
  }

  function makePlayMark() {
    const mark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    mark.setAttribute("viewBox", "0 0 64 44");
    mark.setAttribute("class", "ytf-play-mark");
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = `
      <path class="ytf-play-body" d="M8 0h48v4h4v4h4v28h-4v4h-4v4H8v-4H4v-4H0V8h4V4h4z"/>
      <path class="ytf-play-triangle" d="M24 8h8v4h8v4h8v4h8v4h-8v4h-8v4h-8v4h-8z"/>`;
    return mark;
  }

  function makeHeader() {
    const start = document.querySelector("ytd-masthead #start");
    if (!start || start.querySelector("#ytf-header-link")) return;
    const link = document.createElement("a");
    link.id = "ytf-header-link";
    link.href = "/";
    link.setAttribute("aria-label", "Focus Tube home");
    link.append(makePlayMark());
    start.insertBefore(link, start.querySelector("ytd-topbar-logo-renderer"));
  }

  function focusHomeInput() {
    if (location.pathname !== "/" || settings.showHomeFeed) return;
    requestAnimationFrame(() => {
      if (location.pathname === "/" && !settings.showHomeFeed) {
        document.querySelector("#ytf-search-input")?.focus({ preventScroll: true });
      }
    });
  }

  function applySettings() {
    const root = document.documentElement;
    root.classList.toggle("ytf-hide-home", !settings.showHomeFeed);
    root.classList.toggle("ytf-hide-suggestions", !settings.showSuggestions);
    root.classList.toggle("ytf-hide-shorts", !settings.showShorts);
    root.classList.toggle("ytf-hide-left-menu", !settings.showLeftMenu);
    root.classList.toggle("ytf-hide-endcards", !settings.showEndCards);
    root.classList.toggle("ytf-home-route", location.pathname === "/");
    root.classList.toggle("ytf-results-route", location.pathname === "/results");
    root.classList.toggle("ytf-channel-route", /^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)(?:\/|$)/.test(location.pathname));
    root.dataset.ytfGridSize = settings.gridSize;

    if (controls) {
      for (const key of Object.keys(labels)) {
        controls.querySelector(`[data-setting="${key}"]`).checked = settings[key];
      }
      for (const button of gridButtons.querySelectorAll("[data-grid-size]")) {
        button.setAttribute("aria-pressed", String(button.dataset.gridSize === settings.gridSize));
      }
    }
    enforceAutoplay();
  }

  function autoplayState(button) {
    for (const name of ["aria-checked", "aria-pressed", "data-is-on"]) {
      const value = button.getAttribute(name);
      if (value === "true") return true;
      if (value === "false") return false;
    }
    return null;
  }

  function enforceAutoplay() {
    if (location.pathname !== "/watch") return;
    const button = document.querySelector(".ytp-autonav-toggle-button");
    if (button) {
      const state = autoplayState(button);
      if (state !== null && state !== settings.autoplayNext) button.click();
    }
  }

  function targetFor(input) {
    const value = input.trim();
    if (!value) return null;
    const looksLikeUrl = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i.test(value);
    if (!looksLikeUrl) {
      if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return false;
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(value)}`;
    }

    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (url.protocol !== "https:") return false;
      if (url.hostname === "youtu.be") {
        const id = url.pathname.slice(1).split("/")[0];
        if (!id) return false;
        const watch = new URL("https://www.youtube.com/watch");
        watch.searchParams.set("v", id);
        for (const key of ["t", "start", "list"]) {
          if (url.searchParams.has(key)) watch.searchParams.set(key, url.searchParams.get(key));
        }
        return watch.href;
      }
      if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
        url.hostname = "www.youtube.com";
        return url.href;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function makeHome() {
    const home = document.createElement("section");
    home.id = "ytf-home";
    home.setAttribute("aria-label", "Focus Tube start page");
    home.innerHTML = `
      <div id="ytf-home-card">
        <h1><span id="ytf-logo" role="img" aria-label="Focus Tube"></span></h1>
        <p>Search for a video or paste a YouTube link.</p>
        <form id="ytf-search-form">
          <input id="ytf-search-input" type="text" autocomplete="off"
            aria-label="Search or paste a YouTube link" placeholder="Search or paste a link">
          <button type="submit">Go</button>
        </form>
        <div id="ytf-input-error" role="status" aria-live="polite"></div>
      </div>`;
    makeLogo(home.querySelector("#ytf-logo"));
    home.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const target = targetFor(home.querySelector("input").value);
      if (target === false) {
        home.querySelector("#ytf-input-error").textContent = "Enter a YouTube link or search words.";
      } else if (target) {
        location.assign(target);
      }
    });
    document.body.append(home);
  }

  function makeControls() {
    controls = document.createElement("div");
    controls.id = "ytf-controls";
    searchTools = document.createElement("div");
    searchTools.id = "ytf-search-tools";
    gridButtons = document.createElement("div");
    gridButtons.id = "ytf-grid-buttons";
    gridButtons.setAttribute("role", "group");
    gridButtons.setAttribute("aria-label", "Search card size");
    for (const [size, label] of [["compact", "Compact"], ["large", "Large"], ["extra-large", "Extra large"]]) {
      const gridButton = document.createElement("button");
      gridButton.type = "button";
      gridButton.dataset.gridSize = size;
      gridButton.setAttribute("aria-label", `${label} cards`);
      gridButton.title = `${label} cards`;
      gridButton.innerHTML = pixelIcon(gridIcons[size]);
      gridButton.setAttribute("aria-pressed", String(settings.gridSize === size));
      gridButton.addEventListener("click", () => {
        settings.gridSize = size;
        chrome.storage.local.set({ gridSize: size });
        applySettings();
      });
      gridButtons.append(gridButton);
    }
    searchTools.append(gridButtons);
    const filterButton = document.createElement("button");
    filterButton.id = "ytf-filter-button";
    filterButton.type = "button";
    filterButton.setAttribute("aria-label", "Search filters");
    filterButton.innerHTML = `<span>Filters</span>${pixelIcon(filterIcon)}`;
    filterButton.addEventListener("click", () => {
      document.querySelector("ytd-search-header-renderer #filter-button button")?.click();
    });
    searchTools.append(filterButton);
    controls.append(searchTools);
    const button = document.createElement("button");
    button.id = "ytf-settings-button";
    button.type = "button";
    button.textContent = "Focus";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "ytf-settings-panel");
    button.addEventListener("click", () => {
      const open = controls.classList.toggle("ytf-open");
      button.setAttribute("aria-expanded", String(open));
    });
    controls.append(button);

    const panel = document.createElement("div");
    panel.id = "ytf-settings-panel";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Focus settings");
    const title = document.createElement("h2");
    title.textContent = "Show in YouTube Focus";
    panel.append(title);
    for (const [key, label] of Object.entries(labels)) {
      const row = document.createElement("label");
      const name = document.createElement("span");
      name.textContent = label;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.setting = key;
      checkbox.checked = settings[key];
      checkbox.addEventListener("change", () => {
        settings[key] = checkbox.checked;
        chrome.storage.local.set({ [key]: checkbox.checked });
        applySettings();
      });
      row.append(name, checkbox);
      panel.append(row);
    }
    controls.append(panel);
    document.body.append(controls);
  }

  function placeSearchTools() {
    if (location.pathname !== "/results" || !searchTools) return;
    const mastheadButtons = document.querySelector("ytd-masthead #end #buttons");
    if (mastheadButtons && searchTools.parentElement !== mastheadButtons) {
      mastheadButtons.prepend(searchTools);
    }
  }

  function alignSearchBar() {
    searchAlignmentFrame = 0;
    const searchBar = document.querySelector("ytd-masthead #center yt-searchbox");
    if (!searchBar) return;
    if (location.pathname !== "/results") {
      searchBar.style.removeProperty("transform");
      searchBar.style.removeProperty("max-width");
      searchBar.style.removeProperty("min-width");
      return;
    }

    const grid = document.querySelector("ytd-search #primary ytd-section-list-renderer > #contents");
    const logo = document.querySelector("#ytf-header-link");
    const end = document.querySelector("ytd-masthead #end");
    if (!grid || !logo || !end) return;

    const gridBounds = grid.getBoundingClientRect();
    const firstCard = [...grid.querySelectorAll("ytd-video-renderer, yt-lockup-view-model, ytd-channel-renderer")]
      .find((card) => card.getClientRects().length > 0);
    const firstMedia = firstCard?.matches("ytd-channel-renderer")
      ? firstCard.querySelector(".ytf-channel-preview")
      : firstCard?.matches("yt-lockup-view-model")
        ? firstCard.querySelector(".ytLockupViewModelContentImage")
        : firstCard?.querySelector("ytd-thumbnail");
    const firstMediaBounds = (firstMedia || firstCard)?.getBoundingClientRect();
    const logoBounds = logo.getBoundingClientRect();
    const endBounds = end.getBoundingClientRect();
    const targetLeft = Math.max(firstMediaBounds?.left ?? gridBounds.left, logoBounds.right + 24);
    const availableWidth = Math.max(0, endBounds.left - targetLeft - 16);

    searchBar.style.transform = "none";
    searchBar.style.maxWidth = `${availableWidth}px`;
    searchBar.style.minWidth = "0";
    const currentLeft = searchBar.getBoundingClientRect().left;
    searchBar.style.transform = `translateX(${Math.round(targetLeft - currentLeft)}px)`;
  }

  function queueSearchAlignment() {
    if (searchAlignmentFrame) return;
    searchAlignmentFrame = requestAnimationFrame(alignSearchBar);
  }

  function mount() {
    if (!document.body || document.getElementById("ytf-controls")) return;
    makeHome();
    makeControls();
    makeHeader();
    applySettings();
    placeSearchTools();
    alignSearchBar();
    focusHomeInput();
    decorateResults();
    dedupeResults();
    queuePrefetch();
  }

  applySettings();
  syncTheme();
  new MutationObserver(observeChanges).observe(document.documentElement, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-checked", "aria-pressed", "data-is-on", "href"],
    subtree: true,
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncTheme();
  });
  window.addEventListener("scroll", queuePrefetch, { passive: true });
  window.addEventListener("resize", queuePrefetch);
  window.addEventListener("resize", queueSearchAlignment);
  chrome.storage.local.get([...Object.keys(defaults), "largeGrid"], (saved) => {
    settings = { ...defaults, ...saved };
    settings.gridSize = gridSizes.includes(saved.gridSize)
      ? saved.gridSize
      : saved.largeGrid ? "large" : "compact";
    applySettings();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of Object.keys(defaults)) {
      if (changes[key]) settings[key] = changes[key].newValue ?? defaults[key];
    }
    applySettings();
  });
  document.addEventListener("DOMContentLoaded", mount, { once: true });
  if (document.readyState !== "loading") mount();
  document.addEventListener("yt-navigate-finish", () => {
    syncTheme();
    makeHeader();
    applySettings();
    placeSearchTools();
    alignSearchBar();
    focusHomeInput();
    decorateResults();
    dedupeResults();
    queuePrefetch();
  });
  window.addEventListener("popstate", () => {
    applySettings();
    queueSearchAlignment();
    focusHomeInput();
  });
})();
