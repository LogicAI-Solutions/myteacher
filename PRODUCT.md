# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Professor autônomo brasileiro — professor particular, de idiomas, música, reforço
ou preparatório — que gerencia as próprias turmas sem secretaria, sem equipe
administrativa e sem software de gestão. Ele é o dono do negócio, o professor e o
financeiro ao mesmo tempo.

Audiência secundária confirmada pelo código, não prioritária no design: o aluno
(e/ou responsável), que acessa um portal próprio em `/portal` apenas para
consultar a própria situação. Escolas e redes aparecem como plano comercial
(Enterprise) mas não guiam as decisões de interface.

Cenário de uso real, confirmado pelo usuário: **notebook, em sessões de
trabalho**. O professor senta para organizar turmas, lançar pagamentos e ler
relatórios. Não é uso de corredor entre aulas. Isso implica telas maiores,
sessões mais longas, e ambiente de luz variável (casa/escritório) — não a tela do
celular sob luz de sala de aula.

## Product Purpose

Substituir o caderno, a planilha e o grupo de WhatsApp pelo lugar único onde o
professor autônomo vê quem são seus alunos, quem faltou, e quem pagou.

Sucesso é o professor terminar o mês sabendo exatamente quanto entrou, quanto
falta entrar e de quem — sem ter reconciliado nada à mão.

## Positioning

Sistemas de gestão escolar são desenhados para secretarias de escola: exigem
cadastro institucional, hierarquia de perfis e um processo de implantação. O
MyTeacherApp faz a mesma gestão — frequência, turmas, mensalidades — no tamanho
de uma pessoa só, com cadastro próprio, teste de 7 dias e cobrança por assinatura
direta.

O eixo em que ele ganha: **presença e dinheiro na mesma tela.** Chamada e
mensalidade não são módulos separados que alguém concilia depois; a falta e o
pagamento pendente do mesmo aluno vivem no mesmo registro.

## Operating Context

Fluxos confirmados no código:

- **Autenticação e assinatura:** cadastro público (`/register`), login JWT,
  período de teste com validação de expiração (`is_trial`, `trial_started_at`),
  tela dedicada de trial expirado, e checkout de assinatura via Stripe
  (`routers/billing.py`).
- **Turmas** (`/dashboard/classes`, `/dashboard/class/:id`): criação de turma com
  disciplina e valor; a tela de detalhe concentra chamada, alunos matriculados e
  lançamentos — é a tela mais pesada do sistema (~1270 linhas).
- **Alunos** (`/dashboard/students`): cadastro completo, matrícula em turmas,
  reordenação por drag-and-drop, avatar com recorte de imagem.
- **Financeiro** (`/dashboard/payments`): mensalidades por aluno, status pago /
  pendente, visão do mês e do ano.
- **Dashboard** (`/dashboard`): contagem de alunos ativos/inativos, pagos e
  pendentes do mês, em cartões e dois gráficos (Recharts).
- **Portal do aluno** (`/portal`): autenticação separada (`StudentAuthContext`),
  com dashboard próprio e escopo estritamente de leitura da própria situação.
- **Administração** (`/dashboard/admin`, planos, configurações): visível apenas
  para `is_admin`; gerencia usuários, planos e configurações do sistema.
- **Suporte:** o canal de suporte e de venda consultiva é WhatsApp
  (`utils/support.ts`), acionado da landing, da sidebar e da tela de trial.

## Capabilities and Constraints

- Stack: React 19 + TypeScript + Vite + Tailwind v4 (frontend); FastAPI +
  SQLAlchemy + PostgreSQL (backend); Docker Compose para dev e produção.
- Idioma de toda a interface: **português do Brasil**. Moeda: BRL. Nenhuma
  internacionalização está implementada nem foi pedida.
- Gráficos usam Recharts; ícones, lucide-react; drag-and-drop, @dnd-kit. Não há
  biblioteca de componentes de UI — todos os componentes são próprios.
- O sistema de temas existe hoje via classe no `<html>` (`ThemeContext`) e
  variáveis CSS em `src/index.css`; praticamente toda a cor do app já é
  tokenizada, com pouquíssimas cores literais nas páginas.
- Decisão explicitamente aberta pelo usuário: **nada é intocável.** Temas,
  navegação e identidade visual podem ser repensados.

## Brand Commitments

- Nome do produto: **MyTeacherApp**. Empresa: LogicIA Solutions.
- Restrição visual que o usuário fixou nesta rodada: a paleta deve ser
  profissional, e o sistema não deve parecer gerado por IA. Registrado como
  pedido, sem expandir em direção visual — isso pertence ao DESIGN.md.

## Evidence on Hand

- Planos e preços reais em `backend/core/init_db.py`: Essencial R$ 47,90/mês,
  Profissional R$ 97,90/mês, ambos com `stripe_price_id` real; Enterprise é "Sob
  Consulta". A landing tem uma cópia de fallback desses planos que precisa
  espelhar o backend.
- Ilustrações existentes: `frontend/src/assets/teacher_login_illustration.png`,
  `login_hero_female.png`, `login_hero_v2.png`.
- **Ausências que trabalhos futuros não podem inventar:** não há depoimentos,
  logos de clientes, números de adoção, benchmarks, estudos de caso, prêmios,
  nem certificações. Os números que aparecem hoje na landing ("1.240 alunos
  ativos", "98% de frequência") são ilustrativos dentro de um mock de produto e
  devem ser tratados como demonstração, nunca como métrica do negócio.

## Product Principles

1. **Um professor, não uma instituição.** Nenhum fluxo pode exigir uma equipe,
   um cargo ou uma etapa de implantação para funcionar.
2. **Presença e dinheiro juntos.** As telas devem manter visível a relação entre
   o aluno que falta e a mensalidade que não entrou; separá-las desfaz a razão
   do produto.
3. **A tarefa vence a expressão.** É software de trabalho usado em sessões
   longas: legibilidade, densidade útil e estados claros vêm antes de qualquer
   efeito.
4. **Nunca anunciar o que não existe.** Preço, capacidade e prova só aparecem se
   forem verdadeiros no backend.
5. **O aluno vê só o que é dele.** O portal é de leitura e estritamente
   escopado ao próprio registro.

## Accessibility & Inclusion

Nenhum padrão formal foi estabelecido pelo usuário. Requisito derivado do
cenário de uso confirmado: sessões longas de leitura em notebook exigem contraste
de texto adequado (WCAG AA) e alvos de toque utilizáveis no uso móvel
secundário. O código já respeita `prefers-reduced-motion`.
