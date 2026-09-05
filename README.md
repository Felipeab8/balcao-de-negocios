# Balcão de Negócios

Jogo de navegador em que você não escala o time durante a partida. Você monta o elenco na janela
de transferências. Um clube das oito principais ligas do mundo cai no seu colo (escolhido por você
no modo fácil, sorteado no difícil, imposto no expert) com o caixa, o teto salarial e os buracos
que ele tem de verdade. Você tem 18 dias para negociar, vender, escalar e
fechar. O mercado inteiro aparece na sua mesa, mas só uma parte dele atende: o que está ao seu
alcance depende do tamanho do clube que caiu no seu colo. No dia seguinte a imprensa dá a nota,
e é ela que decide se você fica.

HTML, CSS e JavaScript puros. Sem dependências, sem build obrigatório, sem servidor.

**[Jogar agora](https://felipeab8.github.io/balcao-de-negocios/)**

## Como jogar

Online, sem baixar nada: <https://felipeab8.github.io/balcao-de-negocios/>.

Localmente, abra `balcao-de-negocios/index.html` no navegador (duplo clique já funciona), ou o
arquivo único `balcao-de-negocios.html`, que é a mesma coisa com tudo embutido.

### Modos

Escolhidos na tela de abertura, antes de abrir a janela. Mudam só como o clube chega até você. As
regras da janela são as mesmas nos três.

| Modo | Como o clube chega |
| --- | --- |
| **Fácil** | Você escolhe a liga e o clube, um a um, entre os 150, e qual **incorporação financeira** aceitar. |
| **Difícil** | O clube é sorteado dentro da liga que você apontar. Não gostou? Sorteia de novo, **três vezes**. Trocar de liga gasta uma delas, e no fim das chances liga e clube travam. |
| **Expert** | Liga e clube sorteados de uma vez só, sem filtro e sem segunda chance. O que sair é seu. |

#### Incorporação financeira (só no fácil)

Três investidores na mesa, e cada um põe o dinheiro em um lugar diferente. Caixa compra passe, teto
salarial banca folha, e escolher o aporte é escolher que tipo de janela você vai fazer. Dá para
recusar os três.

| Investidor | Caixa | Teto salarial | Que janela ele permite |
| --- | ---: | ---: | --- |
| **Nenhuma** | — | — | o clube se vira com o que tem |
| **Fundo de investimento** | +90% | igual | comprar passe caro, sem espaço novo na folha |
| **Sócio majoritário** | +50% | +15% | meio-termo nas duas pontas |
| **Patrocinador master** | +15% | +40% | estrela livre e salário alto, sem dinheiro de compra |

O modo fica registrado na barra do topo e na nota final: janela de modo fácil com aporte aparece
como tal no relatório da imprensa (*modo fácil com patrocinador master*).

### Regras

1. **O mercado é aberto, o alcance não é**: todo jogador de todo clube (menos o seu) aparece na aba
   Mercado e você pode mandar proposta para qualquer um. Mas cada nome vem marcado por patamar:
   **fora do alcance** devolve a sondagem sem conversa (o Bayern não senta pra falar do Kane com um
   clube médio), **outro patamar** aceita negociar cobrando prêmio na taxa e no salário, e o resto
   trata normalmente. O que é alcançável sobe junto com o nível do seu elenco. A tabela mostra os
   250 primeiros do filtro. Refine por posição, liga ou nome, ou marque *só quem me atende*.
2. **Toda contratação tem duas fases.** Primeiro o dinheiro da transferência com o clube dono do
   jogador; depois a **entrevista** com o jogador e o empresário, onde se discute o contrato inteiro.
   Os dois precisam dizer sim.
3. **Recusa do clube não custa dia nenhum**, mas encarece o alvo: cada "não" sobe a pedida em 3%, e
   são quatro tentativas por jogador. **Assinar consome um dia, e sair da entrevista sem acordo
   também.** Enquanto isso, clubes rivais vão fechando com alguns nomes do mercado.
4. **Vender é ferramenta legítima** para liberar caixa e folha, e também é negociação: cada
   jogador do elenco tem a sua fila de clubes interessados. Deixar uma posição descoberta não é.
5. **A nota vai de F a A+**, e a aprovação começa em **B (68 pontos)**.

### A entrevista

Fechado o valor com o clube, o jogador senta à mesa. São seis itens, e um medidor de
**convencimento** (0 a 100) que reage a cada ajuste. Ele só assina acima da exigência dele, que
começa em 70 e **sobe 7 a cada recusa**. São três rodadas antes de o empresário levantar da mesa.

| Item | O que está em jogo |
| --- | --- |
| **Salário semanal** | pesa mais que tudo e ocupa o teto da folha para sempre |
| **Luvas** | dinheiro à vista na assinatura, direto do caixa |
| **Comissão do empresário** | percentual sobre a taxa, também à vista |
| **Duração do contrato** | 1 a 5 anos; jovem quer contrato longo, veterano quer curto |
| **Papel no elenco** | promessa, rotação, titular ou estrela; prometer é grátis, cumprir não |
| **Cláusula de rescisão** | nenhuma a 1,5× o valor dele; quanto mais alta, pior para ele |

A mesa abre na posição do clube, não na dele: é você que tem de subir. Pagar acima do pedido em um
item compensa apertar outro: dá para segurar salário com luvas gordas, ou comprar um contrato de
cinco anos prometendo papel de estrela. Chegando perto, vem contraproposta com os números exatos.
Perto demais do limite é sempre risco: o jogador tem uma teimosia escondida de alguns pontos.

E a imprensa cobra o que você prometeu: **papel de titular ou estrela para quem termina a janela no
banco vira desconto na nota**, assim como **cláusula barata em reforço de destaque**. Luvas e
comissão entram no custo-benefício junto com a taxa, porque o pacote inteiro é o que você gastou.

### A venda

Clicar em *Vender* abre a **fila de interessados** daquele jogador: de dois a quatro clubes das oito
ligas, cada um com liga, nível, o quanto quer o jogador (*prioridade da diretoria*, *interessado*,
*só sondando*) e a oferta que pôs na mesa. Dá para aceitar a oferta como está ou **sentar com um
clube de cada vez**.

Na mesa há dois botões de verdade: a **pedida** e a **forma de pagamento**. Um medidor mostra o
quanto a sua pedida pesa no bolso daquele comprador, com a linha do teto estimado dele.

| Item | O que está em jogo |
| --- | --- |
| **Pedida** | o total do negócio; acima do teto do clube vem contraproposta, muito acima vem recusa |
| **À vista** | tudo entra no caixa hoje, e o teto do comprador é o que ele tem |
| **2 parcelas** | ele aguenta 14% a mais no total, e só 62% entra no caixa agora |
| **3 parcelas** | ele aguenta 27% a mais no total, e só 42% entra no caixa agora |

São **três rodadas por clube**. Pedir demais queima rodada e esfria o comprador em 3%; sem rodada,
ele levanta da mesa e sai da fila. Enquanto você aperta um, os outros da fila se mexem: é comum um
rival subir a oferta no meio da conversa. Se a fila inteira acabar, dá para **sondar o mercado de
novo por um dia**, com clubes novos e um pouco menos de fome.

O painel de negócios e a meta de arrecadação contam **o que entrou no caixa**, não o total assinado:
parcelar sobe o preço do passe e adia o dinheiro que você tem para gastar na janela. Fechar a venda
consome um dia.

### As metas do conselho

Antes de a janela abrir, o conselho fecha **quatro metas contáveis**, tiradas do próprio elenco
sorteado: contratar dois laterais, levar a zaga a 79 de média, levar o XI titular a 78,2 de força,
arrecadar um valor em vendas, contratar um jogador de até 23 anos com potencial alto. Elas aparecem
no dossiê de abertura, num painel próprio ao lado do mercado (com barra de andamento e o número de
hoje) e voltam uma a uma no relatório final.

Valem **26 dos 100 pontos**, com **crédito proporcional**: meta pela metade paga metade. São o
caminho mais direto para a nota, e cumprir as quatro puxa junto o impacto na escalação e as
carências, porque é disso que elas são feitas.

### Como a nota é calculada

| Critério | Pontos |
| --- | ---: |
| Metas do conselho | 26 |
| Impacto na escalação (força do XI vs. o XI de abertura) | 20 |
| Carências resolvidas | 20 |
| Custo-benefício (valor de mercado ÷ taxa + luvas + comissão) | 14 |
| Saúde financeira (folha dentro do teto, uso do caixa) | 10 |
| Projeto de futuro (idade, potencial e tamanho do contrato dos reforços) | 10 |

**Carência é medida pelo buraco que ela tem**, não por uma régua fixa: a posição está resolvida
quando alcança o nível do elenco. Um buraco de 6 pontos pede 6 pontos de reforço; um de 2 pede 2.
Antes toda posição pedia 5, e a que estava quase em dia era impossível de fechar.

Com penalidades para vaga em aberto no XI, elenco sem gente para a posição, folha estourada,
elenco inchado, janela sem nenhum reforço, papel prometido na entrevista e não cumprido, e cláusula
de rescisão barata em reforço de destaque.

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

`game.js` não tem nenhum nome de clube ou jogador embutido: ele lê `window.LIGAS`, montado pelos
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
**valores aproximados** montados de memória. Overalls, idades e elencos servem ao equilíbrio do
jogo, não à precisão de banco de dados. Quando a base não cobre a profundidade de uma posição, o
elenco é completado por atletas gerados com nomes do país da liga. Projeto de fã, sem vínculo com
os clubes, ligas ou entidades citados.
