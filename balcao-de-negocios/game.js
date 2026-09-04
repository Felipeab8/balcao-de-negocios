/* Balcão de Negócios — lógica do jogo.
   Depende dos arquivos de data/ (window.LIGAS e window.NOMES) carregados antes. */

const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dec = v => v.toFixed(1).replace('.', ',');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- posições e táticas ---------------- */
const POS = [
  {id:'GOL', name:'Goleiro',   pl:'goleiros',   depth:2},
  {id:'ZAG', name:'Zagueiro',  pl:'zagueiros',  depth:4},
  {id:'LAT', name:'Lateral',   pl:'laterais',   depth:4},
  {id:'VOL', name:'Volante',   pl:'volantes',   depth:4},
  {id:'MEI', name:'Meia',      pl:'meias',      depth:2},
  {id:'PON', name:'Ponta',     pl:'pontas',     depth:3},
  {id:'ATA', name:'Atacante',  pl:'atacantes',  depth:2}
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
  const n = g.pos ? POSMAP[g.pos] : null;
  switch (g.kind){
    case 'sign':  return 'Contrate ' + g.n + ' ' + (g.n > 1 ? n.pl : n.name.toLowerCase());
    case 'pos':   return 'Leve a posição ' + n.name.toLowerCase() + ' a ' + dec(g.alvo) + ' de média';
    case 'xi':    return 'Leve o XI titular a ' + dec(g.alvo) + ' de força';
    case 'depth': return 'Chegue a ' + g.n + ' ' + n.pl + ' no grupo';
    case 'jovem': return 'Contrate um jogador de até ' + g.idade + ' anos com potencial ' + g.pot + '+';
    case 'venda': return 'Arrecade ' + money(g.alvo) + ' em vendas';
    case 'gasto': return 'Invista ao menos ' + money(g.alvo) + ' em contratações';
  }
  return '';
}
function goalNow(g){
  switch (g.kind){
    case 'sign':  return G.signings.filter(s => s.pos === g.pos).length + ' de ' + g.n + ' contratados';
    case 'pos':   return dec(posStrength(G.squad, g.pos)) + ' hoje · abriu em ' + dec(G.baseStrength[g.pos]);
    case 'xi':    return dec(lineupRating(G.lineup)) + ' hoje · abriu em ' + dec(G.baseXI);
    case 'depth': return G.squad.filter(x => x.pos === g.pos).length + ' no grupo · meta ' + g.n;
    case 'jovem': return G.signings.filter(s => s.age <= g.idade && s.pot >= g.pot).length + ' de ' + g.n + ' contratados';
    case 'venda': return money(G.sales.reduce((a, s) => a + s.fee, 0)) + ' de ' + money(g.alvo);
    case 'gasto': return money(G.signings.reduce((a, s) => a + costOf(s), 0)) + ' de ' + money(g.alvo);
  }
  return '';
}
/* ---------------- modos ---------------- */
const MODES = {
  facil:   { n:'Fácil',   rerolls:0, escolhe:true,  aporte:true,
             d:'Você escolhe liga, clube e qual das três incorporações financeiras aceitar, ou nenhuma.' },
  dificil: { n:'Difícil', rerolls:3, escolhe:false, aporte:false,
             d:'O clube é sorteado dentro da liga que você apontar. Não gostou? Três novos sorteios, e trocar de liga gasta um deles.' },
  expert:  { n:'Expert',  rerolls:0, escolhe:false, aporte:false, sorteiaLiga:true,
             d:'Liga e clube sorteados de uma vez. O que sair é seu, sem segunda chance.' }
};
/* as incorporações do modo fácil: cada investidor põe o dinheiro em um lugar diferente:
   caixa compra passe, teto salarial banca folha. Escolher é escolher que tipo de janela fazer. */
