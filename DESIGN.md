---
name: MyTeacherApp
description: O registro escolar brasileiro como software — papel bond, campo com rótulo, fio de 1px e carimbo.
colors:
  ink: "#001D39"
  ink-muted: "#46617C"
  ink-faint: "#63788E"
  sheet: "#FFFFFF"
  desk: "#EEF4F9"
  rule: "#D7E5EF"
  rule-strong: "#B6CEE0"
  academic-blue: "#0A4174"
  academic-blue-pressed: "#001D39"
  academic-blue-light: "#49769F"
  success-green: "#237A57"
  via-ochre: "#8A6216"
  margin-red: "#A33124"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.07em"
  data:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.3
    fontFeature: "tnum"
rounded:
  field: "2px"
  sheet: "3px"
  none: "0"
spacing:
  hair: "4px"
  tight: "8px"
  snug: "12px"
  base: "16px"
  loose: "24px"
  section: "32px"
  chapter: "48px"
components:
  button-primary:
    backgroundColor: "{colors.academic-blue}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
    padding: "10px 18px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.academic-blue-pressed}"
    textColor: "{colors.sheet}"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 18px"
  button-danger:
    backgroundColor: "{colors.margin-red}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
    padding: "10px 18px"
  field:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "20px 12px 8px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px"
  stamp-paid:
    backgroundColor: "rgba(35, 122, 87, 0.08)"
    textColor: "{colors.success-green}"
    rounded: "{rounded.field}"
    padding: "3px 8px"
    typography: "{typography.label}"
  stamp-pending:
    backgroundColor: "rgba(138, 98, 22, 0.10)"
    textColor: "{colors.via-ochre}"
    rounded: "{rounded.field}"
    padding: "3px 8px"
    typography: "{typography.label}"
  stamp-late:
    backgroundColor: "rgba(163, 49, 36, 0.09)"
    textColor: "{colors.margin-red}"
    rounded: "{rounded.field}"
    padding: "3px 8px"
    typography: "{typography.label}"
---

# Design System: MyTeacherApp

## Overview

**Creative North Star: "O Registro Escolar"**

O produto substitui um objeto real: o diário de classe, a ficha do aluno e o
livro-caixa que o professor autônomo mantinha à mão. O sistema visual assume
esse objeto em vez de fugir dele. A tela é uma folha de papel bond sobre uma
mesa; o dado mora dentro de um campo com o rótulo impresso na própria caixa; a
estrutura é feita de fios de 1px, não de sombras; e o estado de uma mensalidade
chega como carimbo, não como etiqueta colorida arredondada.

A densidade é a de um documento de trabalho, não a de uma landing page. O
cenário confirmado é notebook, em sessões longas — então o padrão é claro, o
texto é grande o suficiente para ser lido por meia hora seguida, e nada pisca.
A cor é escassa por doutrina: a superfície inteira é papel e tinta, o azul
acadêmico identifica ações e navegação, e verde, ocre e vermelho ficam
reservados aos estados quitado, aguardando e atrasado.

Rejeições confirmadas com o usuário: nada de cara de IA. Concretamente, o
sistema anterior misturava índigo e roxo, vidro fosco, orbes desfocadas no fundo,
texto em gradiente e sombras coloridas sem deslocamento. Todos foram removidos,
não suavizados.

**Key Characteristics:**

- Papel e tinta: fundo de mesa mais escuro que a folha, e a folha é branca.
- Fio de 1px como estrutura primária; sombra só quando algo realmente flutua.
- Cantos de 2px. O documento é retangular.
- Rótulo dentro da caixa do campo, em versalete pequeno.
- Estado como carimbo em versalete, nunca como pill.
- Algarismos tabulares em toda coluna comparável.
- Três temas derivados de um mundo só: bond, almaço e ardósia.

## Colors

Papel, tinta e uma identidade azul separada das três cores que o professor
precisa distinguir em menos de um segundo: quitado, aguardando, atrasado.

### Primary

- **Azul Acadêmico** (`#0A4174`): inspirado em caneta e caderno, carrega toda
  ação primária, o item ativo da navegação, links e o foco do teclado. É a cor
  de identidade, nunca um estado financeiro.
- **Azul Pressionado** (`#001D39`): o estado `:hover` e `:active` de tudo que é
  Azul Acadêmico.
