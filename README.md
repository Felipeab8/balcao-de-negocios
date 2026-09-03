# Balcão de Negócios

Jogo de navegador em que você não escala o time durante a partida — você monta o elenco na janela
de transferências. Um clube das oito principais ligas do mundo cai no seu colo com o caixa, o teto
salarial e os buracos que ele tem de verdade. Você tem 18 dias para negociar, vender, escalar e
fechar. O mercado inteiro aparece na sua mesa, mas só uma parte dele atende: o que está ao seu
alcance depende do tamanho do clube que caiu no seu colo. No dia seguinte a imprensa dá a nota —
e é ela que decide se você fica.

HTML, CSS e JavaScript puros. Sem dependências, sem build obrigatório, sem servidor.

**[Jogar agora](https://felipeab8.github.io/balcao-de-negocios/)**

## Como jogar

Online, sem baixar nada: <https://felipeab8.github.io/balcao-de-negocios/>.

Localmente, abra `balcao-de-negocios/index.html` no navegador (duplo clique já funciona), ou o
arquivo único `balcao-de-negocios.html`, que é a mesma coisa com tudo embutido.

### Regras

1. **O mercado é aberto, o alcance não é**: todo jogador de todo clube (menos o seu) aparece na aba
   Mercado e você pode mandar proposta para qualquer um. Mas cada nome vem marcado por patamar —
   **fora do alcance** devolve a sondagem sem conversa (o Bayern não senta pra falar do Kane com um
   clube médio), **outro patamar** aceita negociar cobrando prêmio na taxa e no salário, e o resto
   trata normalmente. O que é alcançável sobe junto com o nível do seu elenco. A tabela mostra os
   250 primeiros do filtro — refine por posição, liga ou nome, ou marque *só quem me atende*.
2. **Acordo fechado gasta um dia**, contraproposta também. **Proposta recusada não custa dia nenhum**,
   mas encarece o alvo: cada "não" sobe a pedida em 3%, e são quatro tentativas por jogador antes de
   a negociação morrer. Enquanto isso, clubes rivais vão fechando com alguns nomes do mercado.
3. **Toda contratação tem duas conversas**: o clube dono do jogador quer o valor de transferência,
   o jogador quer salário. Os dois precisam dizer sim. Perto do acordo vem contraproposta; longe
   demais, a pedida sobe.
4. **Vender é ferramenta legítima** para liberar caixa e folha — deixar uma posição descoberta não é.
5. **A nota vai de F a A+**, e a aprovação começa em **B (70 pontos)**.

### Como a nota é calculada

| Critério | Pontos |
| --- | ---: |
| Impacto na escalação (força do XI vs. o XI de abertura) | 30 |
| Carências resolvidas | 25 |
| Custo-benefício (valor de mercado ÷ o que você gastou) | 20 |
| Projeto de futuro (idade e potencial dos reforços) | 15 |
| Saúde financeira (folha dentro do teto, uso do caixa) | 10 |

Com penalidades para vaga em aberto no XI, elenco sem gente para a posição, folha estourada,
elenco inchado e janela sem nenhum reforço.

### Escalação

A aba **Escalação** tem campo, tática e banco. Clique num reserva e depois numa posição do campo
para escalar; clique em duas posições para trocar os jogadores de lugar. Cinco formações
(4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 3-4-3), e a escolha muda o jogo inteiro: as vagas do esquema definem
o que o scouting considera carência, e jogador fora de posição perde overall. A escalação que você
deixar montada é a que a imprensa avalia.

## Estrutura

```
index.html                     redireciona para o jogo (GitHub Pages)
balcao-de-negocios.html        build de arquivo único (tudo embutido)
balcao-de-negocios/
├── index.html                 marcação das três telas
├── styles.css                 tokens de cor e tipografia, layout, campo, modal
├── game.js                    toda a lógica: elenco, mercado, negociação, escalação, nota
├── build.sh                   gera a build de arquivo único a partir das partes
└── data/
    ├── names.js               bancos de nomes por país (jogadores gerados)
    ├── premier.js             Premier League
    ├── bundesliga.js          Bundesliga
    ├── laliga.js              La Liga
    ├── seriea.js              Serie A
    ├── ligue1.js              Ligue 1
    ├── brasileirao.js         Brasileirão
    ├── belgica.js             Pro League
    └── portugal.js            Liga Portugal
```

`game.js` não tem nenhum nome de clube ou jogador embutido — ele lê `window.LIGAS`, montado pelos
arquivos de `data/`. Dá para trocar ligas, clubes e elencos inteiros sem tocar na lógica.

### Formato dos dados

```js
{ n:'Arsenal', cid:'Londres', lvl:85, c1:'#EF0107', c2:'#0A1F44', p:[
  ['David Raya','GOL',30,85], ['William Saliba','ZAG',24,87], /* [nome, posição, idade, overall] */
]}
```

Posições: `GOL`, `ZAG`, `LAT`, `VOL`, `MEI`, `PON`, `ATA`. `lvl` é o nível do elenco (60–87) e define
orçamento, teto salarial e a régua das carências.

## Build

O jogo roda direto dos arquivos separados. A build de arquivo único existe só para publicar a página
em um lugar que aceite um HTML só:

```sh
cd balcao-de-negocios
sh build.sh
```

## Sobre os dados

150 clubes e cerca de 1.900 jogadores reais das temporadas 2025/26 (2025 no Brasileirão), em
**valores aproximados** montados de memória — overalls, idades e elencos servem ao equilíbrio do
jogo, não à precisão de banco de dados. Quando a base não cobre a profundidade de uma posição, o
elenco é completado por atletas gerados com nomes do país da liga. Projeto de fã, sem vínculo com
os clubes, ligas ou entidades citados.
