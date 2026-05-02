/**
 * Superdry client: during Turbo form submits, disable all controls and show a thin
 * top progress bar. Reverts on turbo:submit-end. Uses document-level listeners so
 * forms injected via Turbo Streams are covered without re-scanning the DOM.
 *
 * Optional **`data-elem-loading`**: XPath string evaluated **with the form as the
 * context node** (same as `document.evaluate(expr, form, …)`). The progress bar is
 * inserted at the top of the matched element (and `position: relative` is applied
 * there if needed). Example: parent row — `data-elem-loading=".."` on the form.
 *
 * Load after @hotwired/turbo (order does not matter before the first submit).
 * Pair with <script type="module" src="…/superdry-client.js"> or a second import.
 */

(function initSuperdryTurboSubmitChrome() {
  if (globalThis.__superdryTurboSubmitChromeInstalled) return;
  globalThis.__superdryTurboSubmitChromeInstalled = true;

  const ATTR_LOADING_ANCHOR = "data-elem-loading";

  /** @type {WeakMap<HTMLFormElement, { controls: HTMLElement[]; bar: HTMLElement; anchor: HTMLElement; positionFixed: boolean }>} */
  const pending = new WeakMap();

  /**
   * @param {HTMLFormElement} form
   * @returns {HTMLElement}
   */
  function resolveLoadingAnchor(form) {
    const expr = form.getAttribute(ATTR_LOADING_ANCHOR);
    if (expr == null || String(expr).trim() === "") return form;

    try {
      const result = document.evaluate(
        String(expr).trim(),
        form,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      );
      const node = result.singleNodeValue;
      if (node instanceof HTMLElement) return node;
    } catch (err) {
      console.warn("[superdry-client] invalid data-elem-loading XPath:", expr, err);
    }
    return form;
  }

  function injectKeyframesOnce() {
    if (document.getElementById("superdry-client-style")) return;
    const style = document.createElement("style");
    style.id = "superdry-client-style";
    style.textContent = `
@keyframes superdry-submit-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
`;
    document.head.appendChild(style);
  }

  function makeProgressBar() {
    const wrap = document.createElement("div");
    wrap.setAttribute("data-superdry-submit-bar", "");
    wrap.style.cssText =
      "position:absolute;top:0;left:0;right:0;height:2px;overflow:hidden;pointer-events:none;z-index:60;";
    const stripe = document.createElement("div");
    stripe.style.cssText =
      "height:100%;width:32%;background:linear-gradient(90deg,transparent,rgba(37,99,235,0.92),transparent);" +
      "animation:superdry-submit-indeterminate 0.85s linear infinite;will-change:transform;";
    wrap.appendChild(stripe);
    return wrap;
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {HTMLElement[]}
   */
  function disableFormControls(form) {
    const restored = [];
    for (const el of form.elements) {
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLButtonElement ||
        el instanceof HTMLSelectElement ||
        el instanceof HTMLTextAreaElement
      ) {
        if (el.disabled) continue;
        el.disabled = true;
        restored.push(el);
      }
    }
    return restored;
  }

  /**
   * @param {HTMLElement[]} controls
   */
  function enableControls(controls) {
    for (const el of controls) {
      el.disabled = false;
    }
  }

  /**
   * @param {Event} ev
   */
  function onSubmitStart(ev) {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;

    injectKeyframesOnce();
    const controls = disableFormControls(form);
    const anchor = resolveLoadingAnchor(form);

    let positionFixed = false;
    if (getComputedStyle(anchor).position === "static") {
      anchor.style.position = "relative";
      positionFixed = true;
    }

    const bar = makeProgressBar();
    anchor.insertBefore(bar, anchor.firstChild);

    pending.set(form, { controls, bar, anchor, positionFixed });
  }

  /**
   * @param {Event} ev
   */
  function onSubmitEnd(ev) {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;

    const state = pending.get(form);
    if (!state) return;
    pending.delete(form);

    enableControls(state.controls);
    state.bar.remove();
    if (state.positionFixed) state.anchor.style.position = "";
  }

  document.addEventListener("turbo:submit-start", onSubmitStart);
  document.addEventListener("turbo:submit-end", onSubmitEnd);
})();
