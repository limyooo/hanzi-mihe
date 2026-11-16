/* =========================================================
 * 配置
 * USE_MOCK = true  : 不需要后端，用假数据先跑通前端
 * USE_MOCK = false : 调用你写的 Python 后端
 * API_BASE 留空表示和页面同源（比如后端在 localhost:8000 同时托管这个页面）
 * ========================================================= */
const USE_MOCK = false;
const API_BASE = "";

/* =========================================================
 * API 层 —— 后端只需实现下面这 5 个接口
 * ========================================================= */
const api = {
  // GET /api/sessions -> [{id, name, created_at}]
  listSessions: () => request("GET", "/api/sessions"),

  // POST /api/sessions -> {id, name, created_at, messages:[{role, content}]}
  // 新建会话时，后端让 AI 出第一道题，放在 messages 里返回
  createSession: () => request("POST", "/api/sessions"),

  // DELETE /api/sessions/{id} -> {ok: true}
  deleteSession: (id) => request("DELETE", `/api/sessions/${id}`),

  // GET /api/sessions/{id}/messages -> [{role: "user"|"assistant", content}]
  getMessages: (id) => request("GET", `/api/sessions/${id}/messages`),

  // POST /api/sessions/{id}/chat  body: {message} -> {reply}
  chat: (id, message) => request("POST", `/api/sessions/${id}/chat`, { message }),
};

