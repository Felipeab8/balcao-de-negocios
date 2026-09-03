/* Balcão de Negócios — lógica do jogo.
   Depende dos arquivos de data/ (window.LIGAS e window.NOMES) carregados antes. */

const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- posições e táticas ---------------- */
const POS = [
  {id:'GOL', name:'Goleiro',   depth:2},
  {id:'ZAG', name:'Zagueiro',  depth:4},
  {id:'LAT', name:'Lateral',   depth:4},
  {id:'VOL', name:'Volante',   depth:4},
  {id:'MEI', name:'Meia',      depth:2},
  {id:'PON', name:'Ponta',     depth:3},
  {id:'ATA', name:'Atacante',  depth:2}
];
const POSMAP = Object.fromEntries(POS.map(p => [p.id, p]));
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
function slotsOf(pos){ return (FORMS[G.form] || FORMS['4-3-3']).filter(s => s.p === pos).length; }
function formSlots(){ return FORMS[G.form] || FORMS['4-3-3']; }
function penalty(slotPos, playerPos){
  const v = (COMPAT[slotPos] || {})[playerPos];
  if (v !== undefined) return v;
  return (slotPos === 'GOL' || playerPos === 'GOL') ? 15 : 9;
}
function effOvr(p, slotPos){ return p ? p.ovr - penalty(slotPos, p.pos) : 42; }

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
  if (v >= 1e6) return '€ ' + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace('.', ',') + ' mi';
  return '€ ' + Math.round(v / 1e3) + ' mil';
}
function wageFmt(v){ return '€ ' + Math.round(v / 1e3) + ' mil/sem'; }

