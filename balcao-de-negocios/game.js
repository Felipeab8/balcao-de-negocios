/* Balcão de Negócios — lógica do jogo.
   Depende dos arquivos de data/ (window.LIGAS e window.NOMES) carregados antes. */

const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dec = v => v.toFixed(1).replace('.', t('num.dec'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- idiomas ---------------- */
/* todo texto de interface vem de data/i18n.js; {chaves} viram valores em tempo de execução */
const I18N = window.I18N || { pt:{} };
let LANG = 'pt';
function t(k, v){
  let s = (I18N[LANG] || {})[k];
  if (s === undefined) s = (I18N.pt || {})[k];
  if (s === undefined) return k;
  return v ? s.replace(/\{(\w+)\}/g, (m, n) => (v[n] === undefined ? m : v[n])) : s;
}
function initLang(){
  let l = null;
  try { l = localStorage.getItem('bdnLang'); } catch (e) {}
  if (!I18N[l]) l = String(navigator.language || 'pt').slice(0, 2).toLowerCase();
  LANG = I18N[l] ? l : 'pt';
  document.documentElement.lang = t('lang.tag');
  applyI18n();
}
function setLang(l){
  if (!I18N[l] || l === LANG) return;
  LANG = l;
  try { localStorage.setItem('bdnLang', l); } catch (e) {}
  document.documentElement.lang = t('lang.tag');
  applyI18n();
  const liga = $('#pickLiga').value;
  initSelects();
  $('#pickLiga').value = liga;
  initAportes();
  SORT_TAB = null;   /* obriga a barra de ordenação a se refazer no idioma novo */
  if (G){
    renderSetup();
    renderIntro();
    if (!$('#screenDesk').hidden) renderAll();
    else if (!$('#hud').hidden) renderHud();   /* na tela final o topo continua à vista */
    if (!$('#screenReport').hidden) renderReport();
  }
}
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('#langBar [data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
}

/* ---------------- posições e táticas ---------------- */
const POS = [
  {id:'GOL', depth:2}, {id:'ZAG', depth:4}, {id:'LAT', depth:4}, {id:'VOL', depth:4},
  {id:'MEI', depth:2}, {id:'PON', depth:3}, {id:'ATA', depth:2}
];
const POSMAP = Object.fromEntries(POS.map(p => [p.id, p]));
const posLabel = id => t('pos.' + id);
/* a sigla curta dos crachás muda de idioma; o id interno (GOL, ZAG…) nunca muda */
const posCode = id => t('code.' + id);
const paisName = nome => { const k = 'pais.' + nome; const v = t(k); return v === k ? nome : v; };
const posPlural = id => t('pos.' + id + '.pl');
const MAX_TRIES = 4;   /* propostas por alvo antes da negociação morrer */

/* x/y em % do campo: y=92 é a própria área, y=15 é a área adversária */
const FORMS = {
  '4-3-3': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'VOL',x:31,y:55},{p:'VOL',x:69,y:55},{p:'MEI',x:50,y:44},
    {p:'PON',x:14,y:25},{p:'ATA',x:50,y:15},{p:'PON',x:86,y:25}
  ],
  '4-4-2': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'PON',x:12,y:46},{p:'VOL',x:37,y:52},{p:'VOL',x:63,y:52},{p:'PON',x:88,y:46},
    {p:'ATA',x:36,y:18},{p:'ATA',x:64,y:18}
  ],
  '4-2-3-1': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'VOL',x:36,y:58},{p:'VOL',x:64,y:58},
    {p:'PON',x:14,y:34},{p:'MEI',x:50,y:37},{p:'MEI',x:86,y:34},
    {p:'ATA',x:50,y:14}
  ],
  '4-1-4-1': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'VOL',x:50,y:61},
    {p:'PON',x:14,y:42},{p:'MEI',x:36,y:45},{p:'MEI',x:64,y:45},{p:'PON',x:86,y:42},
    {p:'ATA',x:50,y:15}
  ],
  '4-4-1-1': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'PON',x:12,y:50},{p:'VOL',x:37,y:54},{p:'VOL',x:63,y:54},{p:'PON',x:88,y:50},
    {p:'MEI',x:50,y:33},
    {p:'ATA',x:50,y:15}
  ],
  '4-2-2-2': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'VOL',x:36,y:58},{p:'VOL',x:64,y:58},
    {p:'MEI',x:20,y:38},{p:'MEI',x:80,y:38},
    {p:'ATA',x:36,y:17},{p:'ATA',x:64,y:17}
  ],
  '4-3-1-2': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'VOL',x:28,y:57},{p:'VOL',x:50,y:60},{p:'VOL',x:72,y:57},
    {p:'MEI',x:50,y:37},
    {p:'ATA',x:36,y:17},{p:'ATA',x:64,y:17}
  ],
  '4-1-2-1-2': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:13,y:72},{p:'ZAG',x:35,y:79},{p:'ZAG',x:65,y:79},{p:'LAT',x:87,y:72},
    {p:'VOL',x:50,y:62},
    {p:'MEI',x:26,y:48},{p:'MEI',x:74,y:48},
    {p:'MEI',x:50,y:35},
    {p:'ATA',x:36,y:17},{p:'ATA',x:64,y:17}
  ],
  '3-5-2': [
    {p:'GOL',x:50,y:91},
    {p:'ZAG',x:28,y:80},{p:'ZAG',x:50,y:82},{p:'ZAG',x:72,y:80},
    {p:'LAT',x:9,y:52},{p:'VOL',x:35,y:57},{p:'VOL',x:65,y:57},{p:'LAT',x:91,y:52},
    {p:'MEI',x:50,y:38},
    {p:'ATA',x:36,y:17},{p:'ATA',x:64,y:17}
  ],
  '3-4-3': [
    {p:'GOL',x:50,y:91},
    {p:'ZAG',x:28,y:80},{p:'ZAG',x:50,y:82},{p:'ZAG',x:72,y:80},
    {p:'LAT',x:9,y:55},{p:'VOL',x:38,y:57},{p:'VOL',x:62,y:57},{p:'LAT',x:91,y:55},
    {p:'PON',x:16,y:26},{p:'ATA',x:50,y:16},{p:'PON',x:84,y:26}
  ],
  '3-4-2-1': [
    {p:'GOL',x:50,y:91},
    {p:'ZAG',x:28,y:80},{p:'ZAG',x:50,y:82},{p:'ZAG',x:72,y:80},
    {p:'LAT',x:9,y:55},{p:'VOL',x:38,y:57},{p:'VOL',x:62,y:57},{p:'LAT',x:91,y:55},
    {p:'MEI',x:29,y:32},{p:'MEI',x:71,y:32},
    {p:'ATA',x:50,y:14}
  ],
  '5-3-2': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:9,y:68},{p:'ZAG',x:27,y:80},{p:'ZAG',x:50,y:82},{p:'ZAG',x:73,y:80},{p:'LAT',x:91,y:68},
    {p:'VOL',x:32,y:55},{p:'MEI',x:50,y:48},{p:'VOL',x:68,y:55},
    {p:'ATA',x:36,y:17},{p:'ATA',x:64,y:17}
  ],
  '5-4-1': [
    {p:'GOL',x:50,y:91},
    {p:'LAT',x:9,y:68},{p:'ZAG',x:27,y:80},{p:'ZAG',x:50,y:82},{p:'ZAG',x:73,y:80},{p:'LAT',x:91,y:68},
    {p:'PON',x:16,y:45},{p:'VOL',x:38,y:52},{p:'VOL',x:62,y:52},{p:'PON',x:84,y:45},
    {p:'ATA',x:50,y:15}
  ]
};
/* quanto o jogador perde de overall jogando fora da posição de origem */
const COMPAT = {
  GOL:{GOL:0},
  ZAG:{ZAG:0, LAT:4, VOL:5},
  LAT:{LAT:0, ZAG:4, PON:5, VOL:6},
  VOL:{VOL:0, MEI:3, ZAG:5, LAT:6},
  MEI:{MEI:0, VOL:3, PON:4, ATA:5},
  PON:{PON:0, MEI:4, ATA:4, LAT:6},
  ATA:{ATA:0, PON:4, MEI:5}
};
/* lateral e ponta jogam num corredor; o resto do time joga pelo meio */
const SIDED = { LAT:1, PON:1 };
const SIDE_PEN = 3;   /* quanto custa jogar no corredor trocado */
const ROLE_PEN = 1;   /* quanto custa jogar na função secundária que ele já faz */
/* o lado de cada vaga sai da posição dela no campo */
Object.values(FORMS).forEach(f => f.forEach(s => {
  s.side = SIDED[s.p] ? (s.x < 45 ? 'E' : s.x > 55 ? 'D' : 'C') : 'C';
}));
function sideName(pos, side){ return SIDED[pos] && side && side !== 'C' ? t('side.' + pos + '.' + side) : posLabel(pos); }
function posName(p){ return sideName(p.pos, p.side); }
function slotName(s){ return sideName(s.p, s.side); }
/* quem joga num corredor só tem sigla própria no padrão FIFA (LD, PE, ME…); os dois lados
   continuam na sigla base com o lado no crachá */
function codeParts(pos, side){
  const lado = SIDED[pos] && side && side !== 'C' ? side : '';
  if (lado && lado !== 'A'){
    const k = 'code.' + pos + '.' + lado, v = t(k);
    if (v !== k) return [v, ''];
  }
  return [posCode(pos), lado === 'A' ? 'E/D' : lado];
}
function posPlain(p){ const [c, s] = codeParts(p.pos, p.side); return c + (s ? ' ' + s : ''); }
function slotPlain(s){ const [c, d] = codeParts(s.p, s.side); return c + (d ? ' ' + d : ''); }
function posTag(p){ const [c, s] = codeParts(p.pos, p.side); return c + (s ? '<i class="sd">' + s + '</i>' : ''); }
function slotTag(s){ const [c, d] = codeParts(s.p, s.side); return c + (d ? '<i class="sd">' + d + '</i>' : ''); }
function rolesTag(p){ return (p.roles && p.roles.length) ? t('roles.also', { list:p.roles.join('/') }) : ''; }
/* quem cobre aquele corredor: o do lado certo e o que joga dos dois */
function cobreLado(p, lado){ return !SIDED[p.pos] || !p.side || p.side === 'A' || p.side === lado; }

function slotsOf(pos){ return (FORMS[G.form] || FORMS['4-3-3']).filter(s => s.p === pos).length; }
function formSlots(){ return FORMS[G.form] || FORMS['4-3-3']; }
function penalty(slotPos, playerPos){
  const v = (COMPAT[slotPos] || {})[playerPos];
  if (v !== undefined) return v;
  return (slotPos === 'GOL' || playerPos === 'GOL') ? 15 : 9;
}
const asSlot = s => typeof s === 'string' ? { p:s, side:'C' } : s;
/* o desconto real de escalar alguém numa vaga: posição de origem, função secundária e corredor */
function fitPenalty(p, slot){
  if (!p) return 0;
  const s = asSlot(slot);
  let v = p.pos === s.p ? 0
        : (p.roles && p.roles.includes(s.p)) ? ROLE_PEN
        : penalty(s.p, p.pos);
  if (SIDED[s.p] && s.side !== 'C' && !cobreLado(p, s.side)) v += SIDE_PEN;
  return v;
}
function effOvr(p, slot){ return p ? p.ovr - fitPenalty(p, slot) : 42; }

const LIGAS = window.LIGAS || [];
const ALL_CLUBS = [];
LIGAS.forEach(l => l.clubes.forEach(c => { c.liga = l; ALL_CLUBS.push(c); }));

/* ---------------- valores ---------------- */
function valueOf(ovr, age, pot){
  let v = 0.34e6 * Math.pow(1.163, ovr - 50);
  const af = age <= 20 ? 1.55 : age <= 23 ? 1.35 : age <= 26 ? 1.15 : age <= 29 ? .95 : age <= 32 ? .62 : .35;
  v *= af * (1 + (pot - ovr) * .035);
  return Math.max(2e5, Math.round(v / 1e5) * 1e5);
}
function wageOf(ovr, age){
  const w = 3200 * Math.pow(1.125, ovr - 55) * (age >= 31 ? 1.12 : 1);
  return Math.max(4000, Math.round(w / 1000) * 1000);
}
function potOf(ovr, age){
  return clamp(ovr + (age <= 20 ? ri(5, 13) : age <= 23 ? ri(2, 9) : age <= 26 ? ri(0, 4) : 0), ovr, 94);
}
function money(v){
  v = Math.round(v);
  if (v <= 0) return '€ 0';
  if (v >= 1e6) return '€ ' + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace('.', t('num.dec')) + t('num.mi');
  return '€ ' + Math.round(v / 1e3) + t('num.mil');
}
function wageFmt(v){ return t('wage.fmt', { n: Math.round(v / 1e3) }); }
function anos(n){ return n === 1 ? t('years.one') : t('years.n', { n }); }

