(function (global) {
  var KEY = "sb-fwfwfbtzarmwalfaxelh-auth-token";
  var SUPABASE = "https://fwfwfbtzarmwalfaxelh.supabase.co";
  var ANON = "sb_publishable_uyool6N2lYnDmZ1cmcK8TQ_WmtMRdlU";

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
      var payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
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

  function clear() {
    try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
  }

  function verify() {
    var session = read();
    if (!session) return Promise.resolve(null);
    return fetch(SUPABASE + "/auth/v1/user", {
      headers: { apikey: ANON, Authorization: "Bearer " + session.access_token }
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        clear();
        return null;
      }
      if (!res.ok) return null;
      return res.json().then(function (user) {
        if (!user || !user.id) {
          clear();
          return null;
        }
        session.user = user;
        return session;
      });
    }).catch(function () {
      return null;
    });
  }

  function save(session) {
    if (!session.expires_at && session.expires_in) {
      session.expires_at = Math.round(Date.now() / 1000) + Number(session.expires_in);
    }
    localStorage.setItem(KEY, JSON.stringify(session));
  }

  function displayName(user) {
    var meta = (user && user.user_metadata) || {};
    var name = meta.full_name || meta.name || "";
    if (!name && user && user.email) name = String(user.email).split("@")[0];
    return String(name || "").trim();
  }

  var WEB_CONFIRM = "https://recunchos.github.io/confirmar/";

  function safeNext(value) {
    if (typeof value !== "string" || !value) return "/";
    var i;
    for (i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) < 32 || value.charAt(i) === "\\") return "/";
    }
    if (value.charAt(0) !== "/" || value.charAt(1) === "/") return "/";
    try {
      var resolved = new URL(value, location.origin);
      if (resolved.origin !== location.origin) return "/";
      var path = resolved.pathname + resolved.search + resolved.hash;
      for (i = 0; i < path.length; i++) {
        if (path.charCodeAt(i) < 32 || path.charAt(i) === "\\") return "/";
      }
      if (!resolved.pathname || resolved.pathname.charAt(0) !== "/" || resolved.pathname.charAt(1) === "/") return "/";
      return path;
    } catch (err) {
      return "/";
    }
  }

  function webNext(value) {
    var path = safeNext(value);
    var pathname = path.split("?")[0].split("#")[0];
    if (pathname === "/app" || pathname.indexOf("/app/") === 0) return "/";
    if (pathname === "/confirmar" || pathname.indexOf("/confirmar/") === 0) return "/";
    return path.split("#")[0];
  }

  function here() {
    var next = location.pathname + location.search;
    return safeNext(next);
  }

  function loginHref() {
    return "/entrar/?next=" + encodeURIComponent(here());
  }

  function registerHref() {
    return "/crear-cuenta/?next=" + encodeURIComponent(here());
  }

  function tr(key) {
    var I = global.RecunchosIdioma;
    var value = I && I.t ? I.t(key) : "";
    return value || "";
  }

  function hasLetter(password) {
    try { return /\p{L}/u.test(password); } catch (err) {
      return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÒÇàèòç]/.test(password);
    }
  }

  function passwordProblem(password) {
    if (!password || password.length < 8) return tr("err.passwordMin");
    if (!hasLetter(password) || !/\d/.test(password)) return tr("err.passwordMix");
    return "";
  }

  function authHeaders(session, json) {
    var headers = {
      apikey: ANON,
      Authorization: "Bearer " + session.access_token
    };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  function publicError(message) {
    var text = String(message || "");
    if (/\d{8}[A-Za-z]/.test(text) || /\+?\d[\d\s]{8,}/.test(text)) return tr("err.public");
    return text || tr("err.public");
  }

  function signIn(email, password) {
    return fetch(SUPABASE + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), password: password || "" })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok || !body || !body.access_token) {
          var code = body && (body.error_description || body.msg || body.error || "");
          if (/invalid/i.test(code)) return { ok: false, message: tr("err.authInvalid") };
          return { ok: false, message: tr("err.authFail") };
        }
        save(body);
        return { ok: true };
      });
    }).catch(function () {
      return { ok: false, message: tr("err.offline") };
    });
  }

  function signUp(fields) {
    var name = String(fields.name || "").trim();
    var email = String(fields.email || "").trim().toLowerCase();
    var municipality = String(fields.municipality || "").trim();
    var accountKind = fields.accountKind === "propietario" ? "propietario" : "comensal";
    if (!name) return Promise.resolve({ ok: false, message: tr("err.name") });
    if (!email.includes("@") || !email.includes(".") || email.charAt(0) === "@" || email.slice(-1) === "@") {
      return Promise.resolve({ ok: false, message: tr("err.email") });
    }
    var passwordError = passwordProblem(fields.password);
    if (passwordError) return Promise.resolve({ ok: false, message: passwordError });
    if (!municipality) return Promise.resolve({ ok: false, message: tr("err.town") });
    if (!fields.ageConfirmed) return Promise.resolve({ ok: false, message: tr("err.age") });
    if (!fields.termsAccepted) return Promise.resolve({ ok: false, message: tr("err.terms") });
    if (!fields.privacyAcknowledged) return Promise.resolve({ ok: false, message: tr("err.privacy") });
    var idioma = global.RecunchosIdioma;
    var uiLang = idioma && idioma.lang ? idioma.lang() : "gl";
    var stamp = new Date().toISOString();
    return fetch(SUPABASE + "/auth/v1/signup?redirect_to=" + encodeURIComponent(WEB_CONFIRM), {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: fields.password,
        data: {
          full_name: name,
          account_kind: accountKind,
          municipality: municipality,
          age_confirmed_18: true,
          age_confirmed_18_at: stamp,
          terms_accepted_at: stamp,
          privacy_acknowledged_at: stamp,
          legal_text_version: "v2.1.5",
          legal_text_language: "es",
          ui_language: uiLang,
          legal_shown: "es:v2.1.5"
        },
        email_redirect_to: WEB_CONFIRM
      })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          var raw = body && (body.msg || body.error_description || body.message) || "";
          if (/invalid/i.test(raw) && /email/i.test(raw)) return { ok: false, message: tr("err.email") };
          if (/already registered|already exists/i.test(raw)) return { ok: false, message: tr("err.exists") };
          if (/rate limit|over_email_send/i.test(raw)) return { ok: false, message: tr("err.rate") };
          return { ok: false, message: publicError(raw) === tr("err.public") ? tr("err.signupFail") : publicError(raw) };
        }
        var user = body.user || (body.data && body.data.user);
        var session = body.session || (body.access_token ? body : null);
        if (body.access_token) session = body;
        var identities = user && user.identities;
        if (user && Array.isArray(identities) && identities.length === 0) {
          return { ok: false, message: tr("err.existsConfirm") };
        }
        if (!user) return { ok: false, message: tr("err.signupFail") };
        if (!session || !session.access_token) {
          return { ok: true, confirmEmail: true, message: tr("err.confirmEmail") };
        }
        save(session);
        return updateProfile(session, { name: name, municipality: municipality, accountKind: accountKind }).then(function (warning) {
          return { ok: true, confirmEmail: false, warning: warning, owner: accountKind === "propietario" };
        });
      });
    }).catch(function () {
      return { ok: false, message: tr("err.offline") };
    });
  }

  function updateProfile(session, profile) {
    var headers = authHeaders(session, true);
    headers.Prefer = "return=minimal";
    var url = SUPABASE + "/rest/v1/profiles?id=eq." + encodeURIComponent(session.user.id);
    return fetch(url, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({ name: profile.name, municipality: profile.municipality })
    }).then(function (res) {
      if (!res.ok) return tr("err.townSave");
      if (profile.accountKind !== "propietario") return "";
      return fetch(url, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ account_kind: "propietario" })
      }).then(function (kind) {
        if (kind.ok) return "";
        return kind.json().then(function (body) {
          var message = body && body.message || "";
          if (/account_kind|schema cache|PGRST204|column/i.test(message)) return "";
          return tr("err.ownerSave");
        }).catch(function () {
          return tr("err.ownerSave");
        });
      });
    }).catch(function () {
      return tr("err.townSave");
    });
  }

  function signOut() {
    var session = read();
    var finish = function () {
      localStorage.removeItem(KEY);
      location.reload();
    };
    if (!session) return finish();
    fetch(SUPABASE + "/auth/v1/logout", {
      method: "POST",
      headers: authHeaders(session, true)
    }).then(finish, finish);
  }

  function isFollowing(furanchoId) {
    var session = read();
    if (!session) return Promise.resolve(false);
    var url = SUPABASE + "/rest/v1/house_follows?select=furancho_id&user_id=eq." +
      encodeURIComponent(session.user.id) + "&furancho_id=eq." + encodeURIComponent(furanchoId);
    return fetch(url, { headers: authHeaders(session, false) }).then(function (res) {
      if (!res.ok) return false;
      return res.json().then(function (rows) { return Array.isArray(rows) && rows.length > 0; });
    }).catch(function () { return false; });
  }

  function setFollow(furanchoId, follow) {
    var session = read();
    if (!session) return Promise.resolve({ ok: false, message: tr("err.followNeed") });
    var headers = authHeaders(session, true);
    if (follow) {
      headers.Prefer = "return=minimal";
      return fetch(SUPABASE + "/rest/v1/house_follows", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ user_id: session.user.id, furancho_id: furanchoId })
      }).then(function (res) {
        if (res.ok || res.status === 409) return { ok: true };
        return res.json().then(function (body) {
          var message = body && body.message || "";
          if (/duplicate|23505/i.test(message)) return { ok: true };
          return { ok: false, message: publicError(message) };
        }).catch(function () { return { ok: false, message: tr("err.followFail") }; });
      });
    }
    var url = SUPABASE + "/rest/v1/house_follows?user_id=eq." + encodeURIComponent(session.user.id) +
      "&furancho_id=eq." + encodeURIComponent(furanchoId);
    return fetch(url, { method: "DELETE", headers: authHeaders(session, false) }).then(function (res) {
      if (res.ok) return { ok: true };
      return { ok: false, message: tr("err.unfollow") };
    });
  }

  function seal(furanchoId) {
    var session = read();
    if (!session) return Promise.resolve({ ok: false, message: tr("err.sealNeed") });
    if (!navigator.geolocation) {
      return Promise.resolve({ ok: false, message: tr("err.noGeo") });
    }
    return new Promise(function (resolve) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        fetch(SUPABASE + "/rest/v1/rpc/seal_passport", {
          method: "POST",
          headers: authHeaders(session, true),
          body: JSON.stringify({
            p_furancho_id: furanchoId,
            p_lat: pos.coords.latitude,
            p_lng: pos.coords.longitude,
            p_accuracy: pos.coords.accuracy
          })
        }).then(function (res) {
          if (res.ok) return resolve({ ok: true, message: tr("err.sealOk") });
          return res.json().then(function (body) {
            resolve({ ok: false, message: publicError(body && (body.message || body.hint)) });
          }).catch(function () {
            resolve({ ok: false, message: tr("err.sealFail") });
          });
        }).catch(function () {
          resolve({ ok: false, message: tr("err.offline") });
        });
      }, function () {
        resolve({ ok: false, message: tr("err.sealNear") });
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    });
  }

  function hashParams(hash) {
    var raw = String(hash || "");
    if (raw.charAt(0) === "#") raw = raw.slice(1);
    return new URLSearchParams(raw);
  }

  function applyCallback(hash, search) {
    var fromHash = hashParams(hash);
    var fromQuery = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    history.replaceState(null, "", location.pathname);
    var error = fromHash.get("error") || fromHash.get("error_code") || fromQuery.get("error") || fromQuery.get("error_code") || "";
    if (error) return Promise.resolve({ ok: false, code: error });
    var access = fromHash.get("access_token");
    if (!access) {
      if (fromQuery.get("code")) return Promise.resolve({ ok: false, code: "pkce_unsupported" });
      return Promise.resolve({ ok: false, code: "missing" });
    }
    var session = {
      access_token: access,
      refresh_token: fromHash.get("refresh_token") || "",
      expires_in: Number(fromHash.get("expires_in")) || 0,
      token_type: fromHash.get("token_type") || "bearer"
    };
    var type = fromHash.get("type") || "";
    return fetch(SUPABASE + "/auth/v1/user", {
      headers: { apikey: ANON, Authorization: "Bearer " + access }
    }).then(function (res) {
      if (!res.ok) return { ok: false, code: "rejected" };
      return res.json().then(function (user) {
        if (!user || !user.id) return { ok: false, code: "rejected" };
        session.user = user;
        save(session);
        return { ok: true, type: type };
      });
    }).catch(function () {
      return { ok: false, code: "offline" };
    });
  }

  function updatePassword(password) {
    var problem = passwordProblem(password);
    if (problem) return Promise.resolve({ ok: false, message: problem });
    var session = read();
    if (!session) return Promise.resolve({ ok: false, code: "rejected" });
    return fetch(SUPABASE + "/auth/v1/user", {
      method: "PUT",
      headers: authHeaders(session, true),
      body: JSON.stringify({ password: password })
    }).then(function (res) {
      if (!res.ok) return { ok: false, code: "rejected" };
      return { ok: true };
    }).catch(function () {
      return { ok: false, code: "offline" };
    });
  }

  function requestRecovery(email) {
    var clean = String(email || "").trim().toLowerCase();
    if (!clean.includes("@") || !clean.includes(".") || clean.charAt(0) === "@") {
      return Promise.resolve({ ok: false, code: "email" });
    }
    return fetch(SUPABASE + "/auth/v1/recover", {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: clean, redirect_to: WEB_CONFIRM })
    }).then(function (res) {
      if (res.ok) return { ok: true };
      return res.json().then(function (body) {
        var raw = body && (body.msg || body.error_description || body.message) || "";
        if (/rate limit|over_email_send/i.test(raw)) return { ok: false, code: "rate" };
        return { ok: false, code: "rejected" };
      }).catch(function () {
        return { ok: false, code: "rejected" };
      });
    }).catch(function () {
      return { ok: false, code: "offline" };
    });
  }

  function userHtml(session) {
    var person = displayName(session.user) || tr("account.you");
    var letter = person.charAt(0).toLocaleUpperCase("es");
    return '<div class="account__menu">' +
      '<button type="button" class="account__user" aria-expanded="false" aria-haspopup="menu" aria-label="' + esc(tr("account.menu")) + '">' +
      '<span class="account__avatar" aria-hidden="true">' + esc(letter) + "</span>" +
      "<span>" + esc(person) + "</span></button>" +
      '<div class="account__panel" role="menu" hidden>' +
      '<a role="menuitem" href="/perfil/">' + esc(tr("account.profile")) + "</a>" +
      '<a role="menuitem" href="/app/">' + esc(tr("account.openApp")) + "</a>" +
      '<button type="button" role="menuitem" data-logout>' + esc(tr("account.logout")) + "</button>" +
      "</div></div>";
  }

  function closeMenus(except) {
    var panels = document.querySelectorAll(".account__panel");
    for (var i = 0; i < panels.length; i++) {
      if (panels[i] === except) continue;
      panels[i].hidden = true;
      var button = panels[i].parentNode && panels[i].parentNode.querySelector(".account__user");
      if (button) button.setAttribute("aria-expanded", "false");
    }
  }

  function bindMenus() {
    var buttons = document.querySelectorAll(".account__menu .account__user");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        event.stopPropagation();
        var panel = this.parentNode.querySelector(".account__panel");
        var open = panel.hidden;
        closeMenus(open ? panel : null);
        panel.hidden = !open;
        this.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    var exits = document.querySelectorAll("[data-logout]");
    for (var j = 0; j < exits.length; j++) {
      exits[j].addEventListener("click", function () { signOut(); });
    }
  }

  var cachedSession = undefined;

  function render(session) {
      var boxes = document.querySelectorAll("[data-sesion]");
      for (var i = 0; i < boxes.length; i++) {
        if (session) boxes[i].innerHTML = userHtml(session);
        else {
          var link = boxes[i].querySelector(".login-link");
          if (link) link.setAttribute("href", loginHref());
          var create = boxes[i].querySelector(".account__ghost");
          if (create) create.setAttribute("href", registerHref());
        }
      }
      if (session) bindMenus();
  }

  function paint() {
    verify().then(function (session) {
      cachedSession = session;
      render(session);
    });
  }

  document.addEventListener("click", function () { closeMenus(null); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenus(null);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();

  global.RecunchosSesion = {
    read: read,
    verify: verify,
    displayName: displayName,
    safeNext: safeNext,
    webNext: webNext,
    confirmUrl: WEB_CONFIRM,
    applyCallback: applyCallback,
    updatePassword: updatePassword,
    requestRecovery: requestRecovery,
    loginHref: loginHref,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    repaint: function () { if (cachedSession !== undefined) render(cachedSession); },
    registerHref: registerHref,
    isFollowing: isFollowing,
    setFollow: setFollow,
    seal: seal
  };
})(window);
