{
const API = 'https://api.deadlock-api.com';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = { get(k){ try { return JSON.parse(localStorage.getItem('dbl_'+k)); } catch { return null; } }, set(k,v){ try { localStorage.setItem('dbl_'+k, JSON.stringify(v)); } catch {} } };
const getJ = async (path) => { const r = await fetch(API + path); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };

let heroes = [], heroById = {}, items = {}, account = store.get('account');
const state = { me: store.get('me') ? [store.get('me')] : [], ally: [], enemy: [] };
let threat = new Set();
const max = { me: 1, ally: 5, enemy: 6 };
let active = state.me.length ? 'enemy' : 'me';
let pollTimer = null, runId = 0;
const cache = {};

const setStatus = (el, msg, err) => { el.className = 'status' + (err ? ' err' : ''); el.innerHTML = msg; };
const pct = x => (x * 100).toFixed(1) + '%';
const pp = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + 'pp';
const rankQ = () => {
  const mode = $('mode').value, v = mode === 'ranked' ? $('rank').value : '';
  let q = '&match_mode=' + mode;
  if (v) { const [a, b] = v.split('-'); q += `&min_average_badge=${a}&max_average_badge=${b}`; }
  return q;
};
const syncRank = () => { $('rankwrap').style.display = $('mode').value === 'ranked' ? '' : 'none'; };

function renderSlots() {
  for (const k of ['me', 'ally', 'enemy']) {
    let html = '';
    for (let i = 0; i < max[k]; i++) {
      const h = heroById[state[k][i]];
      const slot = `<button class="slot ${k} ${h ? 'filled' : ''} ${active === k && (h ? false : i === state[k].length) ? 'active' : ''}" data-k="${k}" data-i="${i}" aria-label="${h ? esc(h.name) + ' (clique para remover)' : 'Vazio'}">${h ? `<img src="${esc(h.img)}" alt=""><span>${esc(h.name)}</span>` : '<span>+</span>'}</button>`;
      if (k === 'enemy') html += `<div class="eslot">${slot}${h ? `<button class="threat ${threat.has(h.id) ? 'on' : ''}" data-t="${h.id}" aria-pressed="${threat.has(h.id)}" title="Marque quem está com mais souls no placar (Tab)">${threat.has(h.id) ? 'Forte ✓' : 'Forte?'}</button>` : ''}</div>`;
      else html += slot;
    }
    $('s-' + k).innerHTML = html;
  }
  const names = { me: 'o seu herói', ally: 'um aliado', enemy: 'um inimigo' };
  $('pickhint').textContent = `Clique num herói para adicionar ${names[active]}. Clique num espaço para trocar de time ou num herói já escolhido para remover. Use "Forte?" nos inimigos com mais souls no placar (Tab).`;
  renderGrid();
}

function renderGrid() {
  const f = $('filter').value.trim().toLowerCase();
  const used = new Set([...state.me, ...state.ally, ...state.enemy]);
  const list = heroes.filter(h => !f || h.name.toLowerCase().includes(f));
  $('grid').innerHTML = list.map(h => `<button class="hero ${used.has(h.id) ? 'used' : ''}" data-id="${h.id}"><img src="${esc(h.img)}" alt="" loading="lazy">${esc(h.name)}</button>`).join('') || '<div class="empty">Nenhum herói com esse nome.</div>';
}

function nextActive() {
  if (state.me.length < 1) return 'me';
  if (active !== 'me' && state[active].length < max[active]) return active;
  if (state.enemy.length < 6) return 'enemy';
  if (state.ally.length < 5) return 'ally';
  return active;
}

function pick(id) {
  for (const k of ['me', 'ally', 'enemy']) state[k] = state[k].filter(x => x !== id);
  if (state[active].length >= max[active]) { if (active === 'me') state.me = []; else return; }
  state[active].push(id);
  if (active === 'me') store.set('me', id);
  active = nextActive();
  renderSlots(); schedule();
}

$('grid').addEventListener('click', e => { const b = e.target.closest('.hero'); if (b) pick(+b.dataset.id); });
document.querySelector('.teams').addEventListener('click', e => {
  const t = e.target.closest('.threat');
  if (t) { const id = +t.dataset.t; threat.has(id) ? threat.delete(id) : threat.add(id); renderSlots(); schedule(); return; }
  const b = e.target.closest('.slot'); if (!b) return;
  const k = b.dataset.k, i = +b.dataset.i;
  if (state[k][i] != null) { state[k].splice(i, 1); if (k === 'me') store.set('me', null); schedule(); }
  active = k; renderSlots(); $('filter').focus();
});
$('filter').addEventListener('input', renderGrid);
$('filter').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const f = $('filter').value.trim().toLowerCase(); if (!f) return;
  const h = heroes.find(h => h.name.toLowerCase().startsWith(f)) || heroes.find(h => h.name.toLowerCase().includes(f));
  if (h) { pick(h.id); $('filter').value = ''; renderGrid(); }
});
$('clear').addEventListener('click', () => { state.ally = []; state.enemy = []; threat.clear(); active = nextActive(); renderSlots(); schedule(); });
$('rank').addEventListener('change', () => { store.set('rank', $('rank').value); schedule(); });
$('mode').addEventListener('change', () => { store.set('mode', $('mode').value); syncRank(); schedule(); });

