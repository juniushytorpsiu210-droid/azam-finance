(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const parseNum = v => { const n = parseFloat(String(v ?? '').replace(/[\s  ]/g, '').replace(',', '.')); return isFinite(n) ? n : NaN; };

const SALARY = 'Зарплата';
const AREA_INCOME_CAT = 'Оплата площадью';
const AREA_GAIN_CAT = 'Прибыль от продажи площади';
const AREA_LOSS_CAT = 'Убыток от продажи площади';
const DEFAULT_SETTINGS = {
  rate: 9.5, opening: {TJS: {bank: 0, cash: 0, card: 0}, USD: {bank: 0, cash: 0, card: 0}},
  incomeCats: ['Аванс по договору', 'Оплата за этап', 'Окончательный расчёт', 'Прочие доходы', AREA_INCOME_CAT, AREA_GAIN_CAT],
  expenseCats: [SALARY, 'Аренда офиса', 'Налоги и сборы', 'Изыскания и обследования', 'Экспертиза и согласования', 'Печать и плоттер', 'Программное обеспечение', 'Транспорт и выезды на объект', 'Оборудование и оргтехника', 'Коммунальные услуги и связь', 'Банковские комиссии', AREA_LOSS_CAT, 'Прочие расходы']
};
const SECTIONS = {
  'ВК': 'Водопровод и канализация (внутренние)', 'НВК': 'Наружные сети водопровода и канализации', 'ОВ': 'Отопление, вентиляция и кондиционирование',
  'ТС': 'Тепловые сети', 'ГС': 'Газоснабжение', 'ЭОМ': 'Электрооборудование и освещение', 'НЭС': 'Наружные электросети',
  'СС': 'Слаботочные системы', 'АПС': 'Пожарная сигнализация'
};
const PSTAT = {
  work: {l: 'В работе', c: 'st-work', i: '●'}, expertise: {l: 'На экспертизе', c: 'st-exp', i: '◐'},
  done: {l: 'Сдан', c: 'st-done', i: '✓'}, paused: {l: 'Приостановлен', c: 'st-pause', i: '‖'}
};
const METHODS = {bank: 'Банк', cash: 'Наличные', card: 'Карта'};
const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const MONTHS_S = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const PERIODS = {month: 'Этот месяц', prev: 'Прошлый месяц', quarter: 'Этот квартал', year: 'Этот год', prevyear: 'Прошлый год', all: 'Всё время', custom: 'Выбрать даты'};

const ICON = {
  edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>',
  del: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>',
  x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
};

/* ---------- State ---------- */
const S = { ready: false, settings: mergeSettings(null), projects: {}, clients: {}, employees: {}, months: {} };
const UI = {
  view: 'overview', base: 'TJS', detail: null, clientDetail: null,
  ops: {period: 'month', from: '', to: '', type: '', project: '', cat: '', q: ''},
  rep: {period: 'year', from: '', to: ''},
  proj: 'active', emp: {month: ymd(new Date()).slice(0, 7), inactive: false}, area: {filter: 'unsold'},
  balDetail: {TJS: false, USD: false}
};
try { const b = localStorage.getItem('nemat-base'); if (b === 'USD' || b === 'TJS') UI.base = b; } catch (e) {}

function mergeSettings(d) {
  const s = Object.assign({}, DEFAULT_SETTINGS, d || {});
  s.incomeCats = Array.isArray(s.incomeCats) && s.incomeCats.length ? [...s.incomeCats] : [...DEFAULT_SETTINGS.incomeCats];
  s.expenseCats = Array.isArray(s.expenseCats) && s.expenseCats.length ? [...s.expenseCats] : [...DEFAULT_SETTINGS.expenseCats];
  if (!s.expenseCats.includes(SALARY)) s.expenseCats.unshift(SALARY);
  if (!s.incomeCats.includes(AREA_INCOME_CAT)) s.incomeCats.push(AREA_INCOME_CAT);
  if (!s.incomeCats.includes(AREA_GAIN_CAT)) s.incomeCats.push(AREA_GAIN_CAT);
  if (!s.expenseCats.includes(AREA_LOSS_CAT)) s.expenseCats.push(AREA_LOSS_CAT);
  const mk = v => ({bank: +(v && v.bank) || 0, cash: +(v && v.cash) || 0, card: +(v && v.card) || 0});
  if (d && d.opening) s.opening = {TJS: mk(d.opening.TJS), USD: mk(d.opening.USD)};
  else if (d && (d.openingTJS || d.openingUSD)) s.opening = {TJS: {bank: +d.openingTJS || 0, cash: 0, card: 0}, USD: {bank: +d.openingUSD || 0, cash: 0, card: 0}};
  else s.opening = {TJS: mk(DEFAULT_SETTINGS.opening.TJS), USD: mk(DEFAULT_SETTINGS.opening.USD)};
  return s;
}

/* ---------- Storage: this browser (localStorage), with JSON export/import for backups ---------- */
const LOCAL_KEY = 'nemat2010-budget-v1';
const Store = {
  mode: 'local',
  init() {
    this.loadLocal();
    S.ready = true;
    render();
    renderSync();
  },
  loadLocal() {
    try {
      const d = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
      if (d) { S.settings = mergeSettings(d.settings); S.projects = d.projects || {}; S.clients = d.clients || {}; S.employees = d.employees || {}; S.months = d.months || {}; }
    } catch (e) {}
  },
  saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({settings: S.settings, projects: S.projects, clients: S.clients, employees: S.employees, months: S.months})); }
    catch (e) { toast('Не удалось сохранить — хранилище браузера переполнено или недоступно', true); }
  },
  saveEntity(coll, obj) { S[coll] = Object.assign({}, S[coll], {[obj.id]: obj}); this.saveLocal(); render(); },
  deleteEntity(coll, id) { const o = Object.assign({}, S[coll]); delete o[id]; S[coll] = o; this.saveLocal(); render(); },
  saveSettings(s) { S.settings = mergeSettings(s); this.saveLocal(); render(); },
  saveTx(tx, old) { this.applyTx(tx ? [tx] : [], old ? [old] : []); },
  applyTx(adds, removes) {
    const touched = new Set();
    for (const o of removes) { const m = o.date.slice(0, 7); if (S.months[m]) { S.months[m] = Object.assign({}, S.months[m]); delete S.months[m][o.id]; touched.add(m); } }
    for (const t of adds) { const m = t.date.slice(0, 7); S.months[m] = Object.assign({}, S.months[m] || {}, {[t.id]: t}); touched.add(m); }
    for (const m of touched) if (!Object.keys(S.months[m] || {}).length) delete S.months[m];
    this.saveLocal();
    render();
  },
  exportJSON() {
    return JSON.stringify({settings: S.settings, projects: S.projects, clients: S.clients, employees: S.employees, months: S.months}, null, 2);
  },
  importJSON(data) {
    S.settings = mergeSettings(data.settings);
    S.projects = (data.projects && typeof data.projects === 'object') ? data.projects : {};
    S.clients = (data.clients && typeof data.clients === 'object') ? data.clients : {};
    S.employees = (data.employees && typeof data.employees === 'object') ? data.employees : {};
    S.months = (data.months && typeof data.months === 'object') ? data.months : {};
    UI.detail = null; UI.clientDetail = null;
    this.saveLocal();
    render();
  }
};

/* ---------- Money & dates ---------- */
const nf = new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 0, maximumFractionDigits: 2});
const CUR = {TJS: 'смн', USD: '$'};
function money(n, cur) { const s = nf.format(Math.round((n || 0) * 100) / 100); return cur === 'USD' ? '$ ' + s : s + ' смн'; }
function signed(n, cur) { return (n > 0.004 ? '+' : n < -0.004 ? '−' : '') + money(Math.abs(n), cur); }
function conv(amount, from, to, rate) { if (from === to) return amount; const r = rate > 0 ? rate : S.settings.rate; return from === 'USD' ? amount * r : amount / r; }
const txIn = (t, cur) => conv(t.amount, t.currency, cur, t.rate);
function compact(v) { const a = Math.abs(v); if (a >= 1e6) return nf.format(+(v / 1e6).toFixed(1)) + ' млн'; if (a >= 1e3) return nf.format(+(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)) + ' тыс'; return nf.format(Math.round(v)); }
function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const today = () => ymd(new Date());
const fmtDate = s => s ? s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4) : '—';
const monthLabel = m => MONTHS[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
function periodRange(key, from, to) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  const r = (a, b) => [ymd(a), ymd(b)];
  switch (key) {
    case 'month': return r(new Date(y, m, 1), new Date(y, m + 1, 0));
    case 'prev': return r(new Date(y, m - 1, 1), new Date(y, m, 0));
    case 'quarter': { const q = Math.floor(m / 3) * 3; return r(new Date(y, q, 1), new Date(y, q + 3, 0)); }
    case 'year': return [y + '-01-01', y + '-12-31'];
    case 'prevyear': return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
    case 'custom': return [from || '0000-01-01', to || '9999-12-31'];
    default: return ['0000-01-01', '9999-12-31'];
  }
}
function periodText(scope) {
  const f = UI[scope];
  if (f.period === 'custom') return (f.from ? 'с ' + fmtDate(f.from) : '') + (f.to ? ' по ' + fmtDate(f.to) : '') || 'всё время';
  if (f.period === 'month') return monthLabel(today());
  if (f.period === 'year') return new Date().getFullYear() + ' год';
  if (f.period === 'prevyear') return (new Date().getFullYear() - 1) + ' год';
  return PERIODS[f.period].toLowerCase();
}

/* ---------- Derived data ---------- */
function allTx() {
  const out = [];
  for (const m in S.months) for (const id in S.months[m]) out.push(S.months[m][id]);
  return out.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
}
function projStats(p) {
  const txs = allTx().filter(t => t.projectId === p.id);
  const received = sum(txs.filter(t => t.type === 'income'), t => txIn(t, p.currency));
  const spent = sum(txs.filter(t => t.type === 'expense'), t => txIn(t, p.currency));
  const contract = +p.contract || 0;
  const areaPriceUsd = +p.areaPriceUsd || 0;
  const rate = p.rate || S.settings.rate;
  const contractUsd = contract > 0 && rate > 0 ? (p.currency === 'USD' ? contract : contract / rate) : 0;
  const totalAreaSqm = areaPriceUsd > 0 ? contractUsd / areaPriceUsd : 0;
  const receivedAreaSqm = sum(txs.filter(t => t.form === 'area'), t => +t.areaSqm || 0);
  return {
    txs, received, spent, contract, debt: Math.max(0, contract - received), profit: received - spent, pct: contract > 0 ? Math.min(100, received / contract * 100) : 0,
    totalAreaSqm, receivedAreaSqm, remainingAreaSqm: Math.max(0, totalAreaSqm - receivedAreaSqm)
  };
}
const projName = id => { const p = S.projects[id]; return p ? p.name : ''; };
const clientName = id => { const c = S.clients[id]; return c ? c.name : ''; };
const sortedProjects = () => Object.values(S.projects).sort((a, b) => (b.code || '').localeCompare(a.code || ''));
const sortedClients = () => Object.values(S.clients).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
const sortedEmployees = () => Object.values(S.employees).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
const allAreaTx = () => allTx().filter(t => t.form === 'area');