/* ---------------- jogadores ---------------- */
let UID = 1;
function hashName(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry(a){
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/* lado do campo e funções secundárias. No jogador real o sorteio sai do nome:
   o mesmo atleta é o mesmo jogador em toda partida. */
function traitsOf(pos, seed, forceSide){
  const r = seed == null ? Math.random : mulberry(seed);
  const q = r();
  const side = SIDED[pos] ? (forceSide || (q < .42 ? 'E' : q < .88 ? 'D' : 'A')) : null;
  const opts = Object.keys(COMPAT[pos] || {}).filter(k => k !== pos && COMPAT[pos][k] <= 5);
  const n = r() < .11 ? 2 : r() < .5 ? 1 : 0;
  const roles = [];
  for (let i = 0; i < n && opts.length; i++) roles.push(opts.splice(Math.floor(r() * opts.length), 1)[0]);
  return { side, roles };
}
/* quem faz mais de uma função vale mais: é uma vaga a mais coberta no mesmo contrato */
function versatilidade(tr){ return 1 + tr.roles.length * .04 + (tr.side === 'A' ? .02 : 0); }
function realPlayer(row, club){
  const [name, pos, age, ovr, side] = row;
  const pot = potOf(ovr, age);
  const tr = traitsOf(pos, hashName(name + pos), side);
  return { id:UID++, pos, name, age, ovr, pot, side:tr.side, roles:tr.roles,
    value:Math.round(valueOf(ovr, age, pot) * versatilidade(tr) / 1e5) * 1e5, wage:wageOf(ovr, age),
    club:club.n, clubLvl:club.lvl, liga:club.liga.nome, real:true, attempts:0, gone:false };
}
function fakePlayer(posId, ovr, opts = {}){
  ovr = clamp(Math.round(ovr), 52, 90);
  const age = opts.age ?? (Math.random() < .35 ? ri(18, 22) : Math.random() < .7 ? ri(23, 28) : ri(29, 34));
  const pot = potOf(ovr, age);
  const pool = window.NOMES[opts.pool] || window.NOMES.BRA;
  const tr = traitsOf(posId, null, opts.side);
  return { id:UID++, pos:posId, name:pick(pool.f) + ' ' + pick(pool.s), age, ovr, pot, side:tr.side, roles:tr.roles,
    value:Math.round(valueOf(ovr, age, pot) * versatilidade(tr) / 1e5) * 1e5, wage:wageOf(ovr, age),
    club:opts.club ?? t('club.none'), liga:opts.liga ?? '—', attempts:0, gone:false };
}
/* o quanto o jogador é grande demais para o seu clube: overall acima do nível do elenco
   mais um empurrão pelo tamanho do clube que o tem hoje */
function appealGap(p, lvl, myLvl){
  const my = myLvl ?? lvl;
  return (p.ovr - my) + Math.max(0, (p.clubLvl || 0) - my) * .45;
}
function reachOf(p){
  const a = appealGap(p, G.lvl);
  return a > 7 ? 'fora' : a > 3 ? 'dificil' : 'ok';
}
/* cada etiqueta é só o id; o texto sai do dicionário na hora de desenhar */
function tagsOf(p, lvl){
  const out = [];
  const r = reachOf(p);
  if (r === 'fora') out.push(['out']);
  else if (r === 'dificil') out.push(['hard']);
  if (p.free) out.push(['free']);
  if (p.age <= 21 && p.pot - p.ovr >= 7) out.push(['gem']);
  if (p.ovr >= lvl + 6) out.push(['star']);
  if (p.age >= 33) out.push(['vet']);
  if ((p.roles || []).length >= 2) out.push(['multi']);
  return out;
}

/* ---------------- escalação ---------------- */
function bestXI(squad){
  const slots = formSlots();
  const used = new Set();
  const line = new Array(slots.length).fill(null);
  /* vaga mais difícil de preencher primeiro: conta quem serve na posição e no corredor */
  const order = slots.map((s, i) => ({ i, s, cnt: squad.filter(p => fitPenalty(p, s) === 0).length }))
                     .sort((a, b) => a.cnt - b.cnt);
  for (const { i, s } of order){
    let best = null, bv = -1;
    for (const p of squad){
      if (used.has(p.id)) continue;
      const v = effOvr(p, s);
      if (v > bv){ bv = v; best = p; }
    }
    if (best){ line[i] = best.id; used.add(best.id); }
  }
  return line;
}
function lineupRating(line, squad){
  const sq = squad || G.squad, slots = formSlots();
  let sum = 0;
  for (let i = 0; i < slots.length; i++){
    const p = sq.find(x => x.id === line[i]);
    sum += p ? effOvr(p, slots[i]) : 42;
  }
  return sum / slots.length;
}
function cleanLineup(){
  G.lineup = G.lineup.map(id => (id && G.squad.some(p => p.id === id)) ? id : null);
}
function fillEmpty(){
  const slots = formSlots();
  for (let i = 0; i < slots.length; i++){
    if (G.lineup[i]) continue;
    const used = new Set(G.lineup.filter(Boolean));
    let best = null, bv = -1;
    for (const p of G.squad){
      if (used.has(p.id)) continue;
      const v = effOvr(p, slots[i]);
      if (v > bv){ bv = v; best = p; }
    }
    G.lineup[i] = best ? best.id : null;
  }
}
function autoPlace(p){
  const slots = formSlots();
  let bi = -1, gain = 0.5;
  for (let i = 0; i < slots.length; i++){
    const cur = G.squad.find(x => x.id === G.lineup[i]);
    const g = effOvr(p, slots[i]) - effOvr(cur, slots[i]);
    if (g > gain){ gain = g; bi = i; }
  }
  if (bi < 0) return null;
  G.lineup[bi] = p.id;
  return slotPlain(slots[bi]);
}
function benchList(){
  const inXI = new Set(G.lineup.filter(Boolean));
  const ord = POS.map(p => p.id);
  return G.squad.filter(p => !inXI.has(p.id))
    .sort((a, b) => ord.indexOf(a.pos) - ord.indexOf(b.pos) || b.ovr - a.ovr);
}

/* a carência é medida contra o que falta para a posição alcançar o nível do elenco:
   um buraco de 6 pontos pede 6 pontos de reforço, um de 2 pede 2. Antes tudo pedia 5,
   e posição quase resolvida ficava impossível de fechar. */
function needTarget(pos){
  const base = G.baseStrength[pos];
  return clamp(G.lvl + .5, base + 1.5, base + 7);
}
function needGap(pos){ return needTarget(pos) - G.baseStrength[pos]; }
function needProgress(pos){
  return clamp((posStrength(G.squad, pos) - G.baseStrength[pos]) / needGap(pos), 0, 1);
}
function needState(pos){
  const n = G.needs[pos];
  if (n === 'ok') return 'ok';
  return needProgress(pos) >= 1 ? 'done' : n;
}
/* a força da posição preenche as vagas reais do esquema: dois laterais direitos
   e nenhum esquerdo deixam um corredor descoberto, e a conta mostra isso */
function posStrength(squad, posId){
  const cands = squad.filter(x => x.pos === posId);
  const slots = formSlots().filter(s => s.p === posId);
  if (!slots.length){
    const best = cands.slice().sort((a, b) => b.ovr - a.ovr)[0];
    return best ? best.ovr : 42;
  }
  const ordem = slots.slice().sort((a, b) =>
    cands.filter(p => fitPenalty(p, a) === 0).length - cands.filter(p => fitPenalty(p, b) === 0).length);
  const used = new Set();
  let s = 0;
  for (const slot of ordem){
    let best = null, bv = -1;
    for (const p of cands){
      if (used.has(p.id)) continue;
      const v = effOvr(p, slot);
      if (v > bv){ bv = v; best = p; }
    }
    if (best){ used.add(best.id); s += bv; } else s += 42;
  }
  return s / slots.length;
}
function buildSquad(club){
  const squad = (club.p || []).map(r => realPlayer(r, club));
  for (const pos of POS){
    let have = squad.filter(x => x.pos === pos.id).length;
    while (have < pos.depth){
      const base = have < 2 ? club.lvl - ri(1, 5) : club.lvl - ri(5, 11);
      squad.push(fakePlayer(pos.id, base, { club:club.n, liga:club.liga.nome, pool:club.liga.nomes }));
      have++;
    }
  }
  /* nenhum elenco abre a janela sem gente para um dos corredores */
  for (const pos of POS){
    if (!SIDED[pos.id]) continue;
    for (const lado of ['E', 'D']){
      if (squad.some(x => x.pos === pos.id && cobreLado(x, lado))) continue;
      squad.push(fakePlayer(pos.id, club.lvl - ri(3, 9),
        { club:club.n, liga:club.liga.nome, pool:club.liga.nomes, side:lado }));
    }
  }
  return squad;
}
/* mercado aberto: todo jogador de todo clube que nao seja o seu aceita ouvir proposta */
function buildMarket(my){
  const market = [];
  for (const c of ALL_CLUBS){
    if (c === my) continue;
    for (const r of (c.p || [])) market.push(realPlayer(r, c));
  }
  for (let i = 0; i < 14; i++){
    const p = fakePlayer(pick(POS).id, my.lvl - ri(0, 7), { age:ri(29, 35), pool:my.liga.nomes });
    p.free = true; p.value = Math.round(p.value * .6 / 1e5) * 1e5;
    market.push(p);
  }
  for (const p of market){
    const gap = appealGap(p, my.lvl);
    const prem = gap > 3 ? 1 + (Math.min(gap, 7) - 3) * .12 : 1;   /* até +48% para alvo de outro patamar */
    p.demand = p.free ? 0 : rnd(.86, 1.18) * prem;
    p.feeAsk = p.free ? 0 : Math.round(p.value * p.demand / 1e5) * 1e5;
    p.wageAsk = Math.round(p.wage * (1 + Math.max(0, p.ovr - my.lvl) * .03) * prem * (p.free ? 1.2 : 1) / 1000) * 1000;
  }
  return market;
}

/* ---------------- estado ---------------- */
let G = null;
function recomputeBaseline(){
  G.baseXI = lineupRating(bestXI(G.squad0), G.squad0);
  G.baseStrength = Object.fromEntries(POS.map(p => [p.id, posStrength(G.squad0, p.id)]));
  const needs = {};
  for (const p of POS){
    if (!slotsOf(p.id)){ needs[p.id] = 'ok'; continue; }
    const gap = G.lvl - posStrength(G.squad0, p.id);
    needs[p.id] = gap >= 4 ? 'crit' : gap >= 1.8 ? 'soft' : 'ok';
  }
  if (!POS.some(p => needs[p.id] !== 'ok')){
    POS.filter(p => slotsOf(p.id)).map(p => ({ id:p.id, g:posStrength(G.squad0, p.id) }))
      .sort((a, b) => a.g - b.g).slice(0, 2).forEach(x => { needs[x.id] = 'soft'; });
  }
  G.needs = needs;
  if (!G.goals || !G.signings.length) G.goals = goalPlan();
}

/* ---------------- metas do conselho ---------------- */
/* a diretoria não pede "faça uma boa janela": ela pede coisa contável, com número e prazo.
   São quatro metas, valem 26 pontos e dão crédito proporcional ao que já foi cumprido. */
const GOAL_PTS = [9, 7, 6, 4];
function goalPlan(){
  const sev = { crit:0, soft:1 };
  const alvos = POS.filter(p => G.needs[p.id] !== 'ok' && slotsOf(p.id))
    .sort((a, b) => (sev[G.needs[a.id]] - sev[G.needs[b.id]]) || (needGap(b.id) - needGap(a.id)));
  const gs = [];
  const p1 = alvos[0];
  if (p1) gs.push({ kind:'sign', pos:p1.id, n: slotsOf(p1.id) >= 2 ? 2 : 1 });
  const p2 = alvos[1] || p1;
  if (p2) gs.push({ kind:'pos', pos:p2.id, alvo: Math.round(needTarget(p2.id) * 10) / 10 });
  gs.push({ kind:'xi', alvo: Math.round((G.baseXI + 1.4) * 10) / 10 });
  gs.push(goalExtra());
  gs.forEach((g, i) => { g.pts = GOAL_PTS[i]; });
  return gs;
}
function goalExtra(){
  const opts = [];
  const raso = POS.filter(p => slotsOf(p.id) && G.squad.filter(x => x.pos === p.id).length <= slotsOf(p.id));
  if (raso.length){
    const p = raso[0], have = G.squad.filter(x => x.pos === p.id).length;
    opts.push({ kind:'depth', pos:p.id, de:have, n:have + 1 });
  }
  opts.push({ kind:'jovem', n:1, idade:23, pot:Math.min(88, G.lvl + 5) });
  opts.push({ kind:'venda', alvo: Math.round(G.budget0 * .18 / 1e5) * 1e5 });
  opts.push({ kind:'gasto', alvo: Math.round(G.budget0 * .45 / 1e5) * 1e5 });
  return pick(opts);
}
function goalProgress(g){
  switch (g.kind){
    case 'sign':  return clamp(G.signings.filter(s => s.pos === g.pos).length / g.n, 0, 1);
    case 'pos':   return clamp((posStrength(G.squad, g.pos) - G.baseStrength[g.pos]) /
                               Math.max(g.alvo - G.baseStrength[g.pos], .1), 0, 1);
    case 'xi':    return clamp((lineupRating(G.lineup) - G.baseXI) / Math.max(g.alvo - G.baseXI, .1), 0, 1);
    case 'depth': return clamp((G.squad.filter(x => x.pos === g.pos).length - g.de) / Math.max(g.n - g.de, 1), 0, 1);
    case 'jovem': return clamp(G.signings.filter(s => s.age <= g.idade && s.pot >= g.pot).length / g.n, 0, 1);
    case 'venda': return clamp(G.sales.reduce((a, s) => a + s.fee, 0) / g.alvo, 0, 1);
    case 'gasto': return clamp(G.signings.reduce((a, s) => a + costOf(s), 0) / g.alvo, 0, 1);
  }
  return 0;
}
function goalText(g){
  switch (g.kind){
    case 'sign':  return g.n > 1 ? t('goal.sign', { n:g.n, pos:posPlural(g.pos) })
                                 : t('goal.sign.one', { pos:posLabel(g.pos).toLowerCase() });
    case 'pos':   return t('goal.pos', { pos:posLabel(g.pos).toLowerCase(), v:dec(g.alvo) });
    case 'xi':    return t('goal.xi', { v:dec(g.alvo) });
    case 'depth': return t('goal.depth', { n:g.n, pos:posPlural(g.pos) });
    case 'jovem': return t('goal.jovem', { age:g.idade, pot:g.pot });
    case 'venda': return t('goal.venda', { v:money(g.alvo) });
    case 'gasto': return t('goal.gasto', { v:money(g.alvo) });
  }
  return '';
}
function goalNow(g){
  switch (g.kind){
    case 'sign':  return t('goalnow.sign', { a:G.signings.filter(s => s.pos === g.pos).length, b:g.n });
    case 'pos':   return t('goalnow.pos', { now:dec(posStrength(G.squad, g.pos)), base:dec(G.baseStrength[g.pos]) });
    case 'xi':    return t('goalnow.xi', { now:dec(lineupRating(G.lineup)), base:dec(G.baseXI) });
    case 'depth': return t('goalnow.depth', { n:G.squad.filter(x => x.pos === g.pos).length, alvo:g.n });
    case 'jovem': return t('goalnow.sign', { a:G.signings.filter(s => s.age <= g.idade && s.pot >= g.pot).length, b:g.n });
    case 'venda': return t('goalnow.money', { a:money(G.sales.reduce((a, s) => a + s.fee, 0)), b:money(g.alvo) });
    case 'gasto': return t('goalnow.money', { a:money(G.signings.reduce((a, s) => a + costOf(s), 0)), b:money(g.alvo) });
  }
  return '';
}
/* ---------------- modos ---------------- */
const MODES = {
  facil:   { rerolls:0, escolhe:true,  aporte:true },
  dificil: { rerolls:3, escolhe:false, aporte:false },
  expert:  { rerolls:0, escolhe:false, aporte:false, sorteiaLiga:true }
};
const modeName = id => t('mode.' + id + '.n');
const modeDesc = id => t('mode.' + id + '.d');
/* as incorporações do modo fácil: cada investidor põe o dinheiro em um lugar diferente:
   caixa compra passe, teto salarial banca folha. Escolher é escolher que tipo de janela fazer. */
const APORTES = [
  { id:'nenhum', caixa:1,    teto:1 },
  { id:'fundo',  caixa:1.9,  teto:1 },
  { id:'socio',  caixa:1.5,  teto:1.15 },
  { id:'patroc', caixa:1.15, teto:1.4 }
];
const apName = id => t('ap.' + id + '.n');
const apDesc = id => t('ap.' + id + '.d');
const APMAP = Object.fromEntries(APORTES.map(a => [a.id, a]));
let APORTE = 'nenhum';
let MODE = 'dificil';
let REROLLS = MODES[MODE].rerolls;

function newGame(ligaId, clubeNome, aporteId){
  const ap = APMAP[aporteId] || APMAP.nenhum;
  const pool = ligaId ? ALL_CLUBS.filter(c => c.liga.id === ligaId) : ALL_CLUBS;
  const c = (clubeNome && pool.find(x => x.n === clubeNome)) || pick(pool);
  const squad = buildSquad(c);
  const wages = squad.reduce((s, p) => s + p.wage, 0);
  /* caixa ancorado no que custa um reforço de dois pontos acima do elenco: ~3 alvos por janela */
  const base = Math.round(clamp(2.0 * valueOf(c.lvl + 2, 26, c.lvl + 4), 1e7, 2.4e8) / 1e5) * 1e5;
  const budget = Math.round(base * ap.caixa / 1e5) * 1e5;
  const tetoBase = Math.round(wages * rnd(1.3, 1.58) / 1000) * 1000;
  const teto = Math.round(tetoBase * ap.teto / 1000) * 1000;

  G = {
    club: c, lvl: c.lvl, squad, squad0: squad.slice(), market: buildMarket(c),
    form: '4-3-3', lineup: [],
    money: budget, budget0: budget,
    wageCap: teto,
    wages, day: 1, maxDays: 18,
    mode: MODE, aporte: ap.id === 'nenhum' ? null : ap,
    aporteCaixa: budget - base, aporteTeto: teto - tetoBase,
    signings: [], sales: [], feed: [], watch: [], over: false
  };
  G.lineup = bestXI(squad);
  initFeeRange();
  recomputeBaseline();
  news(t('news.open', { club:c.n, cash:money(G.money), days:G.maxDays }), '');
  if (G.aporte) news(t('news.ap', { n:apName(G.aporte.id),
    cash: G.aporteCaixa ? t('news.ap.cash', { v:money(G.aporteCaixa) }) : t('news.ap.cash.none'),
    cap: G.aporteTeto ? t('news.ap.cap', { v:wageFmt(teto) }) : t('news.ap.cap.same') }), 'good');
  return G;
}
function dificuldade(){
  const k = G.lvl >= 83 ? 'dif.alta' : G.lvl >= 76 ? 'dif.media' : 'dif.baixa';
  return [t(k), t(k + '.txt')];
}

/* ---------------- notícias ---------------- */
function news(text, kind){
  G.feed.unshift({ d:'D' + G.day, text, kind: kind || '' });
  if (G.feed.length > 40) G.feed.pop();
}
function tickDay(){
  if (G.over) return;
  G.day++;
  if (G.day > G.maxDays){
    G.day = G.maxDays;
    news(t('news.gong'), 'rival');
    closeWindow();
    return;
  }
  if (Math.random() < .28){
    const live = G.market.filter(p => !p.gone && !p.free).sort((a, b) => b.ovr - a.ovr).slice(0, 120);
    if (live.length){
      const alvo = pick(live);
      alvo.gone = true;
      let rival = pick(ALL_CLUBS);
      if (rival === G.club) rival = pick(ALL_CLUBS);
      news(t('news.rival', { name:esc(alvo.name), pos:posPlain(alvo), ovr:alvo.ovr, club:esc(rival.n) }) +
        (observado(alvo.id) ? t('news.rival.watch') : ''), 'rival');
    }
  }
  if (G.day === G.maxDays) news(t('news.lastday'), 'rival');
  renderAll();
}

/* ---------------- avaliação ---------------- */
/* o que a contratação custou de verdade: taxa + luvas + comissão do empresário */
function costOf(s){ return s.fee + (s.signBonus || 0) + (s.agentFee || 0); }
/* contrato longo para quem tem estrada pela frente é projeto; para veterano é conta pendurada */
function yearsFit(age, years){
  const y = years || 3;
  return age <= 24 ? clamp((y - 1) / 4, 0, 1)
       : age <= 29 ? (y >= 3 && y <= 4 ? 1 : y === 5 ? .7 : .5)
       : clamp((4 - y) / 3, 0, 1);
}
function evaluate(){
  const s = G.signings;
  const xi = lineupRating(G.lineup);
  const delta = xi - G.baseXI;
  const spend = s.reduce((a, x) => a + costOf(x), 0);
  const valueIn = s.reduce((a, x) => a + x.value, 0);
  const comps = [];

  const gp = G.goals.map(g => ({ g, p:goalProgress(g) }));
  const c0 = gp.reduce((a, x) => a + x.p * x.g.pts, 0);
  const feitas = gp.filter(x => x.p >= 1).length;
  comps.push({ k:t('comp.goals'), v:c0, max:26,
    note: t('comp.goals.note', { n:feitas, t:G.goals.length,
      p:Math.round(gp.reduce((a, x) => a + x.p, 0) / G.goals.length * 100) }) });

  const c1 = clamp(delta / 1.8, 0, 1) * 20;
  comps.push({ k:t('comp.xi'), v:c1, max:20,
    note: t('comp.xi.note', { d:(delta >= 0 ? '+' : '') + delta.toFixed(2), form:G.form }) });

  let wSum = 0, wGot = 0;
  for (const p of POS){
    const w = G.needs[p.id] === 'crit' ? 1 : G.needs[p.id] === 'soft' ? .5 : 0;
    if (!w) continue;
    wSum += w;
    wGot += w * needProgress(p.id);
  }
  const c2 = wSum ? (wGot / wSum) * 20 : 20;
  comps.push({ k:t('comp.needs'), v:c2, max:20,
    note: wSum ? t('comp.needs.note', { p:Math.round((wGot / wSum) * 100) }) : t('comp.needs.none') });

  let c3;
  if (!s.length) c3 = 2;
  else { const ratio = valueIn / Math.max(spend, 1e5); c3 = clamp((ratio - .72) / .43, 0, 1) * 14; }
  comps.push({ k:t('comp.value'), v:c3, max:14,
    note: s.length ? t('comp.value.note', { spend:money(spend), value:money(valueIn) }) : t('comp.value.none') });

  let c4 = 0;
  if (s.length){
    const avg = s.reduce((a, x) => a + clamp((x.pot - x.ovr) / 5, 0, 1) * .40 +
      clamp((33 - x.age) / 11, 0, 1) * .36 + yearsFit(x.age, x.years) * .24, 0) / s.length;
    c4 = avg * 10;
  }
  comps.push({ k:t('comp.future'), v:c4, max:10,
    note: s.length ? t('comp.future.note', {
      age: dec(s.reduce((a, x) => a + x.age, 0) / s.length),
      y: dec(s.reduce((a, x) => a + (x.years || 3), 0) / s.length) }) : t('comp.future.none') });

  let c5 = 0;
  if (G.wages <= G.wageCap) c5 += 6;
  const usage = 1 - G.money / Math.max(G.budget0, 1);
  c5 += clamp(usage / .45, 0, 1) * 4;
  comps.push({ k:t('comp.money'), v:c5, max:10,
    note: t('comp.money.note', { a:t(G.wages <= G.wageCap ? 'comp.money.ok' : 'comp.money.bad'),
      p:Math.round(usage * 100) }) });

  const pen = [];
  const vagas = G.lineup.filter(x => !x).length;
  if (vagas) pen.push({ k: vagas > 1 ? t('pen.vagas', { n:vagas }) : t('pen.vagas.one'), v:-6 * vagas });
  /* quem está na própria função secundária não conta como improviso; corredor trocado conta */
  const fora = G.lineup.reduce((a, id, i) => {
    const p = G.squad.find(x => x.id === id);
    return a + (p && fitPenalty(p, formSlots()[i]) > ROLE_PEN ? 1 : 0);
  }, 0);
  if (fora >= 3) pen.push({ k:t('pen.outpos', { n:fora }), v:-4 });
  for (const p of POS){
    const need = slotsOf(p.id);
    const have = G.squad.filter(x => x.pos === p.id).length;
    if (have < need) pen.push({ k:t('pen.nosquad', { pos:posLabel(p.id) }), v:-7 * (need - have) });
    if (!SIDED[p.id]) continue;
    for (const lado of ['E', 'D']){
      if (!formSlots().some(s => s.p === p.id && s.side === lado)) continue;
      if (!G.squad.some(x => x.pos === p.id && cobreLado(x, lado)))
        pen.push({ k:t('pen.noside', { pos:sideName(p.id, lado).toLowerCase() }), v:-4 });
    }
  }
  const quebradas = s.filter(x => (x.role === 'estrela' || x.role === 'titular') && !G.lineup.includes(x.id));
  if (quebradas.length) pen.push({ k:t('pen.promise', { names:quebradas.map(x => x.name.split(' ').pop()).join(', ') }),
    v:-Math.min(12, 4 * quebradas.length) });
  const baratas = s.filter(x => x.clause > 0 && x.clause <= 2 && x.ovr >= G.lvl + 2);
  if (baratas.length) pen.push({ k: baratas.length > 1 ? t('pen.clause', { n:baratas.length }) : t('pen.clause.one'),
    v:-Math.min(9, 3 * baratas.length) });
  if (s.length > 9) pen.push({ k:t('pen.bloat', { n:s.length }), v:-5 });
  if (G.wages > G.wageCap) pen.push({ k:t('pen.wagecap'), v:-10 });
  if (!s.length && G.day > 1) pen.push({ k:t('pen.nosign'), v:-8 });

  const total = clamp(comps.reduce((a, c) => a + c.v, 0) + pen.reduce((a, c) => a + c.v, 0), 0, 100);
  return { comps, pen, total, delta, xi, spend, valueIn, goals:gp, feitas };
}
function gradeOf(t){
  return t >= 90 ? 'A+' : t >= 82 ? 'A' : t >= 75 ? 'B+' : t >= 68 ? 'B'
       : t >= 60 ? 'C+' : t >= 52 ? 'C' : t >= 42 ? 'D' : t >= 30 ? 'E' : 'F';
}
function gradeColor(t){ return t >= 68 ? 'var(--pos)' : t >= 52 ? 'var(--amber)' : 'var(--neg)'; }

/* ---------------- render ---------------- */
function renderIntro(){
  const c = G.club;
  $('#fForm').value = G.form;
  const ini = c.n.replace(/^(FC|AC|AS|SC|RC|AJ|OGC|KV|KAA|KRC|RB|VfB|VfL|TSG|1\.)\s+/, '')
               .split(/[\s-]/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const needList = POS.filter(p => G.needs[p.id] !== 'ok')
    .map(p => posLabel(p.id).toLowerCase() + (G.needs[p.id] === 'crit' ? t('need.crit.suffix') : ''));
  const [dif, difTxt] = dificuldade();
  const reais = (c.p || []).length;
  $('#dossier').innerHTML =
    '<div class="hd"><span class="t">' + t('dossier.hd') + '</span><span class="t">' + esc(c.liga.nome) + ' · ' + esc(paisName(c.liga.pais)) + '</span></div>' +
    '<div class="club-line">' +
      '<div class="crest" style="background:' + c.c1 + ';color:' + c.c2 + '">' + ini + '</div>' +
      '<div><h2>' + esc(c.n) + '</h2><div class="sub">' +
        t('dossier.clubline', { cid:esc(c.cid), lvl:c.lvl, dif:dif.toLowerCase() }) + '</div></div>' +
    '</div>' +
    '<div class="dgrid">' +
      '<div><div class="k">' + t('dossier.cash') + '</div><div class="v" style="color:var(--amber)">' + money(G.money) + '</div></div>' +
      '<div><div class="k">' + t('dossier.wageroom') + '</div><div class="v">' + wageFmt(G.wageCap - G.wages) + '</div></div>' +
      '<div><div class="k">' + t('dossier.xi', { form:G.form }) + '</div><div class="v">' + G.baseXI.toFixed(1) + '</div></div>' +
      '<div><div class="k">' + t('dossier.squad') + '</div><div class="v">' + G.squad.length + '</div></div>' +
    '</div>' +
    '<div class="board"><div class="k">' + t('dossier.mode', { mode:modeName(MODE).toLowerCase() }) + '</div><p>' + modeDesc(MODE) +
      (MODE === 'dificil' ? ' <b>' + (REROLLS ? (REROLLS > 1 ? t('dossier.rerolls', { n:REROLLS }) : t('dossier.rerolls.one'))
                                              : t('dossier.rerolls.none')) + '.</b>' : '') +
      (G.aporte ? ' <b>' + apName(G.aporte.id) + ':</b> ' +
        (G.aporteCaixa ? t('dossier.ap.cash', { v:money(G.aporteCaixa) }) : t('dossier.ap.cash.same')) + ' ' + t('and') + ' ' +
        (G.aporteTeto ? t('dossier.ap.cap', { v:wageFmt(G.aporteTeto) }) : t('dossier.ap.cap.same')) + '.' : '') + '</p></div>' +
    '<div class="board"><div class="k">' + t('dossier.market') + '</div><p>' +
      t('dossier.market.p', { dif:dif.toLowerCase(), txt:difTxt }) + '</p></div>' +
    '<div class="board" style="background:var(--panel)"><div class="k">' + t('dossier.goals') + '</div>' +
      '<p>' + G.goals.map(g => goalText(g) + ' <span style="color:var(--dim)">' + t('dossier.pts', { n:g.pts }) + '</span>').join('<br>') + '</p></div>' +
    '<div class="board" style="background:var(--panel)"><div class="k">' + t('dossier.scout') + '</div>' +
      '<p>' + t('dossier.scout.p', { list:needList.length ? needList.join(', ') : t('dossier.scout.none') }) + '<br>' +
      '<span style="color:var(--dim);font-size:12px">' + t('dossier.scout.base', { n:reais }) + '</span></p></div>';
}
function renderHud(){
  const ev = evaluate();
  $('#hud').hidden = false;
  $('#hud').innerHTML =
    '<div class="cell"><div class="k">' + t('hud.day') + '</div><div class="v">' + G.day + '<span style="color:var(--dim);font-size:12px">/' + G.maxDays + '</span></div></div>' +
    '<div class="cell"><div class="k">' + t('hud.cash') + '</div><div class="v amber">' + money(G.money) + '</div></div>' +
    '<div class="cell"><div class="k">' + t('hud.wageroom') + '</div><div class="v ' + (G.wages > G.wageCap ? 'neg' : 'pos') + '">' + wageFmt(G.wageCap - G.wages) + '</div></div>' +
    '<div class="cell"><div class="k">' + t('hud.grade') + '</div><div class="v" style="color:' + gradeColor(ev.total) + '">' + gradeOf(ev.total) + '</div></div>';
  $('#topTag').textContent = t('hud.tag', { club:G.club.n, liga:G.club.liga.nome, mode:modeName(G.mode).toLowerCase() });
}
function renderTicker(){
  $('#tickerBar').hidden = false;
  $('#tickerRun').innerHTML = G.feed.slice(0, 8)
    .map(f => '&nbsp;&nbsp;&nbsp;' + esc(f.text.replace(/<[^>]+>/g, '')) + '&nbsp;&nbsp;&nbsp;•').join('');
}
function renderSquad(){
  const rows = [];
  for (const p of POS){
    const list = G.squad.filter(x => x.pos === p.id).sort((a, b) => b.ovr - a.ovr);
    const now = posStrength(G.squad, p.id), d = now - G.baseStrength[p.id];
    const cls = G.needs[p.id] === 'crit' ? 'crit' : G.needs[p.id] === 'soft' ? 'soft' : 'ok';
    const vagas = slotsOf(p.id);
    const lados = SIDED[p.id]
      ? ' (' + list.filter(x => cobreLado(x, 'E')).length + 'E/' + list.filter(x => cobreLado(x, 'D')).length + 'D)'
      : '';
    rows.push('<div class="srow">' +
      '<div class="pos ' + cls + '">' + posCode(p.id) + '</div>' +
      '<div class="nm"><b>' + (list[0] ? esc(list[0].name) : '<span style="color:var(--neg)">' + t('squad.empty') + '</span>') + '</b>' +
        '<small>' + t('squad.group', { n:list.length }) + lados + ' · ' +
        (vagas ? (vagas > 1 ? t('squad.slots', { n:vagas }) : t('squad.slots.one')) : t('squad.noslot')) + '</small></div>' +
      '<div class="ovr">' + now.toFixed(0) +
        (Math.abs(d) >= .5 ? '<small class="' + (d < 0 ? 'neg' : '') + '">' + (d > 0 ? '+' : '') + d.toFixed(1) + '</small>' : '') +
      '</div></div>');
  }
  $('#squadList').innerHTML = rows.join('');
  $('#squadCount').textContent = t('squad.count', { n:G.squad.length });

  const xi = lineupRating(G.lineup);
  $('#formLabel').textContent = G.form;
  $('#xiNow').textContent = xi.toFixed(1);
  $('#xiBar').style.width = clamp((xi - 50) / 40 * 100, 3, 100) + '%';
  const spent = 1 - G.money / Math.max(G.budget0, 1);
  $('#spentPct').textContent = Math.round(spent * 100) + '%';
  $('#spentBar').style.width = clamp(spent * 100, 0, 100) + '%';
  const wp = G.wages / G.wageCap;
  $('#wagePct').textContent = Math.round(wp * 100) + '%';
  const wb = $('#wageBar');
  wb.style.width = clamp(wp * 100, 0, 100) + '%';
  wb.className = wp > 1 ? 'neg' : wp > .92 ? 'amber' : 'pos';
}

/* ---------------- central de transferências ---------------- */
/* o mercado tem o mundo inteiro; a central é onde os alvos de verdade ficam à mão */
function observado(id){ return G.watch.includes(id); }
function observados(){ return G.market.filter(p => observado(p.id) && !p.gone); }
function toggleWatch(id){
  const i = G.watch.indexOf(id);
  if (i >= 0) G.watch.splice(i, 1); else G.watch.push(id);
  renderList();
}

/* ---------------- centro: mercado / elenco / escalação ---------------- */
let TAB = 'market';
let SEL = null;

function currentList(){
  const posF = $('#fPos').value, ligaF = $('#fLiga').value, sort = $('#fSort').value;
  const q = $('#fName').value.trim().toLowerCase();
  const onlyNeed = $('#fNeed').checked, onlyAfford = $('#fAfford').checked, onlyReach = $('#fReach').checked;
  const onlyBench = $('#fBench').checked, onlyHeavy = $('#fHeavy').checked;
  const tetoFee = +$('#fFee').value;
  /* a central guarda o que você marcou, inclusive quem já saiu do mercado */
  let list = TAB === 'squad' ? G.squad.slice()
           : TAB === 'central' ? G.market.filter(p => observado(p.id))
           : G.market.filter(p => !p.gone);
  if (posF){
    /* 'LAT:E' pede lateral que jogue pela esquerda. O filtro é pela posição de origem:
       a função secundária vale na escalação, não aqui */
    const [fp, fs] = posF.split(':');
    list = list.filter(p => p.pos === fp && (!fs || cobreLado(p, fs)));
  }
  if (q) list = list.filter(p => (p.name + ' ' + p.club).toLowerCase().includes(q));
  if (TAB !== 'squad'){
    if (ligaF) list = list.filter(p => p.liga === ligaF);
    if (onlyNeed) list = list.filter(p => G.needs[p.pos] !== 'ok');
    if (onlyAfford) list = list.filter(p => p.feeAsk <= G.money && p.wageAsk <= G.wageCap - G.wages);
    if (onlyReach) list = list.filter(p => reachOf(p) !== 'fora');
    if (tetoFee < FEE_MAX) list = list.filter(p => p.feeAsk <= tetoFee);
  } else {
    if (onlyBench) list = list.filter(p => !G.lineup.includes(p.id));
    if (onlyHeavy){
      const media = G.squad.reduce((s, p) => s + (p.paidWage ?? p.wage), 0) / Math.max(G.squad.length, 1);
      list = list.filter(p => (p.paidWage ?? p.wage) > media);
    }
  }
  const cmp = {
    ovr:(a, b) => b.ovr - a.ovr,
    fee:(a, b) => (a.feeAsk ?? a.value) - (b.feeAsk ?? b.value),
    pot:(a, b) => b.pot - a.pot,
    age:(a, b) => a.age - b.age,
    wage:(a, b) => a.wage - b.wage,
    val:(a, b) => b.value - a.value,
    wageTop:(a, b) => (b.paidWage ?? b.wage) - (a.paidWage ?? a.wage),
    aged:(a, b) => b.age - a.age
  }[sort] || ((a, b) => b.ovr - a.ovr);
  return list.sort(cmp);
}
const FILTER_DEFAULTS = { fPos:'', fLiga:'', fSort:'ovr', fName:'', fNeed:false, fAfford:false, fReach:false, fBench:false, fHeavy:false, fFee:'' };
/* filtros que só fazem sentido em uma das abas */
const FILTER_TAB = { fLiga:'market', fNeed:'market', fAfford:'market', fReach:'market', fBench:'squad', fHeavy:'squad', fFee:'market' };
const SORTS = {
  market:['ovr', 'fee', 'pot', 'age', 'wage'],
  squad:['ovr', 'val', 'wageTop', 'aged', 'pot']
};
/* a barrinha vai de zero até a maior pedida do mercado sorteado; no topo, não filtra nada */
let FEE_MAX = 0;
function initFeeRange(){
  const maior = G.market.reduce((m, p) => Math.max(m, p.feeAsk || 0), 0);
  FEE_MAX = Math.max(Math.ceil(maior / 1e6) * 1e6, 1e6);
  const el = $('#fFee');
  el.max = FEE_MAX;
  el.step = Math.max(Math.round(FEE_MAX / 200 / 1e5) * 1e5, 1e5);
  el.value = FEE_MAX;
  FILTER_DEFAULTS.fFee = String(FEE_MAX);
  renderFeeLab();
}
function renderFeeLab(){
  const v = +$('#fFee').value;
  $('#fFeeLab').textContent = v >= FEE_MAX ? t('f.fee.none') : t('f.fee.upto', { v:money(v) });
}

const filtroVale = id => !FILTER_TAB[id] || FILTER_TAB[id] === (TAB === 'squad' ? 'squad' : 'market');

let SORT_TAB = null;
/* a barra de filtros muda de cara entre comprar no mercado e vender do elenco */
function syncFilters(){
  const tab = TAB === 'squad' ? 'squad' : 'market';
  Object.keys(FILTER_TAB).forEach(id => {
    const el = $('#' + id);
    (el.closest('label') || el).hidden = !filtroVale(id);
  });
  renderFeeLab();
  $('#fName').placeholder = tab === 'market' ? 'Buscar jogador ou clube' : 'Buscar jogador do elenco';
  if (SORT_TAB === tab) return;
  SORT_TAB = tab;
  const atual = $('#fSort').value, opts = SORTS[tab];
  $('#fSort').innerHTML = opts.map(v => '<option value="' + v + '">' + t('sort.' + v) + '</option>').join('');
  $('#fSort').value = opts.includes(atual) ? atual : FILTER_DEFAULTS.fSort;
}

function filtersAtivos(){
  return Object.keys(FILTER_DEFAULTS).filter(filtroVale).some(id => {
    const el = $('#' + id);
    return (el.type === 'checkbox' ? el.checked : el.value) !== FILTER_DEFAULTS[id];
  });
}

function zerarFiltros(){
  Object.keys(FILTER_DEFAULTS).forEach(id => {
    const el = $('#' + id), d = FILTER_DEFAULTS[id];
    if (el.type === 'checkbox') el.checked = d; else el.value = d;
  });
  renderList();
}

const LIST_CAP = 250;   /* o mercado tem o mundo inteiro; a tabela mostra os melhores por filtro */
function renderList(){
  renderFeeLab();
  const naCentral = observados().length;
  $('#tabWatchN').textContent = naCentral || '';
  $('#fClear').disabled = !filtersAtivos();
  const list = currentList();
  const shown = list.slice(0, LIST_CAP);
  $('#listCount').textContent =
    t('list.count.' + (TAB === 'market' ? 'market' : TAB === 'central' ? 'central' : 'squad'), { n:list.length }) +
    (list.length > shown.length ? t('list.more', { n:shown.length }) : '');
  const isMk = TAB !== 'squad';
  if (!list.length){
    $('#listWrap').innerHTML = '<div class="empty">' +
      t(TAB === 'central' && !G.watch.length ? 'list.central.empty' : 'list.empty') + '</div>';
    return;
  }
  const head = '<thead><tr><th>' + t('th.pos') + '</th><th>' + t('th.player') + '</th><th class="num">' + t('th.age') +
    '</th><th class="num">' + t('th.ovr') + '</th><th class="num">' + t('th.pot') + '</th>' +
    '<th class="num">' + (isMk ? t('th.ask') : t('th.value')) + '</th><th class="num">' + t('th.wage') + '</th><th></th></tr></thead>';
  const body = shown.map(p => {
    const tags = isMk ? tagsOf(p, G.lvl).map(x => '<span class="chip ' + x[0] + '">' + t('tag.' + x[0]) + '</span>').join('')
                      : (G.lineup.includes(p.id) ? '<span class="chip xi">' + t('chip.xi') + '</span>' : '');
    const fee = isMk ? (p.free ? '<span style="color:var(--blue)">' + t('row.free') + '</span>' : money(p.feeAsk)) : money(p.value);
    const btn = isMk
      ? '<button class="btn sm" data-neg="' + p.id + '"' + (p.gone || p.attempts >= MAX_TRIES ? ' disabled' : '') + '>' +
        t(p.gone ? 'btn.gone' : p.attempts >= MAX_TRIES ? 'btn.closed' : 'btn.negotiate') + '</button>'
      : '<button class="btn sm ghost" data-sell="' + p.id + '">' + t('btn.sell') + '</button>';
    const on = isMk && observado(p.id);
    const wbtn = isMk
      ? '<button class="btn sm ghost wbtn' + (on ? ' on' : '') + '" data-watch="' + p.id + '" aria-pressed="' + on + '" title="' +
        t(on ? 'title.central.remove' : 'title.central.add') + '">' +
        t(TAB === 'central' ? 'btn.central.remove' : on ? 'btn.central.on' : 'btn.central.add') + '</button>'
      : '';
    return '<tr' + (p.gone ? ' class="gone"' : isMk && reachOf(p) === 'fora' ? ' class="unreach"' : '') + '><td><div class="pos ' + (G.needs[p.pos] === 'crit' ? 'crit' : G.needs[p.pos] === 'soft' ? 'soft' : '') + '">' + posTag(p) + '</div></td>' +
      '<td><div class="pname">' + esc(p.name) + tags + '</div><div class="pmeta">' + esc(p.club) + (isMk ? ' · ' + esc(p.liga) : '') + rolesTag(p) + '</div></td>' +
      '<td class="num">' + p.age + '</td><td class="num" style="font-weight:600">' + p.ovr + '</td>' +
      '<td class="num" style="color:' + (p.pot > p.ovr ? 'var(--amber)' : 'var(--dim)') + '">' + p.pot + '</td>' +
      '<td class="num">' + fee + '</td><td class="num" style="color:var(--muted)">' + wageFmt(isMk ? p.wageAsk : (p.paidWage ?? p.wage)) + '</td>' +
      '<td style="text-align:right">' + wbtn + btn + '</td></tr>';
  }).join('');
  const corte = list.length > shown.length
    ? '<div class="empty">' + t('list.cut', { n:list.length - shown.length }) + '</div>'
    : '';
  $('#listWrap').innerHTML = '<table>' + head + '<tbody>' + body + '</tbody></table>' + corte;
}

function renderLineup(){
  cleanLineup();
  const slots = formSlots();
  const selSlot = SEL && SEL.t === 'slot' ? SEL.i : -1;
  const selBench = SEL && SEL.t === 'bench' ? SEL.id : -1;

  $('#pitchSlots').innerHTML = slots.map((s, i) => {
    const p = G.squad.find(x => x.id === G.lineup[i]);
    const pen = p ? fitPenalty(p, s) : 0;
    const marca = !pen ? '' : pen <= ROLE_PEN ? ' alt' : ' out';
    const ns = needState(s.p);
    const cls = ['slot', selSlot === i ? 'sel' : '', p ? '' : 'vazio',
      (ns === 'crit' || ns === 'soft') ? 'need ' + ns : ''].filter(Boolean).join(' ');
    const badge = p
      ? '<span class="badge b-' + s.p + marca + '">' + effOvr(p, s) + '</span>'
      : '<span class="badge vaga">' + slotTag(s) + '</span>';
    const nome = p
      ? '<span class="who">' + esc(p.name.split(' ').slice(-1)[0]) + '</span>' +
        (pen ? '<span class="warn' + (pen <= ROLE_PEN ? ' soft' : '') + '">' + posTag(p) + ' · -' + pen + '</span>'
             : '<span class="mini">' + slotTag(s) + '</span>')
      : '<span class="who" style="color:var(--dim)">' + t('slot.empty') + '</span>';
    const carencia = ns === 'crit' || ns === 'soft' || ns === 'done' ? t('need.title.' + ns) : '';
    const desvio = !pen ? '' : t(pen <= ROLE_PEN ? 'slot.alt' : 'slot.out');
    const title = (p ? t('slot.title', { name:esc(p.name), pos:posName(p), ovr:p.ovr, off:desvio })
                     : t('slot.vacancy', { pos:slotName(s) })) + carencia;
    return '<button class="' + cls + '" style="left:' + s.x + '%;top:' + s.y + '%" data-slot="' + i + '" title="' + title + '">' +
      badge + '<span class="nm">' + nome + '</span>' +
      (p ? '<span class="rm" data-rm="' + i + '" title="' + t('slot.remove') + '">×</span>' : '') + '</button>';
  }).join('');

  const bench = benchList();
  $('#bench').innerHTML = bench.length ? bench.map(p => {
    const fit = selSlot >= 0 ? fitPenalty(p, slots[selSlot]) : null;
    const cls = ['brow', selBench === p.id ? 'sel' : '', fit === 0 ? 'fit' : '', fit !== null && fit >= 9 ? 'unfit' : ''].filter(Boolean).join(' ');
    return '<button class="' + cls + '" data-bench="' + p.id + '">' +
      '<span class="pos">' + posTag(p) + '</span>' +
      '<span class="bn">' + esc(p.name) + '<small>' + t('bench.small', { age:p.age, wage:wageFmt(p.paidWage ?? p.wage) }) +
        rolesTag(p) + '</small></span>' +
      '<span class="bo">' + p.ovr + (fit ? '<small>-' + fit + '</small>' : '') + '</span></button>';
  }).join('') : '<div class="empty">' + t('bench.empty') + '</div>';

  const alvos = POS.filter(p => G.needs[p.id] !== 'ok' && slotsOf(p.id));
  $('#needBar').innerHTML = alvos.length ? alvos.map(p => {
    const st = needState(p.id), prog = needProgress(p.id);
    const ganho = posStrength(G.squad, p.id) - G.baseStrength[p.id];
    const lbl = t(st === 'done' ? 'need.chip.done' : G.needs[p.id] === 'crit' ? 'need.chip.crit' : 'need.chip.soft');
    const num = (ganho >= 0 ? '+' : '') + dec(ganho);
    return '<button class="needchip ' + (st === 'done' ? 'done' : G.needs[p.id]) + '" data-need="' + p.id + '" ' +
      'title="' + t('need.chip.title', { now:dec(posStrength(G.squad, p.id)), base:dec(G.baseStrength[p.id]),
        target:dec(needTarget(p.id)), lvl:G.lvl }) + '">' +
      '<span class="nc-t">' + posLabel(p.id) + ' <em>' + lbl + '</em></span>' +
      '<span class="nc-b"><i style="width:' + Math.round(prog * 100) + '%"></i></span>' +
      '<span class="nc-v"><span>' + t('need.chip.of', { num, gap:dec(needGap(p.id)) }) + '</span><span class="go">' +
      t(st === 'done' ? 'need.done' : 'need.go') + '</span></span>' +
      '</button>';
  }).join('') : '<div class="allok">' + t('need.allok', { form:G.form }) + '</div>';

  const xi = lineupRating(G.lineup);
  $('#lineupStrength').textContent = xi.toFixed(1);
  $('#lineupDelta').innerHTML = (() => {
    const d = xi - G.baseXI;
    return '<span style="color:' + (d >= 0 ? 'var(--pos)' : 'var(--neg)') + '">' + (d >= 0 ? '+' : '') + d.toFixed(2) + '</span> ' + t('lineup.delta');
  })();
  $('#benchCount').textContent = t('lineup.benchcount', { n:bench.length });
  $('#listCount').textContent = t('lineup.count', { n:G.lineup.filter(Boolean).length });
  $('#selHint').textContent = t(SEL ? (SEL.t === 'slot' ? 'hint.slot' : 'hint.bench') : 'hint.none');
}
function clickSlot(i){
  if (SEL && SEL.t === 'bench'){
    G.lineup[i] = SEL.id;   // quem estava na vaga volta para o banco
    SEL = null;
  } else if (SEL && SEL.t === 'slot'){
    if (SEL.i !== i){ const a = G.lineup[SEL.i]; G.lineup[SEL.i] = G.lineup[i]; G.lineup[i] = a; }
    SEL = null;
  } else {
    SEL = { t:'slot', i };
  }
  renderLineup(); renderHud(); renderSquad(); renderRight();
}
function clickBench(id){
  if (SEL && SEL.t === 'slot'){
    G.lineup[SEL.i] = id;
    SEL = null;
  } else {
    SEL = (SEL && SEL.t === 'bench' && SEL.id === id) ? null : { t:'bench', id };
  }
  renderLineup(); renderHud(); renderSquad(); renderRight();
}

function renderCenter(){
  const isLine = TAB === 'lineup';
  $('#filters').hidden = isLine;
  $('#tacbar').hidden = !isLine;
  $('#pitchWrap').hidden = !isLine;
  $('#listWrap').hidden = isLine;
  if (isLine){ renderLineup(); return; }
  syncFilters();
  renderList();
}
function renderGoals(ev){
  $('#goalsCount').textContent = t('goals.count', { a:ev.feitas, b:G.goals.length });
  $('#goals').innerHTML = ev.goals.map(({ g, p }) =>
    '<div class="goal' + (p >= 1 ? ' done' : '') + '">' +
      '<div class="k"><span>' + goalText(g) + '</span><b>' + (p >= 1 ? t('need.done') : t('goal.pts', { n:g.pts })) + '</b></div>' +
      '<div class="bar"><i class="' + (p >= 1 ? 'pos' : p >= .5 ? 'amber' : '') + '" style="width:' + Math.round(p * 100) + '%"></i></div>' +
      '<div class="m">' + goalNow(g) + '</div>' +
    '</div>').join('');
}
function renderRight(){
  const ev = evaluate();
  renderGoals(ev);
  $('#gLetter').textContent = gradeOf(ev.total);
  $('#gLetter').style.color = gradeColor(ev.total);
  $('#gScore').textContent = t('press.points', { n:Math.round(ev.total) });
  $('#gScale').innerHTML = Array.from({length:20}, (_, i) =>
    '<span class="' + (i < Math.round(ev.total / 5) ? 'on' : '') + '"></span>').join('');
  $('#comps').innerHTML = ev.comps.map(c =>
    '<div class="comp"><div class="k"><span>' + c.k + '</span><b>' + c.v.toFixed(1) + '<span style="color:var(--dim)">/' + c.max + '</span></b></div>' +
    '<div class="bar"><i style="width:' + (c.v / c.max * 100) + '%"></i></div>' +
    '<div style="font-family:var(--f-mono);font-size:10px;color:var(--dim);margin-top:5px">' + c.note + '</div></div>').join('') +
    ev.pen.map(p => '<div class="comp"><div class="k"><span style="color:var(--neg)">' + p.k + '</span><b style="color:var(--neg)">' + p.v + '</b></div></div>').join('');

  const deals = G.signings.map(s =>
    '<div class="deal"><div><div class="n">' + esc(s.name) + '</div><div class="m">' +
      t('deals.in', { pos:posPlain(s), ovr:s.ovr, years:anos(s.years || 3), role:roleOf(s).toLowerCase() }) + '</div></div>' +
    '<div class="p" style="color:var(--neg)">-' + money(costOf(s)) + '<small>' + wageFmt(s.paidWage) + '</small></div></div>')
    .concat(G.sales.map(s =>
    '<div class="deal"><div><div class="n">' + esc(s.name) + '</div><div class="m">' +
      t('deals.out', { pos:posPlain(s), ovr:s.ovr }) + '</div></div>' +
    '<div class="p" style="color:var(--pos)">+' + money(s.fee) + '<small>' +
      (s.total > s.fee ? t('deals.inst', { v:money(s.total) }) + ' · ' : '') +
      t('deals.frees', { w:wageFmt(s.paidWage ?? s.wage) }) + '</small></div></div>')).join('');
  $('#deals').innerHTML = deals || '<div class="empty">' + t('deals.empty') + '</div>';
  $('#dealsCount').textContent = t('deals.count', { a:G.signings.length, b:G.sales.length });
  const net = G.sales.reduce((a, s) => a + s.fee, 0) - ev.spend;
  $('#netSpend').textContent = (net >= 0 ? '+' : '-') + money(Math.abs(net)).replace('€ ', '');
  $('#feed').innerHTML = G.feed.map(f =>
    '<div class="fitem ' + f.kind + '"><span class="d">' + f.d + '</span><span>' + f.text + '</span></div>').join('');
  $('#btnClose').textContent = G.day >= G.maxDays ? t('btn.close.final') : t('btn.close.day', { n:G.day });
}
function renderAll(){ renderHud(); renderSquad(); renderCenter(); renderRight(); renderTicker(); }

/* ---------------- negociação ---------------- */
function closeModal(){ $('#modalRoot').innerHTML = ''; }
function modal(html){
  $('#modalRoot').innerHTML = '<div class="scrim" id="scrim"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
  $('#scrim').addEventListener('mousedown', e => { if (e.target.id === 'scrim') closeModal(); });
}

/* papéis que dá para prometer na entrevista, do mais modesto ao mais pesado */
const ROLES = [{id:'promessa'}, {id:'rotacao'}, {id:'titular'}, {id:'estrela'}];
const ROLEIDX = Object.fromEntries(ROLES.map((r, i) => [r.id, i]));
const roleName = id => t('role.' + id + '.n');
const roleDesc = id => t('role.' + id + '.d');
const roleOf = p => roleName(p.role || 'rotacao');
/* cláusula de rescisão: quanto mais alta, melhor para o clube e pior para o jogador */
const CLAUSES = [{m:0, s:.12}, {m:5, s:.34}, {m:3, s:.60}, {m:2, s:.84}, {m:1.5, s:1}];
function clauseLab(i){
  const m = CLAUSES[i].m;
  return m ? String(m).replace('.', t('num.dec')) + '×' : t('clause.none');
}
const INT_ROUNDS = 3;    /* rodadas de conversa na mesa antes do empresário levantar */
const TERM_W = { wage:32, sign:16, agent:10, years:14, role:18, clause:10 };

/* o que o jogador quer ouvir na entrevista: sorteado uma vez por alvo e mantido */
function contractAsk(p){
  if (p.ask) return p.ask;
  const gap = clamp(appealGap(p, G.lvl), 0, 8);
  const forte = posStrength(G.squad, p.pos);
  const ambicao = p.ovr >= G.lvl + 8 ? 1.06 : 1;
  p.ask = {
    wage: Math.round(p.wageAsk * ambicao / 1000) * 1000,
    sign: Math.max(1e5, Math.round(p.wageAsk * (9 + gap * 1.8 + (p.free ? 7 : 0)) * rnd(.85, 1.15) / 1e5) * 1e5),
    agent: Math.round(clamp(4 + gap * 1.1 + (p.free ? 3 : 0) + rnd(-1, 1.2), 3, 15) * 10) / 10,
    years: p.age <= 22 ? 5 : p.age <= 26 ? 4 : p.age <= 29 ? 3 : p.age <= 32 ? 2 : 1,
    role: (p.ovr >= G.lvl + 4 || p.ovr >= forte + 6) ? 'estrela'
        : (p.ovr >= G.lvl - 1 || p.ovr >= forte + 2) ? 'titular'
        : (p.age <= 21 && p.pot - p.ovr >= 6) ? 'promessa' : 'rotacao',
    clause: p.ovr >= G.lvl + 3 ? 2 : 3,
    brio: rnd(-3, 3)   /* teimosia escondida: proposta colada na exigência é sempre um risco */
  };
  return p.ask;
}
function agentBase(p, fee){ return fee > 0 ? fee : contractAsk(p).wage * 52; }
function agentAmount(p, fee, pct){ return Math.round(agentBase(p, fee) * pct / 100 / 1e4) * 1e4; }
function cashOut(p, d){ return d.fee + d.sign + agentAmount(p, d.fee, d.agent); }

/* o quanto cada item da proposta agrada: 0 a ~1,1 por item, ponderado em TERM_W */
const termName = id => t('term.k.' + id);
function termScores(p, t){
  const a = contractAsk(p);
  const ms = r => r <= .72 ? 0 : r > 1 ? Math.min(1 + (r - 1) * .22, 1.12) : (r - .72) / .28;
  const dy = Math.min(Math.abs(t.years - a.years), 4);
  const dr = ROLEIDX[t.role] - ROLEIDX[a.role];
  const parts = [
    { id:'wage',   s:ms(t.wage / a.wage) },
    { id:'sign',   s:ms(t.sign / a.sign) },
    { id:'agent',  s:ms(t.agent / a.agent) },
    { id:'years',  s:[1, .72, .36, .12, 0][dy] },
    { id:'role',   s:dr >= 0 ? Math.min(1 + dr * .03, 1.06) : dr === -1 ? .5 : dr === -2 ? .16 : 0 },
    { id:'clause', s:CLAUSES[t.clause].s }
  ];
  let score = 0;
  for (const q of parts){ q.w = TERM_W[q.id]; score += q.w * q.s; }
  return { parts, score };
}
function askThreshold(p){ return 70 + (p.rounds || 0) * 7; }
function moodOf(d){
  return d >= 6 ? [t('mood.now'), 'pos'] : d >= 0 ? [t('mood.ok'), 'pos']
       : d >= -9 ? [t('mood.near'), 'amber'] : d >= -22 ? [t('mood.hesit'), 'amber'] : [t('mood.cold'), 'neg'];
}
function snapTerm(t, id, a){
  if (id === 'wage') t.wage = a.wage;
  else if (id === 'sign') t.sign = a.sign;
  else if (id === 'agent') t.agent = a.agent;
  else if (id === 'years') t.years = a.years;
  else if (id === 'role') t.role = a.role;
  else if (id === 'clause') t.clause = CLAUSES.findIndex(c => c.m === a.clause);
}
/* contraproposta: sobe item por item, do que mais pesa para o que menos, até dar o número */
function counterOf(p, t, thr){
  const a = contractAsk(p);
  const c = Object.assign({}, t);
  const ordem = termScores(p, c).parts.slice()
    .sort((x, y) => y.w * (1 - y.s) - x.w * (1 - x.s)).map(q => q.id);
  for (const id of ordem){
    if (termScores(p, c).score >= thr + 2) break;
    snapTerm(c, id, a);
  }
  return c;
}

/* ---- fase 1: acerto com o clube dono do jogador ---- */
function openNegotiation(id){
  const p = G.market.find(x => x.id === id);
  if (!p || p.gone || p.attempts >= MAX_TRIES) return;
  if (p.free){ p.attempts++; openInterview(p, 0); return; }

  const maxFee = Math.max(G.money, p.feeAsk * 1.2);
  const reach = reachOf(p);
  const tags = tagsOf(p, G.lvl).map(x => '<span class="chip ' + x[0] + '">' + t('tag.' + x[0]) + '</span>').join('');

  modal(
    '<div class="mh"><div><h3>' + esc(p.name) + ' ' + tags + '</h3>' +
      '<div class="sub">' + t('neg.phase1', { club:esc(p.club) }) + '<br>' +
      t('neg.sub', { pos:posName(p) + rolesTag(p), liga:esc(p.liga), age:p.age,
        fee:money(p.feeAsk), a:p.attempts, b:MAX_TRIES }) + '</div></div>' +
      '<button class="x" id="mx" aria-label="' + t('btn.closemodal') + '">✕</button></div>' +
    '<div class="attrs">' +
      '<div><div class="k">' + t('attr.ovr') + '</div><div class="v">' + p.ovr + '</div></div>' +
      '<div><div class="k">' + t('attr.pot') + '</div><div class="v" style="color:var(--amber)">' + p.pot + '</div></div>' +
      '<div><div class="k">' + t('attr.value') + '</div><div class="v">' + money(p.value).replace('€ ', '') + '</div></div>' +
      '<div><div class="k">' + t('attr.yourpos', { pos:posCode(p.pos) }) + '</div><div class="v">' + posStrength(G.squad, p.pos).toFixed(0) + '</div></div>' +
    '</div>' +
    '<div class="negotiate">' +
      (reach === 'fora'
        ? '<div class="msg no"><span class="who">' + t('who.scout') + '</span>' + t('neg.out', { club:esc(G.club.n), from:esc(p.club) }) + '</div>'
        : reach === 'dificil'
        ? '<div class="msg mid"><span class="who">' + t('who.scout') + '</span>' + t('neg.hard') + '</div>'
        : '') +
      '<div class="msg"><span class="who">' + t('who.how') + '</span>' + t('neg.how') + '</div>' +
      '<div class="field"><div class="k"><span>' + t('neg.offer', { club:esc(p.club) }) + '</span><b id="feeOut">' + money(Math.min(p.feeAsk, G.money)) + '</b></div>' +
        '<input type="range" id="feeR" min="0" max="' + Math.round(maxFee) + '" step="100000" value="' + Math.round(Math.min(p.feeAsk, G.money)) + '">' +
        '<div class="quick">' +
          '<button data-fee="ask">' + t('q.ask') + '</button><button data-fee="0.9">-10%</button>' +
          '<button data-fee="0.8">-20%</button><button data-fee="1.05">+5%</button>' +
          '<button data-fee="all">' + t('q.all', { v:money(G.money).replace('€ ', '') }) + '</button></div></div>' +
      '<div id="negMsg"></div>' +
    '</div>' +
    '<div class="mfoot"><span class="hint">' + t('neg.hint') + '</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mCancel">' + t('btn.giveup') + '</button>' +
      '<button class="btn" id="mSend">' + t('btn.send') + '</button></div></div>'
  );

  const feeR = $('#feeR');
  const sync = () => {
    const fee = +feeR.value;
    $('#feeOut').textContent = money(fee);
    $('#feeOut').style.color = fee > G.money ? 'var(--neg)' : 'var(--ink)';
    $('#mSend').disabled = fee > G.money || p.attempts >= MAX_TRIES;
    if (!$('#negMsg').dataset.locked)
      $('#negMsg').innerHTML = fee > G.money
        ? '<div class="msg no"><span class="who">' + t('who.finance') + '</span>' + t('neg.nocash') + '</div>' : '';
  };
  feeR.addEventListener('input', sync);
  $('#mx').onclick = closeModal;
  $('#mCancel').onclick = closeModal;
  $('#modalRoot').querySelectorAll('[data-fee]').forEach(b => b.onclick = () => {
    const v = b.dataset.fee;
    feeR.value = v === 'ask' ? p.feeAsk : v === 'all' ? G.money : Math.round(p.feeAsk * parseFloat(v));
    sync();
  });
  $('#mSend').onclick = () => sendOffer(p, +feeR.value);
  sync();
}

function sendOffer(p, fee){
  if (G.over || fee > G.money) return;
  const box = $('#negMsg');
  const lock = html => { if (box){ box.dataset.locked = '1'; box.innerHTML = html; } };

  if (reachOf(p) === 'fora'){
    lock('<div class="msg no"><span class="who">' + esc(p.club) + '</span>' +
      t('neg.refuse.out', { name:esc(p.name), club:esc(G.club.n) }) + '</div>');
    news(t('news.refuse.out', { name:esc(p.name), club:esc(G.club.n) }), 'bad');
    renderAll();
    return;
  }
  p.attempts++;
  const feeOK = fee >= p.feeAsk * .93 ? 'yes' : fee >= p.feeAsk * .80 ? 'counter' : 'no';

  if (feeOK === 'no'){
    p.feeAsk = Math.round(p.feeAsk * 1.03 / 1e5) * 1e5;
    lock('<div class="msg no"><span class="who">' + esc(p.club) + '</span>' + t('neg.low', { fee:money(p.feeAsk) }) +
      (p.attempts >= MAX_TRIES ? '<br><br>' + t('neg.closed', { n:MAX_TRIES }) : '') + '</div>');
    news(t('news.refused', { name:esc(p.name), club:esc(p.club) }) +
      (p.attempts >= MAX_TRIES ? t('news.closed') : ''), 'bad');
    if (p.attempts >= MAX_TRIES && $('#mSend')) $('#mSend').disabled = true;
    renderAll();
    return;
  }

  const acerto = feeOK === 'yes' ? fee : Math.max(fee, Math.round(p.feeAsk * .945 / 1e5) * 1e5);
  const cabe = acerto <= G.money;
  lock('<div class="msg ' + (feeOK === 'yes' ? 'ok' : 'mid') + '"><span class="who">' + esc(p.club) + '</span>' +
    t(feeOK === 'yes' ? 'neg.yes' : 'neg.counter', { v:money(acerto) }) +
    (cabe ? '' : '<br><br><b style="color:var(--neg)">' + t('neg.nofit') + '</b>') + '</div>' +
    (cabe ? '<div style="margin-top:10px"><button class="btn wide" id="mGoInt">' + t('neg.gotoint', { v:money(acerto) }) + '</button></div>' : ''));
  if (cabe) $('#mGoInt').onclick = () => openInterview(p, acerto);
  news(t('news.agreed', { name:esc(p.name), v:money(acerto), club:esc(p.club) }), 'rival');
  if ($('#mSend')) $('#mSend').disabled = true;
  renderAll();
}

/* ---- fase 2: a entrevista com o jogador e o empresário ---- */
function openInterview(p, fee){
  if (G.over || p.gone) return;
  const a = contractAsk(p);
  p.rounds = p.rounds || 0;
  if (p.rounds >= INT_ROUNDS) return;
  const room = G.wageCap - G.wages;
  /* a mesa começa na posição do clube, não na do jogador: é você que tem de subir */
  const tm = {
    fee,
    wage: Math.min(Math.round(a.wage * .85 / 1000) * 1000, Math.max(4000, room)),
    sign: Math.round(a.sign * .5 / 5e4) * 5e4,
    agent: Math.round(a.agent * .6 * 2) / 2,
    years: 3,
    role: ROLES[Math.max(0, ROLEIDX[a.role] - 1)].id,
    clause: 2
  };
  const tags = tagsOf(p, G.lvl).map(x => '<span class="chip ' + x[0] + '">' + t('tag.' + x[0]) + '</span>').join('');
  const seg = (name, opts) => '<div class="seg" data-seg="' + name + '">' +
    opts.map(o => '<button data-val="' + o.v + '">' + o.l + '</button>').join('') + '</div>';

  modal(
    '<div class="mh"><div><h3>' + esc(p.name) + ' ' + tags + '</h3>' +
      '<div class="sub">' + t('int.phase2', { r:p.rounds + 1, n:INT_ROUNDS }) + '<br>' +
      t('int.sub', { pos:posName(p) + rolesTag(p), age:p.age, ovr:p.ovr,
        fee: fee ? t('int.fee', { v:money(fee), club:esc(p.club) }) : t('int.nofee') }) + '</div></div>' +
      '<button class="x" id="mx" aria-label="' + t('btn.closemodal') + '">✕</button></div>' +
    '<div class="meter"><div class="mk"><span>' + t('int.meter') + '</span><b id="mtVal">—</b></div>' +
      '<div class="mtrack"><i id="mtFill"></i><span class="mthr" id="mtThr"></span></div>' +
      '<div class="mlegend"><span id="mtMood">—</span><span>' + t('int.need', { n:Math.round(askThreshold(p)) }) + '</span></div></div>' +
    '<div class="negotiate">' +
      '<div class="msg mid"><span class="who">' + t('who.agent', { name:esc(p.name) }) + '</span>' +
        t('int.ask', { wage:wageFmt(a.wage), sign:money(a.sign), agent:a.agent.toFixed(1), years:anos(a.years),
          role:roleName(a.role).toLowerCase(), clause:String(a.clause).replace('.', t('num.dec')) }) + '</div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dWage"></i>' + t('term.wage', { room:wageFmt(room) }) + '</span><b id="wgOut"></b></div>' +
        '<input type="range" id="wgR" min="4000" max="' + Math.round(a.wage * 1.7) + '" step="1000" value="' + tm.wage + '">' +
        '<div class="quick"><button data-wg="ask">' + t('q.asked') + '</button><button data-wg="0.9">-10%</button>' +
        '<button data-wg="1.12">+12%</button><button data-wg="1.25">+25%</button></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dSign"></i>' + t('term.sign') + '</span><b id="sgOut"></b></div>' +
        '<input type="range" id="sgR" min="0" max="' + Math.round(a.sign * 1.8) + '" step="50000" value="' + tm.sign + '">' +
        '<div class="quick"><button data-sg="ask">' + t('q.asked') + '</button><button data-sg="0.6">-40%</button>' +
        '<button data-sg="0">' + t('q.zero') + '</button><button data-sg="1.3">+30%</button></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dAgent"></i>' + t('term.agent') + '</span><b id="agOut"></b></div>' +
        '<input type="range" id="agR" min="0" max="' + (a.agent * 1.8).toFixed(1) + '" step="0.5" value="' + a.agent + '">' +
        '<div class="quick"><button data-ag="ask">' + t('q.asked') + '</button><button data-ag="0.7">-30%</button><button data-ag="0">' + t('q.zero') + '</button></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dYears"></i>' + t('term.years') + '</span><b id="yrOut"></b></div>' +
        seg('years', [1, 2, 3, 4, 5].map(y => ({ v:y, l:anos(y) }))) + '</div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dRole"></i>' + t('term.role') + '</span><b id="rlOut"></b></div>' +
        seg('role', ROLES.map(r => ({ v:r.id, l:roleName(r.id) }))) +
        '<div class="hint2" id="rlHint"></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dClause"></i>' + t('term.clause') + '</span><b id="clOut"></b></div>' +
        seg('clause', CLAUSES.map((c, i) => ({ v:i, l:clauseLab(i) }))) +
        '<div class="hint2">' + t('clause.hint') + '</div></div>' +

      '<div class="totals"><div><span>' + t('tot.cash') + '</span><b id="tCash"></b></div>' +
        '<div><span>' + t('tot.wage') + '</span><b id="tWage"></b></div>' +
        '<div><span>' + t('tot.all') + '</span><b id="tAll"></b></div></div>' +
      '<div id="intMsg"></div>' +
    '</div>' +
    '<div class="mfoot"><span class="hint">' + t('int.hint') + '</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mCancel">' + t('btn.giveup') + '</button>' +
      '<button class="btn" id="mSign">' + t('btn.sign') + '</button></div></div>'
  );

  const wgR = $('#wgR'), sgR = $('#sgR'), agR = $('#agR');
  const dot = { wage:$('#dWage'), sign:$('#dSign'), agent:$('#dAgent'), years:$('#dYears'), role:$('#dRole'), clause:$('#dClause') };

  const sync = () => {
    tm.wage = +wgR.value; tm.sign = +sgR.value; tm.agent = +agR.value;
    const cash = cashOut(p, tm), folga = G.wageCap - G.wages;
    $('#wgOut').textContent = wageFmt(tm.wage);
    $('#wgOut').style.color = tm.wage > folga ? 'var(--neg)' : 'var(--ink)';
    $('#sgOut').textContent = money(tm.sign);
    $('#agOut').textContent = tm.agent.toFixed(1) + '% · ' + money(agentAmount(p, tm.fee, tm.agent));
    $('#yrOut').textContent = anos(tm.years);
    $('#rlOut').textContent = roleName(tm.role);
    $('#rlHint').textContent = roleDesc(tm.role) + '.';
    $('#clOut').textContent = CLAUSES[tm.clause].m
      ? clauseLab(tm.clause) + ' · ' + money(p.value * CLAUSES[tm.clause].m) : t('clause.out.none');
    $('#modalRoot').querySelectorAll('[data-seg]').forEach(g => {
      const cur = String(tm[g.dataset.seg]);
      g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.val === cur));
    });

    const { parts, score } = termScores(p, tm);
    const thr = askThreshold(p);
    for (const q of parts) dot[q.id].className = 'dot ' + (q.s >= .95 ? 'ok' : q.s >= .6 ? 'mid' : 'no');
    const [mood, cls] = moodOf(score - thr);
    $('#mtVal').textContent = Math.round(score);
    $('#mtFill').style.width = clamp(score, 2, 100) + '%';
    $('#mtFill').className = cls;
    $('#mtThr').style.left = clamp(thr, 0, 100) + '%';
    $('#mtMood').textContent = mood;
    $('#mtMood').style.color = 'var(--' + cls + ')';
    $('#mtNeed').textContent = Math.round(thr);

    $('#tCash').textContent = money(cash);
    $('#tCash').style.color = cash > G.money ? 'var(--neg)' : 'var(--ink)';
    $('#tWage').textContent = wageFmt(tm.wage);
    $('#tWage').style.color = tm.wage > folga ? 'var(--neg)' : 'var(--ink)';
    $('#tAll').textContent = money(cash + tm.wage * 52 * tm.years);
    const bad = cash > G.money || tm.wage > folga;
    $('#mSign').disabled = bad;
    if (!$('#intMsg').dataset.locked)
      $('#intMsg').innerHTML = bad
        ? '<div class="msg no"><span class="who">' + t('who.finance') + '</span>' +
          t(cash > G.money ? 'fin.cash' : 'fin.wage') + '</div>'
        : '';
  };
  const unlock = () => { const b = $('#intMsg'); if (b){ delete b.dataset.locked; b.innerHTML = ''; } };

  [wgR, sgR, agR].forEach(r => r.addEventListener('input', () => { unlock(); sync(); }));
  $('#modalRoot').querySelectorAll('[data-wg]').forEach(b => b.onclick = () => {
    wgR.value = b.dataset.wg === 'ask' ? a.wage : Math.round(a.wage * parseFloat(b.dataset.wg));
    unlock(); sync();
  });
  $('#modalRoot').querySelectorAll('[data-sg]').forEach(b => b.onclick = () => {
    sgR.value = b.dataset.sg === 'ask' ? a.sign : Math.round(a.sign * parseFloat(b.dataset.sg));
    unlock(); sync();
  });
  $('#modalRoot').querySelectorAll('[data-ag]').forEach(b => b.onclick = () => {
    agR.value = b.dataset.ag === 'ask' ? a.agent : (a.agent * parseFloat(b.dataset.ag)).toFixed(1);
    unlock(); sync();
  });
  $('#modalRoot').querySelectorAll('[data-seg]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('[data-val]');
    if (!b) return;
    const key = g.dataset.seg;
    tm[key] = key === 'role' ? b.dataset.val : +b.dataset.val;
    unlock(); sync();
  }));
  $('#mx').onclick = closeModal;
  $('#mCancel').onclick = closeModal;
  $('#mSign').onclick = () => proposeContract(p, tm);
  sync();
}