async function request(method, path, body) {
  if (USE_MOCK) return mock(method, path, body);
  const res = await fetch(API_BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} 失败：HTTP ${res.status}`);
  return res.json();
}

/* =========================================================
 * Mock 后端（写好真后端后把 USE_MOCK 改成 false 即可）
 * ========================================================= */
const mockDB = { sessions: [], messages: {} };
const riddles = [["一箭穿心", "必"], ["半部春秋", "秦"], ["七十二小时", "晶"], ["一口咬掉牛尾巴", "告"]];
let mockAnswer = {};
function mock(method, path, body) {
  return new Promise((resolve) => setTimeout(() => {
    const m = path.match(/^\/api\/sessions\/?([^/]*)\/?(\w*)$/);
    const id = m[1], action = m[2];
    const newRiddle = (sid) => {
      const r = riddles[Math.floor(Math.random() * riddles.length)];
      mockAnswer[sid] = r[1];
      return `谜面：${r[0]}（打一字）`;
    };
    if (method === "GET" && !id) return resolve([...mockDB.sessions].reverse());
    if (method === "POST" && !id) {
      const now = new Date();
      const s = { id: String(now.getTime()), name: formatTime(now), created_at: now.toISOString() };
      mockDB.sessions.push(s);
      mockDB.messages[s.id] = [{ role: "assistant", content: newRiddle(s.id) }];
      return resolve({ ...s, messages: mockDB.messages[s.id] });
    }
    if (method === "DELETE") {
      mockDB.sessions = mockDB.sessions.filter((s) => s.id !== id);
      delete mockDB.messages[id];
      return resolve({ ok: true });
    }
    if (method === "GET" && action === "messages") return resolve(mockDB.messages[id] || []);
    if (method === "POST" && action === "chat") {
      const msgs = mockDB.messages[id];
      msgs.push({ role: "user", content: body.message });
      let reply;
      if (/来|再|新|下一/.test(body.message)) reply = newRiddle(id);
      else if (body.message.includes(mockAnswer[id])) reply = `太棒了！答对了！就是“${mockAnswer[id]}”字！要不要再来一题？`;
      else reply = "差一点点哦～再想想谜面里的每个字分别对应什么部件？";
      msgs.push({ role: "assistant", content: reply });
      return resolve({ reply });
    }
    resolve(null);
  }, 400));
}

/* =========================================================
 * 页面逻辑
 * ========================================================= */
const $ = (id) => document.getElementById(id);
const els = {
  list: $("sessionList"), messages: $("messages"), name: $("sessionName"),
  input: $("input"), send: $("btnSend"), btnNew: $("btnNew"), toast: $("toast"),
};
const state = { sessions: [], currentId: null, sending: false };

function formatTime(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function toast(text) {
  els.toast.textContent = text;
  els.toast.style.display = "block";
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (els.toast.style.display = "none"), 2500);
}

function renderSessions() {
  els.list.innerHTML = "";
  if (!state.sessions.length) {
    els.list.innerHTML = '<li class="empty-tip">还没有游戏记录</li>';
    return;
  }
  for (const s of state.sessions) {
    const li = document.createElement("li");
    li.className = "session-item" + (s.id === state.currentId ? " active" : "");
    const btn = document.createElement("button");
    btn.className = "session-btn";
    btn.textContent = "🧩 " + s.name;
    btn.onclick = () => openSession(s.id);
    const del = document.createElement("button");
    del.className = "btn-del";
    del.textContent = "✕";
    del.setAttribute("aria-label", "删除 " + s.name);
    del.onclick = () => removeSession(s.id);
    li.append(btn, del);
    els.list.appendChild(li);
  }
}

function addMessage(role, content) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "🙂" : "🤖";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content; // 用 textContent 防止 XSS
  wrap.append(avatar, bubble);
  els.messages.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;
  return wrap;
}

function addTyping() {
  const el = addMessage("assistant", "");
  el.querySelector(".bubble").innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
  return el;
}

function renderMessages(list) {
  els.messages.innerHTML = "";
  list.forEach((m) => addMessage(m.role, m.content));
}

function setInputEnabled(on) {
  els.input.disabled = !on;
  els.send.disabled = !on;
  if (on) els.input.focus();
}

async function loadSessions() {
  try {
    state.sessions = await api.listSessions();
    renderSessions();
  } catch (e) { toast(e.message); }
}

async function newSession() {
  els.btnNew.disabled = true;
  try {
    const s = await api.createSession();
    state.sessions.unshift({ id: s.id, name: s.name, created_at: s.created_at });
    state.currentId = s.id;
    els.name.textContent = "会话名称：" + s.name;
    renderSessions();
    renderMessages(s.messages || []);
    setInputEnabled(true);
  } catch (e) { toast(e.message); }
  finally { els.btnNew.disabled = false; }
}

async function openSession(id) {
  state.currentId = id;
  const s = state.sessions.find((x) => x.id === id);
  els.name.textContent = "会话名称：" + (s ? s.name : id);
  renderSessions();
  try {
    renderMessages(await api.getMessages(id));
    setInputEnabled(true);
  } catch (e) { toast(e.message); }
}

async function removeSession(id) {
  if (!confirm("确定删除这条游戏记录吗？")) return;
  try {
    await api.deleteSession(id);
    state.sessions = state.sessions.filter((s) => s.id !== id);
    if (state.currentId === id) {
      state.currentId = null;
      els.name.textContent = "未选择会话";
      els.messages.innerHTML = '<div class="welcome"><div class="big">🧩</div>点击左侧「新建游戏」开始猜字谜</div>';
      setInputEnabled(false);
    }
    renderSessions();
  } catch (e) { toast(e.message); }
}

async function send() {
  const text = els.input.value.trim();
  if (!text || !state.currentId || state.sending) return;
  state.sending = true;
  els.input.value = "";
  addMessage("user", text);
  setInputEnabled(false);
  const typing = addTyping();
  try {
    const { reply } = await api.chat(state.currentId, text);
    typing.remove();
    addMessage("assistant", reply);
  } catch (e) {
    typing.remove();
    toast(e.message);
  } finally {
    state.sending = false;
    setInputEnabled(true);
  }
}

els.btnNew.onclick = newSession;
els.send.onclick = send;
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) send(); // isComposing：中文输入法选字时按回车不发送
});

loadSessions();
