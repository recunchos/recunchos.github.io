(function (global) {
  var KEY = "sb-fwfwfbtzarmwalfaxelh-auth-token";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parse(raw) {
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (data.currentSession && typeof data.currentSession === "object") return data.currentSession;
    return data;
  }

  function tokenExpiry(session) {
    var exp = Number(session.expires_at);
    if (exp) return exp;
    var token = session.access_token;
    if (typeof token !== "string") return 0;
    var parts = token.split(".");
    if (parts.length < 2) return 0;
    try {
      var json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      var payload = JSON.parse(json);
      return Number(payload.exp) || 0;
    } catch (err) {
      return 0;
    }
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var session = parse(raw);
      if (!session || !session.access_token || !session.user) return null;
      var exp = tokenExpiry(session);
      if (exp && exp * 1000 < Date.now() - 30000 && !session.refresh_token) return null;
      return session;
    } catch (err) {
      return null;
    }
  }

  function displayName(user) {
    var meta = (user && user.user_metadata) || {};
    var name = meta.full_name || meta.name || "";
    if (!name && user && user.email) name = String(user.email).split("@")[0];
    return String(name || "").trim();
  }

  function avatarUrl(user) {
    var meta = (user && user.user_metadata) || {};
    var url = meta.avatar_url || meta.picture || "";
    if (typeof url !== "string" || url.indexOf("https://") !== 0) return "";
    return url;
  }

  function userHtml(session) {
    var person = displayName(session.user);
    var letter = (person || "R").charAt(0).toLocaleUpperCase("es");
    var photo = avatarUrl(session.user);
    var face = photo ? '<img alt="" src="' + esc(photo) + '">' : esc(letter);
    var aria = person ? "Abrir Recunchos, " + person : "Abrir Recunchos";
    return '<a class="account__user" href="/app/" aria-label="' + esc(aria) + '">' +
      '<span class="account__avatar" aria-hidden="true">' + face + "</span>" +
      "<span>Abrir Recunchos</span></a>";
  }

  function paint() {
    var session = read();
    if (!session) return;
    var html = userHtml(session);
    var boxes = document.querySelectorAll("[data-sesion]");
    for (var i = 0; i < boxes.length; i++) boxes[i].innerHTML = html;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();

  global.RecunchosSesion = {
    read: read,
    displayName: displayName,
    login: "/app/elegir",
    register: "/app/registro",
    home: "/app/"
  };
})(window);