const APORTES = [
  { id:'nenhum', n:'Nenhuma',                caixa:1,    teto:1,
    d:'o clube se vira com o caixa e a folha que tem' },
  { id:'fundo',  n:'Fundo de investimento',  caixa:1.9,  teto:1,
    d:'caixa quase dobrado, folha intocada: dinheiro para comprar passe caro' },
  { id:'socio',  n:'Sócio majoritário',      caixa:1.5,  teto:1.15,
    d:'meio-termo: mais caixa e alguma folga na folha' },
  { id:'patroc', n:'Patrocinador master',    caixa:1.15, teto:1.4,
    d:'banca salário, não compra: teto bem maior para estrela livre e alto salário' }
];
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
    signings: [], sales: [], feed: [], over: false
  };
  G.lineup = bestXI(squad);
  recomputeBaseline();
  news('Janela aberta. O ' + c.n + ' tem ' + money(G.money) + ' em caixa e ' + G.maxDays + ' dias para se resolver. O mercado inteiro atende o telefone.', '');
  if (G.aporte) news('<b>Incorporação financeira: ' + G.aporte.n + '.</b> ' +
    (G.aporteCaixa ? money(G.aporteCaixa) + ' a mais no caixa' : 'Nenhum tostão a mais no caixa') +
    (G.aporteTeto ? ' e o teto salarial subiu para ' + wageFmt(teto) : ' e o teto salarial segue o mesmo') + '.', 'good');
  return G;
}
function dificuldade(){
  return G.lvl >= 83 ? ['Alta', 'elenco de elite: o mundo inteiro atende, mas subir esse time de patamar custa uma fortuna']
       : G.lvl >= 76 ? ['Média', 'há upgrade em quase toda posição; as estrelas dos gigantes é que não atendem']
       : ['Acessível', 'elenco com muito o que melhorar, e alvos baratos de sobra dentro do seu alcance'];
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
    news('<b>Gongo.</b> A janela fechou. Vale o que está assinado.', 'rival');
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
  comps.push({ k:'Metas do conselho', v:c0, max:26,
    note: feitas + ' de ' + G.goals.length + ' metas cumpridas · ' +
      Math.round(gp.reduce((a, x) => a + x.p, 0) / G.goals.length * 100) + '% de andamento' });

  const c1 = clamp(delta / 1.8, 0, 1) * 20;
  comps.push({ k:'Impacto na escalação', v:c1, max:20,
    note:(delta >= 0 ? '+' : '') + delta.toFixed(2) + ' de força no XI · ' + G.form });

  let wSum = 0, wGot = 0;
  for (const p of POS){
    const w = G.needs[p.id] === 'crit' ? 1 : G.needs[p.id] === 'soft' ? .5 : 0;
    if (!w) continue;
    wSum += w;
    wGot += w * needProgress(p.id);
  }
  const c2 = wSum ? (wGot / wSum) * 20 : 20;
  comps.push({ k:'Carências resolvidas', v:c2, max:20,
    note: wSum ? Math.round((wGot / wSum) * 100) + '% dos buracos cobertos' : 'elenco já estava equilibrado' });

  let c3;
  if (!s.length) c3 = 2;
  else { const ratio = valueIn / Math.max(spend, 1e5); c3 = clamp((ratio - .72) / .43, 0, 1) * 14; }
  comps.push({ k:'Custo-benefício', v:c3, max:14,
    note: s.length ? money(spend) + ' gastos por ' + money(valueIn) + ' de mercado' : 'nenhuma contratação' });

  let c4 = 0;
  if (s.length){
    const avg = s.reduce((a, x) => a + clamp((x.pot - x.ovr) / 5, 0, 1) * .40 +
      clamp((33 - x.age) / 11, 0, 1) * .36 + yearsFit(x.age, x.years) * .24, 0) / s.length;
    c4 = avg * 10;
  }
  comps.push({ k:'Projeto de futuro', v:c4, max:10,
    note: s.length ? 'média de ' + (s.reduce((a, x) => a + x.age, 0) / s.length).toFixed(1) + ' anos · contratos de ' +
      (s.reduce((a, x) => a + (x.years || 3), 0) / s.length).toFixed(1) + ' anos em média' : 'sem novos nomes' });

  let c5 = 0;
  if (G.wages <= G.wageCap) c5 += 6;
  const usage = 1 - G.money / Math.max(G.budget0, 1);
  c5 += clamp(usage / .45, 0, 1) * 4;
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
  const quebradas = s.filter(x => (x.role === 'estrela' || x.role === 'titular') && !G.lineup.includes(x.id));
  if (quebradas.length) pen.push({ k:'Papel prometido e não cumprido (' + quebradas.map(x => x.name.split(' ').pop()).join(', ') + ')',
    v:-Math.min(12, 4 * quebradas.length) });
  const baratas = s.filter(x => x.clause > 0 && x.clause <= 2 && x.ovr >= G.lvl + 2);
  if (baratas.length) pen.push({ k:'Cláusula de saída barata em ' + baratas.length + (baratas.length > 1 ? ' reforços' : ' reforço'),
    v:-Math.min(9, 3 * baratas.length) });
  if (s.length > 9) pen.push({ k:'Elenco inchado (' + s.length + ' contratações)', v:-5 });
  if (G.wages > G.wageCap) pen.push({ k:'Teto salarial estourado', v:-10 });
  if (!s.length && G.day > 1) pen.push({ k:'Janela sem reforço nenhum', v:-8 });

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
    '<div class="board"><div class="k">Modo ' + MODES[MODE].n.toLowerCase() + '</div><p>' + MODES[MODE].d +
      (MODE === 'dificil' ? ' <b>' + (REROLLS ? REROLLS + (REROLLS > 1 ? ' sorteios restantes' : ' sorteio restante') : 'Acabaram os sorteios: é esse') + '.</b>' : '') +
      (G.aporte ? ' <b>' + G.aporte.n + ':</b> ' +
        (G.aporteCaixa ? money(G.aporteCaixa) + ' a mais em caixa' : 'caixa igual') + ' e ' +
        (G.aporteTeto ? wageFmt(G.aporteTeto) + ' a mais de teto salarial' : 'teto salarial igual') + '.' : '') + '</p></div>' +
    '<div class="board"><div class="k">Leitura do mercado</div><p>Dificuldade <b>' + dif.toLowerCase() + '</b>: ' + difTxt + '.</p></div>' +
    '<div class="board" style="background:var(--panel)"><div class="k">Metas que o conselho cobrou</div>' +
      '<p>' + G.goals.map(g => goalText(g) + ' <span style="color:var(--dim)">(' + g.pts + ' pts)</span>').join('<br>') + '</p></div>' +
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
  $('#topTag').textContent = G.club.n + ' · ' + G.club.liga.nome + ' · modo ' + MODES[G.mode].n.toLowerCase();
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
      '<td class="num">' + fee + '</td><td class="num" style="color:var(--muted)">' + wageFmt(isMk ? p.wageAsk : (p.paidWage ?? p.wage)) + '</td>' +
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
    const title = (p ? esc(p.name) + ' · ' + p.ovr + ' de overall' + (out ? ', jogando fora de posição' : '') : 'Vaga de ' + POSMAP[s.p].name) + carencia;
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
      '<span class="bn">' + esc(p.name) + '<small>' + p.age + ' anos · ' + wageFmt(p.paidWage ?? p.wage) + '</small></span>' +
      '<span class="bo">' + p.ovr + (fit ? '<small>-' + fit + '</small>' : '') + '</span></button>';
  }).join('') : '<div class="empty">Todo o elenco está escalado.</div>';

  const alvos = POS.filter(p => G.needs[p.id] !== 'ok' && slotsOf(p.id));
  $('#needBar').innerHTML = alvos.length ? alvos.map(p => {
    const st = needState(p.id), prog = needProgress(p.id);
    const ganho = posStrength(G.squad, p.id) - G.baseStrength[p.id];
    const lbl = st === 'done' ? 'resolvida' : G.needs[p.id] === 'crit' ? 'crítica' : 'reforçar';
    const num = (ganho >= 0 ? '+' : '') + ganho.toFixed(1).replace('.', ',');
    return '<button class="needchip ' + (st === 'done' ? 'done' : G.needs[p.id]) + '" data-need="' + p.id + '" ' +
      'title="Posição hoje em ' + dec(posStrength(G.squad, p.id)) + ', abriu em ' + dec(G.baseStrength[p.id]) +
      '. Resolve quando chegar a ' + dec(needTarget(p.id)) + ' (nível do clube: ' + G.lvl + '). Clique para filtrar o mercado nesta posição.">' +
      '<span class="nc-t">' + p.name + ' <em>' + lbl + '</em></span>' +
      '<span class="nc-b"><i style="width:' + Math.round(prog * 100) + '%"></i></span>' +
      '<span class="nc-v"><span>' + num + ' de ' + dec(needGap(p.id)) + '</span><span class="go">' + (st === 'done' ? 'feito ✓' : 'ver alvos →') + '</span></span>' +
      '</button>';
  }).join('') : '<div class="allok">Sem carências no <b>' + G.form + '</b>: o elenco cobre todas as posições do esquema.</div>';

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
    : 'Clique num reserva e depois numa posição, ou em dois jogadores do campo para trocá-los.';
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
function renderGoals(ev){
  $('#goalsCount').textContent = ev.feitas + ' de ' + G.goals.length;
  $('#goals').innerHTML = ev.goals.map(({ g, p }) =>
    '<div class="goal' + (p >= 1 ? ' done' : '') + '">' +
      '<div class="k"><span>' + goalText(g) + '</span><b>' + (p >= 1 ? 'feito ✓' : '+' + g.pts + ' pts') + '</b></div>' +
      '<div class="bar"><i class="' + (p >= 1 ? 'pos' : p >= .5 ? 'amber' : '') + '" style="width:' + Math.round(p * 100) + '%"></i></div>' +
      '<div class="m">' + goalNow(g) + '</div>' +
    '</div>').join('');
}
function renderRight(){
  const ev = evaluate();
  renderGoals(ev);
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
    '<div class="deal"><div><div class="n">' + esc(s.name) + '</div><div class="m">chegou · ' + s.pos + ' ' + s.ovr + ' · ' +
      (s.years || 3) + (s.years > 1 ? ' anos' : ' ano') + ' · ' + ROLES[ROLEIDX[s.role || 'rotacao']].n.toLowerCase() + '</div></div>' +
    '<div class="p" style="color:var(--neg)">-' + money(costOf(s)) + '<small>' + wageFmt(s.paidWage) + '</small></div></div>')
    .concat(G.sales.map(s =>
    '<div class="deal"><div><div class="n">' + esc(s.name) + '</div><div class="m">saiu · ' + s.pos + ' ' + s.ovr + '</div></div>' +
    '<div class="p" style="color:var(--pos)">+' + money(s.fee) + '<small>libera ' + wageFmt(s.paidWage ?? s.wage) + '</small></div></div>')).join('');
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

