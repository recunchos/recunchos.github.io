(function (global) {
  var KEY = "recunchos.idioma";
  var VIEW = "recunchos.idioma.visto";
  var LANGS = ["gl", "es", "eu", "ca"];
  var NAMES = { gl: "Galego", es: "Castellano", eu: "Euskara", ca: "Català" };
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

  function switcherHtml(index) {
    var menuId = "lang-menu-" + index;
    var label = t("lang.label") || "Idioma";
    var html = '<div class="lang">';
    html += '<button type="button" class="lang__toggle" aria-expanded="false" aria-haspopup="menu" aria-controls="' + menuId + '" aria-label="' + esc(label + ", " + NAMES[current]) + '">' + esc(label) + '</button>';
    html += '<div class="lang__menu" id="' + menuId + '" role="menu" hidden>';
    for (var i = 0; i < LANGS.length; i++) {
      var code = LANGS[i];
      html += '<button type="button" class="lang__opt" role="menuitemradio" lang="' + code + '" data-set-lang="' + code + '" aria-checked="' + (code === current ? "true" : "false") + '">' + esc(NAMES[code]) + '</button>';
    }
    html += "</div></div>";
    return html;
  }

  function paintSwitcher() {
    var slots = document.querySelectorAll("[data-lang-slot]");
    if (!slots.length) {
      var bar = document.querySelector(".lang-fallback");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "lang-fallback";
        document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.setAttribute("data-lang-slot", "");
      slots = [bar];
    }
    for (var i = 0; i < slots.length; i++) slots[i].innerHTML = switcherHtml(i);
  }

  function menuOf(root) {
    return root ? root.querySelector(".lang__menu") : null;
  }

  function closeMenu(root, focusToggle) {
    var menu = menuOf(root);
    var toggle = root && root.querySelector(".lang__toggle");
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu.style.left = "";
    menu.style.right = "";
    menu.style.top = "";
    menu.style.bottom = "";
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (focusToggle && toggle) toggle.focus();
  }

  function closeAll() {
    var roots = document.querySelectorAll(".lang");
    for (var i = 0; i < roots.length; i++) closeMenu(roots[i], false);
  }

  function placeMenu(root) {
    var menu = menuOf(root);
    if (!menu) return;
    menu.style.left = "0";
    menu.style.right = "auto";
    menu.style.top = "";
    menu.style.bottom = "";
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      menu.style.left = "auto";
      menu.style.right = "0";
    }
    rect = menu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) {
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 6px)";
    }
  }

  function openMenu(root) {
    closeAll();
    var menu = menuOf(root);
    var toggle = root.querySelector(".lang__toggle");
    if (!menu || !toggle) return;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    placeMenu(root);
    var currentItem = menu.querySelector('[aria-checked="true"]') || menu.querySelector(".lang__opt");
    if (currentItem) currentItem.focus();
  }

  function focusToggle() {
    var toggle = document.querySelector(".lang__toggle");
    if (toggle) toggle.focus();
  }

  function onChoose(button) {
    var code = button.getAttribute("data-set-lang");
    if (!valid(code)) return;
    if (code === current) {
      closeAll();
      focusToggle();
      return;
    }
    current = code;
    try { localStorage.setItem(KEY, code); } catch (err) { /* ignore */ }
    apply(document);
    var detail = remember();
    document.dispatchEvent(new CustomEvent("recunchos:idioma", { detail: detail }));
    if (global.RecunchosSesion && global.RecunchosSesion.repaint) global.RecunchosSesion.repaint();
    focusToggle();
  }

  function moveOption(root, direction) {
    var menu = menuOf(root);
    if (!menu) return;
    var list = menu.querySelectorAll(".lang__opt");
    if (!list.length) return;
    var index = Array.prototype.indexOf.call(list, document.activeElement);
    if (index < 0) index = direction > 0 ? 0 : list.length - 1;
    else index = (index + direction + list.length) % list.length;
    list[index].focus();
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var toggle = target.closest(".lang__toggle");
    if (toggle) {
      var root = toggle.closest(".lang");
      if (toggle.getAttribute("aria-expanded") === "true") closeMenu(root, false);
      else openMenu(root);
      return;
    }
    var choice = target.closest("[data-set-lang]");
    if (choice) {
      onChoose(choice);
      return;
    }
    if (!target.closest(".lang")) closeAll();
  });

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var root = target && target.closest ? target.closest(".lang") : null;
    if (event.key === "Escape") {
      var roots = document.querySelectorAll(".lang");
      var closed = false;
      for (var i = 0; i < roots.length; i++) {
        var menu = menuOf(roots[i]);
        if (menu && !menu.hidden) {
          closeMenu(roots[i], true);
          closed = true;
        }
      }
      if (closed) event.preventDefault();
      return;
    }
    if (!root) return;
    var menu = menuOf(root);
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && menu) {
      event.preventDefault();
      if (menu.hidden) openMenu(root);
      else moveOption(root, event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Tab" && menu && !menu.hidden) closeMenu(root, false);
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
