(function () {
  var S = window.RecunchosSesion;
  var params = new URLSearchParams(location.search);
  var next = S.webNext(params.get("next"));
  var create = document.querySelector(".links a[href='/crear-cuenta/']");
  if (create) create.href = "/crear-cuenta/?next=" + encodeURIComponent(next);
  var form = document.getElementById("form");
  var error = document.getElementById("error");
  var shown = "";

  function tr(key) {
    var I = window.RecunchosIdioma;
    return (I && I.t && I.t(key)) || "";
  }

  function emailOk(value) {
    var email = String(value || "").trim();
    return email.includes("@") && email.includes(".") && email.charAt(0) !== "@" && email.slice(-1) !== "@";
  }

  function show(code) {
    shown = code || "";
    var emailBad = shown === "err.email" || shown === "err.authInvalid";
    var passwordBad = shown === "err.authInvalid" || shown === "err.passwordMin" || shown === "err.passwordMix";
    form.email.setAttribute("aria-invalid", emailBad ? "true" : "false");
    form.password.setAttribute("aria-invalid", passwordBad ? "true" : "false");
    if (!shown) {
      error.hidden = true;
      error.textContent = "";
      return;
    }
    error.textContent = tr(shown);
    error.hidden = false;
    if (emailBad) form.email.focus();
    else if (passwordBad) form.password.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!emailOk(form.email.value)) return show("err.email");
    if (!form.password.value || form.password.value.length < 8) return show("err.passwordMin");
    show("");
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    S.signIn(form.email.value, form.password.value).then(function (result) {
      button.disabled = false;
      if (!result.ok) return show(result.code || "err.authFail");
      location.assign(next);
    });
  });
  document.addEventListener("recunchos:idioma", function () {
    if (shown) error.textContent = tr(shown);
  });
  S.verify().then(function (session) {
    if (session) location.replace(next);
  });
})();