function proposeContract(p, tm){
  if (G.over) return;
  if (cashOut(p, tm) > G.money || tm.wage > G.wageCap - G.wages) return;
  const a = contractAsk(p);
  const thr = askThreshold(p);
  const { parts, score } = termScores(p, tm);
  const box = $('#intMsg');
  const lock = html => { if (box){ box.dataset.locked = '1'; box.innerHTML = html; } };
  p.rounds++;

  if (score + a.brio >= thr){ doSign(p, tm); tickDay(); return; }

  const fracos = parts.slice().sort((x, y) => y.w * (1 - y.s) - x.w * (1 - x.s))
    .filter(q => q.s < .95).slice(0, 2).map(q => termName(q.id));

  if (p.rounds >= INT_ROUNDS){
    p.attempts = MAX_TRIES;
    p.gone = true;
    lock('<div class="msg no"><span class="who">' + t('who.agent', { name:esc(p.name) }) + '</span>' +
      t('int.walk', { club:esc(G.club.n) }) + '</div>');
    if ($('#mSign')) $('#mSign').disabled = true;
    news(t('news.walk', { name:esc(p.name),
      why: fracos.length ? t('news.walk.why', { list:fracos.join(' ' + t('and') + ' ') }) : '' }), 'bad');
    tickDay();
    return;
  }

  if (score >= thr - 16){
    const c = counterOf(p, tm, thr);
    const cCash = cashOut(p, c);
    const cabe = cCash <= G.money && c.wage <= G.wageCap - G.wages;
    lock('<div class="msg mid"><span class="who">' + t('who.counter') + '</span>' +
      t('int.counter', { wage:wageFmt(c.wage), sign:money(c.sign), agent:c.agent.toFixed(1),
        years:anos(c.years), role:roleName(c.role).toLowerCase(), clause:clauseLab(c.clause), cash:money(cCash) }) +
      (cabe ? '' : '<br><br><b style="color:var(--neg)">' + t('int.nofit') + '</b>') + '</div>' +
      (cabe ? '<div style="margin-top:10px"><button class="btn wide" id="mAccept">' + t('btn.accept') + '</button></div>' : ''));
    if (cabe) $('#mAccept').onclick = () => { doSign(p, c); tickDay(); };
    news(t('news.counter', { name:esc(p.name), wage:wageFmt(c.wage), sign:money(c.sign), years:anos(c.years) }), 'rival');
  } else {
    lock('<div class="msg no"><span class="who">' + t('who.agent', { name:esc(p.name) }) + '</span>' +
      t('int.no', { n:Math.round(askThreshold(p)),
        where: fracos.length ? t('int.no.where', { list:fracos.join(t('int.no.join')) }) : t('int.no.all') }) + '</div>');
    const resta = INT_ROUNDS - p.rounds;
    news(resta > 1 ? t('news.intno', { name:esc(p.name), n:resta }) : t('news.intno.one', { name:esc(p.name) }), 'bad');
  }

  if ($('#intRound')) $('#intRound').textContent = Math.min(p.rounds + 1, INT_ROUNDS);
  if ($('#mtNeed')){
    $('#mtNeed').textContent = Math.round(askThreshold(p));
    $('#mtThr').style.left = clamp(askThreshold(p), 0, 100) + '%';
  }
  renderAll();
}