/* ---------------- jogadores ---------------- */
let UID = 1;
function realPlayer(row, club){
  const [name, pos, age, ovr] = row;
  const pot = potOf(ovr, age);
  return { id:UID++, pos, name, age, ovr, pot, value:valueOf(ovr, age, pot), wage:wageOf(ovr, age),
    club:club.n, clubLvl:club.lvl, liga:club.liga.nome, real:true, attempts:0, gone:false };
}
function fakePlayer(posId, ovr, opts = {}){
  ovr = clamp(Math.round(ovr), 52, 90);
  const age = opts.age ?? (Math.random() < .35 ? ri(18, 22) : Math.random() < .7 ? ri(23, 28) : ri(29, 34));
  const pot = potOf(ovr, age);
  const pool = window.NOMES[opts.pool] || window.NOMES.BRA;
  return { id:UID++, pos:posId, name:pick(pool.f) + ' ' + pick(pool.s), age, ovr, pot,
    value:valueOf(ovr, age, pot), wage:wageOf(ovr, age),
    club:opts.club ?? 'Sem clube', liga:opts.liga ?? '—', attempts:0, gone:false };
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
function tagsOf(p, lvl){
  const t = [];
  const r = reachOf(p);
  if (r === 'fora') t.push(['out','fora do alcance']);
  else if (r === 'dificil') t.push(['hard','outro patamar']);
  if (p.free) t.push(['free','livre']);
  if (p.age <= 21 && p.pot - p.ovr >= 7) t.push(['gem','joia']);
  if (p.ovr >= lvl + 6) t.push(['star','estrela']);
  if (p.age >= 33) t.push(['vet','veterano']);
  return t;
}

/* ---------------- escalação ---------------- */
function bestXI(squad){
  const slots = formSlots();
  const used = new Set();
  const line = new Array(slots.length).fill(null);
  const order = slots.map((s, i) => ({ i, s, cnt: squad.filter(p => p.pos === s.p).length }))
                     .sort((a, b) => a.cnt - b.cnt);
  for (const { i, s } of order){
    let best = null, bv = -1;
    for (const p of squad){
      if (used.has(p.id)) continue;
      const v = effOvr(p, s.p);
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
    sum += p ? effOvr(p, slots[i].p) : 42;
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
      const v = effOvr(p, slots[i].p);
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
    const g = effOvr(p, slots[i].p) - effOvr(cur, slots[i].p);
    if (g > gain){ gain = g; bi = i; }
  }
  if (bi < 0) return null;
  G.lineup[bi] = p.id;
  return slots[bi].p;
}
function benchList(){
  const inXI = new Set(G.lineup.filter(Boolean));
  const ord = POS.map(p => p.id);
  return G.squad.filter(p => !inXI.has(p.id))
    .sort((a, b) => ord.indexOf(a.pos) - ord.indexOf(b.pos) || b.ovr - a.ovr);
}

/* quanto a posição melhorou desde a abertura da janela (5.0 = crédito cheio na nota) */
const NEED_FULL = 5;
function needProgress(pos){
  return clamp((posStrength(G.squad, pos) - G.baseStrength[pos]) / NEED_FULL, 0, 1);
}
function needState(pos){
  const n = G.needs[pos];
  if (n === 'ok') return 'ok';
  return needProgress(pos) >= 1 ? 'done' : n;
}
function posStrength(squad, posId){
  const n = Math.max(1, slotsOf(posId));
  const list = squad.filter(x => x.pos === posId).sort((a, b) => b.ovr - a.ovr);
  let s = 0;
  for (let i = 0; i < n; i++) s += list[i] ? list[i].ovr : 42;
  return s / n;
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
}
function newGame(ligaId){
  const pool = ligaId ? ALL_CLUBS.filter(c => c.liga.id === ligaId) : ALL_CLUBS;
  const c = pick(pool);
  const squad = buildSquad(c);
  const wages = squad.reduce((s, p) => s + p.wage, 0);
  /* caixa ancorado no que custa um reforço de dois pontos acima do elenco: ~3 alvos por janela */
  const budget = Math.round(clamp(2.0 * valueOf(c.lvl + 2, 26, c.lvl + 4), 1e7, 2.4e8) / 1e5) * 1e5;

  G = {
    club: c, lvl: c.lvl, squad, squad0: squad.slice(), market: buildMarket(c),
    form: '4-3-3', lineup: [],
    money: budget, budget0: budget,
    wageCap: Math.round(wages * rnd(1.3, 1.58) / 1000) * 1000,
    wages, day: 1, maxDays: 18,
    signings: [], sales: [], feed: [], over: false
  };
  G.lineup = bestXI(squad);
  recomputeBaseline();
  news('Janela aberta. O ' + c.n + ' tem ' + money(G.money) + ' em caixa e ' + G.maxDays + ' dias para se resolver. O mercado inteiro atende o telefone.', '');
  return G;
}
function dificuldade(){
  return G.lvl >= 83 ? ['Alta', 'elenco de elite: o mundo inteiro atende, mas subir esse time de patamar custa uma fortuna']
       : G.lvl >= 76 ? ['Média', 'há upgrade em quase toda posição; as estrelas dos gigantes é que não atendem']
       : ['Acessível', 'elenco com muito o que melhorar — e alvos baratos de sobra dentro do seu alcance'];
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
    news('<b>Gongo.</b> A janela fechou — vale o que está assinado.', 'rival');
    closeWindow();
    return;
  }
  if (Math.random() < .28){
    const live = G.market.filter(p => !p.gone && !p.free).sort((a, b) => b.ovr - a.ovr).slice(0, 120);
    if (live.length){
      const t = pick(live);
      t.gone = true;
      let rival = pick(ALL_CLUBS);
      if (rival === G.club) rival = pick(ALL_CLUBS);
      news('<b>' + esc(t.name) + '</b> (' + t.pos + ' ' + t.ovr + ') fechou com o ' + esc(rival.n) + '. Fora do mercado.', 'rival');
    }
  }
  if (G.day === G.maxDays) news('<b>Último dia de janela.</b> Depois disso, só o que estiver assinado conta.', 'rival');
  renderAll();
}

/* ---------------- avaliação ---------------- */
function evaluate(){
  const s = G.signings;
  const xi = lineupRating(G.lineup);
  const delta = xi - G.baseXI;
  const spend = s.reduce((a, x) => a + x.fee, 0);
  const valueIn = s.reduce((a, x) => a + x.value, 0);
  const comps = [];

  const c1 = clamp(delta / 3.0, 0, 1) * 30;
  comps.push({ k:'Impacto na escalação', v:c1, max:30,
    note:(delta >= 0 ? '+' : '') + delta.toFixed(2) + ' de força no XI · ' + G.form });

  let wSum = 0, wGot = 0;
  for (const p of POS){
    const w = G.needs[p.id] === 'crit' ? 1 : G.needs[p.id] === 'soft' ? .5 : 0;
    if (!w) continue;
    wSum += w;
    wGot += w * needProgress(p.id);
  }
  const c2 = wSum ? (wGot / wSum) * 25 : 25;
  comps.push({ k:'Carências resolvidas', v:c2, max:25,
    note: wSum ? Math.round((wGot / wSum) * 100) + '% dos buracos cobertos' : 'elenco já estava equilibrado' });

  let c3;
  if (!s.length) c3 = 3;
  else { const ratio = valueIn / Math.max(spend, 1e5); c3 = clamp((ratio - .78) / .62, 0, 1) * 20; }
  comps.push({ k:'Custo-benefício', v:c3, max:20,
    note: s.length ? money(spend) + ' gastos por ' + money(valueIn) + ' de mercado' : 'nenhuma contratação' });

  let c4 = 0;
  if (s.length){
    const avg = s.reduce((a, x) => a + clamp((x.pot - x.ovr) / 7, 0, 1) * .52 + clamp((32 - x.age) / 12.5, 0, 1) * .48, 0) / s.length;
    c4 = avg * 15;
  }
  comps.push({ k:'Projeto de futuro', v:c4, max:15,
    note: s.length ? 'média de ' + (s.reduce((a, x) => a + x.age, 0) / s.length).toFixed(1) + ' anos' : 'sem novos nomes' });

  let c5 = 0;
  if (G.wages <= G.wageCap) c5 += 6;
  const usage = 1 - G.money / Math.max(G.budget0, 1);
  c5 += clamp(usage / .55, 0, 1) * 4;
  comps.push({ k:'Saúde financeira', v:c5, max:10,
    note:(G.wages <= G.wageCap ? 'folha dentro do teto' : 'FOLHA ESTOURADA') + ' · ' + Math.round(usage * 100) + '% do caixa usado' });

  const pen = [];
  const vagas = G.lineup.filter(x => !x).length;
  if (vagas) pen.push({ k:'Escalação incompleta (' + vagas + (vagas > 1 ? ' vagas' : ' vaga') + ')', v:-6 * vagas });
  const fora = G.lineup.reduce((a, id, i) => {
    const p = G.squad.find(x => x.id === id);
    return a + (p && p.pos !== formSlots()[i].p ? 1 : 0);
  }, 0);
  if (fora >= 3) pen.push({ k:fora + ' jogadores fora de posição', v:-4 });
  for (const p of POS){
    const need = slotsOf(p.id);
    const have = G.squad.filter(x => x.pos === p.id).length;
    if (have < need) pen.push({ k:'Sem elenco para a posição: ' + p.name, v:-7 * (need - have) });
  }
  if (s.length > 9) pen.push({ k:'Elenco inchado (' + s.length + ' contratações)', v:-5 });
  if (G.wages > G.wageCap) pen.push({ k:'Teto salarial estourado', v:-10 });
  if (!s.length && G.day > 1) pen.push({ k:'Janela sem reforço nenhum', v:-8 });

  const total = clamp(comps.reduce((a, c) => a + c.v, 0) + pen.reduce((a, c) => a + c.v, 0), 0, 100);
  return { comps, pen, total, delta, xi, spend, valueIn };
}
function gradeOf(t){
  return t >= 92 ? 'A+' : t >= 85 ? 'A' : t >= 78 ? 'B+' : t >= 70 ? 'B'
       : t >= 62 ? 'C+' : t >= 54 ? 'C' : t >= 44 ? 'D' : t >= 32 ? 'E' : 'F';
}
function gradeColor(t){ return t >= 70 ? 'var(--pos)' : t >= 54 ? 'var(--amber)' : 'var(--neg)'; }

/* ---------------- render ---------------- */
function renderIntro(){
  const c = G.club;
  $('#fForm').value = G.form;
  const ini = c.n.replace(/^(FC|AC|AS|SC|RC|AJ|OGC|KV|KAA|KRC|RB|VfB|VfL|TSG|1\.)\s+/, '')
               .split(/[\s-]/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  const needList = POS.filter(p => G.needs[p.id] !== 'ok')
    .map(p => p.name.toLowerCase() + (G.needs[p.id] === 'crit' ? ' (crítica)' : ''));
  const [dif, difTxt] = dificuldade();
  const reais = (c.p || []).length;
  $('#dossier').innerHTML =
    '<div class="hd"><span class="t">Dossiê do clube</span><span class="t">' + esc(c.liga.nome) + ' · ' + esc(c.liga.pais) + '</span></div>' +
    '<div class="club-line">' +
      '<div class="crest" style="background:' + c.c1 + ';color:' + c.c2 + '">' + ini + '</div>' +
      '<div><h2>' + esc(c.n) + '</h2><div class="sub">' + esc(c.cid) + ' · nível de elenco ' + c.lvl + ' · dificuldade ' + dif.toLowerCase() + '</div></div>' +
    '</div>' +
    '<div class="dgrid">' +
      '<div><div class="k">Caixa para contratar</div><div class="v" style="color:var(--amber)">' + money(G.money) + '</div></div>' +
      '<div><div class="k">Folga na folha</div><div class="v">' + wageFmt(G.wageCap - G.wages) + '</div></div>' +
      '<div><div class="k">Força do XI (' + G.form + ')</div><div class="v">' + G.baseXI.toFixed(1) + '</div></div>' +
      '<div><div class="k">Jogadores no elenco</div><div class="v">' + G.squad.length + '</div></div>' +
    '</div>' +
    '<div class="board"><div class="k">Leitura do mercado</div><p>Dificuldade <b>' + dif.toLowerCase() + '</b>: ' + difTxt + '.</p></div>' +
    '<div class="board" style="background:var(--panel)"><div class="k">Relatório do scouting</div>' +
      '<p>Posições apontadas como <b>carência</b>: ' + (needList.length ? needList.join(', ') : 'nenhuma') + '.<br>' +
      '<span style="color:var(--dim);font-size:12px">' + reais + ' jogadores reais em base; a reserva é completada por atletas gerados.</span></p></div>';
}
function renderHud(){
  const ev = evaluate();
  $('#hud').hidden = false;
  $('#hud').innerHTML =
    '<div class="cell"><div class="k">Dia</div><div class="v">' + G.day + '<span style="color:var(--dim);font-size:12px">/' + G.maxDays + '</span></div></div>' +
    '<div class="cell"><div class="k">Caixa</div><div class="v amber">' + money(G.money) + '</div></div>' +
    '<div class="cell"><div class="k">Folha livre</div><div class="v ' + (G.wages > G.wageCap ? 'neg' : 'pos') + '">' + wageFmt(G.wageCap - G.wages) + '</div></div>' +
    '<div class="cell"><div class="k">Nota parcial</div><div class="v" style="color:' + gradeColor(ev.total) + '">' + gradeOf(ev.total) + '</div></div>';
  $('#topTag').textContent = G.club.n + ' · ' + G.club.liga.nome;
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
    rows.push('<div class="srow">' +
      '<div class="pos ' + cls + '">' + p.id + '</div>' +
      '<div class="nm"><b>' + (list[0] ? esc(list[0].name) : '<span style="color:var(--neg)">vazio</span>') + '</b>' +
        '<small>' + list.length + ' no grupo · ' + (vagas ? vagas + ' vaga' + (vagas > 1 ? 's' : '') + ' no XI' : 'fora do esquema') + '</small></div>' +
      '<div class="ovr">' + now.toFixed(0) +
        (Math.abs(d) >= .5 ? '<small class="' + (d < 0 ? 'neg' : '') + '">' + (d > 0 ? '+' : '') + d.toFixed(1) + '</small>' : '') +
      '</div></div>');
  }
  $('#squadList').innerHTML = rows.join('');
  $('#squadCount').textContent = G.squad.length + ' atletas';

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

/* ---------------- centro: mercado / elenco / escalação ---------------- */
let TAB = 'market';
let SEL = null;

function currentList(){
  const posF = $('#fPos').value, ligaF = $('#fLiga').value, sort = $('#fSort').value;
  const q = $('#fName').value.trim().toLowerCase();
  const onlyNeed = $('#fNeed').checked, onlyAfford = $('#fAfford').checked, onlyReach = $('#fReach').checked;
  let list = TAB === 'market' ? G.market.filter(p => !p.gone) : G.squad.slice();
  if (posF) list = list.filter(p => p.pos === posF);
  if (ligaF && TAB === 'market') list = list.filter(p => p.liga === ligaF);
  if (q) list = list.filter(p => (p.name + ' ' + p.club).toLowerCase().includes(q));
  if (onlyNeed) list = list.filter(p => G.needs[p.pos] !== 'ok');
  if (onlyAfford && TAB === 'market') list = list.filter(p => p.feeAsk <= G.money && p.wageAsk <= G.wageCap - G.wages);
  if (onlyReach && TAB === 'market') list = list.filter(p => reachOf(p) !== 'fora');
  const cmp = {
    ovr:(a, b) => b.ovr - a.ovr,
    fee:(a, b) => (a.feeAsk ?? a.value) - (b.feeAsk ?? b.value),
    pot:(a, b) => b.pot - a.pot,
    age:(a, b) => a.age - b.age,
    wage:(a, b) => a.wage - b.wage
  }[sort];
  return list.sort(cmp);
}
const LIST_CAP = 250;   /* o mercado tem o mundo inteiro; a tabela mostra os melhores por filtro */
function renderList(){
  const list = currentList();
  const shown = list.slice(0, LIST_CAP);
  $('#listCount').textContent = list.length + (TAB === 'market' ? ' disponíveis' : ' no elenco') +
    (list.length > shown.length ? ' · mostrando ' + shown.length : '');
  if (!list.length){ $('#listWrap').innerHTML = '<div class="empty">Nenhum jogador com esses filtros.</div>'; return; }
  const isMk = TAB === 'market';
  const head = '<thead><tr><th>Pos</th><th>Jogador</th><th class="num">Idade</th><th class="num">OVR</th><th class="num">POT</th>' +
    '<th class="num">' + (isMk ? 'Pedida' : 'Valor') + '</th><th class="num">Salário</th><th></th></tr></thead>';
  const body = shown.map(p => {
    const tags = isMk ? tagsOf(p, G.lvl).map(t => '<span class="chip ' + t[0] + '">' + t[1] + '</span>').join('')
                      : (G.lineup.includes(p.id) ? '<span class="chip xi">titular</span>' : '');
    const fee = isMk ? (p.free ? '<span style="color:var(--blue)">livre</span>' : money(p.feeAsk)) : money(p.value);
    const btn = isMk
      ? '<button class="btn sm" data-neg="' + p.id + '"' + (p.attempts >= MAX_TRIES ? ' disabled' : '') + '>' + (p.attempts >= MAX_TRIES ? 'encerrado' : 'Negociar') + '</button>'
      : '<button class="btn sm ghost" data-sell="' + p.id + '">Vender</button>';
    return '<tr' + (isMk && reachOf(p) === 'fora' ? ' class="unreach"' : '') + '><td><div class="pos ' + (G.needs[p.pos] === 'crit' ? 'crit' : G.needs[p.pos] === 'soft' ? 'soft' : '') + '">' + p.pos + '</div></td>' +
      '<td><div class="pname">' + esc(p.name) + tags + '</div><div class="pmeta">' + esc(p.club) + (isMk ? ' · ' + esc(p.liga) : '') + '</div></td>' +
      '<td class="num">' + p.age + '</td><td class="num" style="font-weight:600">' + p.ovr + '</td>' +
      '<td class="num" style="color:' + (p.pot > p.ovr ? 'var(--amber)' : 'var(--dim)') + '">' + p.pot + '</td>' +
      '<td class="num">' + fee + '</td><td class="num" style="color:var(--muted)">' + wageFmt(isMk ? p.wageAsk : p.wage) + '</td>' +
      '<td style="text-align:right">' + btn + '</td></tr>';
  }).join('');
  const corte = list.length > shown.length
    ? '<div class="empty">Mais ' + (list.length - shown.length) + ' jogadores atendem a esses filtros. Refine por posição, liga ou nome para chegar neles.</div>'
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
    const out = p && p.pos !== s.p;
    const ns = needState(s.p);
    const cls = ['slot', selSlot === i ? 'sel' : '', p ? '' : 'vazio',
      (ns === 'crit' || ns === 'soft') ? 'need ' + ns : ''].filter(Boolean).join(' ');
    const badge = p
      ? '<span class="badge b-' + s.p + (out ? ' out' : '') + '">' + effOvr(p, s.p) + '</span>'
      : '<span class="badge vaga">' + s.p + '</span>';
    const nome = p
      ? '<span class="who">' + esc(p.name.split(' ').slice(-1)[0]) + '</span>' +
        (out ? '<span class="warn">' + p.pos + ' · -' + penalty(s.p, p.pos) + '</span>' : '<span class="mini">' + s.p + '</span>')
      : '<span class="who" style="color:var(--dim)">vaga</span>';
    const carencia = ns === 'crit' ? ' · CARÊNCIA CRÍTICA nesta posição' : ns === 'soft' ? ' · posição a reforçar' : ns === 'done' ? ' · carência resolvida' : '';
    const title = (p ? esc(p.name) + ' — ' + p.ovr + ' de overall' + (out ? ', jogando fora de posição' : '') : 'Vaga de ' + POSMAP[s.p].name) + carencia;
    return '<button class="' + cls + '" style="left:' + s.x + '%;top:' + s.y + '%" data-slot="' + i + '" title="' + title + '">' +
      badge + '<span class="nm">' + nome + '</span>' +
      (p ? '<span class="rm" data-rm="' + i + '" title="Tirar do time">×</span>' : '') + '</button>';
  }).join('');

  const bench = benchList();
  $('#bench').innerHTML = bench.length ? bench.map(p => {
    const fit = selSlot >= 0 ? penalty(slots[selSlot].p, p.pos) : null;
    const cls = ['brow', selBench === p.id ? 'sel' : '', fit === 0 ? 'fit' : '', fit !== null && fit >= 9 ? 'unfit' : ''].filter(Boolean).join(' ');
    return '<button class="' + cls + '" data-bench="' + p.id + '">' +
      '<span class="pos">' + p.pos + '</span>' +
      '<span class="bn">' + esc(p.name) + '<small>' + p.age + ' anos · ' + wageFmt(p.wage) + '</small></span>' +
      '<span class="bo">' + p.ovr + (fit ? '<small>-' + fit + '</small>' : '') + '</span></button>';
  }).join('') : '<div class="empty">Todo o elenco está escalado.</div>';

  const alvos = POS.filter(p => G.needs[p.id] !== 'ok' && slotsOf(p.id));
  $('#needBar').innerHTML = alvos.length ? alvos.map(p => {
    const st = needState(p.id), prog = needProgress(p.id);
    const ganho = posStrength(G.squad, p.id) - G.baseStrength[p.id];
    const lbl = st === 'done' ? 'resolvida' : G.needs[p.id] === 'crit' ? 'crítica' : 'reforçar';
    const num = (ganho >= 0 ? '+' : '') + ganho.toFixed(1).replace('.', ',');
    return '<button class="needchip ' + (st === 'done' ? 'done' : G.needs[p.id]) + '" data-need="' + p.id + '" ' +
      'title="Melhor ' + p.name.toLowerCase() + ' do elenco: ' + posStrength(G.squad, p.id).toFixed(0) +
      ' · nível do clube: ' + G.lvl + '. Clique para filtrar o mercado nesta posição.">' +
      '<span class="nc-t">' + p.name + ' <em>' + lbl + '</em></span>' +
      '<span class="nc-b"><i style="width:' + Math.round(prog * 100) + '%"></i></span>' +
      '<span class="nc-v"><span>' + num + ' de ' + NEED_FULL + ',0</span><span class="go">' + (st === 'done' ? 'feito ✓' : 'ver alvos →') + '</span></span>' +
      '</button>';
  }).join('') : '<div class="allok">Sem carências no <b>' + G.form + '</b> — o elenco cobre todas as posições do esquema.</div>';

  const xi = lineupRating(G.lineup);
  $('#lineupStrength').textContent = xi.toFixed(1);
  $('#lineupDelta').innerHTML = (() => {
    const d = xi - G.baseXI;
    return '<span style="color:' + (d >= 0 ? 'var(--pos)' : 'var(--neg)') + '">' + (d >= 0 ? '+' : '') + d.toFixed(2) + '</span> vs. o XI de abertura';
  })();
  $('#benchCount').textContent = bench.length + ' fora do XI';
  $('#listCount').textContent = G.lineup.filter(Boolean).length + '/11 escalados';
  $('#selHint').textContent = SEL
    ? (SEL.t === 'slot' ? 'Vaga selecionada: escolha um reserva ao lado ou outra posição para trocar.' : 'Reserva selecionado: clique numa posição do campo.')
    : 'Clique num reserva e depois numa posição — ou em dois jogadores do campo para trocá-los.';
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
  if (isLine) renderLineup(); else renderList();
}
function renderRight(){
  const ev = evaluate();
  $('#gLetter').textContent = gradeOf(ev.total);
  $('#gLetter').style.color = gradeColor(ev.total);
  $('#gScore').textContent = Math.round(ev.total) + ' / 100 PONTOS';
  $('#gScale').innerHTML = Array.from({length:20}, (_, i) =>
    '<span class="' + (i < Math.round(ev.total / 5) ? 'on' : '') + '"></span>').join('');
  $('#comps').innerHTML = ev.comps.map(c =>
    '<div class="comp"><div class="k"><span>' + c.k + '</span><b>' + c.v.toFixed(1) + '<span style="color:var(--dim)">/' + c.max + '</span></b></div>' +
    '<div class="bar"><i style="width:' + (c.v / c.max * 100) + '%"></i></div>' +
    '<div style="font-family:var(--f-mono);font-size:10px;color:var(--dim);margin-top:5px">' + c.note + '</div></div>').join('') +
    ev.pen.map(p => '<div class="comp"><div class="k"><span style="color:var(--neg)">' + p.k + '</span><b style="color:var(--neg)">' + p.v + '</b></div></div>').join('');

  const deals = G.signings.map(s =>
    '<div class="deal"><div><div class="n">' + esc(s.name) + '</div><div class="m">chegou · ' + s.pos + ' ' + s.ovr + ' · ' + s.age + ' anos</div></div>' +
    '<div class="p" style="color:var(--neg)">-' + money(s.fee) + '<small>' + wageFmt(s.paidWage) + '</small></div></div>')
    .concat(G.sales.map(s =>
    '<div class="deal"><div><div class="n">' + esc(s.name) + '</div><div class="m">saiu · ' + s.pos + ' ' + s.ovr + '</div></div>' +
    '<div class="p" style="color:var(--pos)">+' + money(s.fee) + '<small>libera ' + wageFmt(s.wage) + '</small></div></div>')).join('');
  $('#deals').innerHTML = deals || '<div class="empty">Nenhum negócio fechado ainda.</div>';
  $('#dealsCount').textContent = G.signings.length + ' in · ' + G.sales.length + ' out';
  const net = G.sales.reduce((a, s) => a + s.fee, 0) - ev.spend;
  $('#netSpend').textContent = (net >= 0 ? '+' : '-') + money(Math.abs(net)).replace('€ ', '');
  $('#feed').innerHTML = G.feed.map(f =>
    '<div class="fitem ' + f.kind + '"><span class="d">' + f.d + '</span><span>' + f.text + '</span></div>').join('');
  $('#btnClose').textContent = G.day >= G.maxDays ? 'Publicar a nota final' : 'Fechar a janela (dia ' + G.day + ')';
}
function renderAll(){ renderHud(); renderSquad(); renderCenter(); renderRight(); renderTicker(); }

