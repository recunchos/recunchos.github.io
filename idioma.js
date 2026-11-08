(function (global) {
  var KEY = "recunchos.idioma";
  var VIEW = "recunchos.idioma.visto";
  var LANGS = ["gl", "es", "eu", "ca"];
  var LEGAL_VERSION = "v2.1.5";
  var LEGAL_LANG = "es";
  var current = "gl";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function valid(code) {
    return LANGS.indexOf(code) !== -1;
  }

  function readPreference() {
    var fromQuery = "";
    try {
      fromQuery = new URLSearchParams(location.search).get("lang") || "";
    } catch (err) {
      fromQuery = "";
    }
    if (valid(fromQuery)) {
      try { localStorage.setItem(KEY, fromQuery); } catch (err) { /* ignore */ }
      return fromQuery;
    }
    try {
      var stored = localStorage.getItem(KEY) || "";
      if (valid(stored)) return stored;
    } catch (err) { /* ignore */ }
    return "gl";
  }

  function pack(code) {
    var all = global.RecunchosTextos || {};
    return all[code] || {};
  }

  function t(key) {
    var chosen = pack(current);
    if (Object.prototype.hasOwnProperty.call(chosen, key)) return chosen[key];
    return "";
  }

  function remember() {
    var record = {
      ui: current,
      legalLang: LEGAL_LANG,
      legalVersion: LEGAL_VERSION,
      path: location.pathname,
      at: new Date().toISOString()
    };
    try { localStorage.setItem(VIEW, JSON.stringify(record)); } catch (err) { /* ignore */ }
    return record;
  }

  function apply(root) {
    var scope = root || document;
    document.documentElement.lang = current;
    document.documentElement.dataset.uiLang = current;
    document.documentElement.dataset.legalLang = LEGAL_LANG;
    document.documentElement.dataset.legalVersion = LEGAL_VERSION;
    var nodes = scope.querySelectorAll("[data-i18n]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.closest("[data-legal-master]")) continue;
      var key = node.getAttribute("data-i18n");
      var value = t(key);
      if (!value) {
        node.setAttribute("data-untranslated", key);
        continue;
      }
      node.removeAttribute("data-untranslated");
      node.textContent = value;
    }
    var metas = scope.querySelectorAll("[data-i18n-content]");
    for (i = 0; i < metas.length; i++) {
      var meta = metas[i];
      var content = t(meta.getAttribute("data-i18n-content"));
      if (content) meta.setAttribute("content", content);
    }
    var attrs = scope.querySelectorAll("[data-i18n-attr]");
    for (i = 0; i < attrs.length; i++) {
      var el = attrs[i];
      var pairs = el.getAttribute("data-i18n-attr").split(",");
      for (var p = 0; p < pairs.length; p++) {
        var bits = pairs[p].split(":");
        if (bits.length !== 2) continue;
        var translated = t(bits[1]);
        if (translated) el.setAttribute(bits[0], translated);
      }
    }
    paintSwitcher();
    remember();
  }

  function switcherHtml() {
    var html = '<div class="lang" role="group" aria-label="' + esc(t("lang.label")) + '">';
    for (var i = 0; i < LANGS.length; i++) {
      var code = LANGS[i];
      var pressed = code === current ? "true" : "false";
      html += '<button type="button" class="lang__btn" lang="' + code + '" data-set-lang="' + code + '" aria-pressed="' + pressed + '" aria-label="' + esc(t("lang." + code)) + '">' +
        '<span class="lang__code">' + esc(t("lang.short." + code)) + '</span>' +
        '<span class="lang__name">' + esc(t("lang." + code)) + '</span></button>';
    }
    html += "</div>";
    return html;
  }

  function paintSwitcher() {
    var slots = document.querySelectorAll("[data-lang-slot]");
    var html = switcherHtml();
    if (!slots.length) {
      var bar = document.querySelector(".lang-fallback");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "lang-fallback";
        document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.innerHTML = html;
      slots = [bar];
    } else {
      for (var i = 0; i < slots.length; i++) slots[i].innerHTML = html;
    }
  }

  function onChoose(event) {
    var code = event.currentTarget.getAttribute("data-set-lang");
    if (!valid(code) || code === current) return;
    current = code;
    try { localStorage.setItem(KEY, code); } catch (err) { /* ignore */ }
    apply(document);
    var detail = remember();
    document.dispatchEvent(new CustomEvent("recunchos:idioma", { detail: detail }));
    if (global.RecunchosSesion && global.RecunchosSesion.repaint) global.RecunchosSesion.repaint();
  }

  document.addEventListener("click", function (event) {
    var button = event.target && event.target.closest ? event.target.closest("[data-set-lang]") : null;
    if (!button) return;
    onChoose({ currentTarget: button });
  });

  function boot() {
    current = readPreference();
    apply(document);
  }

  if (document.body) boot();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);

  global.RecunchosIdioma = {
    lang: function () { return current; },
    t: t,
    apply: apply,
    legalVersion: LEGAL_VERSION,
    legalLang: LEGAL_LANG,
    recordAcceptance: function () {
      var record = {
        ui: current,
        legalLang: LEGAL_LANG,
        legalVersion: LEGAL_VERSION,
        path: location.pathname,
        at: new Date().toISOString(),
        notice: "shown"
      };
      try { localStorage.setItem("recunchos.aceptacion", JSON.stringify(record)); } catch (err) { /* ignore */ }
      return record;
    }
  };
})(window);
