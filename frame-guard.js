(function () {
  if (window.top === window.self) return;
  try {
    window.top.location.replace(window.location.href);
  } catch (err) {
    window.location.replace("about:blank");
  }
})();