/* ---------------- negociação ---------------- */
function closeModal(){ $('#modalRoot').innerHTML = ''; }
function modal(html){
  $('#modalRoot').innerHTML = '<div class="scrim" id="scrim"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
  $('#scrim').addEventListener('mousedown', e => { if (e.target.id === 'scrim') closeModal(); });
}
function openNegotiation(id){
  const p = G.market.find(x => x.id === id);
  if (!p || p.gone || p.attempts >= MAX_TRIES) return;
  const maxFee = Math.max(G.money, p.feeAsk * 1.2);
  const reach = reachOf(p);
  const tags = tagsOf(p, G.lvl).map(t => '<span class="chip ' + t[0] + '">' + t[1] + '</span>').join('');
  const room = G.wageCap - G.wages;

  modal(
    '<div class="mh"><div><h3>' + esc(p.name) + ' ' + tags + '</h3>' +
      '<div class="sub">' + POSMAP[p.pos].name + ' · ' + esc(p.club) + ' · ' + esc(p.liga) + ' · ' + p.age + ' anos<br>' +
      'pede ' + (p.free ? 'nenhuma taxa (contrato encerrado)' : money(p.feeAsk)) + ' + ' + wageFmt(p.wageAsk) +
      ' · tentativas: ' + p.attempts + '/' + MAX_TRIES + '</div></div>' +
      '<button class="x" id="mx" aria-label="Fechar">✕</button></div>' +
    '<div class="attrs">' +
      '<div><div class="k">Overall</div><div class="v">' + p.ovr + '</div></div>' +
      '<div><div class="k">Potencial</div><div class="v" style="color:var(--amber)">' + p.pot + '</div></div>' +
      '<div><div class="k">Valor de mercado</div><div class="v">' + money(p.value).replace('€ ', '') + '</div></div>' +
      '<div><div class="k">Sua posição ' + p.pos + '</div><div class="v">' + posStrength(G.squad, p.pos).toFixed(0) + '</div></div>' +
    '</div>' +
    '<div class="negotiate">' +
      (reach === 'fora'
        ? '<div class="msg no"><span class="who">Scouting</span>Patamar acima do ' + esc(G.club.n) + '. Você pode mandar a proposta — e vai voltar sem conversa: nesta janela ele não troca o ' + esc(p.club) + ' pelo seu clube.</div>'
        : reach === 'dificil'
        ? '<div class="msg mid"><span class="who">Scouting</span>Alvo de outro patamar. Dá para tirar, mas só com prêmio: a pedida e o salário já vêm inflados por isso.</div>'
        : '') +
      (p.free ? '<div class="msg mid"><span class="who">Empresário</span>Sem contrato: nenhum clube leva taxa. Toda a disputa é salário — e ele sabe disso.</div>' : '') +
      '<div class="field"><div class="k"><span>Proposta ao ' + esc(p.club) + '</span><b id="feeOut">' + money(Math.min(p.feeAsk, G.money)) + '</b></div>' +
        '<input type="range" id="feeR" min="0" max="' + Math.round(maxFee) + '" step="100000" value="' + Math.round(Math.min(p.feeAsk, G.money)) + '"' + (p.free ? ' disabled' : '') + '>' +
        '<div class="quick">' +
          '<button data-fee="ask">pedida</button><button data-fee="0.9">-10%</button>' +
          '<button data-fee="0.8">-20%</button><button data-fee="1.05">+5%</button>' +
          '<button data-fee="all">tudo (' + money(G.money).replace('€ ', '') + ')</button></div></div>' +
      '<div class="field"><div class="k"><span>Salário oferecido · folga de ' + wageFmt(room) + '</span><b id="wgOut">' + wageFmt(p.wageAsk) + '</b></div>' +
        '<input type="range" id="wgR" min="4000" max="' + Math.round(p.wageAsk * 1.6) + '" step="1000" value="' + p.wageAsk + '">' +
        '<div class="quick"><button data-wg="ask">pedido</button><button data-wg="0.92">-8%</button>' +
        '<button data-wg="1.12">+12%</button></div></div>' +
      '<div id="negMsg"></div>' +
    '</div>' +
    '<div class="mfoot"><span class="hint">Acordo ou contraproposta consome 1 dia · recusa não custa nada</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mCancel">Deixar pra lá</button>' +
      '<button class="btn" id="mSend">Enviar proposta</button></div></div>'
  );

  const feeR = $('#feeR'), wgR = $('#wgR');
  const sync = () => {
    const fee = +feeR.value, wg = +wgR.value;
    $('#feeOut').textContent = money(fee);
    $('#feeOut').style.color = fee > G.money ? 'var(--neg)' : 'var(--ink)';
    $('#wgOut').textContent = wageFmt(wg);
    $('#wgOut').style.color = wg > room ? 'var(--neg)' : 'var(--ink)';
    const bad = fee > G.money || wg > room;
    $('#mSend').disabled = bad || p.attempts >= MAX_TRIES;
    if (!$('#negMsg').dataset.locked)
      $('#negMsg').innerHTML = bad
        ? '<div class="msg no"><span class="who">Departamento financeiro</span>' +
          (fee > G.money ? 'Caixa insuficiente para essa proposta.' : 'Esse salário estoura o teto da folha.') + '</div>'
        : '';
  };
  feeR.addEventListener('input', sync);
  wgR.addEventListener('input', sync);
  $('#mx').onclick = closeModal;
  $('#mCancel').onclick = closeModal;
  $('#modalRoot').querySelectorAll('[data-fee]').forEach(b => b.onclick = () => {
    const v = b.dataset.fee;
    feeR.value = v === 'ask' ? p.feeAsk : v === 'all' ? G.money : Math.round(p.feeAsk * parseFloat(v));
    sync();
  });
  $('#modalRoot').querySelectorAll('[data-wg]').forEach(b => b.onclick = () => {
    const v = b.dataset.wg;
    wgR.value = v === 'ask' ? p.wageAsk : Math.round(p.wageAsk * parseFloat(v));
    sync();
  });
  $('#mSend').onclick = () => sendOffer(p, +feeR.value, +wgR.value);
  sync();
}