/* papéis que dá para prometer na entrevista, do mais modesto ao mais pesado */
const ROLES = [
  {id:'promessa', n:'Promessa', d:'projeto de futuro, joga o que aparecer'},
  {id:'rotacao',  n:'Rotação',  d:'entra em boa parte dos jogos'},
  {id:'titular',  n:'Titular',  d:'começa jogando'},
  {id:'estrela',  n:'Estrela',  d:'o time é montado em volta dele'}
];
const ROLEIDX = Object.fromEntries(ROLES.map((r, i) => [r.id, i]));
/* cláusula de rescisão: quanto mais alta, melhor para o clube e pior para o jogador */
const CLAUSES = [
  {m:0,   lab:'nenhuma', s:.12},
  {m:5,   lab:'5×',      s:.34},
  {m:3,   lab:'3×',      s:.60},
  {m:2,   lab:'2×',      s:.84},
  {m:1.5, lab:'1,5×',    s:1}
];
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
function termScores(p, t){
  const a = contractAsk(p);
  const ms = r => r <= .72 ? 0 : r > 1 ? Math.min(1 + (r - 1) * .22, 1.12) : (r - .72) / .28;
  const dy = Math.min(Math.abs(t.years - a.years), 4);
  const dr = ROLEIDX[t.role] - ROLEIDX[a.role];
  const parts = [
    { id:'wage',   k:'salário',                s:ms(t.wage / a.wage) },
    { id:'sign',   k:'luvas',                  s:ms(t.sign / a.sign) },
    { id:'agent',  k:'comissão do empresário', s:ms(t.agent / a.agent) },
    { id:'years',  k:'duração do contrato',    s:[1, .72, .36, .12, 0][dy] },
    { id:'role',   k:'papel no elenco',        s:dr >= 0 ? Math.min(1 + dr * .03, 1.06) : dr === -1 ? .5 : dr === -2 ? .16 : 0 },
    { id:'clause', k:'cláusula de rescisão',   s:CLAUSES[t.clause].s }
  ];
  let score = 0;
  for (const q of parts){ q.w = TERM_W[q.id]; score += q.w * q.s; }
  return { parts, score };
}
function askThreshold(p){ return 70 + (p.rounds || 0) * 7; }
function moodOf(d){
  return d >= 6 ? ['fecha agora', 'pos'] : d >= 0 ? ['convencido', 'pos']
       : d >= -9 ? ['quase lá', 'amber'] : d >= -22 ? ['hesitante', 'amber'] : ['frio', 'neg'];
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
  const tags = tagsOf(p, G.lvl).map(t => '<span class="chip ' + t[0] + '">' + t[1] + '</span>').join('');

  modal(
    '<div class="mh"><div><h3>' + esc(p.name) + ' ' + tags + '</h3>' +
      '<div class="sub">Fase 1 de 2 · acerto com o ' + esc(p.club) + '<br>' +
      POSMAP[p.pos].name + ' · ' + esc(p.liga) + ' · ' + p.age + ' anos · pede ' + money(p.feeAsk) +
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
        ? '<div class="msg no"><span class="who">Scouting</span>Patamar acima do ' + esc(G.club.n) + '. Você pode mandar a proposta, e vai voltar sem conversa: nesta janela ele não troca o ' + esc(p.club) + ' pelo seu clube.</div>'
        : reach === 'dificil'
        ? '<div class="msg mid"><span class="who">Scouting</span>Alvo de outro patamar. Dá para tirar, mas só com prêmio: a pedida e o salário já vêm inflados por isso.</div>'
        : '') +
      '<div class="msg"><span class="who">Como funciona</span>Primeiro o dinheiro da transferência com o clube. Fechado isso, você senta com o jogador e o empresário para discutir salário, luvas, comissão, tempo de contrato, papel no elenco e cláusula de rescisão.</div>' +
      '<div class="field"><div class="k"><span>Proposta ao ' + esc(p.club) + '</span><b id="feeOut">' + money(Math.min(p.feeAsk, G.money)) + '</b></div>' +
        '<input type="range" id="feeR" min="0" max="' + Math.round(maxFee) + '" step="100000" value="' + Math.round(Math.min(p.feeAsk, G.money)) + '">' +
        '<div class="quick">' +
          '<button data-fee="ask">pedida</button><button data-fee="0.9">-10%</button>' +
          '<button data-fee="0.8">-20%</button><button data-fee="1.05">+5%</button>' +
          '<button data-fee="all">tudo (' + money(G.money).replace('€ ', '') + ')</button></div></div>' +
      '<div id="negMsg"></div>' +
    '</div>' +
    '<div class="mfoot"><span class="hint">Recusa do clube não custa dia · o dia sai na entrevista</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mCancel">Deixar pra lá</button>' +
      '<button class="btn" id="mSend">Enviar proposta</button></div></div>'
  );

  const feeR = $('#feeR');
  const sync = () => {
    const fee = +feeR.value;
    $('#feeOut').textContent = money(fee);
    $('#feeOut').style.color = fee > G.money ? 'var(--neg)' : 'var(--ink)';
    $('#mSend').disabled = fee > G.money || p.attempts >= MAX_TRIES;
    if (!$('#negMsg').dataset.locked)
      $('#negMsg').innerHTML = fee > G.money
        ? '<div class="msg no"><span class="who">Departamento financeiro</span>Caixa insuficiente para essa proposta.</div>' : '';
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
    lock('<div class="msg no"><span class="who">' + esc(p.club) + '</span>Não é questão de valor. ' +
      esc(p.name) + ' não sai daqui para o ' + esc(G.club.n) + ' nesta janela. A proposta nem chegou a ele.</div>');
    news('<b>' + esc(p.name) + '</b> devolveu a sondagem do ' + esc(G.club.n) + ' sem conversa. Está fora do alcance do clube.', 'bad');
    renderAll();
    return;
  }
  p.attempts++;
  const feeOK = fee >= p.feeAsk * .93 ? 'yes' : fee >= p.feeAsk * .80 ? 'counter' : 'no';

  if (feeOK === 'no'){
    p.feeAsk = Math.round(p.feeAsk * 1.03 / 1e5) * 1e5;
    lock('<div class="msg no"><span class="who">' + esc(p.club) + '</span>Proposta muito abaixo do que consideramos. ' +
      'Nem levamos ao presidente, e a pedida subiu para ' + money(p.feeAsk) + '.' +
      (p.attempts >= MAX_TRIES ? '<br><br><b>Negociação encerrada</b>: ' + MAX_TRIES + ' tentativas, sem acordo.' : '') + '</div>');
    news('Proposta por <b>' + esc(p.name) + '</b> recusada pelo ' + esc(p.club) + ', sem custo de dia.' +
      (p.attempts >= MAX_TRIES ? ' Negociação encerrada.' : ''), 'bad');
    if (p.attempts >= MAX_TRIES && $('#mSend')) $('#mSend').disabled = true;
    renderAll();
    return;
  }

  const acerto = feeOK === 'yes' ? fee : Math.max(fee, Math.round(p.feeAsk * .945 / 1e5) * 1e5);
  const cabe = acerto <= G.money;
  lock('<div class="msg ' + (feeOK === 'yes' ? 'ok' : 'mid') + '"><span class="who">' + esc(p.club) + '</span>' +
    (feeOK === 'yes'
      ? 'Fechado por <b>' + money(acerto) + '</b>. Liberamos o jogador para conversar com vocês.'
      : 'Chegamos perto. Solta <b>' + money(acerto) + '</b> e ele senta com vocês hoje mesmo.') +
    (cabe ? '' : '<br><br><b style="color:var(--neg)">Não cabe no seu caixa.</b>') + '</div>' +
    (cabe ? '<div style="margin-top:10px"><button class="btn wide" id="mGoInt">Sentar com o empresário · ' + money(acerto) + ' de taxa</button></div>' : ''));
  if (cabe) $('#mGoInt').onclick = () => openInterview(p, acerto);
  news('<b>' + esc(p.name) + '</b>: acerto de ' + money(acerto) + ' com o ' + esc(p.club) + '. Falta a entrevista.', 'rival');
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
  const t = {
    fee,
    wage: Math.min(Math.round(a.wage * .85 / 1000) * 1000, Math.max(4000, room)),
    sign: Math.round(a.sign * .5 / 5e4) * 5e4,
    agent: Math.round(a.agent * .6 * 2) / 2,
    years: 3,
    role: ROLES[Math.max(0, ROLEIDX[a.role] - 1)].id,
    clause: 2
  };
  const tags = tagsOf(p, G.lvl).map(x => '<span class="chip ' + x[0] + '">' + x[1] + '</span>').join('');
  const seg = (name, opts) => '<div class="seg" data-seg="' + name + '">' +
    opts.map(o => '<button data-val="' + o.v + '">' + o.l + '</button>').join('') + '</div>';

  modal(
    '<div class="mh"><div><h3>' + esc(p.name) + ' ' + tags + '</h3>' +
      '<div class="sub">Fase 2 de 2 · entrevista pessoal · rodada <span id="intRound">' + (p.rounds + 1) + '</span>/' + INT_ROUNDS + '<br>' +
      POSMAP[p.pos].name + ' · ' + p.age + ' anos · overall ' + p.ovr +
      ' · taxa acertada: ' + (fee ? money(fee) + ' ao ' + esc(p.club) : 'nenhuma, contrato encerrado') + '</div></div>' +
      '<button class="x" id="mx" aria-label="Fechar">✕</button></div>' +
    '<div class="meter"><div class="mk"><span>Convencimento do jogador</span><b id="mtVal">—</b></div>' +
      '<div class="mtrack"><i id="mtFill"></i><span class="mthr" id="mtThr"></span></div>' +
      '<div class="mlegend"><span id="mtMood">—</span><span>ele exige <b id="mtNeed">' + Math.round(askThreshold(p)) + '</b> de 100</span></div></div>' +
    '<div class="negotiate">' +
      '<div class="msg mid"><span class="who">Empresário de ' + esc(p.name) + '</span>' +
        'Ele quer <b>' + wageFmt(a.wage) + '</b>, <b>' + money(a.sign) + '</b> de luvas, <b>' + a.agent.toFixed(1) +
        '%</b> para mim, contrato de <b>' + a.years + (a.years > 1 ? ' anos' : ' ano') + '</b>, papel de <b>' +
        ROLES[ROLEIDX[a.role]].n.toLowerCase() + '</b> e cláusula de no máximo <b>' + String(a.clause).replace('.', ',') + '×</b> o valor dele. ' +
        'Chegue perto disso e ele assina hoje.</div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dWage"></i>Salário semanal · folga de ' + wageFmt(room) + '</span><b id="wgOut"></b></div>' +
        '<input type="range" id="wgR" min="4000" max="' + Math.round(a.wage * 1.7) + '" step="1000" value="' + t.wage + '">' +
        '<div class="quick"><button data-wg="ask">pedido</button><button data-wg="0.9">-10%</button>' +
        '<button data-wg="1.12">+12%</button><button data-wg="1.25">+25%</button></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dSign"></i>Luvas · à vista na assinatura</span><b id="sgOut"></b></div>' +
        '<input type="range" id="sgR" min="0" max="' + Math.round(a.sign * 1.8) + '" step="50000" value="' + t.sign + '">' +
        '<div class="quick"><button data-sg="ask">pedido</button><button data-sg="0.6">-40%</button>' +
        '<button data-sg="0">zerar</button><button data-sg="1.3">+30%</button></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dAgent"></i>Comissão do empresário</span><b id="agOut"></b></div>' +
        '<input type="range" id="agR" min="0" max="' + (a.agent * 1.8).toFixed(1) + '" step="0.5" value="' + a.agent + '">' +
        '<div class="quick"><button data-ag="ask">pedido</button><button data-ag="0.7">-30%</button><button data-ag="0">zerar</button></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dYears"></i>Duração do contrato</span><b id="yrOut"></b></div>' +
        seg('years', [1, 2, 3, 4, 5].map(y => ({ v:y, l:y + (y > 1 ? ' anos' : ' ano') }))) + '</div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dRole"></i>Papel prometido no elenco</span><b id="rlOut"></b></div>' +
        seg('role', ROLES.map(r => ({ v:r.id, l:r.n }))) +
        '<div class="hint2" id="rlHint"></div></div>' +

      '<div class="term"><div class="k"><span><i class="dot" id="dClause"></i>Cláusula de rescisão</span><b id="clOut"></b></div>' +
        seg('clause', CLAUSES.map((c, i) => ({ v:i, l:c.lab }))) +
        '<div class="hint2">Quanto mais alta, mais o clube se protege, e menos o jogador gosta.</div></div>' +

      '<div class="totals"><div><span>Sai do caixa hoje</span><b id="tCash"></b></div>' +
        '<div><span>Entra na folha</span><b id="tWage"></b></div>' +
        '<div><span>Pacote até o fim do contrato</span><b id="tAll"></b></div></div>' +
      '<div id="intMsg"></div>' +
    '</div>' +
    '<div class="mfoot"><span class="hint">Assinar consome 1 dia · sair sem acordo também</span>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost" id="mCancel">Deixar pra lá</button>' +
      '<button class="btn" id="mSign">Fechar contrato</button></div></div>'
  );

  const wgR = $('#wgR'), sgR = $('#sgR'), agR = $('#agR');
  const dot = { wage:$('#dWage'), sign:$('#dSign'), agent:$('#dAgent'), years:$('#dYears'), role:$('#dRole'), clause:$('#dClause') };

  const sync = () => {
    t.wage = +wgR.value; t.sign = +sgR.value; t.agent = +agR.value;
    const cash = cashOut(p, t), folga = G.wageCap - G.wages;
    $('#wgOut').textContent = wageFmt(t.wage);
    $('#wgOut').style.color = t.wage > folga ? 'var(--neg)' : 'var(--ink)';
    $('#sgOut').textContent = money(t.sign);
    $('#agOut').textContent = t.agent.toFixed(1) + '% · ' + money(agentAmount(p, t.fee, t.agent));
    $('#yrOut').textContent = t.years + (t.years > 1 ? ' anos' : ' ano');
    $('#rlOut').textContent = ROLES[ROLEIDX[t.role]].n;
    $('#rlHint').textContent = ROLES[ROLEIDX[t.role]].d + '.';
    $('#clOut').textContent = CLAUSES[t.clause].m ? CLAUSES[t.clause].lab + ' · ' + money(p.value * CLAUSES[t.clause].m) : 'sem cláusula';
    $('#modalRoot').querySelectorAll('[data-seg]').forEach(g => {
      const cur = String(t[g.dataset.seg]);
      g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.val === cur));
    });

    const { parts, score } = termScores(p, t);
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
    $('#tWage').textContent = wageFmt(t.wage);
    $('#tWage').style.color = t.wage > folga ? 'var(--neg)' : 'var(--ink)';
    $('#tAll').textContent = money(cash + t.wage * 52 * t.years);
    const bad = cash > G.money || t.wage > folga;
    $('#mSign').disabled = bad;
    if (!$('#intMsg').dataset.locked)
      $('#intMsg').innerHTML = bad
        ? '<div class="msg no"><span class="who">Departamento financeiro</span>' +
          (cash > G.money ? 'Taxa, luvas e comissão somadas estouram o caixa.' : 'Esse salário estoura o teto da folha.') + '</div>'
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
    t[key] = key === 'role' ? b.dataset.val : +b.dataset.val;
    unlock(); sync();
  }));
  $('#mx').onclick = closeModal;
  $('#mCancel').onclick = closeModal;
  $('#mSign').onclick = () => proposeContract(p, t);
  sync();
}