/* ---------- Steam / partida ao vivo ---------- */
function parseSteam(v) {
  v = v.trim(); const m = v.match(/7656119\d{10}/);
  if (m) return Number(BigInt(m[0]) - 76561197960265728n);
  if (/^\d{1,10}$/.test(v)) return +v;
  const m3 = v.match(/\[U:1:(\d+)\]/); if (m3) return +m3[1];
  return null;
}
async function resolveAccount() {
  const v = $('steam').value.trim();
  if (!v) throw new Error('Digite seu nome na Steam ou o link do seu perfil.');
  if (account && account.input === v) return account.id;
  const id = parseSteam(v);
  if (id) { account = { input: v, id }; store.set('account', account); return id; }
  setStatus($('lstatus'), '<span class="spin"></span>Procurando seu perfil…');
  const res = await getJ('/v1/players/steam-search?limit=5&search_query=' + encodeURIComponent(v)).catch(() => []);
  if (!res.length) throw new Error('Não achei esse perfil. Tente colar o link do seu perfil da Steam.');
  $('choices').innerHTML = '<div class="hint">Qual destes é você?</div>' + res.map(p => `<button data-id="${+p.account_id}" data-name="${esc(p.personaname)}"><img src="${esc(p.avatar)}" alt="">${esc(p.personaname)} <span class="hint">· ${+p.matches_played_last_30d || 0} partidas no último mês</span></button>`).join('');
  return null;
}
$('choices').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]'); if (!b) return;
  account = { input: $('steam').value.trim(), id: +b.dataset.id, name: b.dataset.name };
  store.set('account', account); $('choices').innerHTML = ''; findMatch();
});
async function findMatch() {
  try {
    const id = await resolveAccount(); if (!id) { setStatus($('lstatus'), ''); return; }
    setStatus($('lstatus'), '<span class="spin"></span>Procurando sua partida…');
    const ms = await getJ('/v1/matches/active?account_ids=' + id);
    const m = ms.find(x => x.players.some(p => p.account_id === id));
    if (!m) { setStatus($('lstatus'), 'Sua partida não apareceu na lista ao vivo (ela só mostra as partidas em destaque). Escolha os heróis clicando abaixo.' + ($('auto').checked ? ' Tento de novo em 30 s.' : '')); return; }
    const me = m.players.find(p => p.account_id === id);
    state.me = [me.hero_id]; store.set('me', me.hero_id);
    state.ally = m.players.filter(p => p.team === me.team && p.account_id !== id && p.team_parsed !== 'Spectator').map(p => p.hero_id).slice(0, 5);
    state.enemy = m.players.filter(p => p.team !== me.team && p.team_parsed !== 'Spectator').map(p => p.hero_id).slice(0, 6);
    active = nextActive(); renderSlots(); schedule();
    setStatus($('lstatus'), 'Partida encontrada! Heróis preenchidos automaticamente.');
  } catch (err) { setStatus($('lstatus'), esc(err.message), true); }
}
$('find').addEventListener('click', findMatch);
$('steam').addEventListener('keydown', e => { if (e.key === 'Enter') findMatch(); });
$('auto').addEventListener('change', () => { clearInterval(pollTimer); if ($('auto').checked) { findMatch(); pollTimer = setInterval(findMatch, 30000); } });