function sendOffer(p, fee, wg){
  if (G.over || fee > G.money || wg > G.wageCap - G.wages) return;
  const box0 = $('#negMsg');

  if (reachOf(p) === 'fora'){
    if (box0){
      box0.dataset.locked = '1';
      box0.innerHTML = '<div class="msg no"><span class="who">' + esc(p.club) + '</span>Não é questão de valor. ' +
        esc(p.name) + ' não sai daqui para o ' + esc(G.club.n) + ' nesta janela — a proposta nem chegou a ele.</div>';
    }
    news('<b>' + esc(p.name) + '</b> devolveu a sondagem do ' + esc(G.club.n) + ' sem conversa. Está fora do alcance do clube.', 'bad');
    renderAll();
    return;
  }
  p.attempts++;

  const feeOK = p.free ? 'yes' : fee >= p.feeAsk * .93 ? 'yes' : fee >= p.feeAsk * .80 ? 'counter' : 'no';
  const ambicao = p.ovr >= G.lvl + 8 ? 1.06 : 1;
  const need = p.wageAsk * ambicao;
  const wgOK = wg >= need * .97 ? 'yes' : wg >= need * .86 ? 'counter' : 'no';
  const box = box0;

  if (feeOK === 'yes' && wgOK === 'yes'){ doSign(p, fee, wg); tickDay(); return; }

  if (feeOK === 'no' || wgOK === 'no'){
    if (feeOK === 'no') p.feeAsk = Math.round(p.feeAsk * 1.03 / 1e5) * 1e5;
    else if (wgOK === 'no') p.wageAsk = Math.round(p.wageAsk * 1.03 / 1000) * 1000;
    const why = feeOK === 'no'
      ? '<span class="who">' + esc(p.club) + '</span>Proposta muito abaixo do que consideramos. Nem levamos ao presidente — e a pedida subiu para ' + money(p.feeAsk) + '.'
      : '<span class="who">Empresário de ' + esc(p.name) + '</span>Com esse salário meu cliente nem atende o telefone. Depois dessa ele quer ' + wageFmt(Math.round(p.wageAsk * ambicao)) + '.';
    if (box){
      box.dataset.locked = '1';
      box.innerHTML = '<div class="msg no">' + why + (p.attempts >= MAX_TRIES ? '<br><br><b>Negociação encerrada</b> — ' + MAX_TRIES + ' tentativas, sem acordo.' : '') + '</div>';
    }
    news('Proposta por <b>' + esc(p.name) + '</b> recusada — sem custo de dia.' + (p.attempts >= MAX_TRIES ? ' Negociação encerrada.' : ''), 'bad');
    if (p.attempts >= MAX_TRIES && $('#mSend')) $('#mSend').disabled = true;
    renderAll();
    return;
  }

  const cFee = p.free ? 0 : Math.max(fee, Math.round(p.feeAsk * .945 / 1e5) * 1e5);
  const cWg = Math.max(wg, Math.round(need * .985 / 1000) * 1000);
  const afford = cFee <= G.money && cWg <= G.wageCap - G.wages;
  if (box){
    box.dataset.locked = '1';
    box.innerHTML = '<div class="msg mid"><span class="who">Contraproposta</span>' +
      'Chegamos perto. Fechamos por <b>' + money(cFee) + '</b> de transferência e <b>' + wageFmt(cWg) + '</b> de salário.' +
      (afford ? '' : '<br><br><b style="color:var(--neg)">Não cabe no seu caixa/folha.</b>') + '</div>' +
      (afford ? '<div style="margin-top:10px"><button class="btn wide" id="mAccept">Aceitar contraproposta (sem custo de dia)</button></div>' : '');
    if (afford) $('#mAccept').onclick = () => doSign(p, cFee, cWg);
  }
  news('<b>' + esc(p.name) + '</b>: contraproposta de ' + money(cFee) + ' + ' + wageFmt(cWg) + '.', 'rival');
  tickDay();
}