function doSign(p, d){
  const agent = agentAmount(p, d.fee, d.agent);
  G.money -= d.fee + d.sign + agent;
  G.wages += d.wage;
  p.gone = true;
  const signed = Object.assign({}, p, {
    fee:d.fee, paidWage:d.wage, signBonus:d.sign, agentPct:d.agent, agentFee:agent,
    years:d.years, role:d.role, clause:CLAUSES[d.clause].m,
    club:G.club.n, liga:G.club.liga.nome, signed:true
  });
  G.squad.push(signed);
  G.signings.push(signed);
  G.watch = G.watch.filter(x => x !== p.id);
  const vaga = autoPlace(signed);
  news(t('news.signed', { name:esc(p.name), pos:posPlain(p), ovr:p.ovr, years:anos(d.years),
      fee:money(d.fee), sign:money(d.sign), wage:wageFmt(d.wage), role:roleName(d.role).toLowerCase() }) +
    (vaga ? t('news.signed.xi', { slot:vaga }) : t('news.signed.bench')), 'good');
  closeModal();
  renderAll();
}

/* ---- venda: vários clubes na fila, cada um com a sua mesa ---- */
const SELL_ROUNDS = 3;   /* rodadas de conversa com cada comprador antes de ele levantar */
/* parcelar sobe o total que o comprador aguenta e desce o que entra hoje no caixa */
const PAY = [{ now:1, tol:1 }, { now:.62, tol:1.14 }, { now:.42, tol:1.27 }];
const payLab = i => t('pay.' + i);

