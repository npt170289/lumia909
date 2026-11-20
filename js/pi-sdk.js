/* Lumia 909 — Pi SDK lazy loader.
 * Loads the Pi SDK ONLY inside Pi Browser, mirroring the Garden 303 pattern.
 * NOTE: the Lumia source has NO App ID in its Pi.init — none is invented here. */
(function () {
  var isPiBrowser = /PiBrowser/i.test(navigator.userAgent) || window.Pi !== undefined;
  var sdkReady = null;

  function loadSdk() {
    if (sdkReady) return sdkReady;
    sdkReady = new Promise(function (resolve) {
      if (!isPiBrowser) { resolve(false); return; }
      if (window.Pi) { initPi(); resolve(true); return; }
      var s = document.createElement("script");
      s.src = "https://sdk.minepi.com/pi-sdk.js";
      s.onload = function () { initPi(); resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return sdkReady;
  }

  function initPi() {
    try {
      if (window.Pi) window.Pi.init({ version: "2.0", sandbox: false });
    } catch (e) { /* Pi init failed; login stays unavailable */ }
  }

  function onIncompletePayment(payment) {
    // Incomplete payments are completed server-side; nothing to do in the browser.
    return Promise.resolve();
  }

  window.LumiaPiAuth = function () {
    return loadSdk().then(function (ok) {
      if (!ok || !window.Pi) return null;
      return window.Pi.authenticate(["username", "payments"], onIncompletePayment)
        .then(function (auth) { return auth && auth.user ? auth.user : null; })
        .catch(function () { return null; });
    });
  };

  window.LumiaPiStatus = function () {
    if (!isPiBrowser) return "not-pi";
    return window.Pi ? "ready" : "checking";
  };

  // Start loading in the background when inside Pi Browser.
  if (isPiBrowser) loadSdk();
})();