- **Azul Claro** (`#49769F`): tinta secundária e ícones
  auxiliares. Nunca é fundo de botão.

### Secondary

- **Ocre da Segunda Via** (`#8A6216`): a cor da via 2 do papel autocopiativo.
  Significa exatamente uma coisa: **aguardando** — mensalidade pendente ainda
  dentro do prazo, convite não aceito, tarefa não concluída. Não é uma cor de
  ênfase.

### Tertiary

- **Vermelho da Margem** (`#A33124`): a linha vertical vermelha da margem do
  papel almaço. Significa **atrasado** ou **destrutivo**. Nada mais.

### Neutral

- **Tinta** (`#001D39`): todo texto de leitura e todo título. Preto com desvio
  verde, não preto azulado.
- **Tinta Fraca** (`#46617C`): rótulos, legendas, metadados, texto secundário.
  Contraste 5.8:1 sobre a folha — passa AA para corpo de texto.
- **Tinta Apagada** (`#63788E`): placeholder e texto desabilitado apenas.
  Nunca conteúdo que precise ser lido. O valor é o mais claro que ainda passa
  4.5:1 sobre a folha — placeholder é texto e responde à mesma regra de
  contraste que o corpo, não à do texto decorativo.
- **Folha** (`#FFFFFF`): a superfície do registro. Cartões, tabelas, campos.
- **Mesa** (`#EEF4F9`): o fundo da aplicação, sempre mais escuro que a folha,
  para que a folha leia como folha.
- **Fio** (`#D7E5EF`): divisória e borda padrão, sempre 1px.
- **Fio Forte** (`#B6CEE0`): borda de campo em repouso e cabeçalho de tabela.

### Named Rules

**A Regra da Margem.** O Vermelho da Margem só aparece quando há dinheiro
atrasado ou quando uma ação apaga dados. Ele nunca é cor de título, de ícone
decorativo, de borda de card ou de gráfico neutro. Sua raridade é o que o faz
funcionar.

**A Regra do Papel.** A cor de fundo da aplicação é sempre mais escura que a
cor do conteúdo. Se a folha e a mesa forem iguais, a hierarquia do documento
desapareceu.

**A Regra da Tinta Única.** Nenhuma tela usa mais de uma cor de acento ao mesmo
tempo por motivo estético. Duas cores na mesma tela significam dois estados
diferentes de mensalidade, e nada além disso.

## Typography

