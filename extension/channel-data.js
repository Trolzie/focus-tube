(() => {
  "use strict";

  const prefetchedSearches = new Set();

  function consentVisible() {
    const dialog = document.querySelector("ytd-consent-bump-v2-lightbox");
    return !!dialog && dialog.getBoundingClientRect().width > 0;
  }

  async function waitForConsent() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!consentVisible()) return;
    await new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (!consentVisible()) done();
      });
      const timeout = setTimeout(done, 20000);
      function done() {
        clearTimeout(timeout);
        observer.disconnect();
        resolve();
      }
      observer.observe(document.documentElement, {
        childList: true,
        attributes: true,
        attributeFilter: ["hidden", "style"],
        subtree: true,
      });
    });
  }

  async function channelInfo(path) {
    const controller = new AbortController();
    let timeout;
    try {
      await waitForConsent();
      timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(path, {
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const html = await response.text();
      const marker = "var ytInitialData = ";
      const start = html.indexOf(marker);
      if (start < 0) return null;
      const end = html.indexOf(";</script>", start);
      if (end < 0) return null;
      const data = JSON.parse(html.slice(start + marker.length, end));
      const header = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
      const banner = header?.banner?.imageBannerViewModel?.image?.sources?.[0]?.url;
      const videos = header?.metadata?.contentMetadataViewModel?.metadataRows?.[1]?.metadataParts?.[1]?.text?.content;
      const description = data.metadata?.channelMetadataRenderer?.description;
      return { banner, videos, description };
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source === window && event.origin === location.origin &&
        message?.type === "ytf-prefetch-results" && location.pathname === "/results") {
      if (prefetchedSearches.has(location.href) ||
          document.querySelectorAll("ytd-search #primary ytd-video-renderer, ytd-search #primary yt-lockup-view-model").length < 15) {
        return;
      }
      const continuations = document.querySelectorAll(
        "ytd-search #primary ytd-section-list-renderer > #contents > ytd-continuation-item-renderer"
      );
      const continuation = continuations[continuations.length - 1];
      const token = continuation?.data?.continuationEndpoint?.continuationCommand?.token;
      const bounds = continuation?.getBoundingClientRect();
      if (token && bounds && bounds.top > innerHeight &&
          typeof continuation.triggerContinuation === "function") {
        prefetchedSearches.add(location.href);
        continuation.triggerContinuation();
      }
      return;
    }
    if (event.source !== window || event.origin !== location.origin ||
        message?.type !== "ytf-channel-info-request" ||
        typeof message.id !== "string" ||
        typeof message.path !== "string" ||
        !/^\/(?:@[^/]+|channel\/UC[\w-]+|c\/[^/]+|user\/[^/]+)$/.test(message.path)) {
      return;
    }
    channelInfo(message.path).then((info) => {
      window.postMessage({ type: "ytf-channel-info-response", id: message.id, info }, location.origin);
    });
  });
})();