/* o quanto um clube quer o jogador: overall contra o nível do elenco dele, idade e projeto */
function wantOf(p, club){
  const gap = p.ovr - club.lvl;
  let w = gap >= 5 ? .95 : gap >= 0 ? .78 + gap * .034 : gap >= -6 ? .5 + (gap + 6) * .046 : .18;
  if (p.age <= 23 && p.pot - p.ovr >= 6) w += .1;
  if (p.age >= 32) w -= .18;
  return clamp(w * rnd(.85, 1.15), .1, 1);
}
function newBid(p, club, esfria){
  const want = clamp(wantOf(p, club) * (esfria || 1), .08, 1);
  const max = Math.max(2e5, Math.round(p.value * (.78 + want * .82) / 1e5) * 1e5);
  return { club, want, max, offer:Math.max(1e5, Math.round(max * rnd(.58, .8) / 1e5) * 1e5),
    talks:SELL_ROUNDS, out:false };
}
/* a fila de interessados é sorteada uma vez por jogador e fica guardada com ele */
function buyersFor(p, esfria){
  const perto = ALL_CLUBS.filter(c => c !== G.club && Math.abs(c.lvl - p.ovr) <= 9);
  const base = perto.length >= 4 ? perto : ALL_CLUBS.filter(c => c !== G.club);
  const alvo = Math.min(ri(2, 4), base.length);
  const clubs = [];
  for (let i = 0; clubs.length < alvo && i < 60; i++){
    const c = pick(base);
    if (!clubs.includes(c)) clubs.push(c);
  }
  return clubs.map(c => newBid(p, c, esfria)).sort((a, b) => b.offer - a.offer);
}
const bidsOf = p => (p.bids = p.bids || buyersFor(p));
const wantLab = w => t(w >= .72 ? 'bid.want.high' : w >= .45 ? 'bid.want.mid' : 'bid.want.low');
/* enquanto você aperta um clube, os outros da fila se mexem */
function rivalMove(p, atual){
  const outros = bidsOf(p).filter(b => b !== atual && !b.out);
  if (!outros.length || Math.random() > .4) return;
  const b = pick(outros);
  const up = rnd(1.04, 1.1);
  b.max = Math.round(b.max * up / 1e5) * 1e5;
  b.offer = Math.min(b.max, Math.round(b.offer * up / 1e5) * 1e5);
  news(t('news.bidup', { club:esc(b.club.n), name:esc(p.name), v:money(b.offer) }), 'rival');
}