/* ---------- Shell ---------- */
const VIEWS = {overview: 'Обзор', ops: 'Операции', projects: 'Проекты', area: 'Площадь', clients: 'Заказчики', employees: 'Сотрудники', reports: 'Отчёты', settings: 'Настройки'};
function renderNav() {
  $('#navList').innerHTML = Object.entries(VIEWS).map(([k, v]) => `<button class="nav-btn" data-act="nav" data-v="${k}" ${UI.view === k ? 'aria-current="page"' : ''}>${v}</button>`).join('');
}
function renderStamp() {
  const d = new Date();
  $('#stamp').innerHTML = `
    <div><div class="stamp-l">Организация</div><div class="stamp-v big">Azam Finance</div></div>
    <div><div class="stamp-l">Лист</div><div class="stamp-v">${VIEWS[UI.view]}</div></div>
    <div><div class="stamp-l">Дата</div><div class="stamp-v num">${fmtDate(ymd(d))}</div></div>
    <div><div class="stamp-l">Курс</div><div class="stamp-v num">1 $ = ${nf.format(S.settings.rate)} смн</div></div>
    <div class="no-print"><div class="stamp-l">Итоги в</div><div class="cur-toggle" role="group" aria-label="Валюта итогов">
      <button data-act="base" data-v="TJS" aria-pressed="${UI.base === 'TJS'}">смн</button><button data-act="base" data-v="USD" aria-pressed="${UI.base === 'USD'}">$</button>
    </div></div>`;
}
function renderSync() {
  const dot = $('#syncDot'), txt = $('#syncText');
  dot.className = 'dot ok';
  txt.textContent = 'Данные хранятся в этом браузере';
}
function render() {
  renderNav(); renderStamp();
  const v = $('#view');
  if (!S.ready) { v.innerHTML = '<div class="loading">Загрузка данных…</div>'; return; }
  const fn = {overview: renderOverview, ops: renderOps, projects: renderProjects, area: renderArea, clients: renderClients, employees: renderEmployees, reports: renderReports, settings: renderSettings}[UI.view];
  v.innerHTML = fn();
  if (UI.view === 'ops') renderOpsTable();
}