/* ---------- recomendações ---------- */
let timer = null;
function schedule() { clearTimeout(timer); timer = setTimeout(run, 400); }

const itemStats = q => cache[q] ||= getJ('/v1/analytics/item-stats?' + q).then(rows => { const map = {}; let w = 0, m = 0; for (const r of rows) if (items[r.item_id]) { map[r.item_id] = r; w += r.wins; m += r.matches; } return { map, ref: m ? w / m : .5 }; });
const pairStats = (kind, me) => cache[kind + me + rankQ()] ||= getJ(`/v1/analytics/hero-${kind}-stats?same_lane_filter=false&min_matches=50${rankQ()}`).then(rows => rows);

function itemRow(id, right, extra) {
  const it = items[id];
  return `<div class="it ${esc(it.slot)}"><img src="${esc(it.img)}" alt=""><div><div class="n">${esc(it.name)}</div><div class="m">${it.cost} souls${extra ? ' · ' + extra : ''}</div></div><div class="v">${right}</div></div>`;
}

/* ---------- build dos pros (partidas ranqueadas de rank alto) ---------- */
let proRun = 0;
const heroTotals = b => cache['hs' + b] ||= getJ(`/v1/analytics/hero-stats?match_mode=ranked&min_average_badge=${b}`);
const proItems = (me, b) => cache['pro' + me + '_' + b] ||= getJ(`/v1/analytics/item-stats?hero_ids=${me}&match_mode=ranked&min_average_badge=${b}&min_matches=10`);
async function loadPro(me, b) {
  const [hs, rows] = await Promise.all([heroTotals(b), proItems(me, b)]);
  return { tot: hs.find(x => x.hero_id === me)?.matches || 0, rows };
}
async function runPro(me) {
  const id = ++proRun;
  if (!me) { $('procard').style.display = 'none'; return; }
  $('procard').style.display = 'block';
  if (!$('pro').children.length) $('pro').innerHTML = '<div class="hint"><span class="spin"></span>Carregando…</div>';
  try {
    let d = await loadPro(me, 111), label = 'Eternus';
    if (d.tot < 300) { d = await loadPro(me, 101); label = 'Ascendant e Eternus'; }
    if (id !== proRun) return;
    if (d.tot < 100) { $('prohint').textContent = 'Ainda não há partidas suficientes de jogadores de rank alto com este herói.'; $('pro').innerHTML = ''; return; }
    const list = d.rows.filter(r => items[r.item_id] && r.matches / d.tot >= 0.25).sort((a, b) => a.avg_buy_time_s - b.avg_buy_time_s);
    const phases = [['Início', 'até 10 min', 0, 600], ['Meio', '10 a 20 min', 600, 1200], ['Final', 'depois de 20 min', 1200, Infinity]];
    $('prohint').textContent = `O que jogadores de rank ${label} compram com ${heroById[me].name}, na ordem em que costumam comprar. Baseado em ${d.tot.toLocaleString('pt-BR')} partidas ranqueadas dos últimos 30 dias.`;
    $('pro').innerHTML = phases.map(([name, sub, a, b]) => {
      const ph = list.filter(r => r.avg_buy_time_s >= a && r.avg_buy_time_s < b).sort((x, y) => y.matches - x.matches).slice(0, 6).sort((x, y) => x.avg_buy_time_s - y.avg_buy_time_s);
      return `<div class="tier"><h3>${name} · ${sub}</h3>${ph.map(r => itemRow(r.item_id, `${Math.round(r.matches / d.tot * 100)}%`, `~${Math.max(1, Math.round(r.avg_buy_time_s / 60))} min${r.sold / r.matches > 0.5 ? ' · vendem depois' : ''}`)).join('') || '<div class="hint">—</div>'}</div>`;
    }).join('');
  } catch (err) {
    if (id === proRun) { $('prohint').textContent = 'Não consegui carregar a build dos pros agora (' + err.message + ').'; $('pro').innerHTML = ''; }
  }
}

