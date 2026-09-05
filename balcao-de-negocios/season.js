/* Balcão de Negócios — simulação de uma temporada inteira com o elenco que saiu da janela.
   Roda depois do relatório: liga por pontos corridos, copa nacional e copa continental,
   e devolve títulos, tabela e os números individuais do elenco. */

/* ---------------- utilitários ---------------- */
function poisson(l){
  l = clamp(l, .05, 6);
  const L = Math.exp(-l);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function shuffle(a){
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function wpick(list){
  const tot = list.reduce((s, x) => s + x.w, 0);
  if (tot <= 0) return null;
  let r = Math.random() * tot;
  for (const x of list){ r -= x.w; if (r <= 0) return x.p; }
  return list[list.length - 1].p;
}
/* nível de um clube da máquina: média dos onze melhores overalls da lista real */
function clubRating(c){
  const ovrs = (c.p || []).map(r => r[3]).sort((a, b) => b - a);
  let s = 0;
  for (let i = 0; i < 11; i++) s += i < ovrs.length ? ovrs[i] : c.lvl - 4;
  return s / 11;
}
/* o mesmo nível, medido no seu elenco: sem desconto de posição, para comparar com a máquina */
function squadRating(squad){
  const ovrs = squad.map(p => p.ovr).sort((a, b) => b - a);
  let s = 0;
  for (let i = 0; i < 11; i++) s += i < ovrs.length ? ovrs[i] : G.lvl - 4;
  return s / 11;
}
/* placar de uma partida: a diferença de nível vira gols esperados, o resto é sorte */
const HOME_ADV = .45;
function simScore(rh, rv){
  const d = (rh + HOME_ADV) - rv;
  return [poisson(1.32 + d * .095), poisson(1.32 - d * .095)];
}

/* ---------------- números individuais ---------------- */
const GOAL_W = { GOL:.02, ZAG:.85, LAT:1.0, VOL:1.7, MEI:3.4, PON:4.6, ATA:7.2 };
const AST_W  = { GOL:.05, ZAG:.55, LAT:2.4, VOL:2.1, MEI:4.8, PON:4.6, ATA:2.6 };
const CARD_W = { GOL:.03, ZAG:.16, LAT:.15, VOL:.20, MEI:.12, PON:.09, ATA:.10 };
const qual = p => Math.pow(1.055, p.ovr - 72);

let ST = null;
function st(p){
  let s = ST.get(p.id);
  if (!s){ s = { p, apps:0, goals:0, assists:0, cs:0, yc:0, rc:0, rsum:0, rn:0 }; ST.set(p.id, s); }
  return s;
}
/* onze da partida: o time que você deixou montado, com rodízio de vez em quando */
function pickStarters(){
  const slots = formSlots(), used = new Set(), out = [];
  for (let i = 0; i < slots.length; i++){
    const fixo = G.squad.find(x => x.id === G.lineup[i] && !used.has(x.id));
    let p = fixo;
    if (!fixo || Math.random() < .16){
      let best = null, bv = -1;
      for (const q of G.squad){
        if (used.has(q.id) || q === fixo) continue;
        const v = effOvr(q, slots[i]);
        if (v > bv){ bv = v; best = q; }
      }
      p = best || fixo;
    }
    if (!p) p = G.squad.find(q => !used.has(q.id));
    if (!p) continue;
    used.add(p.id);
    out.push({ p, slot:slots[i] });
  }
  return out;
}
function pickSubs(starters){
  const inXI = new Set(starters.map(s => s.p.id));
  return shuffle(G.squad.filter(p => !inXI.has(p.id))).slice(0, 3);
}
/* uma partida do seu time: presenças, gols, assistências, notas e cartões */
function recordMy(gf, ga){
  const starters = pickStarters();
  const subs = pickSubs(starters);
  const mg = new Map();
  const bump = (p, k) => { const m = mg.get(p.id) || { g:0, a:0 }; m[k]++; mg.set(p.id, m); };
  starters.forEach(({ p }) => { st(p).apps++; });
  subs.forEach(p => { st(p).apps++; });

  const gpool = starters.map(({ p }) => ({ p, w:GOAL_W[p.pos] * qual(p) }))
    .concat(subs.map(p => ({ p, w:GOAL_W[p.pos] * qual(p) * .35 })));
  const apool = starters.map(({ p }) => ({ p, w:AST_W[p.pos] * qual(p) }))
    .concat(subs.map(p => ({ p, w:AST_W[p.pos] * qual(p) * .35 })));

  for (let i = 0; i < gf; i++){
    const s = wpick(gpool);
    if (!s) break;
    st(s).goals++; bump(s, 'g');
    if (Math.random() < .68){
      const a = wpick(apool.filter(x => x.p !== s));
      if (a){ st(a).assists++; bump(a, 'a'); }
    }
  }
  const res = gf > ga ? 1 : gf === ga ? 0 : -1;
  const linha = p => p.pos === 'GOL' || p.pos === 'ZAG' || p.pos === 'LAT';
  const nota = (p, slot, peso) => {
    const m = mg.get(p.id) || { g:0, a:0 };
    let r = 6.30 + (effOvr(p, slot) - 72) * .028 + rnd(-.75, .75) + m.g * .60 + m.a * .35 + res * .22;
    if (linha(p)) r += ga === 0 ? .35 : ga >= 3 ? -.35 : 0;
    if (p.pos === 'GOL') r += ga === 0 ? .15 : ga >= 3 ? -.20 : 0;
    const s = st(p);
    s.rsum += clamp(r, 3, 10) * peso;
    s.rn += peso;
    if (Math.random() < CARD_W[p.pos]) s.yc++;
    if (Math.random() < .006) s.rc++;
  };
  starters.forEach(({ p, slot }) => nota(p, slot, 1));
  subs.forEach(p => nota(p, { p:p.pos, side:p.side || 'C' }, .45));
  if (ga === 0){
    const gk = starters.find(s => s.p.pos === 'GOL');
    if (gk) st(gk.p).cs++;
  }
}

/* ---------------- competições ---------------- */
function entryOf(c, myR){
  return { c, n:c.n, r: c === G.club ? myR : clubRating(c), me: c === G.club,
    pts:0, j:0, v:0, e:0, d:0, gp:0, gc:0 };
}
function tabela(entries){
  const T = entries;
  for (let i = 0; i < T.length; i++){
    for (let j = 0; j < T.length; j++){
      if (i === j) continue;
      const [gh, gv] = simScore(T[i].r, T[j].r);
      T[i].j++; T[j].j++;
      T[i].gp += gh; T[i].gc += gv; T[j].gp += gv; T[j].gc += gh;
      if (gh > gv){ T[i].pts += 3; T[i].v++; T[j].d++; }
      else if (gv > gh){ T[j].pts += 3; T[j].v++; T[i].d++; }
      else { T[i].pts++; T[j].pts++; T[i].e++; T[j].e++; }
      if (T[i].me) recordMy(gh, gv);
      else if (T[j].me) recordMy(gv, gh);
    }
  }
  return T.slice().sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || a.n.localeCompare(b.n));
}
function duelo(A, B){
  const home = Math.random() < .5 ? A : B, away = home === A ? B : A;
  const [gh, gv] = simScore(home.r, away.r);
  if (home.me) recordMy(gh, gv);
  else if (away.me) recordMy(gv, gh);
  let w = gh > gv ? home : gv > gh ? away : null, pens = false;
  if (!w){
    pens = true;
    w = Math.random() < clamp(.5 + (home.r - away.r) * .02, .2, .8) ? home : away;
  }
  return { w, l: w === home ? away : home, home, away, gh, gv, pens };
}
/* mata-mata direto: quem não cabe na chave de potência de dois passa direto da primeira fase.
   Guarda rodada a rodada para o resumo, e separa quem caiu na primeira fase: são esses que
   descem para a copa de baixo. */
function mataMata(entries){
  let vivos = shuffle(entries.slice());
  const out = { champion:null, runner:null, me:null, rounds:[], dropped:[] };
  /* o que a chave precisa saber de cada lado do confronto */
  const lado = e => ({ n:e.n, c1:e.c.c1, c2:e.c.c2, me:!!e.me });
  const rodada = (id, lista) => {
    const primeira = out.rounds.length === 0;
    const next = [], ties = [], caidos = [];
    for (let i = 0; i < lista.length; i += 2){
      const d = duelo(lista[i], lista[i + 1]);
      next.push(d.w); caidos.push(d.l);
      ties.push({ round:id, h:lado(d.home), a:lado(d.away), gh:d.gh, gv:d.gv, pens:d.pens, w:d.w.n,
        me: d.home.me || d.away.me ? (d.w.me ? 1 : -1) : 0 });
      if (d.l.me) out.me = { round:id, by:d.w.n };
      if (id === 'r2'){ out.champion = d.w.n; out.runner = d.l.n; }
    }
    out.rounds.push({ id, ties });
    if (primeira) out.dropped = caidos;
    return next;
  };
  let alvo = 1;
  while (alvo * 2 <= vivos.length) alvo *= 2;
  if (alvo < vivos.length){
    const extra = vivos.length - alvo;
    const jogam = vivos.slice(0, extra * 2), passam = vivos.slice(extra * 2);
    /* o sorteio é o embaralhamento da entrada: daqui para frente a ordem é a chave,
       e o vencedor de cada confronto já sabe quem vai encontrar na fase seguinte */
    vivos = rodada('prelim', jogam).concat(passam);
  }
  while (vivos.length > 1) vivos = rodada('r' + vivos.length, vivos);
  if (!out.champion && vivos.length) out.champion = vivos[0].n;
  if (vivos.length && vivos[0].me) out.me = { round:'champion' };
  return out;
}
/* o continente do seu clube define quem disputa a copa de fora */
function contLigas(){
  const c = G.club.liga.cont;
  return LIGAS.filter(l => l.cont === c);
}
/* lugar na fila do continente: os onze melhores overalls, o mesmo critério para a máquina
   e para você. O seu conta pelo elenco que recebeu: a vaga se ganha no ano anterior,
   não na janela que você acabou de fazer. */
function forcaDe(c){ return c === G.club ? squadRating(G.squad0) : clubRating(c); }
/* vagas de cada liga na copa continental: país mais forte leva mais times, mas todo país
   coloca pelo menos o seu melhor. A América do Sul entra com cinco ligas contra sete da Europa,
   então cada país sul-americano leva mais gente e as duas chaves terminam do mesmo tamanho,
   como na Libertadores de verdade. */
const VAGAS = { eu:{ 5:4, 4:3, 3:2, 2:1 }, sa:{ 4:5, 3:4, 2:3 } };
/* a copa de baixo (a Sul-Americana do jogo) pega a fila logo abaixo dessas vagas */
const VAGAS2 = { eu:{ 5:2, 4:2, 3:2, 2:1 }, sa:{ 4:3, 3:3, 2:2 } };
function contField(myR){
  const ligas = contLigas();
  const cont = [], cont2 = [];
  ligas.forEach(l => {
    const n1 = (VAGAS[l.cont] || VAGAS.eu)[l.forca] || 1;
    const n2 = (VAGAS2[l.cont] || VAGAS2.eu)[l.forca] || 1;
    const fila = l.clubes.slice().sort((a, b) => forcaDe(b) - forcaDe(a));
    fila.slice(0, n1).forEach(c => cont.push(entryOf(c, myR)));
    fila.slice(n1, n1 + n2).forEach(c => cont2.push(entryOf(c, myR)));
  });
  return { cont, cont2 };
}

function simulateSeason(){
  ST = new Map();
  const myR = lineupRating(G.lineup, G.squad);
  const liga = G.club.liga;

  const campo = contField(myR);
  const meCont = campo.cont.some(x => x.me);

  const ligaT = tabela(liga.clubes.map(c => entryOf(c, myR)));
  const copa = mataMata(liga.clubes.map(c => entryOf(c, myR)));
  const cont = mataMata(campo.cont);
  /* é isto que liga as duas copas: quem cai na primeira fase da de cima entra na de baixo */
  const campo2 = campo.cont2.concat(cont.dropped);
  const cont2 = mataMata(campo2);
  const meCont2 = campo2.some(x => x.me);

  const pos = ligaT.findIndex(x => x.me) + 1;
  /* onde a imprensa te colocava antes da janela: posição pelo elenco que você recebeu */
  const base = squadRating(G.squad0);
  const esperado = liga.clubes.map(c => c === G.club ? base : clubRating(c))
    .sort((a, b) => b - a).indexOf(base) + 1;

  const titulos = [];
  if (ligaT[0].me) titulos.push('liga');
  if (copa.me && copa.me.round === 'champion') titulos.push('copa');
  if (cont.me && cont.me.round === 'champion') titulos.push('cont');
  if (cont2.me && cont2.me.round === 'champion') titulos.push('cont2');

  const stats = [...ST.values()].filter(s => s.apps > 0)
    .map(s => Object.assign(s, { nota: s.rn ? s.rsum / s.rn : 0 }));
  const jogos = stats.reduce((a, s) => Math.max(a, s.apps), 0);
  const top = (list, key) => list.slice().sort((a, b) => b[key] - a[key] || b.apps - a.apps)[0] || null;
  const elegiveis = stats.filter(s => s.apps >= Math.max(6, jogos * .35));

  return {
    year: liga.cont === 'sa' ? '2027' : '2026/27',
    liga: liga.nome, ligaT, pos, esperado, titulos, jogos,
    copa, cont, meCont, cont2, meCont2, myR,
    /* o continente decide o nome das copas: Libertadores e Sul-Americana na América do Sul */
    contId: liga.cont,
    stats: stats.sort((a, b) => (b.goals * 2 + b.assists) - (a.goals * 2 + a.assists) || b.nota - a.nota),
    awards: {
      artilheiro: top(stats.filter(s => s.goals > 0), 'goals'),
      garcom: top(stats.filter(s => s.assists > 0), 'assists'),
      craque: top(elegiveis.length ? elegiveis : stats, 'nota'),
      goleiro: top(stats.filter(s => s.p.pos === 'GOL'), 'cs'),
      jogos: top(stats, 'apps'),
      revelacao: top(stats.filter(s => s.p.age <= 21 && s.apps >= 8), 'nota')
    }
  };
}

/* ---------------- relatório da temporada ---------------- */
const ROUND_KEY = { prelim:'round.prelim', r64:'round.r64', r32:'round.r32', r16:'round.r16',
  r8:'round.r8', r4:'round.r4', r2:'round.r2' };
function roundName(id){ return t(ROUND_KEY[id] || 'round.r16'); }
/* posição na tabela: 3º em português e espanhol, 3rd em inglês */
function ord(n){
  if (LANG !== 'en') return n + 'º';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function compName(id, s){
  if (id === 'liga') return s.liga;
  const k = 'comp.' + id + '.' + (s.contId || 'eu'), v = t(k);
  return v === k ? t('comp.' + id) : v;
}
/* como terminou cada mata-mata: título, vice, eliminação ou ausência */
function campanhaLine(cup, jogou){
  const fora = { st:t('camp.st.none'), cls:'off', det:'' };
  if (!cup || !jogou) return fora;
  const m = cup.me;
  if (!m) return fora;
  if (m.round === 'champion') return { st:t('camp.st.champ'), cls:'win', det:'' };
  if (m.round === 'r2') return { st:t('camp.st.vice'), cls:'amber', det:t('camp.runner', { club:esc(m.by) }) };
  return { st:t('camp.st.out'), cls:'',
    det:t('camp.out', { round:roundName(m.round).toLowerCase(), club:esc(m.by) }) };
}
/* ---------------- a chave das copas ---------------- */
/* sigla do escudo: a palavra mais longa do nome, sem os prefixos de fundação
   (FC Porto vira POR, Bayer Leverkusen vira LEV, Red Bull Bragantino vira BRA) */
const SIGLA_RUIDO = /^(fc|sc|ac|as|rc|aj|sv|ss|sl|sd|cf|cd|us|ud|ol|rb|afc|vfb|vfl|tsg|ogc|krc|kaa|kv|oh|fcv|avs|\d+\.?)$/i;
/* os poucos nomes em que a regra erra o apelido conhecido */
const SIGLA_FIXA = { 'Manchester City':'MCI', 'Manchester United':'MUN', 'Bayern de Munique':'BAY',
  'Paris Saint-Germain':'PSG', 'Borussia Mönchengladbach':'BMG', 'Paris FC':'PFC',
  'Olympique de Marseille':'MAR', 'Olympique Lyonnais':'LYO', 'Stade Brestois':'BRS',
  'KRC Genk':'GNK', 'KAA Gent':'GNT', 'Rayo Vallecano':'RAY', 'Levante':'LVT',
  'Estrela da Amadora':'AMA', 'Boca Juniors':'BOC', 'Vélez Sarsfield':'VEL',
  'San Lorenzo':'SLO', 'Atlético Nacional':'ATN', 'Santa Fe':'SFE',
  'Fortaleza CEIF':'CEI', 'Juventud':'JLP', 'Independiente del Valle':'IDV',
  'LDU Quito':'LDU', 'Barcelona SC':'BSC', 'El Nacional':'ENA', 'Libertad FC':'LFC',
  'Cerro Porteño':'CPO', 'Nacional de Asunción':'NAS', 'Sportivo Luqueño':'LUQ',
  'Sportivo Ameliano':'AML', 'Sportivo Trinidense':'TRI', 'Recoleta':'RCL' };
function sigla(n){
  if (SIGLA_FIXA[n]) return SIGLA_FIXA[n];
  const w = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[\s-]+/).filter(Boolean);
  const uteis = w.filter(x => !SIGLA_RUIDO.test(x));
  const base = (uteis.length ? uteis : w).reduce((a, b) => b.length > a.length ? b : a);
  return (base.length >= 3 ? base.slice(0, 3) : w.map(x => x[0]).join('').slice(0, 3)).toUpperCase();
}
/* texto que se lê por cima da cor principal do clube */
function tintaSobre(hex){
  const h = (hex || '#000').replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const l = (parseInt(v.slice(0, 2), 16) * .299 + parseInt(v.slice(2, 4), 16) * .587 +
    parseInt(v.slice(4, 6), 16) * .114) / 255;
  return l > .6 ? '#12142B' : '#FFFFFF';
}
function escudo(x, cls){
  return '<i class="bdisc' + (cls ? ' ' + cls : '') + '" style="--c1:' + esc(x.c1) + ';--c2:' + esc(x.c2) +
    ';--fg:' + tintaSobre(x.c1) + '">' + esc(sigla(x.n)) + '</i>';
}
/* o que o balão de cada confronto conta: a fase, o placar e os pênaltis, se houve */
function placarTit(r, tie){
  return roundName(r) + ' · ' + esc(tie.h.n) + ' ' + tie.gh + ':' + tie.gv + ' ' + esc(tie.a.n) +
    (tie.pens ? ' ' + t('ko.pens', { club:esc(tie.w) }) : '');
}
/* uma linha da cartela: escudo do clube e o gol que ele fez naquele confronto */
function brkCell(tie, lado){
  const x = tie[lado], g = lado === 'h' ? tie.gh : tie.gv;
  return '<div class="btm' + (tie.w === x.n ? ' w' : '') + (x.me ? ' me' : '') + '">' +
    escudo(x) + '<span class="g">' + g + '</span></div>';
}
/* a cartela do confronto: os dois clubes, um em cima do outro, como em qualquer chave */
function brkMatch(r, tie, cls){
  return '<div class="bmatch' + (cls ? ' ' + cls : '') + (tie.me !== 0 ? ' meu' : '') +
    '" data-tip="' + placarTit(r, tie) + '">' + brkCell(tie, 'h') + brkCell(tie, 'a') + '</div>';
}
/* a chave só desenha as fases que dobram direitinho: uma fase preliminar, em que parte do
   campo entra só depois, fica de fora e aparece no seu caminho */
function brkRounds(cup){
  const rr = cup.rounds;
  let ini = rr.length - 1;
  while (ini > 0 && rr.length - ini < 4 && rr[ini - 1].ties.length === rr[ini].ties.length * 2) ini--;
  return rr.slice(ini);
}
/* a chave inteira: os dois lados espelhados e a final no meio. Cada par de cartelas
   entra em uma forquilha, que é o que desenha o traço até a fase seguinte. */
function brkHtml(cup){
  const rr = brkRounds(cup);
  if (!rr.length) return '';
  const fim = rr[rr.length - 1], antes = rr.slice(0, -1);
  const col = (r, side, inner) => {
    const corte = r.ties.length / 2;
    const ties = side === 'l' ? r.ties.slice(0, corte) : r.ties.slice(corte);
    let html = '';
    for (let i = 0; i < ties.length; i += 2)
      html += ties.length > 1
        ? '<div class="bfork">' + ties.slice(i, i + 2).map(x => brkMatch(r.id, x)).join('') + '</div>'
        : brkMatch(r.id, ties[i]);
    return '<div class="bcol ' + side + (inner ? ' inner' : '') + '" style="--n:' +
      Math.max(1, Math.ceil(ties.length / 2)) + '">' + html + '</div>';
  };
  const ult = antes.length - 1;
  const esq = antes.map((r, i) => col(r, 'l', i === ult)).join('');
  const dir = antes.slice().reverse().map((r, i) => col(r, 'r', ult - i === ult)).join('');
  const f = fim.ties[0];
  const dono = f ? (f.w === f.h.n ? f.h : f.a) : null;
  const meio = '<div class="bmid">' +
    (f ? brkMatch(fim.id, f, 'fin') : '') +
    (dono ? '<div class="bchamp">' + escudo(dono, 'big') + '<b>' + esc(dono.n) + '</b>' +
      '<span>' + t('ko.champLabel') + '</span></div>' : '') + '</div>';
  return '<div class="tabwrap"><div class="brk">' + esq + meio + dir + '</div></div>';
}
/* o que a chave não mostra: os seus confrontos nas fases anteriores a ela */
function brkPath(cup){
  const fora = cup.rounds.slice(0, cup.rounds.length - brkRounds(cup).length);
  const rows = [];
  fora.forEach(r => r.ties.forEach(tie => {
    if (tie.me !== 0) rows.push('<div class="korow me"><span class="rd">' + roundName(r.id) + '</span>' +
      '<span class="mt">' + esc(tie.h.n) + ' <b>' + tie.gh + ':' + tie.gv + '</b> ' + esc(tie.a.n) +
      (tie.pens ? ' <span class="sdim">' + t('ko.pens', { club:esc(tie.w) }) + '</span>' : '') + '</span></div>');
  }));
  return rows.length ? '<div class="ko">' + rows.join('') + '</div>' : '';
}
/* cada copa ganha o seu próprio painel: nome, como terminou a sua campanha e a chave */
function koPanel(x, s, nota, d){
  const cup = x.c;
  if (!cup || !cup.rounds.length) return '';
  const l = campanhaLine(cup, x.j);
  const linha = [l.det, nota].filter(Boolean).join(' · ');
  return '<div class="pnl kop rv" style="--d:' + d + 's"><header><h3>' + esc(compName(x.id, s)) + '</h3>' +
    '<span class="r ' + l.cls + '">' + l.st + '</span></header>' +
    (linha ? '<p class="konote">' + linha + '</p>' : '') + brkPath(cup) + brkHtml(cup) + '</div>';
}
function statLine(s){
  return esc(s.p.name) + ' <span class="sdim">' + posPlain(s.p) + ' ' + s.p.ovr + '</span>';
}
function awardRow(k, s, val){
  if (!s) return '';
  return '<div class="crow"><div class="t2"><span class="nm">' + statLine(s) + '</span>' +
    '<span class="sc">' + val + '</span></div><p>' + t('award.' + k) + ' · ' +
    t('award.line', { j:s.apps, g:s.goals, a:s.assists, n:dec(s.nota) }) + '</p></div>';
}
/* veredito do ano: título pesa mais que tabela, e tabela pesa contra a expectativa */
function seasonVerdict(s){
  const n = s.titulos.length, N = s.ligaT.length;
  if (n >= 2) return t('season.v.multi', { n });
  if (s.titulos[0] === 'liga') return t('season.v.liga', { liga:esc(s.liga) });
  if (n === 1) return t('season.v.cup', { comp:esc(compName(s.titulos[0], s)) });
  if (s.pos <= 3) return t('season.v.podium', { pos:ord(s.pos) });
  if (s.pos >= N - 2) return t('season.v.releg', { pos:ord(s.pos) });
  if (s.pos <= s.esperado - 3) return t('season.v.over', { pos:ord(s.pos), exp:ord(s.esperado) });
  if (s.pos >= s.esperado + 3) return t('season.v.under', { pos:ord(s.pos), exp:ord(s.esperado) });
  return t('season.v.par', { pos:ord(s.pos), exp:ord(s.esperado) });
}
function seasonHtml(s){
  const me = s.ligaT[s.pos - 1];
  const trofeus = s.titulos.length
    ? s.titulos.map((id, i) => '<span class="trophy" style="--d:' + (.75 + i * .15).toFixed(2) + 's">' +
        esc(compName(id, s)) + '</span>').join('')
    : '<span class="trophy none" style="--d:.75s">' + t('season.notitle') + '</span>';

  const tabRows = s.ligaT.map((x, i) =>
    '<tr' + (x.me ? ' class="me"' : '') + '><td class="p">' + (i + 1) + '</td><td class="l">' + esc(x.n) + '</td>' +
    '<td>' + x.pts + '</td><td>' + x.j + '</td><td>' + x.v + '</td><td>' + x.e + '</td><td>' + x.d + '</td>' +
    '<td>' + x.gp + ':' + x.gc + '</td><td>' + (x.gp - x.gc > 0 ? '+' : '') + (x.gp - x.gc) + '</td></tr>').join('');

  const cups = [
    { id:'copa', c:s.copa, j:true },
    { id:'cont', c:s.cont, j:s.meCont },
    { id:'cont2', c:s.cont2, j:s.meCont2 }
  ];


  const a = s.awards;
  const awards =
    awardRow('artilheiro', a.artilheiro, a.artilheiro ? t('award.goals', { n:a.artilheiro.goals }) : '') +
    awardRow('garcom', a.garcom, a.garcom ? t('award.assists', { n:a.garcom.assists }) : '') +
    awardRow('craque', a.craque, a.craque ? t('award.rating', { n:dec(a.craque.nota) }) : '') +
    awardRow('goleiro', a.goleiro, a.goleiro ? t('award.cs', { n:a.goleiro.cs }) : '') +
    awardRow('revelacao', a.revelacao, a.revelacao ? t('award.rating', { n:dec(a.revelacao.nota) }) : '') +
    awardRow('jogos', a.jogos, a.jogos ? t('award.apps', { n:a.jogos.apps }) : '');

  const numeros = '<table class="stab nums"><thead><tr><th></th><th>' + t('tbl.j') + '</th><th>' + t('tbl.g') +
    '</th><th>' + t('tbl.a') + '</th><th>' + t('tbl.card') + '</th><th>' + t('tbl.rating') + '</th></tr></thead><tbody>' +
    s.stats.slice(0, 16).map(x =>
      '<tr><td class="l">' + statLine(x) + (x.p.signed ? ' <span class="chip gem">' + t('chip.reinforcement') + '</span>' : '') +
      '</td><td>' + x.apps + '</td><td>' + x.goals + '</td><td>' + x.assists + '</td><td>' + x.yc + (x.rc ? '/' + x.rc : '') +
      '</td><td>' + dec(x.nota) + '</td></tr>').join('') + '</tbody></table>';

  const reforcos = G.signings.length ? G.signings.map(p => {
    const x = s.stats.find(y => y.p.id === p.id);
    return '<div class="crow"><div class="t2"><span class="nm">' + esc(p.name) + ' <span class="sdim">' + posPlain(p) + ' ' + p.ovr + '</span></span>' +
      '<span class="sc">' + (x ? t('award.rating', { n:dec(x.nota) }) : '—') + '</span></div>' +
      '<p>' + (x ? t('season.sign.line', { j:x.apps, g:x.goals, a:x.assists }) : t('season.sign.none')) + '</p></div>';
  }).join('') : '<div class="empty">' + t('report.nosign') + '</div>';

  let pd = 1.55;
  const pnl = () => '<div class="pnl rv" style="--d:' + (pd += .16).toFixed(2) + 's">';
  return '<div class="season' + (G.seasonReveal ? ' reveal' : '') + '" id="seasonBlock">' +
    '<div class="shead">' +
      '<div class="eyebrow rv" style="--d:0s">' + t('season.eyebrow', { y:s.year, club:esc(G.club.n) }) + '</div>' +
      '<h2 class="rv" style="--d:.35s">' + (s.titulos.length ? t(s.titulos.length === 1 ? 'season.titles.one' : 'season.titles.n', { n:s.titulos.length })
        : t('season.titles.none')) + '</h2>' +
      '<div class="trophies">' + trofeus + '</div>' +
      '<p class="rv" style="--d:1.15s">' + seasonVerdict(s) + '</p>' +
      '<div class="sgrid rv" style="--d:1.35s">' +
        '<div><span>' + t('season.pos') + '</span><b>' + ord(s.pos) + '</b></div>' +
        '<div><span>' + t('season.pts') + '</span><b>' + me.pts + '</b></div>' +
        '<div><span>' + t('season.wdl') + '</span><b>' + me.v + '-' + me.e + '-' + me.d + '</b></div>' +
        '<div><span>' + t('season.gd') + '</span><b>' + me.gp + ':' + me.gc + '</b></div>' +
      '</div>' +
    '</div>' +
    /* a coluna da esquerda fica com a tabela e os prêmios, a da direita com os números
       e os reforços: as duas terminam na mesma altura e some o vão embaixo da tabela */
    '<div class="rgrid">' +
      '<div>' +
        pnl() + '<header><h3>' + t('season.table') + '</h3><span class="r">' + esc(s.liga) + '</span></header>' +
          '<div class="tabwrap"><table class="stab"><thead><tr><th></th><th class="l">' + t('tbl.club') + '</th><th>' + t('tbl.pts') +
          '</th><th>' + t('tbl.j') + '</th><th>' + t('tbl.v') + '</th><th>' + t('tbl.e') + '</th><th>' + t('tbl.d') +
          '</th><th>' + t('tbl.gols') + '</th><th>' + t('tbl.sg') + '</th></tr></thead><tbody>' + tabRows + '</tbody></table></div></div>' +
        pnl() + '<header><h3>' + t('season.awards') + '</h3></header>' + awards + '</div>' +
      '</div>' +
      '<div>' +
        pnl() + '<header><h3>' + t('season.numbers') + '</h3><span class="r">' +
          t('season.matches', { n:s.jogos }) + '</span></header><div class="tabwrap">' + numeros + '</div></div>' +
        pnl() + '<header><h3>' + t('season.signings') + '</h3><span class="r">' + G.signings.length + '</span></header>' +
          reforcos + '</div>' +
      '</div>' +
    '</div>' +
    /* as copas saem do meio da grade e viram uma seção só delas, uma copa por painel */
    '<div class="ksect rv" style="--d:' + (pd += .16).toFixed(2) + 's"><h3>' + t('season.ko') + '</h3>' +
      '<span>' + t('season.ko.note') + '</span></div>' +
    cups.map(x => koPanel(x, s,
      x.id === 'cont' ? t('ko.link', { comp:esc(compName('cont2', s)) }) : '',
      (pd += .12).toFixed(2))).join('') +
  '</div>';
}
/* ---------------- suspense: o ano corre antes de aparecer ---------------- */
const SIM_STEPS = [
  { k:'sim.s1', ms:600 }, { k:'sim.s2', ms:800 }, { k:'sim.s3', ms:750 }, { k:'sim.s4', ms:750 },
  { k:'sim.s5', ms:850 }, { k:'sim.s6', ms:800 }, { k:'sim.s7', ms:700 }, { k:'sim.s8', ms:800 }
];
let SIM = null, SIM_T = null;
function simText(i){ return t(SIM_STEPS[i].k, { liga:esc(G.club.liga.nome) }); }
/* o palco ocupa o lugar do botão enquanto a temporada roda */
function simStageHtml(){
  return '<div class="simstage" id="simStage">' +
    '<div class="simtop"><span class="live"></span><b>' + t('sim.head') + '</b>' +
      '<span class="pct" id="simPct">0%</span></div>' +
    '<div class="simbar"><i id="simFill"></i></div>' +
    '<ul class="simlog" id="simLog"></ul>' +
    '<button class="skip" id="btnSkip">' + t('sim.skip') + '</button></div>';
}
/* redesenha o palco a partir do passo atual, e por isso ele sobrevive a uma troca de idioma no meio */
function simPaint(){
  const log = $('#simLog');
  if (!log) return;
  let h = '';
  for (let i = Math.max(0, SIM.i - 3); i <= SIM.i; i++)
    h += '<li' + (i === SIM.i ? ' class="now"' : '') + '>' + simText(i) + '</li>';
  log.innerHTML = h;
  const p = Math.round((SIM.i + 1) / SIM_STEPS.length * 100);
  const fill = $('#simFill'), pct = $('#simPct'), skip = $('#btnSkip');
  if (fill) fill.style.width = p + '%';
  if (pct) pct.textContent = p + '%';
  if (skip) skip.onclick = revealSeason;
}
function simStep(){
  simPaint();
  SIM_T = setTimeout(() => {
    if (!SIM) return;
    if (++SIM.i >= SIM_STEPS.length) revealSeason();
    else simStep();
  }, SIM_STEPS[SIM.i].ms);
}
/* jogar de novo no meio da espera: os timers morrem com a janela antiga */
function simAbort(){ clearTimeout(SIM_T); SIM_T = null; SIM = null; }
function revealSeason(){
  if (!SIM) return;
  clearTimeout(SIM_T); SIM_T = null;
  G.season = SIM.res;
  SIM = null;
  G.seasonReveal = true;
  renderReport();
  G.seasonReveal = false;
  const el = $('#seasonBlock');
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}
function runSeason(){
  if (!G || G.season || SIM) return;
  /* o ano inteiro já está decidido nesta linha: daqui para baixo é só teatro */
  SIM = { res:simulateSeason(), i:0 };
  if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return revealSeason();
  renderReport();
  const el = $('#simStage');
  if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
  simStep();
}
