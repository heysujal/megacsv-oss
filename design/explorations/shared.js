// Shared behaviour for the design explorations: sample data, open-file flow,
// theme toggle, find highlighting, rolling counters. Throwaway mockup code.
(() => {
  const COLS = ["txn_id", "posted_date", "vendor", "account", "cost_center", "amount", "currency", "status", "invoice_no", "country"];
  const VENDORS = ["Acme Industrial Supply", "Northwind Traders", "Globex Logistics", "Initech Software", "Umbrella Freight", "Acme Industrial Supply", "Stark Components", "Wayne Facilities", "Hooli Cloud Services", "Acme Industrial Supply", "Soylent Foods", "Vandelay Imports"];
  const ACCOUNTS = ["6100 Materials", "6200 Freight", "6400 Software", "6500 Facilities", "7100 Travel"];
  const STATUS = ["Posted", "Posted", "Posted", "Pending", "Reversed"];
  const COUNTRIES = ["US", "DE", "IN", "GB", "SG", "US", "NL"];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const START_ROW = 18_402_113;

  const rows = Array.from({ length: 80 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 6, 1) + Math.floor(rnd() * 90) * 864e5);
    return [
      "TX-" + String(90_412_000 + i * 37 + Math.floor(rnd() * 30)).padStart(9, "0"),
      d.toISOString().slice(0, 10),
      pick(VENDORS),
      pick(ACCOUNTS),
      "CC-" + String(100 + Math.floor(rnd() * 40)).padStart(4, "0"),
      (rnd() * 48000 + 12).toFixed(2),
      pick(["USD", "USD", "EUR", "INR", "GBP"]),
      pick(STATUS),
      "INV-00" + Math.floor(rnd() * 900000 + 100000),
      pick(COUNTRIES),
    ];
  });

  const fmt = (n) => n.toLocaleString("en-US");
  window.MEGA = { COLS, rows, START_ROW, fmt };

  if (!document.getElementById("i-up")) {
    document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 15V3m0 0 4 4m-4-4-4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></symbol>
  <symbol id="i-theme" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 9l4.6-4.6M12 14.3l7.4-7.4M12 19.6l8.8-8.8"/></symbol>
  <symbol id="i-wifi" viewBox="0 0 24 24"><path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2-1.5M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M12 20h.01"/></symbol>
  <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></symbol>
  <symbol id="i-gift" viewBox="0 0 24 24"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
  <symbol id="i-cols" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/></symbol>
  <symbol id="i-filter" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></symbol>
  <symbol id="i-split" viewBox="0 0 24 24"><path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M12 22v-8"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
</svg>`);
  }

  function renderGrid() {
    document.querySelectorAll("[data-grid]").forEach((table) => {
      const letters = table.hasAttribute("data-letters");
      const thead = table.createTHead();
      if (letters) {
        const lr = thead.insertRow();
        lr.className = "letters";
        lr.appendChild(document.createElement("th"));
        COLS.forEach((_, i) => {
          const th = document.createElement("th");
          th.textContent = String.fromCharCode(65 + i);
          lr.appendChild(th);
        });
      }
      const hr = thead.insertRow();
      hr.className = "names";
      const corner = document.createElement("th");
      corner.className = "rn";
      hr.appendChild(corner);
      COLS.forEach((c) => {
        const th = document.createElement("th");
        th.textContent = c;
        if (c === "amount") th.className = "num";
        hr.appendChild(th);
      });
      const tb = table.createTBody();
      rows.forEach((r, i) => {
        const tr = tb.insertRow();
        const rn = document.createElement("td");
        rn.className = "rn";
        rn.textContent = fmt(START_ROW + i);
        tr.appendChild(rn);
        r.forEach((v, j) => {
          const td = tr.insertCell();
          td.textContent = v;
          if (COLS[j] === "amount") td.className = "num";
          if (COLS[j] === "status") td.dataset.status = v;
        });
        if (i === 3) tr.classList.add("sel");
      });
    });
  }

  function countUp(el, to, ms) {
    const t0 = performance.now();
    const from = Number(el.dataset.from || 0);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setFileName(name) {
    document.querySelectorAll("[data-filename]").forEach((el) => (el.textContent = name));
  }

  function openFile(name) {
    if (name) setFileName(name);
    const body = document.body;
    body.classList.add("loading");
    const bar = document.querySelector("[data-progress]");
    const cnt = document.querySelector("[data-loading-count]");
    if (cnt) countUp(cnt, 48_273_485, 1100);
    if (bar) {
      bar.style.transition = "none";
      bar.style.transform = "scaleX(0)";
      requestAnimationFrame(() => {
        bar.style.transition = "transform 1100ms cubic-bezier(0.23, 1, 0.32, 1)";
        bar.style.transform = "scaleX(1)";
      });
    }
    setTimeout(() => {
      body.classList.remove("loading");
      body.classList.add("show-app");
      window.scrollTo(0, 0);
      document.querySelectorAll("[data-count-app]").forEach((el) => countUp(el, Number(el.dataset.countApp), 700));
    }, 1250);
  }

  function goHome() {
    document.body.classList.remove("show-app", "loading");
    window.scrollTo(0, 0);
  }

  function find(q) {
    q = q.trim().toLowerCase();
    let hits = 0;
    document.querySelectorAll("[data-grid] tbody td:not(.rn)").forEach((td) => {
      const on = q.length > 1 && td.textContent.toLowerCase().includes(q);
      td.classList.toggle("hit", on);
      if (on) hits++;
    });
    document.querySelectorAll("[data-hits]").forEach((el) => (el.textContent = q.length > 1 ? fmt(hits * 4_113) + " matches" : ""));
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.dataset.action;
    if (a === "open") openFile(t.dataset.file);
    if (a === "pick") document.getElementById("picker")?.click();
    if (a === "home") goHome();
    if (a === "theme") {
      const root = document.documentElement;
      root.classList.toggle("dark");
      localStorage.setItem("mega-theme-" + location.pathname, root.classList.contains("dark") ? "dark" : "light");
    }
    if (a === "toggle") document.querySelector(t.dataset.target)?.classList.toggle("open");
  });

  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-find]")) find(e.target.value);
  });

  document.addEventListener("change", (e) => {
    if (e.target.id === "picker" && e.target.files[0]) openFile(e.target.files[0].name);
  });

  let depth = 0;
  addEventListener("dragenter", (e) => { e.preventDefault(); depth++; document.body.classList.add("dragging"); });
  addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; document.body.classList.remove("dragging"); } });
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => {
    e.preventDefault();
    depth = 0;
    document.body.classList.remove("dragging");
    const f = e.dataTransfer.files[0];
    openFile(f ? f.name : undefined);
  });

  const saved = localStorage.getItem("mega-theme-" + location.pathname);
  if (saved === "dark" || (!saved && document.documentElement.dataset.default === "dark")) document.documentElement.classList.add("dark");

  if (!document.getElementById("picker")) {
    const inp = document.createElement("input");
    inp.type = "file"; inp.id = "picker"; inp.hidden = true; inp.accept = ".csv,.tsv,.txt";
    document.body.appendChild(inp);
  }

  renderGrid();
  document.querySelectorAll("[data-count-home]").forEach((el) => countUp(el, Number(el.dataset.countHome), 1600));
  if (location.hash === "#app") { document.body.classList.add("show-app"); document.querySelectorAll("[data-count-app]").forEach((el) => (el.textContent = fmt(Number(el.dataset.countApp)))); }
  if (location.hash === "#dark") document.documentElement.classList.add("dark");
  if (location.hash === "#app-dark") { document.documentElement.classList.add("dark"); document.body.classList.add("show-app"); document.querySelectorAll("[data-count-app]").forEach((el) => (el.textContent = fmt(Number(el.dataset.countApp)))); }
})();