async function run() {
  const me = state.me[0];
  runPro(me);
  if (!me) { $('results').style.display = 'none'; setStatus($('status'), 'Escolha o seu herói para começar.'); return; }
  if (!state.enemy.length) { $('results').style.display = 'none'; setStatus($('status'), 'Agora escolha pelo menos um inimigo.'); return; }
  for (const t of [...threat]) if (!state.enemy.includes(t)) threat.delete(t);
  const id = ++runId;
  setStatus($('status'), '<span class="spin"></span>Analisando a partida…');
  try {
    const rq = rankQ();
    const baseP = itemStats(`hero_ids=${me}&min_matches=100${rq}`);
    const vsP = state.enemy.map(e => itemStats(`hero_ids=${me}&enemy_hero_ids=${e}&min_matches=30${rq}`));
    const [base, vs, counter, syn] = await Promise.all([baseP, Promise.all(vsP), pairStats('counter', me), pairStats('synergy', me)]);
    if (id !== runId) return;
    if (!Object.keys(base.map).length) { $('results').style.display = 'none'; setStatus($('status'), 'Ainda não há partidas suficientes com esse herói nesse filtro. Tente outro modo ou rank.', true); return; }

    /* matchups */
    const mu = [];
    for (const e of state.enemy) { const r = counter.find(x => x.hero_id === me && x.enemy_hero_id === e); if (r) mu.push({ t: 'contra', h: e, wr: r.wins / r.matches_played, n: r.matches_played }); }
    for (const a of state.ally) { const r = syn.find(x => (x.hero_id1 === me && x.hero_id2 === a) || (x.hero_id2 === me && x.hero_id1 === a)); if (r) mu.push({ t: 'com', h: a, wr: r.wins / r.matches_played, n: r.matches_played }); }
    $('mu').innerHTML = mu.map(x => `<div><b class="${x.wr >= .5 ? 'pos' : 'neg'}">${pct(x.wr)}</b>${x.t} ${esc(heroById[x.h]?.name)}</div>`).join('') || '<div>Sem dados suficientes.</div>';

    /* score dos itens contra os inimigos */
    const K = 250, scores = {};
    const W = h => threat.has(h) ? 3 : 1, wTotal = state.enemy.reduce((a, h) => a + W(h), 0);
    for (const id2 of Object.keys(base.map)) {
      const b = base.map[id2], bw = b.wins / b.matches; let sum = 0; const per = [];
      vs.forEach((v, i) => {
        const r = v.map[id2]; if (!r) return;
        const lift = (r.wins / r.matches - bw) - (v.ref - base.ref);
        const s = lift * r.matches / (r.matches + K);
        sum += s * W(state.enemy[i]); per.push({ h: state.enemy[i], s });
      });
      scores[id2] = { s: sum / wTotal, per };
    }

    /* build base: mais comprados por tier */
    const byTier = t => Object.values(base.map).filter(r => items[r.item_id].tier === t).sort((a, b) => b.matches - a.matches);
    const baseIds = new Set();
    $('base').innerHTML = [1, 2, 3, 4].map(t => {
      const top = byTier(t).slice(0, 4); top.forEach(r => baseIds.add(String(r.item_id)));
      return `<div class="tier"><h3>Tier ${t}</h3>${top.map(r => itemRow(r.item_id, `<span class="hint">${pct(r.wins / r.matches)}</span>`, 'vitória')).join('') || '<div class="hint">—</div>'}</div>`;
    }).join('');

    /* counters */
    $('counters').innerHTML = [1, 2, 3, 4].map(t => {
      const list = Object.entries(scores).filter(([i, s]) => items[i].tier === t && s.s > 0.004).sort((a, b) => b[1].s - a[1].s).slice(0, 5);
      return `<div class="tier"><h3>Tier ${t}</h3>${list.map(([i, s]) => {
        const best = s.per.filter(p => p.s > 0.004).sort((a, b) => b.s * W(b.h) - a.s * W(a.h)).slice(0, 2).map(p => esc(heroById[p.h]?.name) + (threat.has(p.h) ? ' (forte)' : '')).join(', ');
        return itemRow(i, `<span class="pos">${pp(s.s)}</span>`, best ? 'bom contra ' + best : '');
      }).join('') || '<div class="hint">Nada se destaca neste tier.</div>'}</div>`;
    }).join('');

    /* evitar */
    const avoid = [...baseIds].filter(i => scores[i] && scores[i].s < -0.004).sort((a, b) => scores[a].s - scores[b].s).slice(0, 6);
    $('avoid').innerHTML = avoid.map(i => {
      const worst = scores[i].per.sort((a, b) => a.s - b.s)[0];
      return itemRow(i, `<span class="neg">${pp(scores[i].s)}</span>`, worst ? 'pior contra ' + esc(heroById[worst.h]?.name) : '');
    }).join('') || '<div class="hint">Nenhum item da build base vai mal contra este time. Pode seguir a build normal.</div>';

    $('results').style.display = 'block';
    setStatus($('status'), `Build para <b>${esc(heroById[me].name)}</b> contra ${state.enemy.map(e => esc(heroById[e]?.name) + (threat.has(e) ? ' <b>(forte)</b>' : '')).join(', ')}.` + (threat.size ? ' Inimigos marcados como fortes pesam 3× nas recomendações.' : ' Dica: durante a partida, olhe o placar (Tab) e marque quem está com mais souls.'));
  } catch (err) {
    if (id === runId) setStatus($('status'), 'Não consegui buscar os dados agora (' + esc(err.message) + '). Tente de novo em alguns segundos.', true);
  }
}

