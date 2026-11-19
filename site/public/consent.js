// Loads Google Analytics and Microsoft Clarity. Shared by the site and the app
// (same origin, so one choice covers both); production builds only.
// Visitors whose time zone is in Europe (EU, EEA, UK, Switzerland) are asked first
// and nothing loads until they accept. Anyone can change their choice later from
// a "Cookie settings" link (any element with data-consent-settings).
(function () {
  var KEY = "megacsv-consent"; // "granted" or "denied"
  var GA = "G-5R3TTC770R";
  var CLARITY = "z6gjzdh6wf";

  var tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch (e) {}
  var asks =
    /^Europe\//.test(tz) ||
    /^Atlantic\/(Canary|Madeira|Azores|Reykjavik|Faroe)$/.test(tz) ||
    tz === "Asia/Nicosia" ||
    tz === "Asia/Famagusta" ||
    tz === "Arctic/Longyearbyen";

  var choice = null;
  try {
    choice = localStorage.getItem(KEY);
  } catch (e) {}
  var loaded = false;

  // Only the live site counts: production builds run locally (pnpm dev:api, previews) stay out of the numbers.
  var live = /(^|\.)megacsv\.com$/.test(location.hostname);

  function load() {
    if (loaded || !live) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA);
    add("https://www.googletagmanager.com/gtag/js?id=" + GA);
    window.clarity =
      window.clarity ||
      function () {
        (window.clarity.q = window.clarity.q || []).push(arguments);
      };
    add("https://www.clarity.ms/tag/" + CLARITY);
    window.dispatchEvent(new Event("megacsv-analytics"));
  }

  function add(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function save(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {}
    var wasLoaded = loaded;
    if (value === "granted") load();
    // Scripts that already ran can't be unloaded; a reload starts clean.
    else if (wasLoaded) location.reload();
  }

  var CSS =
    ".mc-consent{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;" +
    "background:#fff;color:#17181a;border:1px solid #e2e3e0;border-radius:12px;box-shadow:0 24px 48px -32px #0004;" +
    "padding:16px;font:400 15px/1.45 'Hanken Grotesk',system-ui,sans-serif}" +
    ".mc-consent p{margin:0 0 12px}.mc-consent a{color:#2449f5}" +
    ".mc-consent .mc-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}" +
    ".mc-consent button{font:inherit;font-weight:500;line-height:1;border:0;border-radius:8px;padding:11px 18px;cursor:pointer;" +
    "touch-action:manipulation;transition:transform 160ms cubic-bezier(0.23,1,0.32,1)}" +
    ".mc-consent button:active{transform:scale(0.97)}" +
    ".mc-consent button:focus-visible{outline:2px solid #2449f5;outline-offset:2px}" +
    ".mc-consent .mc-no{background:#dcdedb;color:#17181a}.mc-consent .mc-yes{background:#2449f5;color:#fff}" +
    "@media (prefers-color-scheme:dark){:root:not(.light) .mc-consent{background:#17181b;color:#e9eaec;border-color:#24262a}" +
    ":root:not(.light) .mc-consent a{color:#6f8bff}:root:not(.light) .mc-consent .mc-no{background:#27292d;color:#e9eaec}" +
    ":root:not(.light) .mc-consent .mc-yes{background:#6f8bff;color:#0b0c10}}" +
    ":root.dark .mc-consent{background:#17181b;color:#e9eaec;border-color:#24262a}:root.dark .mc-consent a{color:#6f8bff}" +
    ":root.dark .mc-consent .mc-no{background:#27292d;color:#e9eaec}:root.dark .mc-consent .mc-yes{background:#6f8bff;color:#0b0c10}" +
    "@media (prefers-reduced-motion:reduce){.mc-consent button{transition:none}}";

  function ask() {
    if (document.querySelector(".mc-consent")) return;
    if (!document.getElementById("mc-consent-css")) {
      var style = document.createElement("style");
      style.id = "mc-consent-css";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    var box = document.createElement("section");
    box.className = "mc-consent";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Cookies");
    box.innerHTML =
      "<p>We'd like to use cookies from Google Analytics and Microsoft Clarity to see how MegaCSV is used, so we can fix problems and improve it. " +
      "Clarity's session replays can show what's on your screen, including parts of an open file; the file itself is never uploaded. " +
      '<a href="/privacy">Privacy policy</a></p>' +
      '<div class="mc-row"><button type="button" class="mc-no">No thanks</button>' +
      '<button type="button" class="mc-yes">Accept</button></div>';
    box.querySelector(".mc-no").addEventListener("click", function () {
      box.remove();
      save("denied");
    });
    box.querySelector(".mc-yes").addEventListener("click", function () {
      box.remove();
      save("granted");
    });
    document.body.appendChild(box);
  }

  window.megacsvConsent = { open: ask };
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("[data-consent-settings]")) {
      e.preventDefault();
      ask();
    }
  });

  if (choice === "granted" || (!asks && choice !== "denied")) load();
  else if (choice !== "denied") {
    if (document.body) ask();
    else document.addEventListener("DOMContentLoaded", ask);
  }
})();