function proposeContract(p, t){
  if (G.over) return;
  if (cashOut(p, t) > G.money || t.wage > G.wageCap - G.wages) return;
  const a = contractAsk(p);
  const thr = askThreshold(p);
  const { parts, score } = termScores(p, t);
  const box = $('#intMsg');
  const lock = html => { if (box){ box.dataset.locked = '1'; box.innerHTML = html; } };
  p.rounds++;

  if (score + a.brio >= thr){ doSign(p, t); tickDay(); return; }

  const fracos = parts.slice().sort((x, y) => y.w * (1 - y.s) - x.w * (1 - x.s))
    .filter(q => q.s < .95).slice(0, 2).map(q => q.k);

  if (p.rounds >= INT_ROUNDS){
    p.attempts = MAX_TRIES;
    p.gone = true;
    lock('<div class="msg no"><span class="who">Empresário de ' + esc(p.name) + '</span>' +
      'Perdemos a tarde. Meu cliente não assina isso, e não quero mais ouvir falar do ' + esc(G.club.n) +
      ' nesta janela.<br><br><b>Negociação encerrada.</b> O dia foi embora junto.</div>');
    if ($('#mSign')) $('#mSign').disabled = true;
    news('<b>' + esc(p.name) + '</b> levantou da mesa: entrevista sem acordo' +
      (fracos.length ? ' (' + fracos.join(' e ') + ')' : '') + '. Um dia perdido.', 'bad');
    tickDay();
    return;
  }

  if (score >= thr - 16){
    const c = counterOf(p, t, thr);
    const cCash = cashOut(p, c);
    const cabe = cCash <= G.money && c.wage <= G.wageCap - G.wages;
    lock('<div class="msg mid"><span class="who">Contraproposta do empresário</span>' +
      'Assim ele assina: <b>' + wageFmt(c.wage) + '</b> de salário, <b>' + money(c.sign) + '</b> de luvas, <b>' +
      c.agent.toFixed(1) + '%</b> de comissão, <b>' + c.years + (c.years > 1 ? ' anos' : ' ano') + '</b> de contrato, papel de <b>' +
      ROLES[ROLEIDX[c.role]].n.toLowerCase() + '</b> e cláusula <b>' + CLAUSES[c.clause].lab + '</b>. ' +
      'Sai ' + money(cCash) + ' do caixa hoje.' +
      (cabe ? '' : '<br><br><b style="color:var(--neg)">Não cabe no seu caixa/folha.</b>') + '</div>' +
      (cabe ? '<div style="margin-top:10px"><button class="btn wide" id="mAccept">Aceitar contraproposta e assinar</button></div>' : ''));
    if (cabe) $('#mAccept').onclick = () => { doSign(p, c); tickDay(); };
    news('<b>' + esc(p.name) + '</b>: contraproposta na mesa: ' + wageFmt(c.wage) + ', ' + money(c.sign) +
      ' de luvas e ' + c.years + (c.years > 1 ? ' anos' : ' ano') + '.', 'rival');
  } else {
    lock('<div class="msg no"><span class="who">Empresário de ' + esc(p.name) + '</span>' +
      'Nem levo isso ao meu cliente. O problema está ' +
      (fracos.length ? 'em ' + fracos.join(' e em ') : 'no pacote inteiro') +
      '. E depois dessa a paciência encolheu: agora a exigência é <b>' + Math.round(askThreshold(p)) + '</b>.</div>');
    news('Proposta de contrato a <b>' + esc(p.name) + '</b> recusada na entrevista, resta' +
      (INT_ROUNDS - p.rounds > 1 ? 'm ' + (INT_ROUNDS - p.rounds) + ' rodadas' : ' 1 rodada') + '.', 'bad');
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
  const vaga = autoPlace(signed);
  news('<b>' + esc(p.name) + '</b> (' + p.pos + ' ' + p.ovr + ') assinou por ' + d.years + (d.years > 1 ? ' anos' : ' ano') +
    ': ' + money(d.fee) + ' de taxa, ' + money(d.sign) + ' de luvas, ' + wageFmt(d.wage) + ' e papel de ' +
    ROLES[ROLEIDX[d.role]].n.toLowerCase() + '.' +
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
      '<div><div class="k">Libera na folha</div><div class="v">' + Math.round((p.paidWage ?? p.wage) / 1000) + ' mil</div></div>' +
      '<div><div class="k">Sobram na posição</div><div class="v" style="color:' + (remaining < need ? 'var(--neg)' : 'var(--ink)') + '">' + remaining + '</div></div>' +
    '</div>' +
    '<div class="negotiate">' +
      (offer > p.value * 1.05
        ? '<div class="msg ok"><span class="who">Análise</span>Oferta acima do valor de mercado. Vender aqui é lucro limpo.</div>'
        : offer < p.value * .85
        ? '<div class="msg no"><span class="who">Análise</span>Oferta abaixo do valor de mercado. Você perde patrimônio nessa.</div>'
        : '<div class="msg mid"><span class="who">Análise</span>Oferta em linha com o valor de mercado.</div>') +
      (isStarter ? '<div class="msg no"><span class="who">Comissão técnica</span>Ele é titular na sua escalação. Sai e a vaga vai para o melhor reserva.</div>' : '') +
      (remaining < need ? '<div class="msg no"><span class="who">Regulamento interno</span>Sem gente para o ' + G.form + ' nessa posição, e a imprensa desconta pontos.</div>' : '') +
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
    G.wages -= (p.paidWage ?? p.wage);
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
  if (t >= 90) return ['Janela histórica.', 'A imprensa cravou: mandou no mercado do começo ao fim. Resolveu carência, pagou barato e ainda deixou o clube com futuro. Contrato renovado antes da estreia.'];
  if (t >= 82) return ['Janela de primeira.', 'Nomes certos nas posições certas, sem loucura no caixa. O torcedor entrou na fila da camisa nova.'];
  if (t >= 75) return ['Janela muito boa.', 'O time subiu de patamar e as contas fecharam. Pequenas sobras, mas a diretoria assinou embaixo.'];
  if (t >= 68) return ['Janela aprovada.', 'Deu conta do recado: o elenco está melhor do que estava e nada saiu do controle. Passou com folga confortável, não com aplauso de pé.'];
  if (t >= 60) return ['Janela mediana.', 'Faltou coragem em uma posição e sobrou dinheiro parado em outra. Começa o campeonato sob desconfiança.'];
  if (t >= 52) return ['Janela fraca.', 'Movimento houve; melhora, quase nenhuma. A crítica já pergunta quem aprovou esses valores.'];
  if (t >= 42) return ['Janela ruim.', 'O elenco continua com os mesmos buracos e agora com menos caixa. Primeira derrota e o cargo vira assunto.'];
  return ['Janela desastrosa.', 'A imprensa foi impiedosa e a diretoria também. Você não chega ao fim do primeiro turno.'];
}
function closeWindow(){
  if (G.over) return;
  G.over = true;
  closeModal();
  const ev = evaluate();
  const g = gradeOf(ev.total), win = ev.total >= 68;
  const [h, sub] = verdictFor(ev.total);
  const slots = formSlots();

  const signRows = G.signings.length ? G.signings.map(s => {
    const custo = costOf(s);
    const r = s.value / Math.max(custo, 1e5);
    const line = custo === 0 ? 'Chegou de graça: só salário no orçamento.'
      : r >= 1.25 ? 'Pagou bem abaixo do valor de mercado: negócio da janela.'
      : r >= .95 ? 'Preço justo pelo que ele entrega hoje.'
      : r >= .75 ? 'Pagou um prêmio pela pressa.' : 'Pagou caro: o mercado não valida esse número.';
    const idx = G.lineup.indexOf(s.id);
    const papel = ROLES[ROLEIDX[s.role || 'rotacao']].n.toLowerCase();
    const impact = idx >= 0
      ? ' Terminou a janela como titular (' + slots[idx].p + ')' + (slots[idx].p !== s.pos ? ', fora da posição de origem.' : '.')
      : ' Ficou no banco na escalação que você deixou montada' +
        (s.role === 'estrela' || s.role === 'titular' ? ', e você prometeu ' + papel + ' na entrevista.' : '.');
    const contrato = 'Contrato de ' + (s.years || 3) + (s.years > 1 ? ' anos' : ' ano') + ' como ' + papel + ': ' +
      money(s.fee) + ' de taxa, ' + money(s.signBonus || 0) + ' de luvas, ' + money(s.agentFee || 0) +
      ' de comissão e ' + wageFmt(s.paidWage) + '. ' +
      (s.clause ? 'Cláusula de ' + money(s.value * s.clause) + '.' : 'Sem cláusula de rescisão.');
    return '<div class="crow"><div class="t2"><span class="nm">' + esc(s.name) + ' <span style="color:var(--dim);font-weight:400">' + s.pos + ' ' + s.ovr + '</span></span>' +
      '<span class="sc">' + money(custo) + '</span></div><p>' + contrato + '</p><p>' + line + impact + '</p></div>';
  }).join('') : '<div class="empty">Você não contratou ninguém.</div>';

  const xiRows = slots.map((s, i) => {
    const p = G.squad.find(x => x.id === G.lineup[i]);
    if (!p) return '<div class="crow"><div class="t2"><span class="nm" style="color:var(--neg)">' + s.p + ' · vaga em aberto</span></div></div>';
    const out = p.pos !== s.p;
    return '<div class="crow"><div class="t2"><span class="nm"><span style="color:var(--dim);font-weight:400">' + s.p + '</span> ' + esc(p.name) +
      (p.signed ? ' <span class="chip gem">reforço</span>' : '') + '</span>' +
      '<span class="sc"' + (out ? ' style="color:var(--neg)"' : '') + '>' + effOvr(p, s.p) + (out ? ' (' + p.pos + ')' : '') + '</span></div></div>';
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
      '<div class="stamp ' + (win ? 'win' : 'lose') + '">' + (win ? 'Janela aprovada · você fica' : 'Janela reprovada · você cai') + '</div>' +
      '<div class="big" style="color:' + gradeColor(ev.total) + '">' + g + '</div>' +
      '<h2>' + h + '</h2><p>' + sub + '</p>' +
      '<div style="font-family:var(--f-mono);font-size:12px;color:var(--dim);margin-top:16px">' +
        esc(G.club.n) + ' · modo ' + MODES[G.mode].n.toLowerCase() +
        (G.aporte ? ' com ' + G.aporte.n.toLowerCase() : '') +
        ' · ' + Math.round(ev.total) + '/100 · ' + G.form + ' · XI de ' + G.baseXI.toFixed(1) + ' para ' + ev.xi.toFixed(1) +
        ' · ' + G.signings.length + ' chegadas, ' + G.sales.length + ' saídas · ' + money(ev.spend) + ' gastos · ' + money(G.money) + ' em caixa' +
      '</div>' +
      '<div class="actions" style="justify-content:center"><button class="btn" id="btnAgain">Nova janela, outro clube</button></div>' +
    '</div>' +
    '<div class="rgrid">' +
      '<div><div class="pnl"><header><h3>Metas do conselho</h3><span class="r">' + ev.feitas + '/' + ev.goals.length + '</span></header>' + goalRows + '</div>' +
      '<div class="pnl"><header><h3>Como a nota foi montada</h3><span class="r">' + Math.round(ev.total) + ' pts</span></header>' + compRows + '</div></div>' +
      '<div><div class="pnl"><header><h3>Contratação por contratação</h3><span class="r">' + G.signings.length + '</span></header>' + signRows + '</div>' +
      '<div class="pnl"><header><h3>Time que ficou de pé</h3><span class="r">' + G.form + '</span></header>' + xiRows + '</div></div>' +
    '</div>';
  $('#screenDesk').hidden = true;
  $('#screenReport').hidden = false;
  $('#btnAgain').onclick = () => {
    /* janela nova: chances de sorteio de volta e todo clube guardado é descartado */
    Object.keys(SAVED).forEach(k => delete SAVED[k]);
    REROLLS = MODES[MODE].rerolls;
    drawGame(false);
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
  $('#pickLiga').innerHTML = '<option value="">Qualquer liga</option>' +
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
/* ---- seleção de modo, liga e clube na tela de abertura ---- */
function ligaAtual(){ return MODES[MODE].sorteiaLiga ? null : ($('#pickLiga').value || null); }
function aporteAtual(){ return MODES[MODE].aporte ? APORTE : 'nenhum'; }
function initAportes(){
  $('#aporteSeg').innerHTML = APORTES.map(a =>
    '<button data-ap="' + a.id + '"><b>' + a.n + '</b>' +
      (a.id === 'nenhum' ? '<em>caixa e teto do clube</em>'
        : '<em>' + (a.caixa > 1 ? 'caixa +' + Math.round((a.caixa - 1) * 100) + '%' : 'caixa igual') + ' · ' +
          (a.teto > 1 ? 'teto +' + Math.round((a.teto - 1) * 100) + '%' : 'teto igual') + '</em>') +
      '<small>' + a.d + '</small></button>').join('');
}
function fillClubes(){
  const id = ligaAtual();
  const ligas = LIGAS.filter(l => !id || l.id === id);
  $('#pickClube').innerHTML = ligas.map(l => '<optgroup label="' + esc(l.nome) + '">' +
    l.clubes.slice().sort((a, b) => a.n.localeCompare(b.n))
      .map(c => '<option value="' + esc(c.n) + '">' + esc(c.n) + ' · nível ' + c.lvl + '</option>').join('') +
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
initAportes();
REROLLS = MODES[MODE].rerolls;
renderSetup();
drawGame(false);