/* ---------- carregar dados ---------- */
(async () => {
  try {
    const [hs, its] = await Promise.all([getJ('/v1/assets/heroes?only_active=true'), getJ('/v1/assets/items')]);
    heroes = hs.filter(h => h.player_selectable && !h.disabled && !h.in_development).map(h => ({ id: h.id, name: h.name, img: h.images?.icon_image_small_webp || h.images?.icon_image_small || '' })).sort((a, b) => a.name.localeCompare(b.name));
    heroes.forEach(h => heroById[h.id] = h);
    for (const it of its) if (it.type === 'upgrade' && it.shopable && it.item_tier >= 1 && it.item_tier <= 4) items[it.id] = { name: it.name, tier: it.item_tier, cost: it.cost, slot: it.item_slot_type, img: it.shop_image_webp || it.image_webp || it.image || '' };
    state.me = state.me.filter(id => heroById[id]);
    $('rank').value = store.get('rank') || '';
    $('mode').value = store.get('mode') || 'unranked';
    syncRank();
    if (account) $('steam').value = account.input;
    active = nextActive(); renderSlots(); run();
  } catch (err) {
    $('grid').innerHTML = `<div class="empty">Não consegui carregar os dados da deadlock-api.com (${esc(err.message)}). Verifique sua internet e recarregue a página.</div>`;
  }
})();
}
