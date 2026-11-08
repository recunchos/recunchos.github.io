(function () {
  var S = window.RecunchosSesion;
  var params = new URLSearchParams(location.search);
  var next = S.webNext(params.get("next"));
  document.getElementById("entrar").href = "/entrar/?next=" + encodeURIComponent(next);
  var form = document.getElementById("form");
  var error = document.getElementById("error");
  var ok = document.getElementById("ok");
  var button = document.getElementById("submit");
  var boxes = [form.age, form.terms, form.privacy];
  var shown = "";
  var okCode = "";
  function tr(key) {
    var I = window.RecunchosIdioma;
    return (I && I.t && I.t(key)) || "";
  }
  function emailOk(value) {
    var email = String(value || "").trim();
    return email.includes("@") && email.includes(".") && email.charAt(0) !== "@" && email.slice(-1) !== "@";
  }
  function mark(code) {
    ["name", "email", "password", "municipality"].forEach(function (field) {
      form[field].setAttribute("aria-invalid", "false");
    });
    if (code === "err.name") form.name.setAttribute("aria-invalid", "true");
    if (code === "err.email" || code === "err.exists" || code === "err.existsConfirm") form.email.setAttribute("aria-invalid", "true");
    if (code === "err.passwordMin" || code === "err.passwordMix") form.password.setAttribute("aria-invalid", "true");
    if (code === "err.town") form.municipality.setAttribute("aria-invalid", "true");
  }
  function show(code) {
    shown = code || "";
    okCode = "";
    ok.hidden = true;
    mark(shown);
    if (!shown) {
      error.hidden = true;
      error.textContent = "";
      return;
    }
    error.textContent = tr(shown);
    error.hidden = false;
    var field = form.name;
    if (shown === "err.email" || shown === "err.exists" || shown === "err.existsConfirm") field = form.email;
    else if (shown === "err.passwordMin" || shown === "err.passwordMix") field = form.password;
    else if (shown === "err.town") field = form.municipality;
    else if (shown === "err.age" || shown === "err.terms" || shown === "err.privacy") field = form.age;
    field.focus();
  }
  function ready() {
    button.disabled = !(form.age.checked && form.terms.checked && form.privacy.checked);
  }
  boxes.forEach(function (box) { box.addEventListener("change", ready); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.name.value.trim()) return show("err.name");
    if (!emailOk(form.email.value)) return show("err.email");
    if (!form.password.value || form.password.value.length < 8) return show("err.passwordMin");
    var letter = false;
    try { letter = /\p{L}/u.test(form.password.value); }
    catch (err) { letter = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÒÇàèòç]/.test(form.password.value); }
    if (!/[0-9]/.test(form.password.value) || !letter) return show("err.passwordMix");
    if (!form.municipality.value.trim()) return show("err.town");
    if (!form.age.checked) return show("err.age");
    if (!form.terms.checked) return show("err.terms");
    if (!form.privacy.checked) return show("err.privacy");
    show("");
    button.disabled = true;
    var kind = form.kind.value;
    if (window.RecunchosIdioma && window.RecunchosIdioma.recordAcceptance) {
      window.RecunchosIdioma.recordAcceptance();
    }
    S.signUp({
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      municipality: form.municipality.value,
      accountKind: kind,
      ageConfirmed: form.age.checked,
      termsAccepted: form.terms.checked,
      privacyAcknowledged: form.privacy.checked
    }).then(function (result) {
      ready();
      if (!result.ok) return show(result.code || "err.signupFail");
      if (result.confirmEmail) {
        okCode = result.code || "err.confirmEmail";
        ok.textContent = tr(okCode);
        ok.hidden = false;
        form.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
        return;
      }
      location.assign(next);
    });
  });
  document.addEventListener("recunchos:idioma", function () {
    if (shown) error.textContent = tr(shown);
    if (okCode && !ok.hidden) ok.textContent = tr(okCode);
  });
  S.verify().then(function (session) {
    if (session) location.replace(next);
  });
})();