function openSell(id){
  const p = G.squad.find(x => x.id === id);
  if (!p) return;
  const bids = bidsOf(p);
  const vivos = bids.filter(b => !b.out);
  const need = slotsOf(p.pos);
  const remaining = G.squad.filter(x => x.pos === p.pos).length - 1;
  const isStarter = G.lineup.includes(p.id);
  /* vender o único canhoto da lateral custa mais do que a conta de sobra na posição mostra */
  const soLado = SIDED[p.pos] && p.side && p.side !== 'A' &&
    formSlots().some(s => s.p === p.pos && s.side === p.side) &&
    !G.squad.some(x => x.id !== p.id && x.pos === p.pos && cobreLado(x, p.side));
  const melhor = vivos.reduce((a, b) => !a || b.offer > a.offer ? b : a, null);

  modal(
    '<div class="mh"><div><h3>' + t('sell.title', { name:esc(p.name) }) + '</h3>' +
      '<div class="sub">' + t('sell.sub', { pos:posName(p) + rolesTag(p), age:p.age, ovr:p.ovr }) + '</div></div>' +
      '<button class="x" id="mx" aria-label="' + t('btn.closemodal') + '">✕</button></div>' +
    '<div class="attrs">' +
      '<div><div class="k">' + t('sell.bids') + '</div><div class="v" style="color:var(--pos)">' + vivos.length + '</div></div>' +
      '<div><div class="k">' + t('sell.value') + '</div><div class="v">' + money(p.value).replace('€ ', '') + '</div></div>' +
      '<div><div class="k">' + t('sell.frees') + '</div><div class="v">' +
        t('thousand', { n:Math.round((p.paidWage ?? p.wage) / 1000) }) + '</div></div>' +
      '<div><div class="k">' + t('sell.left') + '</div><div class="v" style="color:' + (remaining < need ? 'var(--neg)' : 'var(--ink)') + '">' + remaining + '</div></div>' +
    '</div>' +
    '<div class="negotiate">' +
      (!vivos.length
        ? '<div class="msg no"><span class="who">' + t('who.analysis') + '</span>' + t('sell.none') + '</div>'
        : '<div class="msg ' + (melhor.offer > p.value * 1.05 ? 'ok' : melhor.offer < p.value * .85 ? 'no' : 'mid') + '">' +
          '<span class="who">' + t('who.analysis') + '</span>' +
          t(melhor.offer > p.value * 1.05 ? 'sell.high' : melhor.offer < p.value * .85 ? 'sell.low' : 'sell.mid') + '</div>') +
      (isStarter ? '<div class="msg no"><span class="who">' + t('who.staff') + '</span>' + t('sell.starter') + '</div>' : '') +
      (soLado ? '<div class="msg no"><span class="who">' + t('who.staff') + '</span>' + t('sell.side', { n:SIDE_PEN }) + '</div>' : '') +
      (remaining < need ? '<div class="msg no"><span class="who">' + t('who.rules') + '</span>' + t('sell.thin', { form:G.form }) + '</div>' : '') +
      '<div class="bidlist">' + bids.map((b, i) =>
        '<div class="bidrow' + (b.out ? ' out' : '') + '">' +
          '<div class="bn"><b>' + esc(b.club.n) + '</b><small>' + esc(b.club.liga.nome) + ' · ' +
            t('bid.level', { n:b.club.lvl }) + ' · ' + (b.out ? t('bid.out') : wantLab(b.want)) + '</small></div>' +
          '<div class="bv">' + money(b.offer) + '<small>' +
            t('bid.vs', { n:Math.round(b.offer / p.value * 100) }) + '</small></div>' +
          '<div class="ba">' + (b.out ? ''
            : '<button class="btn sm ghost" data-talk="' + i + '">' + t('btn.talk') + '</button>' +
              '<button class="btn sm" data-take="' + i + '">' + t('btn.take') + '</button>') + '</div>' +
        '</div>').join('') + '</div>' +
      (vivos.length ? '' : '<button class="btn wide" id="mScout">' + t('btn.scout') + '</button>') +
    '</div>' +
    '<div class="mfoot"><span class="hint">' + t('sell.hint') + '</span>' +
      '<button class="btn ghost" id="mCancel">' + t('btn.later') + '</button></div>'
  );
  $('#mx').onclick = closeModal;
  $('#mCancel').onclick = closeModal;
  $('#modalRoot').querySelectorAll('[data-talk]').forEach(b =>
    b.onclick = () => openSellTalk(p, +b.dataset.talk));
  $('#modalRoot').querySelectorAll('[data-take]').forEach(b => b.onclick = () => {
    const bid = bids[+b.dataset.take];
    doSell(p, bid, { fee:bid.offer, pay:0 });
  });
  if ($('#mScout')) $('#mScout').onclick = () => {
    if (G.over) return;
    p.bids = buyersFor(p, .92);
    news(t('news.scout', { name:esc(p.name), n:p.bids.length }), 'rival');
    closeModal();
    tickDay();
  };
}