/* ---------- Shared bits ---------- */
const typeChip = t => t.type === 'income' ? '<span class="chip inc">↓ Доход</span>' : '<span class="chip exp">↑ Расход</span>';
const statusChip = s => { const x = PSTAT[s] || PSTAT.work; return `<span class="chip ${x.c}"><span aria-hidden="true">${x.i}</span>${x.l}</span>`; };
const marks = arr => `<span class="marks">${(arr || []).map(m => `<span class="mark" title="${esc(SECTIONS[m] || m)}">${esc(m)}</span>`).join('')}</span>`;
const amountCell = t => `<span class="num ${t.type === 'income' ? 'pos' : ''}">${t.type === 'income' ? '+' : '−'}${money(t.amount, t.currency)}</span>`;
function periodControl(scope) {
  const f = UI[scope];
  return `<label class="fld"><span>Период</span><select data-f="${scope}.period">${Object.entries(PERIODS).map(([k, v]) => `<option value="${k}" ${f.period === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
  ${f.period === 'custom' ? `<label class="fld"><span>С</span><input type="date" data-f="${scope}.from" value="${esc(f.from)}"></label><label class="fld"><span>По</span><input type="date" data-f="${scope}.to" value="${esc(f.to)}"></label>` : ''}`;
}
function txTable(txs, opts = {}) {
  if (!txs.length) return `<div class="empty">${opts.empty || 'Операций пока нет'}</div>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Тип</th><th>Статья</th>${opts.noProject ? '' : '<th>Проект</th>'}<th>Комментарий</th><th class="r">Сумма</th>${opts.compact ? '' : '<th></th>'}</tr></thead><tbody>
  ${txs.map(t => {
    const emp = t.employeeId && S.employees[t.employeeId] ? S.employees[t.employeeId].name : '';
    const p = S.projects[t.projectId];
    return `<tr>
      <td class="num">${fmtDate(t.date)}</td>
      <td>${typeChip(t)}</td>
      <td><div class="cell-main">${esc(t.category)}</div>${emp ? `<div class="cell-sub">${esc(emp)}</div>` : ''}</td>
      ${opts.noProject ? '' : `<td>${p ? `<div class="code">${esc(p.code)}</div><div class="cell-sub" style="max-width:260px">${esc(p.name)}</div>` : '<span class="muted">Общие</span>'}</td>`}
      <td style="max-width:280px">${esc(t.note) || '<span class="muted">—</span>'}<div class="cell-sub">${t.form === 'area' ? `Площадь: ${nf.format(t.areaSqm)} м² × ${money(t.areaRate, 'TJS')}/м²${t.areaSold ? ' · продано' : ' · не продано'}` : METHODS[t.method] || ''}${t.currency === 'USD' ? ` · курс ${nf.format(t.rate || S.settings.rate)}` : ''}</div></td>
      <td class="r">${amountCell(t)}</td>
      ${opts.compact ? '' : `<td><div class="row-actions"><button class="icon-btn" data-act="editTx" data-id="${t.id}" data-m="${t.date.slice(0, 7)}" aria-label="Изменить">${ICON.edit}</button><button class="icon-btn del" data-act="delTx" data-id="${t.id}" data-m="${t.date.slice(0, 7)}" aria-label="Удалить">${ICON.del}</button></div></td>`}
    </tr>`;
  }).join('')}</tbody></table></div>`;
}

/* ---------- Overview ---------- */
const charts = {};
function cashBalance(txs) {
  // Реальные деньги в кассе/банке/на карте — всё в сомони. Доллары физически не хранятся:
  // операция в USD в тот же день конвертируется по своему зафиксированному курсу (t.rate) и сразу входит сюда.
  const o = S.settings.opening.TJS || {bank: 0, cash: 0, card: 0};
  const out = {bank: +o.bank || 0, cash: +o.cash || 0, card: +o.card || 0};
  txs.forEach(t => {
    if (t.form === 'area') {
      // Площадь — не деньги. Реальная касса пополняется только когда лот продан (на сумму оценки; разница уходит отдельной операцией).
      if (!t.areaSold) return;
      const m = METHODS[t.areaSoldMethod] ? t.areaSoldMethod : 'bank';
      out[m] += t.amount;
      return;
    }
    const m = METHODS[t.method] ? t.method : 'bank';
    out[m] += (t.type === 'income' ? 1 : -1) * txIn(t, 'TJS');
  });
  out.total = out.bank + out.cash + out.card;
  return out;
}
function usdVolume(txs) {
  // Справочная цифра: сколько прошло через операции, оценённые в долларах (по номиналу, без конвертации).
  // Это не отдельные реальные деньги — они уже учтены в остатке сомони выше.
  const o = S.settings.opening.USD || {bank: 0, cash: 0, card: 0};
  const out = {bank: +o.bank || 0, cash: +o.cash || 0, card: +o.card || 0};
  txs.forEach(t => {
    if (t.currency !== 'USD') return;
    const m = METHODS[t.method] ? t.method : 'bank';
    out[m] += t.type === 'income' ? t.amount : -t.amount;
  });
  out.total = out.bank + out.cash + out.card;
  return out;
}
function balBreakdown(b, cur) {
  return `<div class="bal-detail">
    <div class="bal-row"><span>Банк</span><span class="num">${money(b.bank, cur)}</span></div>
    <div class="bal-row"><span>Наличные</span><span class="num">${money(b.cash, cur)}</span></div>
    <div class="bal-row"><span>Карта</span><span class="num">${money(b.card, cur)}</span></div>
  </div>`;
}
function renderOverview() {
  const base = UI.base, st = S.settings, txs = allTx();
  const balTJS = cashBalance(txs), balUSD = usdVolume(txs);
  const [mf, mt] = periodRange('month');
  const mTx = txs.filter(t => t.date >= mf && t.date <= mt);
  const mi = sum(mTx.filter(t => t.type === 'income'), t => txIn(t, base));
  const me = sum(mTx.filter(t => t.type === 'expense'), t => txIn(t, base));
  const projs = Object.values(S.projects);
  const debtors = projs.map(p => ({p, s: projStats(p)})).filter(x => x.s.debt > 0.004 && x.p.status !== 'paused');
  const recv = sum(debtors, x => conv(x.s.debt, x.p.currency, base, x.p.rate));

  // 12 months
  const now = new Date(); const series = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = ymd(d).slice(0, 7);
    const items = Object.values(S.months[key] || {});
    series.push({key, label: MONTHS_S[d.getMonth()], inc: sum(items.filter(t => t.type === 'income'), t => txIn(t, base)), exp: sum(items.filter(t => t.type === 'expense'), t => txIn(t, base))});
  }
  charts.main = {series, base};

  const y = String(now.getFullYear());
  const byCat = {};
  txs.filter(t => t.type === 'expense' && t.date.startsWith(y)).forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + txIn(t, base); });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const catTotal = sum(cats, c => c[1]);
  const catMax = cats.length ? cats[0][1] : 1;

  const active = projs.filter(p => p.status === 'work' || p.status === 'expertise').sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'));

  return `
  <div class="kpis">
    <div class="kpi click" data-act="toggleBal" data-cur="TJS" role="button" tabindex="0" aria-expanded="${UI.balDetail.TJS}"><div class="kpi-l">Остаток, сомони<span class="kpi-caret">${UI.balDetail.TJS ? '▾' : '▸'}</span></div><div class="kpi-v">${money(balTJS.total, 'TJS')}</div><div class="kpi-s">касса и счета</div>${UI.balDetail.TJS ? balBreakdown(balTJS, 'TJS') : ''}</div>
    <div class="kpi click" data-act="toggleBal" data-cur="USD" role="button" tabindex="0" aria-expanded="${UI.balDetail.USD}"><div class="kpi-l">Остаток, доллары<span class="kpi-caret">${UI.balDetail.USD ? '▾' : '▸'}</span></div><div class="kpi-v">${money(balUSD.total, 'USD')}</div><div class="kpi-s">справочно · уже учтено в сомони выше</div>${UI.balDetail.USD ? balBreakdown(balUSD, 'USD') : ''}</div>
    <div class="kpi"><div class="kpi-l">Прибыль за ${MONTHS[now.getMonth()]}</div><div class="kpi-v ${mi - me < 0 ? 'neg' : ''}">${signed(mi - me, base)}</div><div class="kpi-s">доходы ${money(mi, base)} · расходы ${money(me, base)}</div></div>
    <div class="kpi"><div class="kpi-l">Должны заказчики</div><div class="kpi-v">${money(recv, base)}</div><div class="kpi-s">${debtors.length ? 'по ' + debtors.length + ' ' + plural(debtors.length, 'проекту', 'проектам', 'проектам') : 'долгов нет'}</div></div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-head"><div><h2>Доходы и расходы по месяцам</h2><div class="sub">последние 12 месяцев, в ${base === 'USD' ? 'долларах' : 'сомони'}</div></div>
        <div class="legend"><span><i style="background:var(--s-inc)"></i>Доходы</span><span><i style="background:var(--s-exp)"></i>Расходы</span></div></div>
      <div class="chart-wrap" id="chartMain">${barChart(series)}<div class="tip" hidden></div></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Куда уходят деньги</h2><div class="sub">расходы за ${y} год · ${money(catTotal, base)}</div></div></div>
      ${cats.length ? `<div class="hbars">${cats.slice(0, 8).map(([c, v]) => `<div class="hbar-row"><span>${esc(c)}</span><span class="num">${money(v, base)} <span class="muted">${Math.round(v / catTotal * 100)}%</span></span><div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(1, v / catMax * 100)}%"></div></div></div>`).join('')}</div>` : '<div class="empty">Расходов в этом году пока нет</div>'}
    </div>
  </div>

  <div class="grid-2e">
    <div class="card">
      <div class="card-head"><h2>Проекты в работе</h2><button class="link" data-act="nav" data-v="projects">Все проекты →</button></div>
      ${active.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Объект</th><th>Оплачено</th><th class="r">Остаток</th></tr></thead><tbody>
      ${active.map(p => { const s = projStats(p); return `<tr class="click" data-act="openProject" data-id="${p.id}">
        <td><div class="code">${esc(p.code)} · ${statusChip(p.status)}</div><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(clientName(p.clientId))}</div></td>
        <td style="min-width:120px"><div class="progress" style="margin-top:6px"><span style="width:${s.pct}%"></span></div><div class="cell-sub">${Math.round(s.pct)}% из ${money(s.contract, p.currency)}</div></td>
        <td class="r num">${money(s.debt, p.currency)}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty">Активных проектов нет. <button class="link" data-act="addProject">Добавить проект</button></div>'}
    </div>
    <div class="card">
      <div class="card-head"><h2>Последние операции</h2><button class="link" data-act="nav" data-v="ops">Все операции →</button></div>
      ${recentList(txs.slice(0, 7))}
    </div>
  </div>`;
}
function recentList(txs) {
  if (!txs.length) return '<div class="empty">Операций пока нет. <button class="link" data-act="addTx">Добавить первую</button></div>';
  return `<div class="tbl-wrap"><table class="tbl"><tbody>${txs.map(t => {
    const p = S.projects[t.projectId]; const emp = S.employees[t.employeeId];
    return `<tr class="click" data-act="editTx" data-id="${t.id}" data-m="${t.date.slice(0, 7)}"><td class="num muted" style="width:1%">${fmtDate(t.date).slice(0, 5)}</td>
    <td><div class="cell-main">${esc(t.category)}</div><div class="cell-sub">${esc(emp ? emp.name : p ? p.code + ' · ' + p.name : t.note || 'Общие')}</div></td><td class="r">${amountCell(t)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function plural(n, one, few, many) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; }

function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function barPath(x, y, w, h, r) { if (h <= 0.5) return ''; r = Math.min(r, w / 2, h); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
function barChart(series) {
  const W = 680, H = 250, L = 58, R = 8, T = 12, B = 26, pw = W - L - R, ph = H - T - B;
  const max = niceMax(Math.max(1, ...series.map(s => Math.max(s.inc, s.exp))));
  const yv = v => T + ph - v / max * ph;
  const gw = pw / series.length, bw = Math.min(16, (gw - 12) / 2);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max / 4 * i, yy = yv(v); g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(${i ? '--grid' : '--line-strong'})" stroke-width="1"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end">${compact(v)}</text>`; }
  series.forEach((s, i) => {
    const cx = L + gw * i + gw / 2;
    g += `<path d="${barPath(cx - bw - 1, yv(s.inc), bw, T + ph - yv(s.inc), 3)}" fill="var(--s-inc)"/>`;
    g += `<path d="${barPath(cx + 1, yv(s.exp), bw, T + ph - yv(s.exp), 3)}" fill="var(--s-exp)"/>`;
    g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${s.label}</text>`;
  });
  series.forEach((s, i) => { g += `<rect class="hit" data-chart="main" data-i="${i}" x="${L + gw * i}" y="${T}" width="${gw}" height="${ph}"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Доходы и расходы по месяцам">${g}</svg>`;
}

/* ---------- Operations ---------- */
function renderOps() {
  const f = UI.ops, s = S.settings;
  const cats = f.type === 'income' ? s.incomeCats : f.type === 'expense' ? s.expenseCats : [...s.incomeCats, ...s.expenseCats];
  return `
  <div class="page-head"><div><h1>Операции</h1><p>Все поступления и платежи организации</p></div>
    <div class="actions"><button class="btn" data-act="addTx" data-type="expense">+ Расход</button><button class="btn primary" data-act="addTx" data-type="income">+ Доход</button></div></div>
  <div class="card">
    <div class="filters">
      ${periodControl('ops')}
      <label class="fld"><span>Тип</span><select data-f="ops.type"><option value="">Все</option><option value="income" ${f.type === 'income' ? 'selected' : ''}>Доходы</option><option value="expense" ${f.type === 'expense' ? 'selected' : ''}>Расходы</option></select></label>
      <label class="fld"><span>Статья</span><select data-f="ops.cat"><option value="">Все статьи</option>${cats.map(c => `<option ${f.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="fld"><span>Проект</span><select data-f="ops.project"><option value="">Все проекты</option><option value="none" ${f.project === 'none' ? 'selected' : ''}>Общие (без проекта)</option>${sortedProjects().map(p => `<option value="${p.id}" ${f.project === p.id ? 'selected' : ''}>${esc(p.code)} · ${esc(p.name.slice(0, 40))}</option>`).join('')}</select></label>
      <label class="fld grow"><span>Поиск</span><input type="search" data-f="ops.q" value="${esc(f.q)}" placeholder="Комментарий, сотрудник, заказчик…"></label>
    </div>
    <div id="opsTable"></div>
  </div>`;
}
function renderOpsTable() {
  const el = $('#opsTable'); if (!el) return;
  const f = UI.ops, base = UI.base, [from, to] = periodRange(f.period, f.from, f.to), q = f.q.trim().toLowerCase();
  const list = allTx().filter(t => t.date >= from && t.date <= to
    && (!f.type || t.type === f.type) && (!f.cat || t.category === f.cat)
    && (!f.project || (f.project === 'none' ? !S.projects[t.projectId] : t.projectId === f.project))
    && (!q || [t.note, t.category, (S.employees[t.employeeId] || {}).name, projName(t.projectId), (S.projects[t.projectId] || {}).code, clientName((S.projects[t.projectId] || {}).clientId)].join(' ').toLowerCase().includes(q)));
  const inc = sum(list.filter(t => t.type === 'income'), t => txIn(t, base)), exp = sum(list.filter(t => t.type === 'expense'), t => txIn(t, base));
  el.innerHTML = `<div class="totals"><span>Найдено: <b>${list.length}</b></span><span>Доходы: <b class="pos">${money(inc, base)}</b></span><span>Расходы: <b>${money(exp, base)}</b></span><span>Итого: <b class="${inc - exp < 0 ? 'neg' : ''}">${signed(inc - exp, base)}</b></span></div>
  ${txTable(list, {empty: 'За выбранный период операций нет'})}`;
}

/* ---------- Projects ---------- */
function renderProjects() {
  if (UI.detail && S.projects[UI.detail]) return renderProjectDetail(S.projects[UI.detail]);
  UI.detail = null;
  const base = UI.base;
  const filt = {active: p => p.status === 'work' || p.status === 'expertise', done: p => p.status === 'done', paused: p => p.status === 'paused', all: () => true}[UI.proj];
  const rows = sortedProjects().filter(filt).map(p => ({p, s: projStats(p)}));
  const totDebt = sum(rows, r => conv(r.s.debt, r.p.currency, base, r.p.rate)), totContract = sum(rows, r => conv(r.s.contract, r.p.currency, base, r.p.rate));
  const counts = {active: 0, done: 0, paused: 0, all: 0};
  Object.values(S.projects).forEach(p => { counts.all++; if (p.status === 'done') counts.done++; else if (p.status === 'paused') counts.paused++; else counts.active++; });
  return `
  <div class="page-head"><div><h1>Проекты</h1><p>Объекты проектирования: договор, оплаты, расходы и прибыль по каждому</p></div>
    <div class="actions"><button class="btn primary" data-act="addProject">+ Новый проект</button></div></div>
  <div class="card">
    <div class="filters" style="justify-content:space-between">
      <div class="tabs">${[['active', 'В работе'], ['done', 'Сданные'], ['paused', 'Приостановленные'], ['all', 'Все']].map(([k, l]) => `<button class="tab" data-act="projFilter" data-v="${k}" aria-pressed="${UI.proj === k}">${l} <span class="muted">${counts[k]}</span></button>`).join('')}</div>
      <div class="totals" style="margin:0"><span>Сумма договоров: <b>${money(totContract, base)}</b></span><span>Остаток к получению: <b>${money(totDebt, base)}</b></span></div>
    </div>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Объект</th><th>Разделы</th><th>Статус</th><th class="r">Договор</th><th>Оплачено</th><th class="r">Долг заказчика</th><th class="r">Расходы</th><th class="r">Прибыль</th></tr></thead><tbody>
    ${rows.map(({p, s}) => `<tr class="click" data-act="openProject" data-id="${p.id}">
      <td style="min-width:240px"><div class="code">${esc(p.code)}</div><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(clientName(p.clientId)) || 'Заказчик не указан'}${p.deadline ? ' · срок ' + fmtDate(p.deadline) : ''}</div></td>
      <td>${marks(p.sections)}</td><td>${statusChip(p.status)}${p.payType === 'area' ? '<div class="cell-sub" style="margin-top:4px">Площадь</div>' : ''}</td>
      <td class="r num">${money(s.contract, p.currency)}</td>
      <td style="min-width:110px"><div class="progress" style="margin-top:7px"><span style="width:${s.pct}%"></span></div><div class="cell-sub">${Math.round(s.pct)}% · ${money(s.received, p.currency)}${p.payType === 'area' && s.totalAreaSqm > 0 ? `<br>${nf.format(s.receivedAreaSqm)} из ${nf.format(s.totalAreaSqm)} м²` : ''}</div></td>
      <td class="r num">${s.debt > 0.004 ? money(s.debt, p.currency) : '<span class="muted">—</span>'}</td>
      <td class="r num">${money(s.spent, p.currency)}</td>
      <td class="r num ${s.profit < 0 ? 'neg' : ''}">${signed(s.profit, p.currency)}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="empty">В этой группе проектов нет. <button class="link" data-act="addProject">Добавить проект</button></div>`}
  </div>`;
}
function renderProjectDetail(p) {
  const s = projStats(p), c = S.clients[p.clientId];
  const margin = s.received > 0 ? Math.round(s.profit / s.received * 100) : 0;
  return `
  <button class="link back" data-act="closeDetail">← Все проекты</button>
  <div class="page-head"><div class="detail-head"><div class="code">${esc(p.code)}</div><h1>${esc(p.name)}</h1>
    <div class="meta">${statusChip(p.status)}${marks(p.sections)}<span class="chip">${p.payType === 'area' ? 'Оплата: площадь' : 'Оплата: наличные'}${p.payType === 'area' && p.areaPriceUsd > 0 ? ` · $${nf.format(p.areaPriceUsd)}/м²` : ''}</span><span>Заказчик: ${c ? `<button class="link" data-act="openClient" data-id="${c.id}">${esc(c.name)}</button>` : '—'}</span>${p.start ? `<span>Начало: <span class="num">${fmtDate(p.start)}</span></span>` : ''}${p.deadline ? `<span>Срок сдачи: <span class="num">${fmtDate(p.deadline)}</span></span>` : ''}</div>
    ${p.note ? `<p>${esc(p.note)}</p>` : ''}</div>
    <div class="actions"><button class="btn" data-act="editProject" data-id="${p.id}">Изменить</button><button class="btn" data-act="addTx" data-type="expense" data-project="${p.id}">+ Расход</button><button class="btn primary" data-act="addTx" data-type="income" data-project="${p.id}">+ Оплата от заказчика</button></div></div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-l">Сумма договора</div><div class="kpi-v">${money(s.contract, p.currency)}</div><div class="progress" style="margin-top:4px"><span style="width:${s.pct}%"></span></div><div class="kpi-s">оплачено ${Math.round(s.pct)}%${p.payType === 'area' && s.totalAreaSqm > 0 ? ` · ≈ ${nf.format(s.totalAreaSqm)} м² по договору` : ''}</div></div>
    <div class="kpi"><div class="kpi-l">Получено</div><div class="kpi-v pos">${money(s.received, p.currency)}</div><div class="kpi-s">осталось получить ${money(s.debt, p.currency)}${p.payType === 'area' && s.totalAreaSqm > 0 ? ` · площадь: получено ${nf.format(s.receivedAreaSqm)} из ${nf.format(s.totalAreaSqm)} м² (осталось ${nf.format(s.remainingAreaSqm)})` : ''}</div></div>
    <div class="kpi"><div class="kpi-l">Расходы по проекту</div><div class="kpi-v">${money(s.spent, p.currency)}</div><div class="kpi-s">изыскания, экспертиза, печать и др.</div></div>
    <div class="kpi"><div class="kpi-l">Прибыль</div><div class="kpi-v ${s.profit < 0 ? 'neg' : ''}">${signed(s.profit, p.currency)}</div><div class="kpi-s">рентабельность ${margin}%</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>Операции по проекту</h2><span class="sub">${s.txs.length} ${plural(s.txs.length, 'операция', 'операции', 'операций')}</span></div>${txTable(s.txs, {noProject: true, empty: 'По этому проекту операций пока нет'})}</div>
  <div class="no-print" style="display:flex;justify-content:flex-end"><button class="btn ghost sm" data-act="delProject" data-id="${p.id}" style="color:var(--neg)">Удалить проект</button></div>`;
}

/* ---------- Clients ---------- */
function clientStats(c) {
  const ps = Object.values(S.projects).filter(p => p.clientId === c.id).map(p => ({p, s: projStats(p)}));
  const b = UI.base;
  return {ps, contract: sum(ps, x => conv(x.s.contract, x.p.currency, b, x.p.rate)), paid: sum(ps, x => conv(x.s.received, x.p.currency, b, x.p.rate)), debt: sum(ps, x => conv(x.s.debt, x.p.currency, b, x.p.rate))};
}
function renderClients() {
  if (UI.clientDetail && S.clients[UI.clientDetail]) return renderClientDetail(S.clients[UI.clientDetail]);
  UI.clientDetail = null;
  const base = UI.base, rows = sortedClients().map(c => ({c, s: clientStats(c)})).sort((a, b) => b.s.debt - a.s.debt);
  const tot = {contract: sum(rows, r => r.s.contract), paid: sum(rows, r => r.s.paid), debt: sum(rows, r => r.s.debt)};
  return `
  <div class="page-head"><div><h1>Заказчики</h1><p>Кто сколько заказал, оплатил и сколько ещё должен</p></div>
    <div class="actions"><button class="btn primary" data-act="addClient">+ Новый заказчик</button></div></div>
  <div class="card">
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Заказчик</th><th>Контакт</th><th class="r">Проектов</th><th class="r">Сумма договоров</th><th class="r">Оплачено</th><th class="r">Долг</th><th></th></tr></thead><tbody>
    ${rows.map(({c, s}) => `<tr class="click" data-act="openClient" data-id="${c.id}">
      <td><div class="cell-main">${esc(c.name)}</div>${c.inn ? `<div class="cell-sub">ИНН ${esc(c.inn)}</div>` : ''}</td>
      <td>${esc(c.contact) || '<span class="muted">—</span>'}<div class="cell-sub num">${esc(c.phone)}</div></td>
      <td class="r num">${s.ps.length}</td><td class="r num">${money(s.contract, base)}</td><td class="r num">${money(s.paid, base)}</td>
      <td class="r num">${s.debt > 0.004 ? `<b>${money(s.debt, base)}</b>` : '<span class="muted">—</span>'}</td>
      <td><div class="row-actions"><button class="icon-btn" data-act="editClient" data-id="${c.id}" aria-label="Изменить">${ICON.edit}</button></div></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3">Итого</td><td class="r num">${money(tot.contract, base)}</td><td class="r num">${money(tot.paid, base)}</td><td class="r num">${money(tot.debt, base)}</td><td></td></tr></tfoot></table></div>`
    : '<div class="empty">Заказчиков пока нет. <button class="link" data-act="addClient">Добавить заказчика</button></div>'}
  </div>`;
}
function renderClientDetail(c) {
  const s = clientStats(c), base = UI.base;
  return `
  <button class="link back" data-act="closeClient">← Все заказчики</button>
  <div class="page-head"><div class="detail-head"><h1>${esc(c.name)}</h1>
    <div class="meta">${c.contact ? `<span>${esc(c.contact)}</span>` : ''}${c.phone ? `<span class="num">${esc(c.phone)}</span>` : ''}${c.inn ? `<span>ИНН ${esc(c.inn)}</span>` : ''}</div>${c.note ? `<p>${esc(c.note)}</p>` : ''}</div>
    <div class="actions"><button class="btn" data-act="editClient" data-id="${c.id}">Изменить</button><button class="btn primary" data-act="addProject" data-client="${c.id}">+ Проект для заказчика</button></div></div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-l">Проектов</div><div class="kpi-v">${s.ps.length}</div></div>
    <div class="kpi"><div class="kpi-l">Сумма договоров</div><div class="kpi-v">${money(s.contract, base)}</div></div>
    <div class="kpi"><div class="kpi-l">Оплачено</div><div class="kpi-v pos">${money(s.paid, base)}</div></div>
    <div class="kpi"><div class="kpi-l">Долг</div><div class="kpi-v">${money(s.debt, base)}</div></div>
  </div>
  <div class="card"><div class="card-head"><h2>Проекты заказчика</h2></div>
  ${s.ps.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Объект</th><th>Статус</th><th class="r">Договор</th><th class="r">Оплачено</th><th class="r">Долг</th></tr></thead><tbody>
  ${s.ps.map(({p, s: ps}) => `<tr class="click" data-act="openProject" data-id="${p.id}"><td><div class="code">${esc(p.code)}</div><div class="cell-main">${esc(p.name)}</div></td><td>${statusChip(p.status)}</td><td class="r num">${money(ps.contract, p.currency)}</td><td class="r num">${money(ps.received, p.currency)}</td><td class="r num">${money(ps.debt, p.currency)}</td></tr>`).join('')}
  </tbody></table></div>` : '<div class="empty">У этого заказчика пока нет проектов</div>'}</div>
  <div class="no-print" style="display:flex;justify-content:flex-end"><button class="btn ghost sm" data-act="delClient" data-id="${c.id}" style="color:var(--neg)">Удалить заказчика</button></div>`;
}

/* ---------- Employees ---------- */
function renderEmployees() {
  const m = UI.emp.month, all = sortedEmployees(), list = all.filter(e => UI.emp.inactive || e.active !== false);
  const monthTx = Object.values(S.months[m] || {}).filter(t => t.type === 'expense' && t.category === SALARY);
  const base = UI.base;
  const rows = list.map(e => { const paid = sum(monthTx.filter(t => t.employeeId === e.id), t => txIn(t, e.currency || 'TJS')); return {e, paid, sal: +e.salary || 0}; });
  const fot = sum(rows.filter(r => r.e.active !== false), r => conv(r.sal, r.e.currency || 'TJS', base));
  const paidTot = sum(monthTx, t => txIn(t, base));
  const hidden = all.length - list.length;
  return `
  <div class="page-head"><div><h1>Сотрудники</h1><p>Оклады и выплаты зарплаты по месяцам</p></div>
    <div class="actions"><button class="btn primary" data-act="addEmp">+ Сотрудник</button></div></div>
  <div class="card">
    <div class="filters" style="justify-content:space-between">
      <label class="fld"><span>Месяц</span><input type="month" data-f="emp.month" value="${esc(m)}"></label>
      <div class="totals" style="margin:0"><span>Фонд оплаты труда: <b>${money(fot, base)}</b></span><span>Выплачено за ${monthLabel(m + '-01')}: <b>${money(paidTot, base)}</b></span></div>
    </div>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Сотрудник</th><th class="r">Оклад</th><th class="r">Выплачено</th><th>Статус</th><th></th></tr></thead><tbody>
    ${rows.map(({e, paid, sal}) => {
      const cur = e.currency || 'TJS'; const left = Math.max(0, sal - paid);
      const st = e.active === false ? '<span class="chip">Не работает</span>' : paid >= sal - 0.004 && sal > 0 ? '<span class="chip st-done">✓ Выплачено</span>' : paid > 0 ? `<span class="chip st-exp">◐ Частично · осталось ${money(left, cur)}</span>` : '<span class="chip exp">○ Не выплачено</span>';
      return `<tr><td><div class="cell-main">${esc(e.name)}</div><div class="cell-sub">${esc(e.position) || '—'}</div></td>
      <td class="r num">${money(sal, cur)}</td><td class="r num">${money(paid, cur)}</td><td>${st}</td>
      <td><div class="row-actions">${e.active !== false && left > 0.004 ? `<button class="btn sm" data-act="payEmp" data-id="${e.id}">Выплатить</button>` : ''}<button class="icon-btn" data-act="editEmp" data-id="${e.id}" aria-label="Изменить">${ICON.edit}</button><button class="icon-btn del" data-act="delEmp" data-id="${e.id}" aria-label="Удалить">${ICON.del}</button></div></td></tr>`;
    }).join('')}</tbody></table></div>` : '<div class="empty">Сотрудников пока нет. <button class="link" data-act="addEmp">Добавить сотрудника</button></div>'}
    ${hidden || UI.emp.inactive ? `<div style="margin-top:10px"><button class="link" data-act="toggleInactive">${UI.emp.inactive ? 'Скрыть уволенных' : 'Показать уволенных (' + hidden + ')'}</button></div>` : ''}
  </div>
  <div class="card"><div class="card-head"><h2>Выплаты за ${monthLabel(m + '-01')}</h2></div>${txTable(Object.values(S.months[m] || {}).filter(t => t.category === SALARY).sort((a, b) => b.date.localeCompare(a.date)), {empty: 'В этом месяце зарплата ещё не выплачивалась'})}</div>`;
}

/* ---------- Area (payment in kind) ---------- */
function areaUnsoldLots(projectId) {
  return allAreaTx().filter(t => t.projectId === projectId && !t.areaSold).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
}
function areaProjectSummary(projectId) {
  const lots = allAreaTx().filter(t => t.projectId === projectId);
  const totalSqm = sum(lots, t => t.areaSqm);
  const unsoldLots = lots.filter(t => !t.areaSold);
  const unsoldSqm = sum(unsoldLots, t => t.areaSqm);
  return {totalSqm, unsoldSqm, unsoldValue: sum(unsoldLots, t => t.amount), soldSqm: totalSqm - unsoldSqm};
}
function renderArea() {
  const base = UI.base;
  const lots = allAreaTx().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const unsoldLots = lots.filter(t => !t.areaSold), soldLots = lots.filter(t => t.areaSold);
  const counts = {unsold: unsoldLots.length, sold: soldLots.length, all: lots.length};
  const filt = {unsold: t => !t.areaSold, sold: t => t.areaSold, all: () => true}[UI.area.filter] || (() => true);
  const rows = lots.filter(filt);
  const unsoldSqm = sum(unsoldLots, t => t.areaSqm);
  const unsoldValue = sum(unsoldLots, t => txIn(t, base));
  const soldSqm = sum(soldLots, t => t.areaSqm);
  const gainTJS = sum(soldLots, t => (t.areaSoldAmount || 0) - t.amount);
  const gain = conv(gainTJS, 'TJS', base);
  const byProject = {};
  lots.forEach(t => { byProject[t.projectId] = true; });
  const projectRows = Object.keys(byProject).map(pid => ({p: S.projects[pid], sum: areaProjectSummary(pid)})).filter(r => r.p).sort((a, b) => b.sum.unsoldSqm - a.sum.unsoldSqm);
  return `
  <div class="page-head"><div><h1>Площадь</h1><p>Объекты, которые заказчики отдают вместо денег, и их дальнейшая продажа</p></div>
    <div class="actions"><button class="btn primary" data-act="addArea">+ Площадь</button></div></div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-l">Не продано</div><div class="kpi-v">${nf.format(unsoldSqm)} м²</div><div class="kpi-s">≈ ${money(unsoldValue, base)} по оценке получения</div></div>
    <div class="kpi"><div class="kpi-l">Продано</div><div class="kpi-v">${nf.format(soldSqm)} м²</div><div class="kpi-s">${soldLots.length} ${plural(soldLots.length, 'сделка', 'сделки', 'сделок')}</div></div>
    <div class="kpi"><div class="kpi-l">Прибыль/убыток от продаж</div><div class="kpi-v ${gain < 0 ? 'neg' : ''}">${signed(gain, base)}</div><div class="kpi-s">оценка при получении vs. цена продажи</div></div>
  </div>
  <div class="card">
    <div class="card-head"><h2>Остаток по проектам</h2><span class="sub">продать можно любую часть остатка, не привязываясь к конкретной поставке</span></div>
    ${projectRows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Проект</th><th class="r">Получено, м²</th><th class="r">Продано, м²</th><th class="r">Остаток, м²</th><th class="r">Оценка остатка</th><th></th></tr></thead><tbody>
    ${projectRows.map(({p, sum: s}) => `<tr>
      <td><div class="code">${esc(p.code)}</div><div class="cell-sub" style="max-width:260px">${esc(p.name)}</div></td>
      <td class="r num">${nf.format(s.totalSqm)}</td>
      <td class="r num">${nf.format(s.soldSqm)}</td>
      <td class="r num">${nf.format(s.unsoldSqm)}</td>
      <td class="r num">${money(conv(s.unsoldValue, 'TJS', base), base)}</td>
      <td><div class="row-actions">${s.unsoldSqm > 0.004 ? `<button class="btn sm primary" data-act="sellFromProject" data-id="${p.id}">Продать</button>` : '<span class="muted">Всё продано</span>'}</div></td>
    </tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">Записей пока нет</div>'}
  </div>
  <div class="card">
    <div class="card-head"><h2>История поступлений и продаж</h2></div>
    <div class="filters" style="justify-content:space-between">
      <div class="tabs">${[['unsold', 'Не продано'], ['sold', 'Продано'], ['all', 'Все']].map(([k, l]) => `<button class="tab" data-act="areaFilter" data-v="${k}" aria-pressed="${UI.area.filter === k}">${l} <span class="muted">${counts[k]}</span></button>`).join('')}</div>
    </div>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Получено</th><th>Проект</th><th class="r">М²</th><th class="r">Цена/м²</th><th class="r">Оценка</th><th>Статус</th><th>Продажа</th><th class="r">Сумма продажи</th><th class="r">Результат</th><th></th></tr></thead><tbody>
    ${rows.map(t => {
      const p = S.projects[t.projectId];
      const result = t.areaSold ? (t.areaSoldAmount - t.amount) : null;
      return `<tr>
        <td class="num">${fmtDate(t.date)}</td>
        <td>${p ? `<div class="code">${esc(p.code)}</div><div class="cell-sub" style="max-width:220px">${esc(p.name)}</div>` : '<span class="muted">—</span>'}</td>
        <td class="r num">${nf.format(t.areaSqm)}</td>
        <td class="r num">${money(t.areaRate, 'TJS')}</td>
        <td class="r num">${money(t.amount, 'TJS')}</td>
        <td>${t.areaSold ? '<span class="chip st-done">✓ Продано</span>' : '<span class="chip st-exp">◐ Не продано</span>'}</td>
        <td class="num">${t.areaSold ? fmtDate(t.areaSoldDate) + (METHODS[t.areaSoldMethod] ? ' · ' + METHODS[t.areaSoldMethod] : '') : '<span class="muted">—</span>'}</td>
        <td class="r num">${t.areaSold ? money(t.areaSoldAmount, 'TJS') : '<span class="muted">—</span>'}</td>
        <td class="r num ${result !== null && result < 0 ? 'neg' : ''}">${result !== null ? signed(result, 'TJS') : '<span class="muted">—</span>'}</td>
        <td><div class="row-actions">
          ${t.areaSold
            ? `<button class="icon-btn" data-act="unsellArea" data-sale="${t.saleId || ''}" aria-label="Отменить продажу">${ICON.x}</button>`
            : `<button class="icon-btn" data-act="editTx" data-id="${t.id}" data-m="${t.date.slice(0, 7)}" aria-label="Изменить">${ICON.edit}</button><button class="icon-btn del" data-act="delArea" data-id="${t.id}" data-m="${t.date.slice(0, 7)}" aria-label="Удалить">${ICON.del}</button>`}
        </div></td>
      </tr>`;
    }).join('')}
    </tbody></table></div>` : `<div class="empty">Записей нет. <button class="link" data-act="addArea">Добавить площадь</button></div>`}
  </div>`;
}
function areaSellFromProjectDialog(projectId) {
  const p = S.projects[projectId]; if (!p) return;
  const {unsoldSqm} = areaProjectSummary(projectId);
  if (unsoldSqm <= 0.004) { toast('По этому проекту вся площадь уже продана', true); return; }
  const html = `
    <p>Проект: <b>${esc(p.code)} · ${esc(p.name)}</b>. Не продано: <b>${nf.format(unsoldSqm)} м²</b>. Продавать можно любую часть остатка.</p>
    <div class="grid-f">
      <label class="fld"><span>Продать, м²</span><input name="sqm" inputmode="decimal" required value="${nf.format(unsoldSqm)}"></label>
      <label class="fld"><span>Цена за 1 м², $</span><input name="priceUsd" inputmode="decimal" required placeholder="0"></label>
      <label class="fld"><span>Курс на день продажи: 1 $ = … смн</span><input name="rate" inputmode="decimal" value="${nf.format(S.settings.rate)}"></label>
      <label class="fld"><span>Сумма продажи, смн</span><input name="saleAmountPreview" disabled value=""></label>
      <label class="fld"><span>Способ получения денег</span><select name="method">${Object.entries(METHODS).map(([k, v]) => opt(k, v, k === 'bank')).join('')}</select></label>
      <label class="fld"><span>Дата продажи</span><input type="date" name="date" required value="${esc(today())}"></label>
    </div>`;
  openDialog('Продать площадь', html, fd => {
    const sqm = parseNum(fd.get('sqm'));
    const priceUsd = parseNum(fd.get('priceUsd'));
    const rate = parseNum(fd.get('rate'));
    const method = fd.get('method');
    const date = fd.get('date');
    if (!(sqm > 0)) { toast('Укажите площадь больше нуля', true); return false; }
    const {unsoldSqm: freshUnsold} = areaProjectSummary(projectId);
    if (sqm > freshUnsold + 0.004) { toast(`Нельзя продать больше остатка (${nf.format(freshUnsold)} м²)`, true); return false; }
    if (!(priceUsd > 0)) { toast('Укажите цену за м² больше нуля', true); return false; }
    if (!(rate > 0)) { toast('Укажите курс больше нуля', true); return false; }
    if (!date) { toast('Укажите дату продажи', true); return false; }
    const saleAmount = sqm * priceUsd * rate;
    sellAreaFromProject(p, sqm, saleAmount, method, date);
    toast('Продажа сохранена');
  }, {wire: body => {
    const f = n => body.querySelector(`[name="${n}"]`);
    const upd = () => {
      const sqm = parseNum(f('sqm').value), priceUsd = parseNum(f('priceUsd').value), rate = parseNum(f('rate').value);
      f('saleAmountPreview').value = sqm > 0 && priceUsd > 0 && rate > 0 ? money(sqm * priceUsd * rate, 'TJS') : '';
    };
    body.addEventListener('input', upd);
    upd();
  }});
}
function sellAreaFromProject(p, sqmToSell, saleAmount, method, date) {
  const lots = areaUnsoldLots(p.id);
  const pricePerSqm = saleAmount / sqmToSell;
  const saleId = uid();
  let remaining = sqmToSell, consumedValue = 0;
  const removes = [], adds = [];
  for (const lot of lots) {
    if (remaining <= 0.0001) break;
    const take = Math.min(lot.areaSqm, remaining);
    const takeValue = take * lot.areaRate;
    consumedValue += takeValue;
    removes.push(lot);
    adds.push(Object.assign({}, lot, {
      id: uid(), areaSqm: +take.toFixed(4), amount: +takeValue.toFixed(2),
      areaSold: true, areaSoldAmount: +(take * pricePerSqm).toFixed(2), areaSoldMethod: method, areaSoldDate: date, saleId
    }));
    const leftoverSqm = lot.areaSqm - take;
    if (leftoverSqm > 0.0001) {
      adds.push(Object.assign({}, lot, {id: uid(), areaSqm: +leftoverSqm.toFixed(4), amount: +(leftoverSqm * lot.areaRate).toFixed(2)}));
    }
    remaining -= take;
  }
  const diff = saleAmount - consumedValue;
  if (Math.abs(diff) > 0.004) {
    adds.push({
      id: uid(), type: diff > 0 ? 'income' : 'expense', form: 'cash', date, amount: Math.abs(diff), currency: 'TJS', rate: null,
      category: diff > 0 ? AREA_GAIN_CAT : AREA_LOSS_CAT, projectId: p.id, employeeId: '', method, saleId,
      note: `Продажа площади ${nf.format(sqmToSell)} м² по проекту ${p.code}`, createdAt: Date.now()
    });
  }
  Store.applyTx(adds, removes);
}

/* ---------- Reports ---------- */
function renderReports() {
  const base = UI.base, [from, to] = periodRange(UI.rep.period, UI.rep.from, UI.rep.to);
  const txs = allTx().filter(t => t.date >= from && t.date <= to);
  const inc = sum(txs.filter(t => t.type === 'income'), t => txIn(t, base)), exp = sum(txs.filter(t => t.type === 'expense'), t => txIn(t, base));
  const profit = inc - exp, margin = inc > 0 ? Math.round(profit / inc * 100) : 0;
  const cat = {income: {}, expense: {}};
  txs.forEach(t => { cat[t.type][t.category] = (cat[t.type][t.category] || 0) + txIn(t, base); });
  const catRows = (type, total) => Object.entries(cat[type]).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td>${esc(c)}</td><td class="r num">${money(v, base)}</td><td class="r num muted">${total ? Math.round(v / total * 100) : 0}%</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Нет операций</td></tr>';
  const byP = {};
  txs.forEach(t => { const k = S.projects[t.projectId] ? t.projectId : ''; byP[k] = byP[k] || {inc: 0, exp: 0}; byP[k][t.type === 'income' ? 'inc' : 'exp'] += txIn(t, base); });
  const pRows = Object.entries(byP).sort((a, b) => (a[0] === '') - (b[0] === '') || (b[1].inc - b[1].exp) - (a[1].inc - a[1].exp));
  const byM = {};
  txs.forEach(t => { const k = t.date.slice(0, 7); byM[k] = byM[k] || {inc: 0, exp: 0}; byM[k][t.type === 'income' ? 'inc' : 'exp'] += txIn(t, base); });
  let run = 0;
  const mRows = Object.keys(byM).sort().map(k => { const r = byM[k]; run += r.inc - r.exp; return `<tr><td style="text-transform:capitalize">${monthLabel(k)}</td><td class="r num">${money(r.inc, base)}</td><td class="r num">${money(r.exp, base)}</td><td class="r num ${r.inc - r.exp < 0 ? 'neg' : ''}">${signed(r.inc - r.exp, base)}</td><td class="r num ${run < 0 ? 'neg' : ''}">${signed(run, base)}</td></tr>`; }).join('');
  return `
  <div class="page-head"><div><h1>Отчёты</h1><p>Доходы, расходы и прибыль за ${periodText('rep')} · в ${base === 'USD' ? 'долларах' : 'сомони'}</p></div>
    <div class="actions no-print"><button class="btn" data-act="print">Распечатать</button></div></div>
  <div class="filters no-print">${periodControl('rep')}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-l">Доходы</div><div class="kpi-v pos">${money(inc, base)}</div></div>
    <div class="kpi"><div class="kpi-l">Расходы</div><div class="kpi-v">${money(exp, base)}</div></div>
    <div class="kpi"><div class="kpi-l">Прибыль</div><div class="kpi-v ${profit < 0 ? 'neg' : ''}">${signed(profit, base)}</div></div>
    <div class="kpi"><div class="kpi-l">Рентабельность</div><div class="kpi-v">${margin}%</div><div class="kpi-s">прибыль ÷ доходы</div></div>
  </div>
  <div class="grid-2e">
    <div class="card"><div class="card-head"><h2>По статьям</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Статья</th><th class="r">Сумма</th><th class="r">Доля</th></tr></thead><tbody>
      <tr class="sec"><td colspan="3">Доходы</td></tr>${catRows('income', inc)}
      <tr class="sec"><td colspan="3">Расходы</td></tr>${catRows('expense', exp)}
    </tbody><tfoot><tr><td>Прибыль</td><td class="r num ${profit < 0 ? 'neg' : ''}">${signed(profit, base)}</td><td></td></tr></tfoot></table></div></div>
    <div class="card"><div class="card-head"><h2>По проектам</h2></div>${pRows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Проект</th><th class="r">Доходы</th><th class="r">Расходы</th><th class="r">Итог</th></tr></thead><tbody>
      ${pRows.map(([id, r]) => { const p = S.projects[id]; return `<tr ${p ? `class="click" data-act="openProject" data-id="${id}"` : ''}><td>${p ? `<div class="code">${esc(p.code)}</div><div class="cell-sub" style="max-width:220px">${esc(p.name)}</div>` : '<span class="cell-main">Общие расходы</span><div class="cell-sub">зарплата, аренда, налоги…</div>'}</td><td class="r num">${money(r.inc, base)}</td><td class="r num">${money(r.exp, base)}</td><td class="r num ${r.inc - r.exp < 0 ? 'neg' : ''}">${signed(r.inc - r.exp, base)}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<div class="empty">Нет операций за период</div>'}</div>
  </div>
  <div class="card"><div class="card-head"><h2>По месяцам</h2></div>${mRows ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Месяц</th><th class="r">Доходы</th><th class="r">Расходы</th><th class="r">Прибыль</th><th class="r">Нарастающим итогом</th></tr></thead><tbody>${mRows}</tbody></table></div>` : '<div class="empty">Нет операций за период</div>'}</div>`;
}

/* ---------- Settings ---------- */
function renderSettings() {
  const s = S.settings;
  const catBlock = (type, title) => `<div class="card"><div class="card-head"><h2>${title}</h2></div>
    <div class="cat-list">${(type === 'income' ? s.incomeCats : s.expenseCats).map(c => `<span class="cat-item">${esc(c)}${c === SALARY ? '<span class="muted" style="padding:0 6px;font-size:12px">системная</span>' : `<button class="icon-btn" data-act="delCat" data-type="${type}" data-name="${esc(c)}" aria-label="Удалить статью ${esc(c)}">${ICON.x}</button>`}</span>`).join('')}</div>
    <div class="inline-add"><input id="newCat-${type}" placeholder="Новая статья"><button class="btn" data-act="addCat" data-type="${type}">Добавить</button></div></div>`;
  return `
  <div class="page-head"><div><h1>Настройки</h1><p>Курс валют, начальные остатки и статьи доходов и расходов</p></div></div>
  <div class="grid-2e">
    <div class="card"><div class="card-head"><h2>Курс и остатки</h2></div>
      <div class="grid-f">
        <label class="fld span2"><span>Курс: 1 доллар = … сомони</span><input id="setRate" inputmode="decimal" value="${nf.format(s.rate)}"></label>
        <p class="hint span2" style="margin:-2px 0 0">Начальные остатки на момент начала учёта — отдельно по банку, наличным и карте.</p>
        <label class="fld"><span>Смн — банк</span><input id="setO-TJS-bank" inputmode="decimal" value="${nf.format(s.opening.TJS.bank || 0)}"></label>
        <label class="fld"><span>Смн — наличные</span><input id="setO-TJS-cash" inputmode="decimal" value="${nf.format(s.opening.TJS.cash || 0)}"></label>
        <label class="fld"><span>Смн — карта</span><input id="setO-TJS-card" inputmode="decimal" value="${nf.format(s.opening.TJS.card || 0)}"></label>
        <label class="fld"><span>$ — банк</span><input id="setO-USD-bank" inputmode="decimal" value="${nf.format(s.opening.USD.bank || 0)}"></label>
        <label class="fld"><span>$ — наличные</span><input id="setO-USD-cash" inputmode="decimal" value="${nf.format(s.opening.USD.cash || 0)}"></label>
        <label class="fld"><span>$ — карта</span><input id="setO-USD-card" inputmode="decimal" value="${nf.format(s.opening.USD.card || 0)}"></label>
        <p class="hint span2">Курс подставляется в новые долларовые операции и используется для итогов. У каждой сохранённой операции остаётся свой курс на день платежа.</p>
        <div class="span2"><button class="btn primary" data-act="saveSettings">Сохранить</button></div>
      </div>
    </div>
    <div class="card"><div class="card-head"><h2>Хранение данных и резервные копии</h2></div>
      <p style="margin:0 0 10px">Все записи хранятся локально в этом браузере, на этом устройстве. Если очистить историю браузера, переустановить его или открыть приложение на другом компьютере — без резервной копии эти данные будут недоступны.</p>
      <p class="hint" style="margin:0 0 14px">Операций: ${allTx().length} · проектов: ${Object.keys(S.projects).length} · заказчиков: ${Object.keys(S.clients).length} · сотрудников: ${Object.keys(S.employees).length}</p>
      <div class="actions">
        <button class="btn primary" data-act="exportData">Скачать резервную копию</button>
        <button class="btn" data-act="importData">Восстановить из файла</button>
        <button class="btn ghost" data-act="resetAll" style="color:var(--neg)">Очистить все данные</button>
      </div>
    </div>
  </div>
  <div class="grid-2e">${catBlock('income', 'Статьи доходов')}${catBlock('expense', 'Статьи расходов')}</div>`;
}

/* ---------- Dialogs ---------- */
const dlg = $('#dlg'); let dlgHandler = null;
function openDialog(title, html, onOk, opts = {}) {
  $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = html;
  const ok = $('#dlgOk'); ok.textContent = opts.ok || 'Сохранить'; ok.className = 'btn ' + (opts.danger ? 'danger' : 'primary');
  dlgHandler = onOk; dlg.showModal();
  if (opts.wire) opts.wire($('#dlgBody'));
  const first = $('#dlgBody').querySelector('input:not([type=radio]):not([type=checkbox]),select'); if (first && !opts.noFocus) first.focus();
}
$('#dlgForm').addEventListener('submit', e => {
  if (!e.submitter || e.submitter.value !== 'ok') return;
  e.preventDefault();
  const fd = new FormData($('#dlgForm'));
  if (dlgHandler && dlgHandler(fd) === false) return;
  dlg.close();
});
function confirmDlg(title, text, onYes, ok = 'Удалить') { openDialog(title, `<p>${text}</p>`, () => { onYes(); }, {ok, danger: true, noFocus: true}); }
const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(l)}</option>`;

function txDialog(t, preset) {
  const isNew = !t;
  const projOf = pid => pid && S.projects[pid];
  const startProj = projOf((t && t.projectId) || (preset && preset.projectId));
  const defaultForm = startProj && startProj.payType === 'area' ? 'area' : 'cash';
  const defaultAreaRate = startProj && startProj.areaPriceUsd > 0 ? +(startProj.areaPriceUsd * (startProj.rate || S.settings.rate)).toFixed(2) : '';
  const d = Object.assign({type: 'income', form: defaultForm, date: today(), amount: '', currency: 'TJS', rate: (startProj && startProj.rate) || S.settings.rate, areaSqm: '', areaRate: defaultAreaRate, category: '', projectId: '', employeeId: '', method: 'bank', note: ''}, t || {}, preset || {});
  const isArea = d.type === 'income' && d.form === 'area';
  const catOpts = (type, cur) => { const list = [...(type === 'income' ? S.settings.incomeCats : S.settings.expenseCats)]; if (cur && !list.includes(cur) && d.type === type) list.push(cur); return list.map(c => opt(c, c, c === cur)).join(''); };
  const html = `
    <div class="seg"><label><input type="radio" name="type" value="income" ${d.type === 'income' ? 'checked' : ''}>↓ Доход</label><label><input type="radio" name="type" value="expense" ${d.type === 'expense' ? 'checked' : ''}>↑ Расход</label></div>
    <div class="seg" data-show="form" ${d.type === 'income' ? '' : 'hidden'}><label><input type="radio" name="form" value="cash" ${d.form !== 'area' ? 'checked' : ''}>Деньги</label><label><input type="radio" name="form" value="area" ${d.form === 'area' ? 'checked' : ''}>Площадь</label></div>
    <div class="grid-f">
      <label class="fld" data-show="money" ${isArea ? 'hidden' : ''}><span>Сумма</span><input name="amount" inputmode="decimal" autocomplete="off" placeholder="0" value="${d.amount === '' ? '' : esc(String(d.amount).replace('.', ','))}"></label>
      <label class="fld" data-show="money" ${isArea ? 'hidden' : ''}><span>Валюта</span><select name="currency">${opt('TJS', 'Сомони (смн)', d.currency === 'TJS')}${opt('USD', 'Доллар ($)', d.currency === 'USD')}</select></label>
      <label class="fld" data-show="usd" ${d.currency === 'USD' && !isArea ? '' : 'hidden'}><span>Курс: 1 $ = … смн</span><input name="rate" inputmode="decimal" value="${esc(String(d.rate || S.settings.rate).replace('.', ','))}" title="Если выбран проект — курс зафиксирован по этому проекту и не меняется"></label>
      <label class="fld" data-show="usd" ${d.currency === 'USD' && !isArea ? '' : 'hidden'}><span>В сомони</span><input name="tjsPreview" disabled value=""></label>
      <label class="fld" data-show="area" ${isArea ? '' : 'hidden'}><span>Площадь, м²</span><input name="areaSqm" inputmode="decimal" placeholder="0" value="${d.areaSqm === '' ? '' : esc(String(d.areaSqm).replace('.', ','))}"></label>
      <label class="fld" data-show="area" ${isArea ? '' : 'hidden'}><span>Цена за 1 м², смн</span><input name="areaRate" inputmode="decimal" placeholder="0" value="${d.areaRate === '' ? '' : esc(String(d.areaRate).replace('.', ','))}" title="Цена площади ведётся в долларах и фиксируется в проекте — здесь показан её эквивалент в сомони по курсу проекта"></label>
      <label class="fld"><span>Дата</span><input type="date" name="date" required value="${esc(d.date)}"></label>
      <label class="fld" data-show="money" ${isArea ? 'hidden' : ''}><span>Способ</span><select name="method">${Object.entries(METHODS).map(([k, v]) => opt(k, v, d.method === k)).join('')}</select></label>
      <label class="fld span2" data-show="money" ${isArea ? 'hidden' : ''}><span>Статья</span><select name="category">${catOpts(d.type, d.category)}</select></label>
      <label class="fld span2" data-show="salary" ${d.type === 'expense' && d.category === SALARY ? '' : 'hidden'}><span>Сотрудник</span><select name="employeeId"><option value="">— выберите —</option>${sortedEmployees().filter(e => e.active !== false || e.id === d.employeeId).map(e => opt(e.id, e.name + (e.position ? ' · ' + e.position : ''), e.id === d.employeeId)).join('')}</select></label>
      <label class="fld span2"><span>Проект${isArea ? ' — обязательно для оплаты площадью' : ''}</span><select name="projectId"><option value="">Без проекта (общие расходы или доходы)</option>${sortedProjects().map(p => opt(p.id, p.code + ' · ' + p.name, p.id === d.projectId)).join('')}</select></label>
      <label class="fld span2"><span>Комментарий</span><input name="note" autocomplete="off" value="${esc(d.note)}" placeholder="Например: аванс 30% по договору №14/26"></label>
    </div>`;
  openDialog(isNew ? 'Новая операция' : 'Изменить операцию', html, fd => {
    if (t && t.form === 'area' && t.areaSold) { toast('Эта площадь уже продана — сначала отмените продажу в разделе «Площадь»', true); return false; }
    if (!fd.get('date')) { toast('Укажите дату', true); return false; }
    const type = fd.get('type');
    const form = type === 'income' && fd.get('form') === 'area' ? 'area' : 'cash';
    let amount, currency, rate, category, method, areaSqm = null, areaRate = null;
    if (form === 'area') {
      areaSqm = parseNum(fd.get('areaSqm')); areaRate = parseNum(fd.get('areaRate'));
      if (!(areaSqm > 0)) { toast('Укажите площадь больше нуля', true); return false; }
      if (!(areaRate > 0)) { toast('Укажите цену за м² больше нуля', true); return false; }
      if (!fd.get('projectId')) { toast('Оплата площадью возможна только по проекту — выберите проект', true); return false; }
      amount = areaSqm * areaRate; currency = 'TJS'; rate = null; category = AREA_INCOME_CAT; method = '';
    } else {
      amount = parseNum(fd.get('amount')); currency = fd.get('currency'); rate = parseNum(fd.get('rate'));
      if (!(amount > 0)) { toast('Укажите сумму больше нуля', true); return false; }
      if (currency === 'USD' && !(rate > 0)) { toast('Укажите курс доллара', true); return false; }
      category = fd.get('category'); method = fd.get('method');
      if (!category) { toast('Укажите статью', true); return false; }
    }
    const tx = Object.assign({}, t || {}, {
      id: t ? t.id : uid(), type, date: fd.get('date'), amount, currency, rate: currency === 'USD' ? rate : null,
      category, projectId: fd.get('projectId') || '', employeeId: type === 'expense' && category === SALARY ? (fd.get('employeeId') || '') : '',
      method, note: (fd.get('note') || '').trim(), createdAt: t ? t.createdAt : Date.now()
    });
    if (form === 'area') Object.assign(tx, {form: 'area', areaSqm, areaRate});
    else { delete tx.form; delete tx.areaSqm; delete tx.areaRate; delete tx.areaSold; delete tx.areaSoldAmount; delete tx.areaSoldMethod; delete tx.areaSoldDate; delete tx.adjTxId; }
    Store.saveTx(tx, t);
    toast(isNew ? 'Операция добавлена' : 'Изменения сохранены');
  }, {wire: body => {
    const f = n => body.querySelector(`[name="${n}"]`);
    const syncRate = () => {
      const proj = projOf(f('projectId').value);
      const rateField = f('rate');
      if (proj && proj.rate) {
        rateField.value = String(proj.rate).replace('.', ',');
        rateField.readOnly = true;
        rateField.title = `Курс зафиксирован по проекту «${proj.code}» и не меняется`;
      } else {
        rateField.readOnly = false;
        rateField.title = 'Если выбран проект — курс зафиксирован по этому проекту и не меняется';
      }
      const areaRateField = f('areaRate');
      if (proj && proj.areaPriceUsd > 0) {
        const smnPerSqm = +(proj.areaPriceUsd * (proj.rate || S.settings.rate)).toFixed(2);
        areaRateField.value = String(smnPerSqm).replace('.', ',');
        areaRateField.readOnly = true;
        areaRateField.title = `Цена зафиксирована по проекту «${proj.code}»: $${nf.format(proj.areaPriceUsd)}/м² по курсу ${nf.format(proj.rate || S.settings.rate)}`;
      } else {
        areaRateField.readOnly = false;
        areaRateField.title = 'Цена площади ведётся в долларах и фиксируется в проекте — здесь показан её эквивалент в сомони по курсу проекта';
      }
    };
    const upd = () => {
      const type = body.querySelector('[name="type"]:checked').value;
      const formRadio = body.querySelector('[name="form"]:checked');
      const areaNow = type === 'income' && formRadio && formRadio.value === 'area';
      body.querySelector('[data-show="form"]').hidden = type !== 'income';
      body.querySelectorAll('[data-show="money"]').forEach(x => { x.hidden = areaNow; });
      body.querySelectorAll('[data-show="area"]').forEach(x => { x.hidden = !areaNow; });
      const cur = f('currency').value;
      body.querySelectorAll('[data-show="usd"]').forEach(x => { x.hidden = areaNow || cur !== 'USD'; });
      body.querySelector('[data-show="salary"]').hidden = !(type === 'expense' && f('category').value === SALARY);
      const a = parseNum(f('amount').value), r = parseNum(f('rate').value);
      f('tjsPreview').value = a > 0 && r > 0 ? money(a * r, 'TJS') : '';
    };
    body.addEventListener('change', e => {
      if (e.target.name === 'type') { f('category').innerHTML = catOpts(e.target.value, ''); }
      if (e.target.name === 'projectId') {
        syncRate();
        if (isNew) {
          const proj = projOf(f('projectId').value);
          if (proj && proj.payType) {
            const wantArea = proj.payType === 'area';
            body.querySelectorAll('[name="form"]').forEach(r => { r.checked = (r.value === 'area') === wantArea; });
          }
        }
      }
      upd();
    });
    body.addEventListener('input', upd);
    syncRate();
    upd();
  }});
}

function projectDialog(p, preset) {
  const isNew = !p;
  const yy = String(new Date().getFullYear()).slice(2);
  const nextNo = 1 + Math.max(0, ...Object.values(S.projects).map(x => (x.code || '').startsWith('НМ-' + yy + '-') ? parseInt(x.code.slice(6), 10) || 0 : 0));
  const d = Object.assign({code: 'НМ-' + yy + '-' + String(nextNo).padStart(3, '0'), name: '', clientId: '', sections: [], status: 'work', contract: '', currency: 'TJS', rate: S.settings.rate, payType: 'cash', areaPriceUsd: '', start: today(), deadline: '', note: ''}, p || {}, preset || {});
  const html = `
    <div class="grid-f">
      <label class="fld"><span>Шифр проекта</span><input name="code" required value="${esc(d.code)}"></label>
      <label class="fld"><span>Статус</span><select name="status">${Object.entries(PSTAT).map(([k, v]) => opt(k, v.l, d.status === k)).join('')}</select></label>
      <label class="fld span2"><span>Название объекта</span><input name="name" required value="${esc(d.name)}" placeholder="Например: Жилой дом по ул. Айни — наружные сети ВК"></label>
      <label class="fld span2"><span>Заказчик</span><select name="clientId"><option value="">— не указан —</option>${sortedClients().map(c => opt(c.id, c.name, c.id === d.clientId)).join('')}<option value="__new">+ Новый заказчик…</option></select></label>
      <label class="fld span2" data-show="newClient" hidden><span>Название нового заказчика</span><input name="newClient" placeholder="ООО «…»"></label>
      <div class="fld span2"><span>Разделы проекта</span><div class="checks">${Object.entries(SECTIONS).map(([k, v]) => `<label title="${esc(v)}"><input type="checkbox" name="sections" value="${k}" ${d.sections.includes(k) ? 'checked' : ''}>${k}</label>`).join('')}</div><span class="hint" style="text-transform:none;letter-spacing:0;font:inherit;font-size:12.5px">Наведите на марку, чтобы увидеть расшифровку</span></div>
      <label class="fld"><span>Сумма договора</span><input name="contract" inputmode="decimal" value="${d.contract === '' ? '' : esc(String(d.contract).replace('.', ','))}" placeholder="0"></label>
      <label class="fld"><span>Валюта договора</span><select name="currency">${opt('TJS', 'Сомони (смн)', d.currency === 'TJS')}${opt('USD', 'Доллар ($)', d.currency === 'USD')}</select></label>
      <label class="fld"><span>Курс на дату договора: 1 $ = … смн</span><input name="rate" inputmode="decimal" value="${esc(String(d.rate || S.settings.rate).replace('.', ','))}" title="Фиксируется при создании проекта и используется для всех долларовых операций по нему"></label>
      <div class="fld"><span>Оплата по умолчанию</span><div class="seg"><label><input type="radio" name="payType" value="cash" ${d.payType !== 'area' ? 'checked' : ''}>Наличные</label><label><input type="radio" name="payType" value="area" ${d.payType === 'area' ? 'checked' : ''}>Площадь</label></div></div>
      <label class="fld" data-show="areaPrice" ${d.payType === 'area' ? '' : 'hidden'}><span>Цена площади, $ за 1 м²</span><input name="areaPriceUsd" inputmode="decimal" placeholder="0" value="${d.areaPriceUsd === '' ? '' : esc(String(d.areaPriceUsd).replace('.', ','))}" title="Фиксируется при создании проекта, конвертируется в сомони по курсу проекта"></label>
      <label class="fld" data-show="areaPrice" ${d.payType === 'area' ? '' : 'hidden'}><span>Площадь по договору, м²</span><input name="contractAreaSqm" disabled value=""></label>
      <label class="fld"><span>Дата начала</span><input type="date" name="start" value="${esc(d.start)}"></label>
      <label class="fld"><span>Срок сдачи</span><input type="date" name="deadline" value="${esc(d.deadline)}"></label>
      <label class="fld span2"><span>Примечание</span><input name="note" value="${esc(d.note)}" placeholder="Номер договора, стадия, особые условия"></label>
    </div>
    <p class="hint" style="text-transform:none;letter-spacing:0;font:inherit;font-size:12.5px">«Оплата по умолчанию» лишь подставляет способ при добавлении операции по проекту — по факту можно получить часть наличными, часть площадью, это не ограничение.</p>`;
  openDialog(isNew ? 'Новый проект' : 'Изменить проект', html, fd => {
    const name = (fd.get('name') || '').trim(); if (!name) { toast('Укажите название объекта', true); return false; }
    let clientId = fd.get('clientId');
    if (clientId === '__new') {
      const cn = (fd.get('newClient') || '').trim(); if (!cn) { toast('Укажите название нового заказчика', true); return false; }
      const c = {id: uid(), name: cn, contact: '', phone: '', inn: '', note: ''}; Store.saveEntity('clients', c); clientId = c.id;
    }
    const contract = parseNum(fd.get('contract'));
    const rate = parseNum(fd.get('rate'));
    const areaPriceUsd = parseNum(fd.get('areaPriceUsd'));
    const obj = Object.assign({}, p || {}, {id: p ? p.id : uid(), code: (fd.get('code') || '').trim(), name, clientId: clientId || '', sections: fd.getAll('sections'), status: fd.get('status'), contract: contract > 0 ? contract : 0, currency: fd.get('currency'), rate: rate > 0 ? rate : ((p && p.rate) || S.settings.rate), payType: fd.get('payType') === 'area' ? 'area' : 'cash', areaPriceUsd: areaPriceUsd > 0 ? areaPriceUsd : 0, start: fd.get('start') || '', deadline: fd.get('deadline') || '', note: (fd.get('note') || '').trim()});
    Store.saveEntity('projects', obj);
    toast(isNew ? 'Проект создан' : 'Проект сохранён');
  }, {wire: body => {
    const sel = body.querySelector('[name="clientId"]');
    sel.addEventListener('change', () => { body.querySelector('[data-show="newClient"]').hidden = sel.value !== '__new'; });
    const updArea = () => {
      const areaField = body.querySelector('[name="contractAreaSqm"]'); if (!areaField) return;
      const contract = parseNum(body.querySelector('[name="contract"]').value);
      const cur = body.querySelector('[name="currency"]').value;
      const rate = parseNum(body.querySelector('[name="rate"]').value) || S.settings.rate;
      const priceUsd = parseNum(body.querySelector('[name="areaPriceUsd"]').value);
      if (contract > 0 && priceUsd > 0 && rate > 0) {
        const contractUsd = cur === 'USD' ? contract : contract / rate;
        areaField.value = nf.format(+(contractUsd / priceUsd).toFixed(2)) + ' м²';
      } else {
        areaField.value = '';
      }
    };
    body.addEventListener('change', e => {
      if (e.target.name === 'payType') { body.querySelectorAll('[data-show="areaPrice"]').forEach(x => { x.hidden = e.target.value !== 'area'; }); }
    });
    body.addEventListener('change', updArea);
    body.addEventListener('input', updArea);
    updArea();
  }});
}

function clientDialog(c) {
  const d = Object.assign({name: '', contact: '', phone: '', inn: '', note: ''}, c || {});
  openDialog(c ? 'Изменить заказчика' : 'Новый заказчик', `
    <div class="grid-f">
      <label class="fld span2"><span>Название организации или ФИО</span><input name="name" required value="${esc(d.name)}" placeholder="ООО «…»"></label>
      <label class="fld"><span>Контактное лицо</span><input name="contact" value="${esc(d.contact)}"></label>
      <label class="fld"><span>Телефон</span><input name="phone" type="tel" value="${esc(d.phone)}" placeholder="+992 …"></label>
      <label class="fld span2"><span>ИНН</span><input name="inn" value="${esc(d.inn)}"></label>
      <label class="fld span2"><span>Примечание</span><input name="note" value="${esc(d.note)}"></label>
    </div>`, fd => {
    const name = (fd.get('name') || '').trim(); if (!name) { toast('Укажите название заказчика', true); return false; }
    Store.saveEntity('clients', Object.assign({}, c || {}, {id: c ? c.id : uid(), name, contact: fd.get('contact').trim(), phone: fd.get('phone').trim(), inn: fd.get('inn').trim(), note: fd.get('note').trim()}));
    toast(c ? 'Заказчик сохранён' : 'Заказчик добавлен');
  });
}

function empDialog(e) {
  const d = Object.assign({name: '', position: '', salary: '', currency: 'TJS', active: true}, e || {});
  openDialog(e ? 'Изменить сотрудника' : 'Новый сотрудник', `
    <div class="grid-f">
      <label class="fld span2"><span>ФИО</span><input name="name" required value="${esc(d.name)}"></label>
      <label class="fld span2"><span>Должность</span><input name="position" value="${esc(d.position)}" placeholder="Например: инженер-проектировщик ОВ"></label>
      <label class="fld"><span>Оклад в месяц</span><input name="salary" inputmode="decimal" value="${d.salary === '' ? '' : esc(String(d.salary).replace('.', ','))}"></label>
      <label class="fld"><span>Валюта</span><select name="currency">${opt('TJS', 'Сомони (смн)', d.currency === 'TJS')}${opt('USD', 'Доллар ($)', d.currency === 'USD')}</select></label>
      <label class="span2" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" ${d.active !== false ? 'checked' : ''}> Работает сейчас</label>
    </div>`, fd => {
    const name = (fd.get('name') || '').trim(); if (!name) { toast('Укажите ФИО', true); return false; }
    const sal = parseNum(fd.get('salary'));
    Store.saveEntity('employees', Object.assign({}, e || {}, {id: e ? e.id : uid(), name, position: fd.get('position').trim(), salary: sal > 0 ? sal : 0, currency: fd.get('currency'), active: fd.get('active') === 'on'}));
    toast(e ? 'Сотрудник сохранён' : 'Сотрудник добавлен');
  });
}

/* ---------- Actions ---------- */
const findTx = (id, m) => (S.months[m] || {})[id] || allTx().find(t => t.id === id);
const actions = {
  nav: el => { UI.view = el.dataset.v; UI.detail = null; UI.clientDetail = null; render(); window.scrollTo(0, 0); },
  base: el => { UI.base = el.dataset.v; try { localStorage.setItem('nemat-base', UI.base); } catch (e) {} render(); },
  addTx: el => txDialog(null, Object.assign(el.dataset.type ? {type: el.dataset.type} : {}, el.dataset.project ? {projectId: el.dataset.project} : {})),
  editTx: el => { const t = findTx(el.dataset.id, el.dataset.m); if (t) txDialog(t); },
  delTx: el => { const t = findTx(el.dataset.id, el.dataset.m); if (t) confirmDlg('Удалить операцию?', `${esc(t.category)}, ${fmtDate(t.date)} — ${money(t.amount, t.currency)}. Отменить удаление будет нельзя.`, () => { Store.saveTx(null, t); toast('Операция удалена'); }); },
  openProject: el => { UI.view = 'projects'; UI.detail = el.dataset.id; render(); window.scrollTo(0, 0); },
  closeDetail: () => { UI.detail = null; render(); },
  addProject: el => projectDialog(null, el.dataset.client ? {clientId: el.dataset.client} : null),
  editProject: el => projectDialog(S.projects[el.dataset.id]),
  delProject: el => { const p = S.projects[el.dataset.id]; if (!p) return; const n = projStats(p).txs.length; confirmDlg('Удалить проект?', `«${esc(p.name)}» будет удалён.${n ? ` ${n} ${plural(n, 'операция останется', 'операции останутся', 'операций останутся')} в учёте как общие.` : ''}`, () => { UI.detail = null; Store.deleteEntity('projects', p.id); toast('Проект удалён'); }); },
  projFilter: el => { UI.proj = el.dataset.v; render(); },
  openClient: el => { UI.view = 'clients'; UI.clientDetail = el.dataset.id; render(); window.scrollTo(0, 0); },
  closeClient: () => { UI.clientDetail = null; render(); },
  addClient: () => clientDialog(null),
  editClient: el => clientDialog(S.clients[el.dataset.id]),
  delClient: el => { const c = S.clients[el.dataset.id]; if (!c) return; const n = Object.values(S.projects).filter(p => p.clientId === c.id).length; confirmDlg('Удалить заказчика?', `«${esc(c.name)}» будет удалён.${n ? ` У ${n} ${plural(n, 'проекта', 'проектов', 'проектов')} заказчик станет «не указан».` : ''}`, () => { UI.clientDetail = null; Store.deleteEntity('clients', c.id); toast('Заказчик удалён'); }); },
  addEmp: () => empDialog(null),
  editEmp: el => empDialog(S.employees[el.dataset.id]),
  delEmp: el => { const e = S.employees[el.dataset.id]; if (e) confirmDlg('Удалить сотрудника?', `${esc(e.name)} будет удалён из списка. Выплаты останутся в учёте. Если человек просто уволился, лучше снять отметку «Работает сейчас».`, () => { Store.deleteEntity('employees', e.id); toast('Сотрудник удалён'); }); },
  toggleInactive: () => { UI.emp.inactive = !UI.emp.inactive; render(); },
  payEmp: el => {
    const e = S.employees[el.dataset.id]; if (!e) return; const m = UI.emp.month, cur = e.currency || 'TJS';
    const paid = sum(Object.values(S.months[m] || {}).filter(t => t.category === SALARY && t.employeeId === e.id), t => txIn(t, cur));
    const isCur = m === today().slice(0, 7);
    txDialog(null, {type: 'expense', category: SALARY, employeeId: e.id, amount: Math.max(0, (+e.salary || 0) - paid), currency: cur, date: isCur ? today() : ymd(new Date(+m.slice(0, 4), +m.slice(5, 7), 0)), note: 'Зарплата за ' + monthLabel(m + '-01')});
  },
  addArea: () => txDialog(null, {type: 'income', form: 'area'}),
  areaFilter: el => { UI.area.filter = el.dataset.v; render(); },
  sellFromProject: el => { areaSellFromProjectDialog(el.dataset.id); },
  unsellArea: el => {
    const saleId = el.dataset.sale; if (!saleId) return;
    const batch = allTx().filter(t => t.saleId === saleId); if (!batch.length) return;
    const sqm = sum(batch.filter(t => t.form === 'area'), t => t.areaSqm);
    confirmDlg('Отменить продажу?', `${nf.format(sqm)} м² снова станут непроданными. Операция прибыли/убытка от продажи будет удалена.`, () => {
      const adds = batch.filter(t => t.form === 'area').map(t => Object.assign({}, t, {areaSold: false, areaSoldAmount: null, areaSoldMethod: null, areaSoldDate: null, saleId: null}));
      Store.applyTx(adds, batch);
      toast('Продажа отменена');
    }, 'Отменить продажу');
  },
  delArea: el => {
    const t = findTx(el.dataset.id, el.dataset.m); if (!t) return;
    if (t.areaSold) { toast('Эта площадь продана — сначала отмените продажу', true); return; }
    confirmDlg('Удалить лот площади?', `Запись о ${nf.format(t.areaSqm)} м² будет удалена безвозвратно.`, () => { Store.saveTx(null, t); toast('Лот удалён'); });
  },
  addCat: el => {
    const type = el.dataset.type, inp = $('#newCat-' + type), v = (inp.value || '').trim(); if (!v) return;
    const s = Object.assign({}, S.settings), key = type === 'income' ? 'incomeCats' : 'expenseCats';
    if (s[key].includes(v)) { toast('Такая статья уже есть', true); return; }
    s[key] = [...s[key], v]; Store.saveSettings(s); toast('Статья добавлена');
  },
  delCat: el => { const type = el.dataset.type, name = el.dataset.name, key = type === 'income' ? 'incomeCats' : 'expenseCats'; const s = Object.assign({}, S.settings); s[key] = s[key].filter(c => c !== name); Store.saveSettings(s); toast('Статья удалена. Старые операции её сохранят.'); },
  saveSettings: () => {
    const rate = parseNum($('#setRate').value);
    if (!(rate > 0)) { toast('Курс должен быть больше нуля', true); return; }
    const g = id => { const v = parseNum($(id).value); return isFinite(v) ? v : 0; };
    const opening = {
      TJS: {bank: g('#setO-TJS-bank'), cash: g('#setO-TJS-cash'), card: g('#setO-TJS-card')},
      USD: {bank: g('#setO-USD-bank'), cash: g('#setO-USD-cash'), card: g('#setO-USD-card')}
    };
    Store.saveSettings(Object.assign({}, S.settings, {rate, opening})); toast('Настройки сохранены');
  },
  toggleBal: el => { const cur = el.dataset.cur; UI.balDetail[cur] = !UI.balDetail[cur]; render(); },
  exportData: () => {
    const data = Store.exportJSON();
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'azam-finance-budget-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Резервная копия скачана');
  },
  importData: () => { $('#importFile').click(); },
  resetAll: () => {
    confirmDlg('Очистить все данные?', 'Все операции, проекты, заказчики, сотрудники и настройки будут удалены безвозвратно из этого браузера. Отменить это будет нельзя. Если нужна резервная копия — сначала скачайте её.', () => {
      Store.importJSON({});
      UI.view = 'overview'; UI.detail = null; UI.clientDetail = null;
      toast('Все данные удалены — можно начинать с чистого листа');
    }, 'Да, удалить всё');
  },
  print: () => window.print()
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.closest('.row-actions') && el.closest('tr.click') && el.closest('tr.click') !== el) e.stopPropagation();
  const fn = actions[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); }
});
function onFilter(e) {
  const el = e.target.closest('[data-f]'); if (!el) return;
  const [scope, key] = el.dataset.f.split('.');
  if (e.type === 'input' && !(scope === 'ops' && key === 'q')) return;
  UI[scope][key] = el.value;
  if (scope === 'ops' && key !== 'period') renderOpsTable(); else render();
}
document.addEventListener('change', onFilter);
document.addEventListener('input', onFilter);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('newCat-')) { e.preventDefault(); actions.addCat({dataset: {type: e.target.id.slice(7)}}); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); const fn = actions[e.target.dataset.act]; if (fn) fn(e.target); }
});

$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); if (!data || typeof data !== 'object') throw new Error('bad'); }
  catch (err) { toast('Не удалось прочитать файл — убедитесь, что это резервная копия в формате JSON', true); return; }
  confirmDlg('Восстановить данные из файла?', `Текущие данные в этом браузере будут полностью заменены содержимым файла «${esc(file.name)}». Это нельзя отменить — при необходимости сначала скачайте резервную копию текущих данных.`, () => {
    Store.importJSON(data);
    toast('Данные восстановлены из файла');
  }, 'Восстановить');
});

/* chart hover */
document.addEventListener('pointermove', e => {
  const wrap = $('#chartMain'); if (!wrap) return;
  const tip = wrap.querySelector('.tip');
  const hit = e.target.closest && e.target.closest('.hit');
  if (!hit || !wrap.contains(hit)) { tip.hidden = true; return; }
  const {series, base} = charts.main, s = series[+hit.dataset.i];
  tip.innerHTML = `<b>${monthLabel(s.key + '-01')}</b><div><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--s-inc);margin-right:6px"></i>Доходы</span><span class="num">${money(s.inc, base)}</span></div><div><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--s-exp);margin-right:6px"></i>Расходы</span><span class="num">${money(s.exp, base)}</span></div><div style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Прибыль</span><span class="num ${s.inc - s.exp < 0 ? 'neg' : ''}">${signed(s.inc - s.exp, base)}</span></div>`;
  tip.hidden = false;
  const r = wrap.getBoundingClientRect(); let x = e.clientX - r.left + wrap.scrollLeft + 14, y = e.clientY - r.top - 10;
  if (x + tip.offsetWidth > wrap.scrollWidth - 4) x = e.clientX - r.left + wrap.scrollLeft - tip.offsetWidth - 14;
  tip.style.left = x + 'px'; tip.style.top = Math.max(0, y) + 'px';
});

let toastTimer;
function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }

render();
Store.init();
})();
