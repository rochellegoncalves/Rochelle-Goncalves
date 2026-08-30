# Próximos passos (por prioridade)

Já feito: painel de administração (clientes + documentos), contrato
preenchido automaticamente + assinatura eletrônica via Autentique + salvo
sozinho em Documentos quando assinado + auto-assinatura da CONTRATADA
(Rochelle) via API assim que o contrato é gerado, restando só o cliente
assinar. Domínio próprio da Área do Cliente também já está no ar em
`clientes.rochellegoncalves.com.br`. Em Minhas Tarefas, a edição de data já
atualiza o Todoist de verdade (via de mão dupla completa). A partir daqui,
ordem sugerida:

1. **Plano de Ação via Google Sheets** -- sincronizar a planilha de plano de
   ação de cada cliente (Tarefa, Responsável, Prazo, Status, Etapa) com a
   tela de Plano de Ação do cliente, como já desenhado no mockup. Prioridade
   máxima: é o coração do método dela e o que dá mais valor pro cliente ver
   na área dele.

2. **Resto do Painel do Negócio** -- rentabilidade por cliente, timesheet e
   o cronômetro de horas, como já desenhado no mockup. Uso dela mesma pra
   gerir o negócio.

3. **Botão "ver como o cliente vê"** -- clicar num cliente em
   `/admin/clientes` e ver a tela exatamente como aquele cliente vê, sem
   precisar logar com o e-mail dele. Faz mais sentido logo depois do Plano
   de Ação existir, quando já há mais coisa pra conferir.

4. **CRM (contatos + funil)** -- cadastro de contatos/leads com etapas
   (Prospect -> Proposta -> Negociação -> Cliente) e histórico de notas por
   contato. Pode reaproveitar/conversar com a tabela `clients` que já existe.

5. **Aba de processos jurídicos** -- ela ainda atua como advogada e conduz
   processos judiciais. Nova área no Painel do Negócio pra acompanhar isso
   (nome do processo, tribunal/vara, prazos, status -- definir campos exatos
   com ela na hora de construir).

6. **Relacionamentos (planilha) como atividades em Minhas Tarefas** -- trazer
   a planilha de relacionamentos/contatos pra dentro de "Minhas Tarefas" como
   mais uma área, parecido com a sincronização do Plano de Ação.

7. **Base técnica dela como contexto** -- ainda não está claro se significa
   (a) dar mais contexto sobre a metodologia pra mim (Claude) usar em
   conversas futuras, ou (b) construir uma biblioteca de conhecimento dentro
   da própria plataforma (pra ela ou pros clientes). Perguntar qual das duas
   -- ou as duas -- antes de começar; por isso fica mais pra frente.

8. **WhatsApp com histórico de mensagens no CRM** -- exige contratar acesso
   oficial à API do WhatsApp Business (Meta ou intermediário tipo
   Twilio/Zenvia), passar pela verificação da Meta (dias/semanas), número
   dedicado, custo por mensagem, e uma central que recebe mensagens em
   tempo real (webhook). Maior custo/esforço da lista e depende do CRM (#4)
   já existir -- fica por último. Enquanto isso não sai do papel, dá pra
   colocar um botão simples "Abrir WhatsApp" (link direto, sem custo) em
   cada contato do CRM.