/* ---- a mesa com um comprador: quanto você pede e como ele paga ---- */
function openSellTalk(p, idx){
  const b = bidsOf(p)[idx];
  if (!b || b.out || G.over) return;
  const d = { fee:b.offer, pay:0 };
  const teto = Math.round(Math.max(p.value * 2.4, b.max * 1.7) / 1e5) * 1e5;
  const seg = (name, opts) => '<div class="seg" data-seg="' + name + '">' +
    opts.map(o => '<button data-val="' + o.v + '">' + o.l + '</button>').join('') + '</div>';

  modal(
    '<div class="mh"><div><h3>' + esc(b.club.n) + '</h3>' +
      '<div class="sub">' + t('talk.sub', { name:esc(p.name), pos:posName(p), ovr:p.ovr,
        r:Math.min(SELL_ROUNDS - b.talks + 1, SELL_ROUNDS), n:SELL_ROUNDS, v:money(b.offer) }) + '</div></div>' +
      '<button class="x" id="mx" aria-label="' + t('btn.closemodal') + '">✕</button></div>' +
    '<div class="meter"><div class="mk"><span>' + t('talk.meter') + '</span><b id="mtVal">—</b></div>' +
      '<div class="mtrack"><i id="mtFill"></i><span class="mthr" style="left:66.6%"></span></div>' +
      '<div class="mlegend"><span id="mtMood">—</span><span>' + t('talk.limit', { club:esc(b.club.n) }) + '</span></div></div>' +
    '<div class="negotiate">' +
      '<div class="msg mid"><span class="who">' + esc(b.club.n) + '</span>' +
        t('talk.open', { name:esc(p.name), v:money(b.offer), want:wantLab(b.want).toLowerCase() }) + '</div>' +

      '<div class="term"><div class="k"><span>' + t('talk.ask') + '</span><b id="feeOut"></b></div>' +
        '<input type="range" id="feeR" min="100000" max="' + teto + '" step="100000" value="' + d.fee + '">' +
        '<div class="quick"><button data-fee="offer">' + t('q.theirs') + '</button>' +
        '<button data-fee="value">' + t('q.value') + '</button>' +
        '<button data-fee="1.1">+10%</button><button data-fee="1.25">+25%</button>' +
        '<button data-fee="0.92">-8%</button></div></div>' +

      '<div class="term"><div class="k"><span>' + t('talk.pay') + '</span><b id="payOut"></b></div>' +
        seg('pay', PAY.map((x, i) => ({ v:i, l:payLab(i) }))) +
        '<div class="hint2">' + t('talk.pay.hint') + '</div></div>' +

      '<div class="totals"><div><span>' + t('tot.now') + '</span><b id="tNow"></b></div>' +
        '<div><span>' + t('tot.total') + '</span><b id="tTotal"></b></div>' +
        '<div><span>' + t('sell.frees') + '</span><b id="tFree"></b></div></div>' +
      '<div id="sellMsg"></div>' +
    '</div>' +
    '<div class="mfoot"><span class="hint">' + t('talk.hint') + '</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mBack">' + t('btn.back') + '</button>' +
      '<button class="btn" id="mAsk">' + t('btn.ask', { v:money(d.fee) }) + '</button></div></div>'
  );

  const feeR = $('#feeR');
  const sync = () => {
    d.fee = +feeR.value;
    const now = Math.round(d.fee * PAY[d.pay].now / 1e5) * 1e5;
    $('#feeOut').textContent = money(d.fee);
    $('#payOut').textContent = payLab(d.pay);
    $('#tNow').textContent = money(now);
    $('#tTotal').textContent = money(d.fee);
    $('#tFree').textContent = wageFmt(p.paidWage ?? p.wage);
    $('#modalRoot').querySelectorAll('[data-seg]').forEach(g => {
      const cur = String(d[g.dataset.seg]);
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.val === cur));
    });
    const r = bidRatio(b, d);
    const [mood, cls] = bidMood(r);
    $('#mtVal').textContent = Math.round(r * 100) + '%';
    $('#mtFill').style.width = clamp(r / 1.5 * 100, 2, 100) + '%';
    $('#mtFill').className = cls;
    $('#mtMood').textContent = mood;
    $('#mtMood').style.color = 'var(--' + cls + ')';
    $('#mAsk').disabled = b.talks <= 0 || b.out;
    $('#mAsk').textContent = t('btn.ask', { v:money(d.fee) });
  };
  const unlock = () => { const x = $('#sellMsg'); if (x){ delete x.dataset.locked; x.innerHTML = ''; } };
  feeR.addEventListener('input', () => { unlock(); sync(); });
  $('#modalRoot').querySelectorAll('[data-fee]').forEach(x => x.onclick = () => {
    const v = x.dataset.fee;
    feeR.value = Math.min(teto, v === 'offer' ? b.offer : v === 'value' ? p.value
      : Math.round(d.fee * parseFloat(v) / 1e5) * 1e5);
    unlock(); sync();
  });
  $('#modalRoot').querySelectorAll('[data-seg]').forEach(g => g.addEventListener('click', e => {
    const x = e.target.closest('[data-val]');
    if (!x) return;
    d[g.dataset.seg] = +x.dataset.val;
    unlock(); sync();
  }));
  $('#mx').onclick = closeModal;
  $('#mBack').onclick = () => openSell(p.id);
  $('#mAsk').onclick = () => askSell(p, b, d);
  sync();
}

/* o quanto a pedida pesa no bolso do comprador: 1 é exatamente o teto dele */
function bidRatio(b, d){ return d.fee / PAY[d.pay].tol / b.max; }
function bidMood(r){
  return r <= .9 ? [t('bidmood.easy'), 'pos'] : r <= 1 ? [t('bidmood.limit'), 'pos']
       : r <= 1.15 ? [t('bidmood.push'), 'amber'] : [t('bidmood.no'), 'neg'];
}
function askSell(p, b, d){
  if (G.over || b.out || b.talks <= 0) return;
  const box = $('#sellMsg');
  const lock = html => { if (box){ box.dataset.locked = '1'; box.innerHTML = html; } };
  const who = '<span class="who">' + esc(b.club.n) + '</span>';
  b.talks--;
  const r = bidRatio(b, d);

  if (r <= 1){
    b.offer = Math.max(b.offer, d.pay ? Math.round(d.fee / PAY[d.pay].tol / 1e5) * 1e5 : d.fee);
    lock('<div class="msg ok">' + who + t('talk.yes', { v:money(d.fee), pay:payLab(d.pay).toLowerCase() }) + '</div>' +
      '<div style="margin-top:10px"><button class="btn wide" id="mClose">' +
      t('btn.closedeal', { v:money(Math.round(d.fee * PAY[d.pay].now / 1e5) * 1e5) }) + '</button></div>');
    $('#mClose').onclick = () => doSell(p, b, d);
    news(t('news.bidyes', { club:esc(b.club.n), name:esc(p.name), v:money(d.fee) }), 'rival');
    if ($('#mAsk')) $('#mAsk').disabled = true;
    renderAll();
    return;
  }

  if (r <= 1.15){
    const c = { fee:Math.round(b.max * .98 * PAY[d.pay].tol / 1e5) * 1e5, pay:d.pay };
    b.offer = Math.max(b.offer, Math.round(c.fee / PAY[c.pay].tol / 1e5) * 1e5);
    lock('<div class="msg mid">' + who + t('talk.counter', { v:money(c.fee), pay:payLab(c.pay).toLowerCase() }) +
      (b.talks <= 0 ? '<br><br>' + t('talk.last') : '') + '</div>' +
      '<div style="margin-top:10px"><button class="btn wide" id="mClose">' +
      t('btn.closedeal', { v:money(Math.round(c.fee * PAY[c.pay].now / 1e5) * 1e5) }) + '</button></div>');
    $('#mClose').onclick = () => doSell(p, b, c);
    news(t('news.bidcounter', { club:esc(b.club.n), name:esc(p.name), v:money(c.fee) }), 'rival');
  } else {
    b.max = Math.round(b.max * .97 / 1e5) * 1e5;
    if (b.talks <= 0){
      b.out = true;
      lock('<div class="msg no">' + who + t('talk.walk', { name:esc(p.name) }) + '</div>');
      news(t('news.bidout', { club:esc(b.club.n), name:esc(p.name) }), 'bad');
    } else {
      lock('<div class="msg no">' + who + t('talk.no', { v:money(b.max) }) + '<br><br>' +
        t('talk.left', { n:b.talks }) + '</div>');
      news(t('news.bidno', { club:esc(b.club.n), name:esc(p.name) }), 'bad');
    }
  }
  rivalMove(p, b);
  if ($('#mAsk')) $('#mAsk').disabled = b.talks <= 0 || b.out;
  renderAll();
}

