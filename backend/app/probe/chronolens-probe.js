/**
 * ChronoLens DOM Probe — injected via page.add_init_script().
 *
 * Responsibilities:
 * 1. On every requestAnimationFrame, log performance.now() plus
 *    element state for each element matching [data-cl] and any
 *    configured selectors.
 * 2. MutationObserver log with timestamps.
 * 3. All data written to window.__chronolens_probe_log.
 * 4. Sync flash: when window.__chronolens_sync_flash is true,
 *    paint an 8x8 magenta square for exactly one frame after load.
 */
(function () {
  "use strict";

  // Probe log — all entries are pushed here
  window.__chronolens_probe_log = window.__chronolens_probe_log || [];

  /** @type {string[]} Extra CSS selectors to track (configurable). */
  const extraSelectors = window.__chronolens_selectors || [];

  /**
   * Collect state for all tracked elements.
   * @returns {Object[]} Array of element state snapshots.
   */
  function collectElementStates() {
    const elements = [];

    // Collect elements with [data-cl] attribute
    const dataClElements = document.querySelectorAll("[data-cl]");
    dataClElements.forEach(function (el) {
      elements.push(el);
    });

    // Collect elements matching extra selectors
    extraSelectors.forEach(function (selector) {
      try {
        const matched = document.querySelectorAll(selector);
        matched.forEach(function (el) {
          if (!el.hasAttribute("data-cl")) {
            elements.push(el);
          }
        });
      } catch (e) {
        // Invalid selector — skip silently
      }
    });

    return elements.map(function (el) {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      return {
        id: el.id || null,
        dataCl: el.getAttribute("data-cl") || null,
        tagName: el.tagName.toLowerCase(),
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        zIndex: computed.zIndex,
        opacity: computed.opacity,
        visibility: computed.visibility,
        display: computed.display,
      };
    });
  }

  // -----------------------------------------------------------------------
  // requestAnimationFrame loop
  // -----------------------------------------------------------------------

  function rafLoop() {
    const entry = {
      type: "raf",
      timestamp: performance.now(),
      elements: collectElementStates(),
    };
    window.__chronolens_probe_log.push(entry);
    requestAnimationFrame(rafLoop);
  }

  // Start the RAF loop
  requestAnimationFrame(rafLoop);

  // -----------------------------------------------------------------------
  // MutationObserver
  // -----------------------------------------------------------------------

  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      const entry = {
        type: "mutation",
        timestamp: performance.now(),
        mutationType: mutation.type,
        targetTag: mutation.target.tagName
          ? mutation.target.tagName.toLowerCase()
          : null,
        targetId: mutation.target.id || null,
        targetDataCl: mutation.target.getAttribute
          ? mutation.target.getAttribute("data-cl")
          : null,
        attributeName: mutation.attributeName || null,
        addedNodes: mutation.addedNodes.length,
        removedNodes: mutation.removedNodes.length,
      };
      window.__chronolens_probe_log.push(entry);
    });
  });

  // Observe the entire document
  observer.observe(document.documentElement, {
    childList: true,
    attributes: true,
    subtree: true,
    attributeOldValue: true,
  });

  // -----------------------------------------------------------------------
  // Sync Flash (test-mode only)
  // -----------------------------------------------------------------------

  if (window.__chronolens_sync_flash) {
    window.addEventListener("load", function () {
      // Create an 8x8 magenta square at top-left
      const flash = document.createElement("div");
      flash.id = "__chronolens_sync_flash";
      flash.style.cssText =
        "position:fixed;top:0;left:0;width:8px;height:8px;" +
        "background:#FF00FF;z-index:2147483647;pointer-events:none;";
      document.body.appendChild(flash);

      // Remove after exactly one frame
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (flash.parentNode) {
            flash.parentNode.removeChild(flash);
          }
          window.__chronolens_probe_log.push({
            type: "sync_flash",
            timestamp: performance.now(),
            action: "removed",
          });
        });
      });

      window.__chronolens_probe_log.push({
        type: "sync_flash",
        timestamp: performance.now(),
        action: "painted",
      });
    });
  }
})();
