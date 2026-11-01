(function () {
  var S = window.RecunchosSesion;
  var params = new URLSearchParams(location.search);
  var next = S.safeNext(params.get("next"));
  var create = document.querySelector(".links a[href='/crear-cuenta/']");
  if (create) create.href = "/crear-cuenta/?next=" + encodeURIComponent(next);
  var form = document.getElementById("form");
  var error = document.getElementById("error");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    error.hidden = true;
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    S.signIn(form.email.value, form.password.value).then(function (result) {
      button.disabled = false;
      if (!result.ok) {
        error.textContent = result.message;
        error.hidden = false;
        return;
      }
      location.assign(next);
    });
  });
  S.verify().then(function (session) {
    if (session) location.replace(next);
  });
})();