function doSell(p, b, d){
  if (G.over) return;
  const now = Math.round(d.fee * PAY[d.pay].now / 1e5) * 1e5;
  G.money += now;
  G.wages -= (p.paidWage ?? p.wage);
  G.squad = G.squad.filter(x => x.id !== p.id);
  G.sales.push(Object.assign({}, p, { fee:now, total:d.fee, pay:d.pay, buyer:b.club.n }));
  cleanLineup(); fillEmpty();
  news(d.pay
    ? t('news.sold.inst', { name:esc(p.name), club:esc(b.club.n), v:money(d.fee), now:money(now), pay:payLab(d.pay).toLowerCase() })
    : t('news.sold', { name:esc(p.name), club:esc(b.club.n), v:money(now) }), 'good');
  closeModal();
  renderAll();
  tickDay();
}

/* ---------------- fechamento ---------------- */
function verdictFor(total){
  const k = total >= 90 ? 'v90' : total >= 82 ? 'v82' : total >= 75 ? 'v75' : total >= 68 ? 'v68'
          : total >= 60 ? 'v60' : total >= 52 ? 'v52' : total >= 42 ? 'v42' : 'v0';
  return [t(k + '.h'), t(k + '.p')];
}
function closeWindow(){
  if (G.over) return;
  G.over = true;
  closeModal();
  renderReport();
  window.scrollTo(0, 0);
}
/* o relatório é redesenhado do zero quando o idioma muda, por isso vive à parte */
function renderReport(){
  const ev = evaluate();
  const g = gradeOf(ev.total), win = ev.total >= 68;
  const [h, sub] = verdictFor(ev.total);
  const slots = formSlots();

  const signRows = G.signings.length ? G.signings.map(s => {
    const custo = costOf(s);
    const r = s.value / Math.max(custo, 1e5);
    const line = t(custo === 0 ? 'sign.free'
      : r >= 1.25 ? 'sign.cheap'
      : r >= .95 ? 'sign.fair'
      : r >= .75 ? 'sign.premium' : 'sign.expensive');
    const idx = G.lineup.indexOf(s.id);
    const papel = roleOf(s).toLowerCase();
    const impact = idx >= 0
      ? t(fitPenalty(s, slots[idx]) > ROLE_PEN ? 'sign.starter.out' : 'sign.starter', { slot:slotPlain(slots[idx]) })
      : (s.role === 'estrela' || s.role === 'titular')
        ? t('sign.bench.promise', { role:papel }) : t('sign.bench');
    const contrato = t('sign.contract', { years:anos(s.years || 3), role:papel, fee:money(s.fee),
        sign:money(s.signBonus || 0), agent:money(s.agentFee || 0), wage:wageFmt(s.paidWage) }) +
      (s.clause ? t('sign.clause', { v:money(s.value * s.clause) }) : t('sign.clause.none'));
    return '<div class="crow"><div class="t2"><span class="nm">' + esc(s.name) + ' <span style="color:var(--dim);font-weight:400">' + posPlain(s) + ' ' + s.ovr + '</span></span>' +
      '<span class="sc">' + money(custo) + '</span></div><p>' + contrato + '</p><p>' + line + impact + '</p></div>';
  }).join('') : '<div class="empty">' + t('report.nosign') + '</div>';

  const xiRows = slots.map((s, i) => {
    const p = G.squad.find(x => x.id === G.lineup[i]);
    if (!p) return '<div class="crow"><div class="t2"><span class="nm" style="color:var(--neg)">' +
      t('report.vacancy', { slot:slotPlain(s) }) + '</span></div></div>';
    const pen = fitPenalty(p, s);
    return '<div class="crow"><div class="t2"><span class="nm"><span style="color:var(--dim);font-weight:400">' + slotPlain(s) + '</span> ' + esc(p.name) +
      (p.signed ? ' <span class="chip gem">' + t('chip.reinforcement') + '</span>' : '') + '</span>' +
      '<span class="sc"' + (pen > ROLE_PEN ? ' style="color:var(--neg)"' : '') + '>' + effOvr(p, s) + (pen ? ' (' + posPlain(p) + ')' : '') + '</span></div></div>';
  }).join('');

  const goalRows = ev.goals.map(({ g, p }) =>
    '<div class="crow"><div class="t2"><span class="nm"' + (p >= 1 ? '' : ' style="color:var(--dim)"') + '>' +
      (p >= 1 ? '✓ ' : '✗ ') + goalText(g) + '</span>' +
      '<span class="sc"' + (p >= 1 ? '' : ' style="color:var(--neg)"') + '>' + (p * g.pts).toFixed(1) + ' / ' + g.pts + '</span></div>' +
    '<p>' + goalNow(g) + '</p></div>').join('');

  const compRows = ev.comps.map(c =>
    '<div class="crow"><div class="t2"><span class="nm">' + c.k + '</span><span class="sc">' + c.v.toFixed(1) + ' / ' + c.max + '</span></div>' +
    '<div class="bar" style="margin-top:8px"><i class="' + (c.v / c.max >= .7 ? 'pos' : c.v / c.max >= .4 ? 'amber' : 'neg') + '" style="width:' + (c.v / c.max * 100) + '%"></i></div>' +
    '<p>' + c.note + '</p></div>').join('') +
    ev.pen.map(p => '<div class="crow"><div class="t2"><span class="nm" style="color:var(--neg)">' + p.k + '</span><span class="sc" style="color:var(--neg)">' + p.v + '</span></div></div>').join('');

  $('#screenReport').innerHTML =
    '<div class="verdict">' +
      '<div class="stamp ' + (win ? 'win' : 'lose') + '">' + t(win ? 'report.win' : 'report.lose') + '</div>' +
      '<div class="big" style="color:' + gradeColor(ev.total) + '">' + g + '</div>' +
      '<h2>' + h + '</h2><p>' + sub + '</p>' +
      '<div style="font-family:var(--f-mono);font-size:12px;color:var(--dim);margin-top:16px">' +
        t('report.meta', { club:esc(G.club.n), mode:modeName(G.mode).toLowerCase(),
          ap: G.aporte ? t('report.meta.ap', { ap:apName(G.aporte.id).toLowerCase() }) : '',
          pts:Math.round(ev.total), form:G.form, a:G.baseXI.toFixed(1), b:ev.xi.toFixed(1),
          in:G.signings.length, out:G.sales.length, spend:money(ev.spend), cash:money(G.money) }) +
      '</div>' +
      '<div class="actions" style="justify-content:center">' +
        (G.season || SIM ? '' : '<button class="btn" id="btnSeason">' + t('season.btn') + '</button>') +
        '<button class="btn ghost" id="btnAgain">' + t('report.again') + '</button></div>' +
      (SIM ? simStageHtml() : G.season ? '' : '<p class="hint" style="margin-top:12px">' + t('season.hint') + '</p>') +
    '</div>' +
    '<div class="rgrid">' +
      '<div><div class="pnl"><header><h3>' + t('report.goals') + '</h3><span class="r">' + ev.feitas + '/' + ev.goals.length + '</span></header>' + goalRows + '</div>' +
      '<div class="pnl"><header><h3>' + t('report.score') + '</h3><span class="r">' + t('report.pts', { n:Math.round(ev.total) }) + '</span></header>' + compRows + '</div></div>' +
      '<div><div class="pnl"><header><h3>' + t('report.signings') + '</h3><span class="r">' + G.signings.length + '</span></header>' + signRows + '</div>' +
      '<div class="pnl"><header><h3>' + t('report.xi') + '</h3><span class="r">' + G.form + '</span></header>' + xiRows + '</div></div>' +
    '</div>' +
    (G.season ? seasonHtml(G.season) : '');
  $('#screenDesk').hidden = true;
  $('#screenReport').hidden = false;
  if ($('#btnSeason')) $('#btnSeason').onclick = runSeason;
  $('#btnAgain').onclick = () => {
    /* janela nova: chances de sorteio de volta e todo clube guardado é descartado */
    simAbort();
    Object.keys(SAVED).forEach(k => delete SAVED[k]);
    REROLLS = MODES[MODE].rerolls;
    drawGame(false);
    $('#screenReport').hidden = true;
    $('#screenIntro').hidden = false;
    $('#hud').hidden = true;
    $('#tickerBar').hidden = true;
    window.scrollTo(0, 0);
  };
}

/* ---------------- eventos ---------------- */
function initSelects(){
  $('#pickLiga').innerHTML = '<option value="">' + t('select.anyliga') + '</option>' +
    LIGAS.map(l => '<option value="' + l.id + '">' + esc(l.nome) + ' · ' + esc(paisName(l.pais)) + '</option>').join('');
  $('#fLiga').innerHTML = '<option value="">' + t('f.liga.all') + '</option>' +
    LIGAS.map(l => '<option value="' + esc(l.nome) + '">' + esc(l.nome) + '</option>').join('');
  $('#fForm').innerHTML = Object.keys(FORMS).map(f => '<option value="' + f + '">' + f + '</option>').join('');
}
function setTab(t){
  TAB = t;
  SEL = null;
  $('#tabMarket').setAttribute('aria-selected', String(t === 'market'));
  $('#tabCentral').setAttribute('aria-selected', String(t === 'central'));
  $('#tabSquad').setAttribute('aria-selected', String(t === 'squad'));
  $('#tabLineup').setAttribute('aria-selected', String(t === 'lineup'));
  renderCenter();
}
/* ---- seleção de modo, liga e clube na tela de abertura ---- */
function ligaAtual(){ return MODES[MODE].sorteiaLiga ? null : ($('#pickLiga').value || null); }
function aporteAtual(){ return MODES[MODE].aporte ? APORTE : 'nenhum'; }
function initAportes(){
  $('#aporteSeg').innerHTML = APORTES.map(a =>
    '<button data-ap="' + a.id + '"><b>' + apName(a.id) + '</b>' +
      (a.id === 'nenhum' ? '<em>' + t('ap.none.sub') + '</em>'
        : '<em>' + (a.caixa > 1 ? t('ap.cash.up', { n:Math.round((a.caixa - 1) * 100) }) : t('ap.cash.same')) + ' · ' +
          (a.teto > 1 ? t('ap.cap.up', { n:Math.round((a.teto - 1) * 100) }) : t('ap.cap.same')) + '</em>') +
      '<small>' + apDesc(a.id) + '</small></button>').join('');
}
function fillClubes(){
  const id = ligaAtual();
  const ligas = LIGAS.filter(l => !id || l.id === id);
  $('#pickClube').innerHTML = ligas.map(l => '<optgroup label="' + esc(l.nome) + '">' +
    l.clubes.slice().sort((a, b) => a.n.localeCompare(b.n))
      .map(c => '<option value="' + esc(c.n) + '">' + t('select.club.level', { club:esc(c.n), lvl:c.lvl }) + '</option>').join('') +
    '</optgroup>').join('');
  if (G && ligas.some(l => l.clubes.some(c => c.n === G.club.n))) $('#pickClube').value = G.club.n;
}
function renderSetup(){
  const m = MODES[MODE];
  $('#modeBar').querySelectorAll('[data-mode]').forEach(b => {
    const on = b.dataset.mode === MODE;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  $('#pickLiga').hidden = !!m.sorteiaLiga;
  /* no difícil trocar de liga é um novo sorteio: sem chances, a liga trava junto */
  $('#pickLiga').disabled = !!m.rerolls && !REROLLS;
  $('#pickClube').hidden = !m.escolhe;
  $('#aporteWrap').hidden = !m.aporte;
  $('#aporteSeg').querySelectorAll('[data-ap]').forEach(b => {
    const on = b.dataset.ap === APORTE;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
  $('#btnReroll').hidden = !m.rerolls;
  $('#btnReroll').disabled = !REROLLS;
  $('#rerollLeft').textContent = REROLLS ? '(' + REROLLS + ')' : '(0)';
  if (m.escolhe) fillClubes();
}
/* redesenha o jogo com o que está escolhido na tela; `sorteio` gasta uma das chances do difícil */
function drawGame(sorteio){
  if (sorteio){
    if (!REROLLS) return;
    REROLLS--;
  }
  newGame(ligaAtual(), MODES[MODE].escolhe ? $('#pickClube').value : null, aporteAtual());
  renderSetup();
  renderIntro();
}
/* cada modo guarda o clube que já saiu nele: voltar para a aba não é um sorteio novo.
   Sem isso, clicar em "expert" de novo seria um re-sorteio infinito. */
const SAVED = {};
function setMode(m){
  if (!MODES[m] || m === MODE) return;
  if (G) SAVED[MODE] = { g:G, rerolls:REROLLS, aporte:APORTE, liga:$('#pickLiga').value };
  MODE = m;
  const s = SAVED[m];
  if (s){
    G = s.g;
    REROLLS = s.rerolls;
    APORTE = s.aporte;
    $('#pickLiga').value = s.liga;
    renderSetup();
    renderIntro();
    return;
  }
  REROLLS = MODES[m].rerolls;
  renderSetup();
  drawGame(false);
}
$('#modeBar').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]');
  if (b) setMode(b.dataset.mode);
});
$('#btnStart').onclick = () => { $('#screenIntro').hidden = true; $('#screenDesk').hidden = false; renderAll(); };
$('#btnReroll').onclick = () => drawGame(true);
$('#pickLiga').onchange = () => {
  if (MODES[MODE].escolhe) fillClubes();
  drawGame(!!MODES[MODE].rerolls);   /* trocar de liga no difícil consome um sorteio */
};
$('#pickClube').onchange = () => drawGame(false);
$('#aporteSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-ap]');
  if (!b || b.dataset.ap === APORTE) return;
  APORTE = b.dataset.ap;
  drawGame(false);   /* trocar de investidor não gasta sorteio: o clube é o mesmo */
});
$('#btnClose').onclick = closeWindow;
$('#tabMarket').onclick = () => setTab('market');
$('#tabCentral').onclick = () => setTab('central');
$('#tabSquad').onclick = () => setTab('squad');
$('#tabLineup').onclick = () => setTab('lineup');
$('#fForm').onchange = () => {
  G.form = $('#fForm').value;
  G.lineup = bestXI(G.squad);
  SEL = null;
  recomputeBaseline();
  news(t('news.form', { form:G.form }), '');
  renderAll();
};
$('#btnAuto').onclick = () => { G.lineup = bestXI(G.squad); SEL = null; renderAll(); };
Object.keys(FILTER_DEFAULTS).forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener(el.type === 'search' || el.type === 'range' ? 'input' : 'change', renderList);
});
$('#fClear').onclick = zerarFiltros;
$('#listWrap').addEventListener('click', e => {
  const w = e.target.closest('[data-watch]');
  if (w){ toggleWatch(+w.dataset.watch); return; }
  const n = e.target.closest('[data-neg]'), s = e.target.closest('[data-sell]');
  if (n) openNegotiation(+n.dataset.neg);
  if (s) openSell(+s.dataset.sell);
});
$('#pitchSlots').addEventListener('click', e => {
  const rm = e.target.closest('[data-rm]');
  if (rm){ e.stopPropagation(); G.lineup[+rm.dataset.rm] = null; SEL = null; renderAll(); return; }
  const sl = e.target.closest('[data-slot]');
  if (sl) clickSlot(+sl.dataset.slot);
});
$('#needBar').addEventListener('click', e => {
  const b = e.target.closest('[data-need]');
  if (!b) return;
  $('#fPos').value = b.dataset.need;
  $('#fName').value = '';
  $('#fNeed').checked = false;
  $('#fSort').value = 'ovr';
  setTab('market');
});
$('#bench').addEventListener('click', e => {
  const b = e.target.closest('[data-bench]');
  if (b) clickBench(+b.dataset.bench);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeModal(); if (SEL){ SEL = null; if (TAB === 'lineup') renderLineup(); } } });

$('#langBar').addEventListener('click', e => {
  const b = e.target.closest('[data-lang]');
  if (b) setLang(b.dataset.lang);
});

initLang();
initSelects();
initAportes();
REROLLS = MODES[MODE].rerolls;
renderSetup();
drawGame(false);
