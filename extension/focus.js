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
  let lastPalette = "";

  function decorateResults() {
    if (location.pathname !== "/results") return;
    for (const card of document.querySelectorAll(
      "ytd-search ytd-video-renderer, ytd-search yt-lockup-view-model"
    )) {
      const lockup = card.matches("yt-lockup-view-model");
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
    root.dataset.ytfGridSize = settings.gridSize;

    if (controls) {
      for (const key of Object.keys(labels)) {
        controls.querySelector(`[data-setting="${key}"]`).checked = settings[key];
      }
      for (const button of controls.querySelectorAll("[data-grid-size]")) {
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
    const gridButtons = document.createElement("div");
    gridButtons.id = "ytf-grid-buttons";
    gridButtons.setAttribute("role", "group");
    gridButtons.setAttribute("aria-label", "Search card size");
    for (const [size, label] of [["compact", "Compact"], ["large", "Large"], ["extra-large", "Extra large"]]) {
      const gridButton = document.createElement("button");
      gridButton.type = "button";
      gridButton.dataset.gridSize = size;
      gridButton.textContent = label;
      gridButton.setAttribute("aria-pressed", String(settings.gridSize === size));
      gridButton.addEventListener("click", () => {
        settings.gridSize = size;
        chrome.storage.local.set({ gridSize: size });
        applySettings();
      });
      gridButtons.append(gridButton);
    }
    controls.append(gridButtons);
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

  function mount() {
    if (!document.body || document.getElementById("ytf-controls")) return;
    makeHome();
    makeControls();
    makeHeader();
    applySettings();
    focusHomeInput();
    decorateResults();
  }

  applySettings();
  syncTheme();
  window.setInterval(syncTheme, 1000);
  window.setInterval(decorateResults, 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncTheme();
  });
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
    makeHeader();
    applySettings();
    focusHomeInput();
    decorateResults();
  });
  window.addEventListener("popstate", () => {
    applySettings();
    focusHomeInput();
  });
  window.setInterval(enforceAutoplay, 2000);
})();
