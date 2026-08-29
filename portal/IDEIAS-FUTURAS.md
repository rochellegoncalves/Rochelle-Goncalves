# Próximos passos e ideias futuras

## Próximos passos (em ordem)

0. **Testar subir um documento de cliente de verdade** -- usar o que já está
   pronto (upload manual no Supabase Storage + linha na tabela `documents`)
   pra confirmar que a Área do Cliente mostra e baixa o arquivo certinho.
1. **Painel de administração básico** -- Rochelle conseguir adicionar
   cliente e subir documento por uma tela própria, sem precisar mexer direto
   no Supabase.
2. **Plano de Ação via Google Sheets** -- sincronizar a planilha de plano de
   ação de cada cliente (Tarefa, Responsável, Prazo, Status, Etapa) com a
   tela de Plano de Ação do cliente, como já desenhado no mockup.
3. **Resto do Painel do Negócio** -- rentabilidade por cliente, timesheet e
   o cronômetro de horas, como já desenhado no mockup.

## Ideias para depois (backlog, sem ordem definida)

Coisas que a Rochelle pediu para anotar e construir mais pra frente (nenhuma
delas está implementada ainda).

### 1. Relacionamentos (planilha) como atividades em Minhas Tarefas
Ela mantém uma planilha com relacionamentos/contatos. Trazer isso pra dentro
de "Minhas Tarefas" como mais uma área/atividade, parecido com a sincronização
com o Google Sheets já planejada para o Plano de Ação do cliente.

### 2. Edição de data nas tarefas refletindo de volta no Todoist
Hoje "Minhas Tarefas" só lê do Todoist (via GET /tasks). Ela quer poder mudar
o prazo de uma tarefa direto na nossa tela e isso atualizar o Todoist de
verdade (via POST/update na API do Todoist v1) -- ou seja, virar uma via de
mão dupla, não só leitura.

### 3. Aba de processos jurídicos
Ela ainda atua como advogada e conduz processos judiciais. Adicionar uma nova
área/aba no Painel do Negócio pra acompanhar esses processos (provavelmente:
nome do processo, tribunal/vara, prazos, status -- a definir com ela os
campos exatos quando for construir).

### 4. Base técnica dela como contexto
Ela mencionou "alimentar" o assistente com a base técnica/conhecimento dela.
Ainda não está claro se isso significa (a) dar mais contexto sobre a
metodologia dela pra mim (Claude) usar em conversas futuras, ou (b) construir
uma biblioteca de conhecimento dentro da própria plataforma (pra ela ou pros
clientes). Perguntar pra ela qual das duas -- ou as duas -- antes de começar.
