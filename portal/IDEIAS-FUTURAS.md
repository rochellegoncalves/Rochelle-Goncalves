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
4. **Domínio bonito pra Área do Cliente** -- hoje o botão "Área do Cliente"
   no site aponta pro endereço feio de preview do Vercel
   (rochelle-goncalves-git-claude-client-portal-rochelle1.vercel.app).
   Configurar algo como `app.rochellegoncalves.com.br` (mesmo processo que
   fizemos pro domínio principal: registro no Vercel + registro DNS no
   Registro.br).

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

### 5. CRM (contatos + funil)
Cadastro de contatos/leads com etapas (Prospect -> Proposta -> Negociação ->
Cliente) e histórico de notas/interações por contato. Provavelmente entra
dentro do Painel do Negócio, e pode reaproveitar/conversar com a tabela
`clients` que já existe.

### 6. Contrato preenchido automaticamente + assinatura eletrônica
Ela mandou o modelo real do contrato de consultoria. Status:
1. ~~Gerar o PDF do contrato já preenchido com os dados do cliente~~ --
   **feito**. Botão "Gerar contrato (PDF)" no painel de detalhes de cada
   cliente (`/admin/clientes`) monta o PDF com as 20 cláusulas do modelo
   real dela, já preenchido com os dados da empresa e do administrador, e
   salva automaticamente como documento (categoria "Contrato") na área
   daquele cliente.
2. ~~Mandar esse PDF pra assinatura eletrônica~~ -- **feito**. Ela já usa o
   Autentique, então integramos direto: botão "Enviar p/ assinatura
   (Autentique)" no painel de detalhes do cliente manda o PDF pra API deles
   (`AUTENTIQUE_TOKEN` configurado no Vercel), com o administrador do
   cliente como signatário. O Autentique manda o e-mail de assinatura
   automaticamente.
3. Guardar o contrato assinado (voltando do Autentique) como documento na
   área do cliente -- ainda falta automatizar. Hoje dá pra baixar o
   assinado no próprio Autentique e subir manualmente em Documentos; pra
   automatizar, precisa configurar um webhook do Autentique avisando
   quando o documento for assinado por todos.

### 7. Botão "ver como o cliente vê" no cadastro do cliente
Depois que a Área do Cliente tiver mais conteúdo de verdade (Plano de Ação,
documentos, etc.), ela quer conseguir clicar num cliente em `/admin/clientes`
e ver a tela exatamente como aquele cliente vê -- pra conferir se está tudo
certo sem precisar logar com o e-mail dele. Passos prováveis: um botão
"Ver área do cliente" no painel de detalhes do cliente que abre a Área do
Cliente em modo leitura, usando as permissões da própria Rochelle (owner)
mas filtrando os dados pelo `client_id` escolhido -- não precisa trocar de
login. Construir só depois que a Área do Cliente tiver mais telas, pra não
ficar revisando uma tela vazia.

### 8. WhatsApp com histórico de mensagens dentro do CRM
Ela quer ver as conversas de WhatsApp direto no CRM. Isso exige contratar
acesso oficial à API do WhatsApp Business (Meta ou um intermediário tipo
Twilio/Zenvia), passar pela verificação da Meta (pode levar dias/semanas),
decidir um número de telefone dedicado, e aceitar custo por mensagem. Do
lado da construção, precisa de uma central que recebe as mensagens em tempo
real (webhook) e guarda no banco. Enquanto isso não sai do papel, dá pra
colocar um botão simples "Abrir WhatsApp" (link direto, sem custo, sem
aprovação) em cada contato do CRM.
