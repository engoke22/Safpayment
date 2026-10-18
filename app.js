(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const HISTORY_KEY = "daraja-lab-history-v1";
  let currentStk = null, currentToken = null, toastTimer;

  const readHistory = () => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
  };
  const saveHistory = (entry) => {
    const items = [entry, ...readHistory()].slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    renderHistory();
    updateMetrics();
  };
  const safeText = (value) => String(value ?? "");
  const pretty = (value) => JSON.stringify(value, null, 2);
  function showToast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function renderResponse(prefix, payload, ok, statusText) {
    const placeholder = $(`#${prefix}-placeholder`);
    const output = $(`#${prefix}-response`);
    const status = $(`#${prefix}-status`);
    const copy = $(`#copy-${prefix}`);
    if (placeholder) placeholder.classList.add("hidden");
    output.classList.remove("hidden");
    output.textContent = pretty(payload);
    status.textContent = statusText || (ok ? "Request completed" : "Request failed");
    status.className = `status-text ${ok ? "ok" : "error"}`;
    copy.disabled = false;
  }
  async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    return { ok: response.ok && data.ok !== false, status: response.status, data };
  }
  function nav(view) {
    $$(".page").forEach(p => p.classList.toggle("active", p.id === `view-${view}`));
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    const labels = { overview: "Overview", stk: "STK Push", connection: "Connection test", history: "Request history" };
    $("#crumb-title").textContent = labels[view] || "Overview";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $$("[data-view]").forEach(b => b.addEventListener("click", () => nav(b.dataset.view)));
  $$("[data-goto]").forEach(b => b.addEventListener("click", () => nav(b.dataset.goto)));
  $("#theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem("daraja-lab-theme", document.body.classList.contains("light") ? "light" : "dark");
  });
  if (localStorage.getItem("daraja-lab-theme") === "light") document.body.classList.add("light");

  async function runTokenTest() {
    const btn = $("#token-test");
    btn.disabled = true; btn.textContent = "Requesting token…";
    try {
      const result = await requestJson("/api/token", { method: "POST" });
      currentToken = result.data;
      renderResponse("token", result.data, result.ok, result.ok ? "OAuth request successful" : `HTTP ${result.status}`);
      saveHistory({ id: crypto.randomUUID(), type: "OAuth token", time: new Date().toISOString(), ok: result.ok, status: result.status, response: result.data });
    } catch (error) {
      currentToken = { error: error.message };
      renderResponse("token", currentToken, false, "Network error");
      saveHistory({ id: crypto.randomUUID(), type: "OAuth token", time: new Date().toISOString(), ok: false, status: "Network error", response: currentToken });
    } finally {
      btn.disabled = false; btn.innerHTML = 'Request access token <span>↗</span>';
    }
  }
  $("#token-test").addEventListener("click", runTokenTest);

  $("#stk-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const btn = $("#stk-submit");
    const rawPhone = $("#phone").value.trim().replace(/[\s()+-]/g, "");
    let phone = rawPhone;
    if (phone.startsWith("0")) phone = "254" + phone.slice(1);
    if (phone.startsWith("7") || phone.startsWith("1")) phone = "254" + phone;
    if (!/^254[17]\d{8}$/.test(phone)) {
      showToast("Enter a valid Kenyan mobile number, e.g. 0712345678.");
      $("#phone").focus(); return;
    }
    const amount = Number($("#amount").value);
    if (!Number.isInteger(amount) || amount < 1 || amount > 150000) {
      showToast("Enter a whole-number amount between 1 and 150,000.");
      return;
    }
    const body = {
      phone,
      amount,
      accountReference: $("#account-reference").value.trim(),
      transactionDesc: $("#description").value.trim()
    };
    btn.disabled = true; btn.textContent = "Sending sandbox request…";
    try {
      const result = await requestJson("/api/stkpush", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      currentStk = result.data;
      renderResponse("stk", result.data, result.ok, result.ok ? "STK request accepted by API" : `HTTP ${result.status}`);
      saveHistory({ id: crypto.randomUUID(), type: "STK Push", time: new Date().toISOString(), ok: result.ok, status: result.status, response: result.data, phone, amount });
    } catch (error) {
      currentStk = { error: error.message };
      renderResponse("stk", currentStk, false, "Network error");
      saveHistory({ id: crypto.randomUUID(), type: "STK Push", time: new Date().toISOString(), ok: false, status: "Network error", response: currentStk });
    } finally {
      btn.disabled = false; btn.innerHTML = 'Send sandbox STK request <span>↗</span>';
    }
  });
  $("#copy-stk").addEventListener("click", () => copyJson(currentStk));
  $("#copy-token").addEventListener("click", () => copyJson(currentToken));
  async function copyJson(value) {
    if (!value) return;
    try { await navigator.clipboard.writeText(pretty(value)); showToast("JSON copied."); }
    catch { showToast("Copy is unavailable in this browser."); }
  }
  function updateMetrics() {
    const items = readHistory();
    $("#request-count").textContent = items.length;
    if (!items.length) {
      $("#latest-status").textContent = "No requests";
      $("#latest-time").textContent = "Run a connection test to begin";
      return;
    }
    $("#latest-status").textContent = items[0].ok ? "Success" : "Failed";
    $("#latest-time").textContent = new Date(items[0].time).toLocaleString();
  }
  function renderHistory() {
    const items = readHistory();
    const container = $("#history-list");
    if (!items.length) {
      container.innerHTML = '<div class="empty-history"><div class="response-symbol">≡</div><strong>No requests yet</strong><p>Your recent API tests will appear here.</p></div>';
      return;
    }
    container.innerHTML = "";
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "history-entry";
      const left = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.type;
      const detail = document.createElement("small");
      detail.textContent = `${new Date(item.time).toLocaleString()} · HTTP ${item.status ?? "—"}`;
      const result = document.createElement("div");
      result.className = "history-result";
      result.textContent = item.ok ? "Success" : "Failed";
      left.append(title, detail);
      const right = document.createElement("div");
      right.style.textAlign = "right";
      right.append(result);
      const view = document.createElement("button");
      view.className = "text-button";
      view.textContent = "View JSON";
      view.addEventListener("click", () => {
        const payload = pretty(item.response);
        const w = window.open("", "_blank", "noopener,noreferrer");
        if (!w) { showToast("Allow pop-ups to view this response."); return; }
        const pre = w.document.createElement("pre");
        pre.textContent = payload;
        pre.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;padding:20px;font:13px/1.6 monospace";
        w.document.body.append(pre);
        w.document.body.style.cssText = "background:#101510;color:#c5e8a9";
      });
      right.append(view); row.append(left, right); container.append(row);
    });
  }
  $("#clear-history").addEventListener("click", () => {
    if (!confirm("Clear all request history saved in this browser?")) return;
    localStorage.removeItem(HISTORY_KEY); renderHistory(); updateMetrics(); showToast("History cleared.");
  });
  renderHistory(); updateMetrics();
})();