**Display Font:** Archivo (fallback `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Archivo
**Label Font:** Archivo, em versalete traqueado

**Character:** Archivo é uma grotesca de trabalho, desenhada para texto pequeno
em formulário impresso e para manchete curta — a mesma face serve o rótulo de
11px dentro do campo e o título de 40px do dashboard sem trocar de família. Tem
eixo de largura e algarismos tabulares, que é o motivo real da escolha: as
colunas de mensalidade precisam alinhar dígito com dígito.

### Hierarchy

- **Display** (700, `clamp(1.75rem, 3vw, 2.5rem)`, lh 1.1, ls -0.02em): título
  da página e manchete da landing. Uma por tela.
- **Headline** (600, 1.375rem, lh 1.2, ls -0.01em): título de seção e de folha.
- **Title** (600, 1rem, lh 1.3): rótulo de card, cabeçalho de tabela, botão.
- **Body** (400, 0.9375rem, lh 1.55): texto corrido, medida máxima de 68ch.
- **Label** (500, 0.6875rem, ls 0.07em, caixa alta): rótulo de campo, carimbo,
  legenda de gráfico, metadado.
- **Data** (500, 0.9375rem, `tabular-nums`): valores, contagens, datas.

### Named Rules

**A Regra da Coluna.** Todo algarismo que possa ser comparado verticalmente —
valor, contagem, data, percentual — usa `font-variant-numeric: tabular-nums`.
Uma coluna de dinheiro com algarismos proporcionais é um defeito, não uma
preferência.

**A Regra do Rótulo Impresso.** O rótulo do campo vive dentro da caixa do
campo, no alto à esquerda, em versalete de 11px. Placeholder não substitui
rótulo: o rótulo continua legível depois que o campo é preenchido.

## Layout

Contêiner máximo de 1152px (`max-w-6xl`) para telas de gestão; 68ch para texto
corrido. A grade de conteúdo é de 12 colunas implícitas via Tailwind, com a
sidebar fora dela.

Ritmo de espaçamento em passos de 4px: 4 / 8 / 12 / 16 / 24 / 32 / 48. Um único
ritmo em todo o app. Sempre mais espaço acima de um título do que abaixo dele —
a proporção padrão é 32px acima, 12px abaixo.

Densidade: linha de tabela com 40px de altura em desktop; a chamada e as
listas de aluno são densas de propósito, porque a tarefa é varrer muitos nomes.
Formulários e telas de leitura são folgados.

Breakpoints herdados do Tailwind (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). A
sidebar vira menu inferior fixo abaixo de `md`. Tabelas com mais de quatro
colunas viram lista de fichas empilhadas abaixo de `md`, nunca rolagem
horizontal de conteúdo essencial.

Escala tipográfica base responsiva já existente: 14px no celular, 15px em `sm`,
16px a partir de `md`.

## Elevation & Depth

O sistema é **plano por padrão e estruturado por fios**. A profundidade vem da
diferença entre a mesa e a folha, e da divisória de 1px — não da sombra. Uma
folha em repouso não tem sombra nenhuma.

Sombra existe apenas onde algo de fato saiu do plano do documento: um menu que
abriu, um modal que cobriu a tela, uma linha que o ponteiro levantou. Toda
sombra tem deslocamento vertical e desfoque suave; halo colorido sem
deslocamento não existe neste sistema.

### Shadow Vocabulary

- **Levantado** (`box-shadow: 0 1px 2px rgba(26,31,28,.06), 0 8px 24px -6px rgba(26,31,28,.14)`):
  menus suspensos, popovers, linha sob o ponteiro.
- **Sobreposto** (`box-shadow: 0 2px 4px rgba(26,31,28,.08), 0 24px 48px -12px rgba(26,31,28,.24)`):
  modais e gavetas.

### Named Rules

**A Regra do Plano.** Uma superfície em repouso é plana. A sombra é resposta a
um estado — abriu, cobriu, levantou — nunca um atributo permanente do
componente.

**A Regra do Fio.** A estrutura é feita de linhas de 1px na cor Fio. Uma borda
colorida acima de 1px em card, item de lista ou alerta está proibida; se o item
precisa de cor de estado, ela vai no carimbo, não na borda.

## Shapes

Retangular. Raio de **2px** em campos, botões, carimbos e células; **3px** na
folha; **0** em tabelas e divisórias. O único elemento circular do sistema é o
avatar, porque é uma fotografia recortada, e o marcador de presença na grade de
chamada, porque é uma marca de caneta.

Sem chanfro, sem clipping decorativo, sem forma de fundo. A silhueta recorrente
é o **campo com rótulo**: um retângulo de 1px com o rótulo em versalete
encostado no topo interno e o valor ocupando o resto.

## Components

### Buttons

- **Shape:** retângulo de cantos quase retos (2px), altura de 38px em desktop.
- **Primary:** Azul Acadêmico com texto Folha, padding 10px 18px, peso 600.
  Uma ação primária por tela.
- **Hover / Focus:** fundo vai para Azul Pressionado em 150ms. Foco de teclado
  é um anel de 2px em Azul Acadêmico com 2px de deslocamento — visível sobre
  qualquer fundo, e nunca removido.
- **Outline:** fundo Folha, texto Tinta, fio de 1px em Fio Forte; no hover a
  borda vai para Azul Acadêmico. É a ação secundária padrão.
- **Ghost:** sem fundo nem borda, texto Tinta Fraca; hover pinta um fundo de
  4% de tinta. Só para ações terciárias dentro de linha de tabela.
- **Danger:** Vermelho da Margem com texto Folha. Exclusivo de exclusão.

### Cards / Containers

- **Corner Style:** 3px.
- **Background:** Folha sobre Mesa.
- **Shadow Strategy:** nenhuma em repouso (ver Elevation & Depth).
- **Border:** 1px em Fio.
- **Internal Padding:** 24px em desktop, 16px abaixo de `sm`.
- **Nested:** proibido. Uma folha dentro de outra vira seção separada por um
  fio horizontal, não uma segunda caixa.

### Inputs / Fields

- **Style:** fundo Folha, fio de 1px em Fio Forte, raio 2px, rótulo em versalete
  de 11px no topo interno, valor em 15px encostado embaixo.
- **Focus:** a borda vira Azul Acadêmico e ganha um segundo fio interno de 1px
  na mesma cor — a espessura dobra sem que o layout mova.
- **Error:** borda em Vermelho da Margem e a mensagem em Vermelho da Margem
  abaixo do campo, nomeando o problema e a correção.
- **Disabled:** fundo Mesa, texto Tinta Apagada, cursor `not-allowed`.

### Tables

Cabeçalho em Label sobre fundo Mesa, com fio de 1px embaixo. Linha de 40px,
separada por fio. Coluna numérica alinhada à direita com algarismos tabulares.
Hover pinta a linha com 3% de tinta. Zebra listrada não é usada — o fio basta.

### Stamps (carimbo de estado)

O componente de assinatura do sistema. Substitui o badge arredondado.

- Versalete de 11px, tracking 0.07em, raio 2px, padding 3px 8px.
- Fio de 1px na própria cor do estado, fundo na mesma cor a 8–10%.
- **PAGO** em Verde de Sucesso, **PENDENTE** em Ocre da Segunda Via,
  **ATRASADO** em Vermelho da Margem, **INATIVO** em Tinta Fraca.
- O texto do carimbo é sempre a palavra, nunca só a cor: o estado continua
  legível para quem não distingue verde de vermelho.

### Navigation

Sidebar com fundo Folha e fio de 1px à direita. Item em Body, 15px, Tinta
Fraca; hover pinta 4% de tinta. O item ativo recebe fundo Azul Acadêmico,
texto Folha e raio de 2px. Abaixo de `md` a sidebar sai e a navegação vira a
barra inferior fixa, onde o item ativo é indicado por texto em Azul Acadêmico
e um fio de 2px no topo do item.

### A Faixa do Registro (signature component)

A tira contínua que liga presença e dinheiro no mesmo aluno — a razão de ser do
produto, desenhada como uma linha só. Cada aluno é uma faixa horizontal onde o
período corre da esquerda para a direita: a presença não escreve nada (o silêncio
é a evidência de que está tudo certo), a falta escreve uma marca em Tinta, e o
mês de mensalidade escreve um carimbo colorido sob a linha. Ler a faixa de um
aluno responde, sem clique, a única pergunta que o professor tem: este aluno
está vindo e está pagando?

## Do's and Don'ts

### Do:

- **Do** usar o carimbo (`.stamp`) para todo estado de mensalidade, matrícula
  ou presença, sempre com a palavra visível.
- **Do** manter o rótulo dentro da caixa do campo e legível depois do
  preenchimento.
- **Do** aplicar `tabular-nums` em toda coluna de valor, contagem ou data.
- **Do** separar conteúdo com um fio de 1px em `--rule` antes de considerar uma
  segunda caixa.
- **Do** deixar o fundo da aplicação (`--desk`) mais escuro que a folha
  (`--sheet`) em todo tema, inclusive no escuro.
- **Do** dar a toda sombra um deslocamento vertical e um desfoque suave.
- **Do** manter o anel de foco de teclado em todos os controles interativos.

### Don't:

- **Don't** usar `backdrop-filter` / `blur` como decoração. Vidro fosco está
  fora do sistema; ele só é aceitável na cortina atrás de um modal.
- **Don't** usar texto em gradiente. Ênfase vem de peso e tamanho.
- **Don't** usar sombra colorida sem deslocamento (`glow`), orbe desfocada de
  fundo, ou `animate-float` / `animate-glow` / `animate-shimmer`.
- **Don't** usar `border-left` colorido acima de 1px em card, alerta ou item de
  lista. O estado vai no carimbo.
- **Don't** usar `rounded-xl`, `rounded-2xl`, `rounded-3xl` ou `rounded-full` em
  contêiner, campo ou botão. Circular só em avatar e marca de presença.
- **Don't** usar botão com `bg-gradient-to-*`. Botão primário é chapado.
- **Don't** escrever cor literal do Tailwind (`text-indigo-400`, `bg-white/10`,
  `text-white`) em página: todas as cores passam pelos tokens, porque três temas
  dependem disso.
- **Don't** aninhar cartão dentro de cartão.
- **Don't** usar emoji em título de interface. O sistema é um registro de
  trabalho.
