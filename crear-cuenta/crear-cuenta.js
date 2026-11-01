(function () {
  var S = window.RecunchosSesion;
  var params = new URLSearchParams(location.search);
  var next = S.safeNext(params.get("next"));
  document.getElementById("entrar").href = "/entrar/?next=" + encodeURIComponent(next);
  var form = document.getElementById("form");
  var error = document.getElementById("error");
  var ok = document.getElementById("ok");
  var button = document.getElementById("submit");
  var boxes = [form.age, form.terms, form.privacy];
  function ready() {
    button.disabled = !(form.age.checked && form.terms.checked && form.privacy.checked);
  }
  boxes.forEach(function (box) { box.addEventListener("change", ready); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    error.hidden = true;
    ok.hidden = true;
    button.disabled = true;
    var kind = form.kind.value;
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
      if (!result.ok) {
        error.textContent = result.message;
        error.hidden = false;
        return;
      }
      if (result.confirmEmail) {
        ok.textContent = result.message;
        ok.hidden = false;
        form.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
        return;
      }
      location.assign(next);
    });
  });
  S.verify().then(function (session) {
    if (session) location.replace(next);
  });
})();