function doSign(p, fee, wg){
  G.money -= fee;
  G.wages += wg;
  p.gone = true;
  const signed = Object.assign({}, p, { fee, paidWage:wg, club:G.club.n, liga:G.club.liga.nome, signed:true });
  G.squad.push(signed);
  G.signings.push(signed);
  const vaga = autoPlace(signed);
  news('<b>' + esc(p.name) + '</b> (' + p.pos + ' ' + p.ovr + ') assinou por ' + money(fee) + ' e ' + wageFmt(wg) + '.' +
    (vaga ? ' Entra direto no XI como ' + vaga + '.' : ' Começa no banco.'), 'good');
  closeModal();
  renderAll();
}

function openSell(id){
  const p = G.squad.find(x => x.id === id);
  if (!p) return;
  const offer = Math.round(p.value * rnd(.72, 1.18) / 1e5) * 1e5;
  let buyer = pick(ALL_CLUBS);
  if (buyer === G.club) buyer = pick(ALL_CLUBS);
  const need = slotsOf(p.pos);
  const remaining = G.squad.filter(x => x.pos === p.pos).length - 1;
  const isStarter = G.lineup.includes(p.id);
  modal(
    '<div class="mh"><div><h3>Proposta por ' + esc(p.name) + '</h3>' +
      '<div class="sub">' + POSMAP[p.pos].name + ' · ' + p.age + ' anos · overall ' + p.ovr + '</div></div>' +
      '<button class="x" id="mx" aria-label="Fechar">✕</button></div>' +
    '<div class="attrs">' +
      '<div><div class="k">Oferta do ' + esc(buyer.n) + '</div><div class="v" style="color:var(--pos)">' + money(offer).replace('€ ', '') + '</div></div>' +
      '<div><div class="k">Valor de mercado</div><div class="v">' + money(p.value).replace('€ ', '') + '</div></div>' +
      '<div><div class="k">Libera na folha</div><div class="v">' + Math.round(p.wage / 1000) + ' mil</div></div>' +
      '<div><div class="k">Sobram na posição</div><div class="v" style="color:' + (remaining < need ? 'var(--neg)' : 'var(--ink)') + '">' + remaining + '</div></div>' +
    '</div>' +
    '<div class="negotiate">' +
      (offer > p.value * 1.05
        ? '<div class="msg ok"><span class="who">Análise</span>Oferta acima do valor de mercado. Vender aqui é lucro limpo.</div>'
        : offer < p.value * .85
        ? '<div class="msg no"><span class="who">Análise</span>Oferta abaixo do valor de mercado. Você perde patrimônio nessa.</div>'
        : '<div class="msg mid"><span class="who">Análise</span>Oferta em linha com o valor de mercado.</div>') +
      (isStarter ? '<div class="msg no"><span class="who">Comissão técnica</span>Ele é titular na sua escalação. Sai e a vaga vai para o melhor reserva.</div>' : '') +
      (remaining < need ? '<div class="msg no"><span class="who">Regulamento interno</span>Sem gente para o ' + G.form + ' nessa posição — a imprensa desconta pontos.</div>' : '') +
    '</div>' +
    '<div class="mfoot"><span class="hint">Vender consome 1 dia</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mCancel">Recusar</button>' +
      '<button class="btn" id="mSell">Vender por ' + money(offer) + '</button></div></div>'
  );
  $('#mx').onclick = closeModal;
  $('#mCancel').onclick = closeModal;
  $('#mSell').onclick = () => {
    if (G.over) return;
    G.money += offer;
    G.wages -= p.wage;
    G.squad = G.squad.filter(x => x.id !== p.id);
    G.sales.push(Object.assign({}, p, { fee:offer }));
    cleanLineup(); fillEmpty();
    news('<b>' + esc(p.name) + '</b> vendido ao ' + esc(buyer.n) + ' por ' + money(offer) + '.', 'good');
    closeModal();
    renderAll();
    tickDay();
  };
}

