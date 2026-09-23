const STORE = 'venu-mvp-v2';
const CATEGORY = ['Commute', 'Regular lunch', 'Outside food', 'Miscellaneous', 'Medicines', 'Groceries'];
const iso = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const seed = { profileName: 'Venu', budget: 15000, upi: '', transactions: [
  { id: 'a1', kind: 'expense', amount: 480, note: 'Mocca & Co.', category: 'Miscellaneous', date: iso(0) },
  { id: 'a2', kind: 'expense', amount: 246, note: 'Metro card top-up', category: 'Commute', date: iso(-1) },
  { id: 'a3', kind: 'expense', amount: 119, note: 'Pharmacy refill', category: 'Medicines', date: iso(-3) },
  { id: 'r1', kind: 'received', amount: 5000, note: 'September allowance', person: 'Mom', date: iso(0) },
  { id: 'r2', kind: 'received', amount: 4000, note: 'Dinner reimbursement', person: 'Arjun', date: iso(-2) }
] };
let state = load(), activeEntry = 'expense', entryCategory = 'Commute', activeCategory = 'all', cloud = null;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fmt = n => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const monthNow = new Date().toISOString().slice(0, 7);

function load() { try { const saved = JSON.parse(localStorage.getItem(STORE)); return saved ? { ...structuredClone(seed), ...saved } : structuredClone(seed); } catch { return structuredClone(seed); } }
function persist() { localStorage.setItem(STORE, JSON.stringify(state)); }
function data(kind) { return state.transactions.filter(t => !kind || t.kind === kind); }
function sum(rows) { return rows.reduce((total, row) => total + Number(row.amount), 0); }
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function dateText(value) { const start = new Date(); start.setHours(0, 0, 0, 0); const date = new Date(`${value}T00:00:00`); const days = Math.round((start - date) / 86400000); if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'; return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date); }
function icon(category) { return ({ Commute: '↗', 'Regular lunch': '◒', 'Outside food': '✦', Miscellaneous: '☕', Medicines: '✚', Groceries: '◌' })[category] || '◌'; }
function tone(category) { return ({ Commute: 'commute', 'Regular lunch': 'lunch', 'Outside food': 'outside', Miscellaneous: 'misc', Medicines: 'medicines', Groceries: 'groceries' })[category] || 'misc'; }
function empty(message) { return `<p class="empty">${message}</p>`; }
function row(t) { const incoming = t.kind === 'received'; return `<article class="row"><span class="row-icon ${incoming ? 'incoming' : tone(t.category)}">${incoming ? escapeHtml((t.person || '?')[0].toUpperCase()) : icon(t.category)}</span><div><b>${escapeHtml(incoming ? (t.person || 'Received') : t.note)}</b><p>${escapeHtml(incoming ? t.note : t.category)} · ${dateText(t.date)}</p></div><strong class="${incoming ? 'plus' : ''}">${incoming ? '+' : '−'}${fmt(t.amount)}</strong><button class="row-delete" aria-label="Delete transaction" data-delete="${t.id}">×</button></article>`; }

function render() {
  const expenses = data('expense'), received = data('received');
  const monthExpenses = expenses.filter(t => t.date.startsWith(monthNow));
  const monthReceived = received.filter(t => t.date.startsWith(monthNow));
  const spent = sum(monthExpenses), inAmount = sum(monthReceived), left = Math.max(state.budget - spent, 0), pct = state.budget ? Math.min(100, Math.round((spent / state.budget) * 100)) : 0;
  $('#availableBalance').textContent = fmt(state.budget - spent);
  $('#monthIn').textContent = fmt(inAmount); $('#monthOut').textContent = fmt(spent); $('#monthlyTrend').textContent = spent ? `${pct}% of budget used` : 'A fresh start';
  $('#budgetPercent').innerHTML = `${pct}<small>%</small>`; $('#budgetRemaining').textContent = `${fmt(left)} left`; $('#budgetLimit').textContent = fmt(state.budget);
  $('#budgetDonut').style.background = `conic-gradient(var(--ink) 0 ${pct}%, var(--sand) ${pct}% 100%)`;
  const all = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  $('#recentActivity').innerHTML = all.slice(0, 4).map(row).join('') || empty('Nothing here yet.');
  const query = ($('#expenseSearch')?.value || '').trim().toLowerCase();
  const shownExpenses = expenses.filter(t => (activeCategory === 'all' || t.category === activeCategory) && `${t.note} ${t.category}`.toLowerCase().includes(query)).sort((a, b) => b.date.localeCompare(a.date));
  $('#expenseList').innerHTML = shownExpenses.map(row).join('') || empty('No expenses match this view.');
  const monthPeople = [...new Set(monthReceived.map(t => t.person).filter(Boolean))];
  $('#receivedMonth').textContent = fmt(inAmount); $('#receivedPeople').textContent = `from ${monthPeople.length} ${monthPeople.length === 1 ? 'person' : 'people'}`;
  const byPerson = {}; received.forEach(t => { const person = t.person || 'Unknown'; byPerson[person] = (byPerson[person] || 0) + t.amount; });
  const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0];
  $('#topSender').textContent = top ? top[0] : '—'; $('#topSenderAmount').textContent = top ? fmt(top[1]) : 'No records yet';
  const last = all.find(t => t.kind === 'received'); $('#lastReceived').textContent = last ? fmt(last.amount) : '—'; $('#lastReceivedDate').textContent = last ? `${last.person || 'Unknown'} · ${dateText(last.date)}` : 'Add your first entry';
  $('#receivedList').innerHTML = [...received].sort((a, b) => b.date.localeCompare(a.date)).map(row).join('') || empty('Add money received from someone.');
  renderChart(expenses); renderIdentity();
}
function renderChart(expenses) { const days = Array.from({ length: 7 }, (_, i) => iso(i - 6)); const amounts = days.map(day => sum(expenses.filter(t => t.date === day))); const max = Math.max(...amounts, 1); $('#weeklyChart').innerHTML = amounts.map((amount, i) => `<i class="${i === 6 ? 'today-bar' : ''}" style="height:${Math.max(8, amount / max * 100)}%"><b>${amount ? fmt(amount) : ''}</b></i>`).join(''); }
function renderIdentity() { const name = state.profileName || 'Venu'; $('#profileName').textContent = name; $('#profileInitial').textContent = name[0].toUpperCase(); $('#contributorName').textContent = `${name}.`; $('#settingName').value = name; $('#settingBudget').value = state.budget; $('#settingUpi').value = state.upi; $('#upiText').textContent = state.upi || 'not configured'; const canPay = Boolean(state.upi); $('#copyUpi').disabled = !canPay; const payment = encodeURIComponent(`upi://pay?pa=${state.upi}&pn=${name}&cu=INR`); $('#qrImage').src = canPay ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${payment}` : placeholderQr(); }
function placeholderQr() { return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="320"%3E%3Crect width="100%25" height="100%25" fill="%23eee8dd"/%3E%3Cpath d="M30 30h70v70H30zM220 30h70v70h-70zM30 220h70v70H30z" fill="none" stroke="%231d314d" stroke-width="16"/%3E%3Ctext x="50%25" y="55%25" text-anchor="middle" fill="%231d314d" font-family="sans-serif" font-size="16"%3EAdd UPI ID%3C/text%3E%3C/svg%3E'; }
function switchView(view) { $$('.view').forEach(el => el.classList.toggle('active', el.id === view)); $$('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view)); const titles = { overview: 'A little clearer, <em>every day.</em>', expenses: 'The everyday <em>outgoing.</em>', received: 'Every arrival <em>counts.</em>', contribute: 'A small spark <em>goes far.</em>', settings: 'Your space, <em>your rules.</em>' }; $('#headerTitle').innerHTML = titles[view]; window.scrollTo({ top: 0, behavior: 'smooth' }); }

function openEntry(kind) { activeEntry = kind; const received = kind === 'received'; $('#entryKicker').textContent = received ? 'MONEY RECEIVED' : 'NEW EXPENSE'; $('#entryTitle').innerHTML = received ? 'Good things <em>arrive.</em>' : 'Make it <em>count.</em>'; $$('.receive-only').forEach(el => el.hidden = !received); $('#entryCategories').hidden = received; $('#entryNote').placeholder = received ? 'e.g. September allowance' : 'e.g. Lunch at office'; $('#entryDialog').showModal(); setTimeout(() => $('#entryAmount').focus(), 30); }
function closeEntry() { $('#entryDialog').close(); $('#entryForm').reset(); }
async function addEntry(event) { event.preventDefault(); const amount = Number($('#entryAmount').value), note = $('#entryNote').value.trim(), person = $('#entryPerson').value.trim(); if (!amount || !note || (activeEntry === 'received' && !person)) return; const entry = { id: crypto.randomUUID(), kind: activeEntry, amount, note, category: entryCategory, person, date: iso() }; state.transactions.unshift(entry); persist(); render(); closeEntry(); await cloudInsert(entry); }

function setCloudStatus(kind, title, detail) { const box = $('#cloudStatus'); if (!box) return; box.className = `cloud-status ${kind}`; box.querySelector('b').textContent = title; box.querySelector('p').textContent = detail; }
function dbRow(t) { return { id: t.id, kind: t.kind, amount: t.amount, note: t.note, category: t.category || null, person: t.person || null, occurred_on: t.date }; }
function appRow(t) { return { id: t.id, kind: t.kind, amount: Number(t.amount), note: t.note, category: t.category || '', person: t.person || '', date: t.occurred_on }; }
async function startCloudSync() {
  try {
    const configResponse = await fetch('/api/config', { cache: 'no-store' }); if (!configResponse.ok) throw new Error('No database configuration'); const config = await configResponse.json(); if (!config.url || !config.anonKey) throw new Error('No database configuration');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2'); const client = createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await client.auth.getSession(); if (!session) { const result = await client.auth.signInAnonymously(); if (result.error) throw result.error; session = result.data.session; }
    cloud = { client, userId: session.user.id };
    const profileResult = await client.from('profiles').select('*').eq('user_id', cloud.userId).maybeSingle(); if (profileResult.error) throw profileResult.error;
    const rowsResult = await client.from('transactions').select('*').order('occurred_on', { ascending: false }); if (rowsResult.error) throw rowsResult.error;
    if (profileResult.data) { state.profileName = profileResult.data.display_name || state.profileName; state.budget = Number(profileResult.data.monthly_budget); state.upi = profileResult.data.upi_id || ''; }
    if (rowsResult.data.length) state.transactions = rowsResult.data.map(appRow); else await cloudReplaceAll();
    persist(); render(); setCloudStatus('connected', 'Private cloud sync is on', 'Your entries are tied to this anonymous device session.');
  } catch (error) { cloud = null; setCloudStatus('local', 'Using this device only', 'Add Vercel Supabase environment variables to enable private sync.'); }
}
async function cloudSaveProfile() { if (!cloud) return; const { error } = await cloud.client.from('profiles').upsert({ user_id: cloud.userId, display_name: state.profileName, monthly_budget: state.budget, upi_id: state.upi, updated_at: new Date().toISOString() }); if (error) setCloudStatus('local', 'Sync needs attention', 'Your changes remain safely in this browser.'); }
async function cloudInsert(entry) { if (!cloud) return; const { error } = await cloud.client.from('transactions').insert(dbRow(entry)); if (error) setCloudStatus('local', 'Sync needs attention', 'Your changes remain safely in this browser.'); }
async function cloudDelete(id) { if (!cloud) return; const { error } = await cloud.client.from('transactions').delete().eq('id', id); if (error) setCloudStatus('local', 'Sync needs attention', 'Your changes remain safely in this browser.'); }
async function cloudReplaceAll() { if (!cloud) return; await cloudSaveProfile(); const { error: deleteError } = await cloud.client.from('transactions').delete().eq('user_id', cloud.userId); if (!deleteError && state.transactions.length) await cloud.client.from('transactions').insert(state.transactions.map(dbRow)); }

function init() {
  $('#today').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
  $$('[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $('#quickAdd').onclick = () => openEntry('expense'); $('#newExpense').onclick = () => openEntry('expense'); $('#newExpense2').onclick = () => openEntry('expense'); $('#newReceived').onclick = () => openEntry('received');
  $('#closeEntry').onclick = closeEntry; $('#entryDialog').addEventListener('click', event => { if (event.target === $('#entryDialog')) closeEntry(); }); $('#entryForm').addEventListener('submit', addEntry);
  $$('#entryCategories button').forEach(button => button.onclick = () => { $$('#entryCategories button').forEach(el => el.classList.remove('selected')); button.classList.add('selected'); entryCategory = button.dataset.category; });
  $('#expenseSearch').oninput = render; $$('#categoryFilters button').forEach(button => button.onclick = () => { activeCategory = button.dataset.category; $$('#categoryFilters button').forEach(el => el.classList.toggle('active', el === button)); render(); });
  document.addEventListener('click', async event => { const id = event.target.dataset.delete; if (!id) return; state.transactions = state.transactions.filter(t => t.id !== id); persist(); render(); await cloudDelete(id); });
  $('#settingsForm').addEventListener('submit', async event => { event.preventDefault(); state.profileName = $('#settingName').value.trim() || 'Venu'; state.budget = Number($('#settingBudget').value) || 0; state.upi = $('#settingUpi').value.trim(); persist(); render(); await cloudSaveProfile(); });
  $('#copyUpi').onclick = async () => { await navigator.clipboard.writeText(state.upi); $('#copyUpi').textContent = 'Copied!'; setTimeout(() => $('#copyUpi').textContent = 'Copy', 1200); };
  $$('.suggestions button').forEach(button => button.onclick = () => { if (state.upi) window.location.href = `upi://pay?pa=${encodeURIComponent(state.upi)}&pn=${encodeURIComponent(state.profileName)}&am=${button.dataset.amount}&cu=INR`; });
  $('#exportData').onclick = () => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); link.download = 'venu-backup.json'; link.click(); URL.revokeObjectURL(link.href); };
  $('#importData').onchange = async event => { try { const uploaded = JSON.parse(await event.target.files[0].text()); if (!Array.isArray(uploaded.transactions)) throw new Error(); state = { ...seed, ...uploaded }; persist(); render(); await cloudReplaceAll(); } catch { alert('That file is not a valid Venu backup.'); } };
  $('#resetData').onclick = async () => { if (confirm('Reset all Venu data for this device?')) { state = structuredClone(seed); persist(); render(); await cloudReplaceAll(); } };
  render(); startCloudSync();
}
init();