/* ---------------- fechamento ---------------- */
function verdictFor(t){
  if (t >= 92) return ['Janela histórica.', 'A imprensa cravou: mandou no mercado do começo ao fim. Resolveu carência, pagou barato e ainda deixou o clube com futuro. Contrato renovado antes da estreia.'];
  if (t >= 85) return ['Janela de primeira.', 'Nomes certos nas posições certas, sem loucura no caixa. O torcedor entrou na fila da camisa nova.'];
  if (t >= 78) return ['Janela muito boa.', 'O time subiu de patamar e as contas fecharam. Pequenas sobras — mas a diretoria assinou embaixo.'];
  if (t >= 70) return ['Janela aprovada.', 'Deu conta do recado: o elenco está melhor do que estava e nada saiu do controle. Passou com folga confortável, não com aplauso de pé.'];
  if (t >= 62) return ['Janela mediana.', 'Faltou coragem em uma posição e sobrou dinheiro parado em outra. Começa o campeonato sob desconfiança.'];
  if (t >= 54) return ['Janela fraca.', 'Movimento houve; melhora, quase nenhuma. A crítica já pergunta quem aprovou esses valores.'];
  if (t >= 44) return ['Janela ruim.', 'O elenco continua com os mesmos buracos e agora com menos caixa. Primeira derrota e o cargo vira assunto.'];
  return ['Janela desastrosa.', 'A imprensa foi impiedosa e a diretoria também. Você não chega ao fim do primeiro turno.'];
}
function closeWindow(){
  if (G.over) return;
  G.over = true;
  closeModal();
  const ev = evaluate();
  const g = gradeOf(ev.total), win = ev.total >= 70;
  const [h, sub] = verdictFor(ev.total);
  const slots = formSlots();

  const signRows = G.signings.length ? G.signings.map(s => {
    const r = s.value / Math.max(s.fee, 1e5);
    const line = s.fee === 0 ? 'Chegou de graça: só salário no orçamento.'
      : r >= 1.25 ? 'Pagou bem abaixo do valor de mercado — negócio da janela.'
      : r >= .95 ? 'Preço justo pelo que ele entrega hoje.'
      : r >= .75 ? 'Pagou um prêmio pela pressa.' : 'Pagou caro: o mercado não valida esse número.';
    const idx = G.lineup.indexOf(s.id);
    const impact = idx >= 0
      ? ' Terminou a janela como titular (' + slots[idx].p + ')' + (slots[idx].p !== s.pos ? ', fora da posição de origem.' : '.')
      : ' Ficou no banco na escalação que você deixou montada.';
    return '<div class="crow"><div class="t2"><span class="nm">' + esc(s.name) + ' <span style="color:var(--dim);font-weight:400">' + s.pos + ' ' + s.ovr + '</span></span>' +
      '<span class="sc">' + money(s.fee) + '</span></div><p>' + line + impact + '</p></div>';
  }).join('') : '<div class="empty">Você não contratou ninguém.</div>';

  const xiRows = slots.map((s, i) => {
    const p = G.squad.find(x => x.id === G.lineup[i]);
    if (!p) return '<div class="crow"><div class="t2"><span class="nm" style="color:var(--neg)">' + s.p + ' — vaga em aberto</span></div></div>';
    const out = p.pos !== s.p;
    return '<div class="crow"><div class="t2"><span class="nm"><span style="color:var(--dim);font-weight:400">' + s.p + '</span> ' + esc(p.name) +
      (p.signed ? ' <span class="chip gem">reforço</span>' : '') + '</span>' +
      '<span class="sc"' + (out ? ' style="color:var(--neg)"' : '') + '>' + effOvr(p, s.p) + (out ? ' (' + p.pos + ')' : '') + '</span></div></div>';
  }).join('');

  const compRows = ev.comps.map(c =>
    '<div class="crow"><div class="t2"><span class="nm">' + c.k + '</span><span class="sc">' + c.v.toFixed(1) + ' / ' + c.max + '</span></div>' +
    '<div class="bar" style="margin-top:8px"><i class="' + (c.v / c.max >= .7 ? 'pos' : c.v / c.max >= .4 ? 'amber' : 'neg') + '" style="width:' + (c.v / c.max * 100) + '%"></i></div>' +
    '<p>' + c.note + '</p></div>').join('') +
    ev.pen.map(p => '<div class="crow"><div class="t2"><span class="nm" style="color:var(--neg)">' + p.k + '</span><span class="sc" style="color:var(--neg)">' + p.v + '</span></div></div>').join('');

  $('#screenReport').innerHTML =
    '<div class="verdict">' +
      '<div class="stamp ' + (win ? 'win' : 'lose') + '">' + (win ? 'Janela aprovada · você fica' : 'Janela reprovada · você cai') + '</div>' +
      '<div class="big" style="color:' + gradeColor(ev.total) + '">' + g + '</div>' +
      '<h2>' + h + '</h2><p>' + sub + '</p>' +
      '<div style="font-family:var(--f-mono);font-size:12px;color:var(--dim);margin-top:16px">' +
        esc(G.club.n) + ' · ' + Math.round(ev.total) + '/100 · ' + G.form + ' · XI de ' + G.baseXI.toFixed(1) + ' para ' + ev.xi.toFixed(1) +
        ' · ' + G.signings.length + ' chegadas, ' + G.sales.length + ' saídas · ' + money(ev.spend) + ' gastos · ' + money(G.money) + ' em caixa' +
      '</div>' +
      '<div class="actions" style="justify-content:center"><button class="btn" id="btnAgain">Nova janela, outro clube</button></div>' +
    '</div>' +
    '<div class="rgrid">' +
      '<div class="pnl"><header><h3>Como a nota foi montada</h3><span class="r">' + Math.round(ev.total) + ' pts</span></header>' + compRows + '</div>' +
      '<div><div class="pnl"><header><h3>Contratação por contratação</h3><span class="r">' + G.signings.length + '</span></header>' + signRows + '</div>' +
      '<div class="pnl"><header><h3>Time que ficou de pé</h3><span class="r">' + G.form + '</span></header>' + xiRows + '</div></div>' +
    '</div>';
  $('#screenDesk').hidden = true;
  $('#screenReport').hidden = false;
  $('#btnAgain').onclick = () => {
    newGame($('#pickLiga').value || null);
    renderIntro();
    $('#screenReport').hidden = true;
    $('#screenIntro').hidden = false;
    $('#hud').hidden = true;
    $('#tickerBar').hidden = true;
    window.scrollTo(0, 0);
  };
  window.scrollTo(0, 0);
}

/* ---------------- eventos ---------------- */
function initSelects(){
  $('#pickLiga').innerHTML = '<option value="">Sortear em qualquer liga</option>' +
    LIGAS.map(l => '<option value="' + l.id + '">' + esc(l.nome) + ' · ' + esc(l.pais) + '</option>').join('');
  $('#fLiga').innerHTML = '<option value="">Todas as ligas</option>' +
    LIGAS.map(l => '<option value="' + esc(l.nome) + '">' + esc(l.nome) + '</option>').join('');
  $('#fForm').innerHTML = Object.keys(FORMS).map(f => '<option value="' + f + '">' + f + '</option>').join('');
}
function setTab(t){
  TAB = t;
  SEL = null;
  $('#tabMarket').setAttribute('aria-selected', String(t === 'market'));
  $('#tabSquad').setAttribute('aria-selected', String(t === 'squad'));
  $('#tabLineup').setAttribute('aria-selected', String(t === 'lineup'));
  renderCenter();
}
$('#btnStart').onclick = () => { $('#screenIntro').hidden = true; $('#screenDesk').hidden = false; renderAll(); };
$('#btnReroll').onclick = () => { newGame($('#pickLiga').value || null); renderIntro(); };
$('#pickLiga').onchange = () => { newGame($('#pickLiga').value || null); renderIntro(); };
$('#btnClose').onclick = closeWindow;
$('#tabMarket').onclick = () => setTab('market');
$('#tabSquad').onclick = () => setTab('squad');
$('#tabLineup').onclick = () => setTab('lineup');
$('#fForm').onchange = () => {
  G.form = $('#fForm').value;
  G.lineup = bestXI(G.squad);
  SEL = null;
  recomputeBaseline();
  news('Tática mudada para <b>' + G.form + '</b>. O time foi reorganizado e o scouting revisou as carências.', '');
  renderAll();
};
$('#btnAuto').onclick = () => { G.lineup = bestXI(G.squad); SEL = null; renderAll(); };
['fPos', 'fLiga', 'fSort', 'fName', 'fNeed', 'fAfford', 'fReach'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener(el.type === 'search' ? 'input' : 'change', renderList);
});
$('#listWrap').addEventListener('click', e => {
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

initSelects();
newGame();
renderIntro();
