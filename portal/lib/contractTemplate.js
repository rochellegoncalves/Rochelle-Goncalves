function field(value) {
  const v = (value ?? '').toString().trim();
  return v || '[●]';
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '[●]';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateExtenso(dateStr) {
  if (!dateStr) return '[●]';
  const [y, m, d] = dateStr.split('-');
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${Number(d)} de ${meses[Number(m) - 1]} de ${y}`;
}

// Monta o texto do contrato com os dados do cliente já substituídos.
// Cada item é um bloco: { type: 'title' | 'heading' | 'paragraph', text }
export function buildContractBlocks(client) {
  const contratanteQualificacao = client.adminName
    ? `${field(client.companyName)}, pessoa jurídica de direito privado, inscrita no CNPJ/CPF sob nº ${field(
        client.cpfCnpj
      )}, com sede/endereço em ${field(client.address)}, neste ato representada por ${field(
        client.adminName
      )}, ${field(client.adminNationality)}, ${field(client.adminMaritalStatus)}, ${field(
        client.adminProfession
      )}, inscrito(a) no CPF sob nº ${field(client.adminCpf)}, portador(a) do RG nº ${field(
        client.adminRg
      )}, com endereço eletrônico ${field(client.adminEmail || client.email)}, telefone ${field(
        client.phone
      )}, doravante denominado(a) simplesmente CONTRATANTE.`
    : `${field(client.companyName)}, inscrito(a) no CPF/CNPJ sob nº ${field(
        client.cpfCnpj
      )}, com endereço em ${field(client.address)}, e-mail ${field(client.email)}, telefone ${field(
        client.phone
      )}, doravante denominado(a) simplesmente CONTRATANTE.`;

  return [
    { type: 'title', text: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA ESTRATÉGICA' },
    { type: 'paragraph', text: 'Pelo presente instrumento particular, de um lado:' },
    {
      type: 'paragraph',
      text: 'CONTRATADA: ROCHELLE GARCIA DE ANDRADE GONÇALVES, brasileira, casada, empresária, inscrita no CNPJ 63.221.693/0001-62, com endereço profissional em Campinas/SP, e-mail contato@rochellegoncalves.com.br, telefone (19) 99939-9744, doravante denominada simplesmente CONTRATADA.',
    },
    { type: 'paragraph', text: 'E, de outro lado:' },
    { type: 'paragraph', text: `CONTRATANTE: ${contratanteQualificacao}` },
    {
      type: 'paragraph',
      text: 'As partes resolvem celebrar o presente Contrato de Prestação de Serviços de Consultoria Estratégica, mediante as cláusulas e condições seguintes.',
    },

    { type: 'heading', text: 'CLÁUSULA 1ª: OBJETO' },
    {
      type: 'paragraph',
      text: '1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços de consultoria estratégica, com foco na estruturação, organização e acompanhamento da gestão do negócio do CONTRATANTE.',
    },
    {
      type: 'paragraph',
      text: '1.2. A consultoria poderá abranger, conforme necessidade identificada pela CONTRATADA, temas relacionados à gestão, comercial, produtos, serviços, posicionamento, modelo de negócio, rotina estratégica, prioridades de execução, indicadores, processos internos e de atendimento, jornada do cliente, estrutura de equipe, precificação, organização financeira e tomada de decisão.',
    },
    {
      type: 'paragraph',
      text: '1.3. A atuação será personalizada, considerando o momento atual do negócio, o perfil do CONTRATANTE, os objetivos definidos, as informações apresentadas e a capacidade de implementação das ações propostas.',
    },
    {
      type: 'paragraph',
      text: '1.4. O presente contrato não representa sociedade, parceria empresarial, representação comercial, vínculo empregatício, mandato, franquia ou qualquer forma de associação entre as partes.',
    },

    { type: 'heading', text: 'CLÁUSULA 2ª: NATUREZA DA CONSULTORIA' },
    { type: 'paragraph', text: '2.1. A atuação da CONTRATADA possui natureza consultiva, estratégica e orientativa.' },
    {
      type: 'paragraph',
      text: '2.2. Compete à CONTRATADA analisar informações, propor direcionamentos, organizar prioridades, apoiar decisões estratégicas e acompanhar a evolução dos pontos definidos durante a consultoria.',
    },
    {
      type: 'paragraph',
      text: '2.3. Compete ao CONTRATANTE executar as ações recomendadas, tomar as decisões finais sobre seu negócio e fornecer as informações necessárias para o desenvolvimento adequado do trabalho.',
    },
    {
      type: 'paragraph',
      text: '2.4. A CONTRATADA não se responsabiliza pela execução direta da operação do CONTRATANTE, salvo se houver contratação específica e expressa para atividade complementar.',
    },

    { type: 'heading', text: 'CLÁUSULA 3ª: FORMATO DOS SERVIÇOS' },
    {
      type: 'paragraph',
      text: '3.1. A consultoria será prestada por meio de encontros online quinzenais, realizados por Google Meet, Zoom ou outra plataforma definida entre as partes.',
    },
    { type: 'paragraph', text: '3.2. Os encontros ocorrerão, em regra, a cada 2 semanas, totalizando 2 encontros por mês.' },
    {
      type: 'paragraph',
      text: '3.3. A existência de meses com maior ou menor número de semanas não gera, automaticamente, obrigação de encontro adicional, salvo ajuste específico entre as partes.',
    },
    {
      type: 'paragraph',
      text: '3.4. Além dos encontros quinzenais, a CONTRATADA poderá realizar análises de materiais, documentos, informações, controles, mensagens ou demandas apresentadas pelo CONTRATANTE, desde que relacionadas ao objeto deste contrato.',
    },
    {
      type: 'paragraph',
      text: '3.5. A comunicação entre as partes poderá ocorrer por WhatsApp, e-mail ou outro meio escrito, respeitados dias úteis, horários comerciais e limites razoáveis de acompanhamento.',
    },
    {
      type: 'paragraph',
      text: '3.6. O acompanhamento por mensagens não representa atendimento imediato, disponibilidade integral, plantão, urgência permanente ou obrigação de resposta fora do horário comercial, fins de semana ou feriados.',
    },

    { type: 'heading', text: 'CLÁUSULA 4ª: ESCOPO DA CONSULTORIA' },
    {
      type: 'paragraph',
      text: '4.1. O escopo da consultoria será definido conforme as necessidades identificadas ao longo do acompanhamento, podendo envolver análise do modelo atual do negócio, organização das prioridades estratégicas, estruturação da rotina de gestão, revisão do posicionamento e da proposta de valor, análise de produtos, serviços, pacotes ou formatos de entrega, orientação sobre precificação e estratégia comercial, estruturação da jornada do cliente, análise de processos internos e fluxos de trabalho, definição de indicadores e formas de acompanhamento, orientação sobre papéis, responsabilidades e estrutura de equipe, bem como apoio à tomada de decisão em temas relevantes para a organização do negócio.',
    },
    {
      type: 'paragraph',
      text: '4.2. A consultoria não inclui execução diária de tarefas operacionais, atendimento direto a clientes do CONTRATANTE, gestão de agenda, postagem em redes sociais, criação diária de conteúdo, fechamento de vendas em nome do CONTRATANTE, administração financeira direta, emissão de notas fiscais, serviços contábeis, serviços jurídicos e gestão direta de funcionários.',
    },

    { type: 'heading', text: 'CLÁUSULA 5ª: OBRIGAÇÕES DA CONTRATADA' },
    { type: 'paragraph', text: '5.1. São obrigações da CONTRATADA:' },
    { type: 'paragraph', text: 'a) prestar os serviços com zelo, técnica, responsabilidade e boa-fé;' },
    { type: 'paragraph', text: 'b) realizar os encontros online quinzenais;' },
    { type: 'paragraph', text: 'c) analisar as informações fornecidas pelo CONTRATANTE;' },
    { type: 'paragraph', text: 'd) propor direcionamentos compatíveis com o contexto do negócio;' },
    { type: 'paragraph', text: 'e) organizar prioridades e orientar a construção de plano de ação;' },
    { type: 'paragraph', text: 'f) acompanhar a evolução das ações definidas;' },
    {
      type: 'paragraph',
      text: 'g) manter sigilo sobre informações estratégicas, financeiras, comerciais e pessoais recebidas, observada a autorização de uso de caso prevista neste contrato;',
    },
    { type: 'paragraph', text: 'h) comunicar eventuais limitações, riscos ou necessidade de apoio técnico complementar;' },
    { type: 'paragraph', text: 'i) apresentar relatório mensal contendo as análises realizadas e evoluções do contratante.' },

    { type: 'heading', text: 'CLÁUSULA 6ª: OBRIGAÇÕES DO CONTRATANTE' },
    { type: 'paragraph', text: '6.1. São obrigações do CONTRATANTE:' },
    { type: 'paragraph', text: 'a) fornecer informações verdadeiras, completas e atualizadas;' },
    { type: 'paragraph', text: 'b) participar dos encontros quinzenais;' },
    { type: 'paragraph', text: 'c) cumprir os combinados definidos durante o acompanhamento;' },
    { type: 'paragraph', text: 'd) informar mudanças relevantes no negócio;' },
    { type: 'paragraph', text: 'e) disponibilizar documentos, números, controles e materiais necessários à análise;' },
    { type: 'paragraph', text: 'f) respeitar os canais e horários de comunicação;' },
    { type: 'paragraph', text: 'g) realizar os pagamentos nas datas acordadas;' },
    {
      type: 'paragraph',
      text: 'h) manter sigilo sobre materiais, métodos, documentos e orientações recebidas da CONTRATADA.',
    },
    {
      type: 'paragraph',
      text: '6.2. A ausência de informações, a omissão de dados relevantes ou a não execução das ações combinadas poderá limitar os resultados da consultoria, sem que isso configure falha da CONTRATADA.',
    },

    { type: 'heading', text: 'CLÁUSULA 7ª: INVESTIMENTO E FORMA DE PAGAMENTO' },
    {
      type: 'paragraph',
      text: `7.1. Pela prestação dos serviços de consultoria estratégica, o CONTRATANTE pagará à CONTRATADA o valor mensal de ${formatMoney(
        client.monthlyValue
      )}.`,
    },
    {
      type: 'paragraph',
      text: '7.2. O pagamento deverá ser realizado até o dia 05 de cada mês, por meio de PIX para a chave CNPJ 63.221.693/0001-62 ou transferência bancária para Banco Nubank (260), agência 0001, conta corrente 725406513-1.',
    },
    {
      type: 'paragraph',
      text: '7.3. A contratação possui caráter mensal recorrente, sendo o valor devido enquanto o contrato estiver vigente.',
    },
    {
      type: 'paragraph',
      text: '7.4. O pagamento remunera a disponibilidade técnica, os encontros quinzenais, as análises realizadas, os direcionamentos estratégicos e o acompanhamento das ações definidas.',
    },
    {
      type: 'paragraph',
      text: '7.5. A ausência do CONTRATANTE em encontro previamente agendado, sem aviso no prazo previsto neste contrato, não afasta a obrigação de pagamento mensal.',
    },

    { type: 'heading', text: 'CLÁUSULA 8ª: ATRASO NO PAGAMENTO' },
    {
      type: 'paragraph',
      text: '8.1. Em caso de atraso no pagamento, incidirá multa de 2% sobre o valor devido, além de juros de mora de 1% ao mês, calculados proporcionalmente ao período de atraso.',
    },
    {
      type: 'paragraph',
      text: '8.2. Caso o atraso ultrapasse 5 dias corridos, a CONTRATADA poderá suspender os serviços até a regularização do pagamento.',
    },
    {
      type: 'paragraph',
      text: '8.3. Caso o atraso ultrapasse 30 dias corridos, a CONTRATADA poderá rescindir o contrato, sem prejuízo da cobrança dos valores vencidos.',
    },

    { type: 'heading', text: 'CLÁUSULA 9ª: PRAZO DE VIGÊNCIA' },
    {
      type: 'paragraph',
      text: `9.1. O presente contrato terá vigência inicial de 6 meses, com início em ${
        client.contractStartDate ? formatDateExtenso(client.contractStartDate) : '[●]'
      }.`,
    },
    {
      type: 'paragraph',
      text: '9.2. Após o término do prazo inicial, o contrato será automaticamente renovado por prazo indeterminado, mantidas as mesmas condições contratadas, salvo manifestação expressa de qualquer das partes em sentido contrário.',
    },
    {
      type: 'paragraph',
      text: '9.3. A manifestação contrária à renovação deverá ser feita por escrito, por e-mail, WhatsApp ou outro meio escrito usualmente utilizado pelas partes, com antecedência mínima de 30 dias.',
    },
    {
      type: 'paragraph',
      text: '9.4. Durante o período de renovação automática por prazo indeterminado, qualquer das partes poderá rescindir o contrato mediante aviso prévio de 30 dias, nos termos da cláusula de rescisão deste instrumento.',
    },

    { type: 'heading', text: 'CLÁUSULA 10ª: REAGENDAMENTO E NÃO COMPARECIMENTO' },
    { type: 'paragraph', text: '10.1. Os encontros deverão ser agendados previamente entre as partes.' },
    {
      type: 'paragraph',
      text: '10.2. O pedido de reagendamento deverá ser feito com antecedência mínima de 24 horas, salvo motivo de força maior.',
    },
    {
      type: 'paragraph',
      text: '10.3. O não comparecimento injustificado do CONTRATANTE a encontro previamente agendado poderá ser considerado como encontro realizado.',
    },
    {
      type: 'paragraph',
      text: '10.4. Caso a CONTRATADA precise reagendar encontro previamente marcado, deverá comunicar o CONTRATANTE e indicar nova data compatível.',
    },

    { type: 'heading', text: 'CLÁUSULA 11ª: CONFIDENCIALIDADE' },
    {
      type: 'paragraph',
      text: '11.1. As partes obrigam-se a manter sigilo sobre informações estratégicas, comerciais, financeiras, operacionais, pessoais e técnicas às quais tiverem acesso em razão deste contrato.',
    },
    { type: 'paragraph', text: '11.2. A obrigação de confidencialidade permanecerá válida mesmo após o término do contrato.' },
    {
      type: 'paragraph',
      text: '11.3. Não serão consideradas confidenciais as informações que já sejam públicas, que tenham sido obtidas legitimamente por terceiros ou cuja divulgação seja exigida por lei, ordem judicial ou autoridade competente.',
    },
    {
      type: 'paragraph',
      text: '11.4. A obrigação de confidencialidade não impede a CONTRATADA de utilizar o caso do CONTRATANTE para fins institucionais, comerciais, educacionais, publicitários ou de autoridade profissional, nos termos da cláusula específica de autorização de uso de nome, imagem, marca e caso.',
    },
    {
      type: 'paragraph',
      text: '11.5. Ao divulgar o caso, a CONTRATADA deverá preservar dados financeiros específicos, documentos internos, informações sensíveis, dados de clientes, pacientes, alunos, funcionários, fornecedores ou terceiros, salvo autorização específica para divulgação.',
    },

    { type: 'heading', text: 'CLÁUSULA 12ª: PROPRIEDADE INTELECTUAL' },
    {
      type: 'paragraph',
      text: '12.1. Os materiais, modelos, estruturas, métodos, documentos, planilhas, orientações, frameworks e conteúdos desenvolvidos ou fornecidos pela CONTRATADA são de sua propriedade intelectual.',
    },
    { type: 'paragraph', text: '12.2. O CONTRATANTE poderá utilizar os materiais recebidos exclusivamente em seu próprio negócio.' },
    {
      type: 'paragraph',
      text: '12.3. É vedada a reprodução, venda, distribuição, compartilhamento com terceiros, adaptação comercial ou utilização dos materiais em benefício de outros negócios sem autorização prévia e expressa da CONTRATADA.',
    },

    { type: 'heading', text: 'CLÁUSULA 13ª: PROTEÇÃO DE DADOS' },
    {
      type: 'paragraph',
      text: '13.1. As partes comprometem-se a tratar dados pessoais eventualmente compartilhados em razão deste contrato de forma adequada, segura e limitada às finalidades necessárias à execução dos serviços.',
    },
    {
      type: 'paragraph',
      text: '13.2. Caso o CONTRATANTE compartilhe dados de clientes, funcionários, parceiros, fornecedores ou terceiros, declara possuir autorização ou base legal adequada para tanto.',
    },
    {
      type: 'paragraph',
      text: '13.3. As partes comprometem-se a não utilizar os dados recebidos para finalidade diversa da execução deste contrato, salvo quanto aos dados necessários para divulgação institucional, comercial ou educacional autorizada neste instrumento.',
    },
    {
      type: 'paragraph',
      text: '13.4. A divulgação de casos pela CONTRATADA deverá evitar a exposição de dados pessoais de terceiros que não sejam parte deste contrato.',
    },

    { type: 'heading', text: 'CLÁUSULA 14ª: AUTORIZAÇÃO DE USO DE NOME, IMAGEM, MARCA, DEPOIMENTOS E CASOS' },
    {
      type: 'paragraph',
      text: '14.1. O CONTRATANTE autoriza expressamente a CONTRATADA, de forma gratuita, não exclusiva e por prazo indeterminado, a utilizar seu nome, imagem, voz, marca, logotipo, ramo de atuação, depoimentos, registros de bastidores, relatos de evolução, resultados alcançados, aprendizados, desafios enfrentados e informações gerais do trabalho realizado, para fins institucionais, comerciais, educacionais, publicitários e de fortalecimento da autoridade profissional da CONTRATADA.',
    },
    {
      type: 'paragraph',
      text: '14.2. A autorização prevista nesta cláusula abrange, entre outros meios, publicações em redes sociais, site, portfólio, propostas comerciais, apresentações institucionais, aulas, palestras, mentorias, reuniões comerciais, materiais digitais, vídeos, fotos, stories, posts, artigos, e-books, apresentações e demais canais de comunicação utilizados pela CONTRATADA.',
    },
    {
      type: 'paragraph',
      text: '14.3. A CONTRATADA poderá divulgar o caso do CONTRATANTE com ou sem menção expressa ao nome, imagem ou marca do CONTRATANTE, conforme acordado entre as partes, desde que respeitados os limites de sigilo previstos neste contrato.',
    },
    {
      type: 'paragraph',
      text: '14.4. Quando a divulgação envolver informações estratégicas, financeiras, comerciais ou operacionais específicas do CONTRATANTE, a CONTRATADA deverá utilizar tais informações de forma geral, contextual ou anonimizada, salvo autorização específica do CONTRATANTE para divulgação mais detalhada.',
    },
    {
      type: 'paragraph',
      text: '14.5. A CONTRATADA poderá relatar situações práticas vivenciadas durante a consultoria, apresentar antes e depois de processos, explicar decisões tomadas, comentar aprendizados do projeto e demonstrar a lógica de raciocínio aplicada ao caso, desde que não exponha documentos internos, dados sensíveis, dados de terceiros ou informações que possam causar prejuízo direto ao CONTRATANTE.',
    },
    {
      type: 'paragraph',
      text: '14.6. A autorização ora concedida não gera ao CONTRATANTE direito a remuneração, participação financeira, indenização, revisão prévia obrigatória ou aprovação prévia de cada conteúdo produzido pela CONTRATADA.',
    },
    {
      type: 'paragraph',
      text: '14.7. O CONTRATANTE poderá solicitar, por escrito, que determinada informação específica não seja divulgada, desde que justifique tratar-se de informação estratégica, sensível, confidencial ou capaz de gerar prejuízo direto ao seu negócio.',
    },
    {
      type: 'paragraph',
      text: '14.8. A eventual solicitação de restrição feita pelo CONTRATANTE produzirá efeitos apenas para conteúdos futuros, não obrigando a CONTRATADA a excluir materiais já publicados, salvo em caso de exposição indevida de dados sensíveis, dados de terceiros ou informação comprovadamente confidencial.',
    },
    { type: 'paragraph', text: '14.9. A autorização prevista nesta cláusula permanecerá válida mesmo após o término deste contrato.' },

    { type: 'heading', text: 'CLÁUSULA 15ª: AUSÊNCIA DE GARANTIA DE RESULTADO' },
    {
      type: 'paragraph',
      text: '15.1. A CONTRATADA não garante resultado financeiro, aumento de faturamento, fechamento de clientes, crescimento de audiência, expansão do negócio, redução de custos ou qualquer resultado específico.',
    },
    {
      type: 'paragraph',
      text: '15.2. Os resultados dependem da execução do CONTRATANTE, da qualidade das informações fornecidas, da adesão às orientações, das condições de mercado e de fatores externos à atuação da CONTRATADA.',
    },
    {
      type: 'paragraph',
      text: '15.3. No primeiro mês do acompanhamento, as partes definirão os objetivos prioritários, os indicadores aplicáveis e as ações que serão acompanhadas, considerando o diagnóstico inicial, os dados disponíveis e a capacidade de implementação do CONTRATANTE.',
    },
    {
      type: 'paragraph',
      text: '15.4. A avaliação da consultoria considerará a realização dos encontros, as análises e direcionamentos apresentados, a organização das prioridades, a elaboração e o acompanhamento dos planos de ação e os relatórios de evolução, não se confundindo com garantia de resultado financeiro específico.',
    },

    { type: 'heading', text: 'CLÁUSULA 16ª: AUSÊNCIA DE EXCLUSIVIDADE' },
    { type: 'paragraph', text: '16.1. O presente contrato não estabelece exclusividade entre as partes.' },
    {
      type: 'paragraph',
      text: '16.2. A CONTRATADA poderá prestar serviços a outros clientes, inclusive em segmentos semelhantes, desde que respeitado o sigilo das informações do CONTRATANTE.',
    },
    {
      type: 'paragraph',
      text: '16.3. O CONTRATANTE poderá contratar outros profissionais, consultores, prestadores ou fornecedores conforme sua necessidade.',
    },

    { type: 'heading', text: 'CLÁUSULA 17ª: RESCISÃO' },
    {
      type: 'paragraph',
      text: '17.1. O prazo inicial de 6 meses previsto na cláusula 9.1 constitui período mínimo de contratação, considerando a necessidade de diagnóstico, definição de prioridades, implementação das ações, acompanhamento e avaliação da evolução do negócio.',
    },
    {
      type: 'paragraph',
      text: '17.2. Durante o prazo inicial de 6 meses, o CONTRATANTE poderá solicitar a rescisão unilateral e imotivada mediante comunicação escrita com antecedência mínima de 30 dias, permanecendo obrigado ao pagamento:',
    },
    { type: 'paragraph', text: 'a) dos valores vencidos e não pagos;' },
    { type: 'paragraph', text: 'b) da mensalidade correspondente ao período de aviso prévio; e' },
    {
      type: 'paragraph',
      text: 'c) de multa compensatória equivalente a 30% do saldo das mensalidades que venceriam entre o término do aviso prévio e o encerramento do prazo inicial de 6 meses.',
    },
    {
      type: 'paragraph',
      text: '17.3. A multa prevista na cláusula anterior não será aplicada quando a rescisão decorrer de descumprimento contratual da outra parte, desde que a parte inadimplente seja previamente notificada e não regularize a situação no prazo de 5 dias úteis, ou quando houver acordo escrito entre as partes.',
    },
    {
      type: 'paragraph',
      text: '17.4. Após o cumprimento do prazo inicial de 6 meses e a renovação do contrato por prazo indeterminado, qualquer das partes poderá rescindi-lo mediante aviso prévio escrito de 30 dias, sem incidência de multa por encerramento.',
    },
    {
      type: 'paragraph',
      text: '17.5. A rescisão não afasta a obrigação de pagamento pelos serviços já prestados, pelo período de aviso prévio e pelas demais quantias eventualmente devidas.',
    },

    { type: 'heading', text: 'CLÁUSULA 18ª: COMUNICAÇÕES' },
    {
      type: 'paragraph',
      text: '18.1. As comunicações relativas a este contrato poderão ser feitas por e-mail, WhatsApp ou outro meio escrito utilizado pelas partes.',
    },
    { type: 'paragraph', text: '18.2. Para fins de comunicação, serão considerados os contatos previstos na qualificação.' },
    { type: 'paragraph', text: '18.3. As partes deverão comunicar eventual alteração de e-mail, telefone ou endereço.' },

    { type: 'heading', text: 'CLÁUSULA 19ª: DISPOSIÇÕES GERAIS' },
    {
      type: 'paragraph',
      text: '19.1. A tolerância de qualquer das partes quanto ao descumprimento de obrigação contratual não significará renúncia de direito ou alteração contratual.',
    },
    {
      type: 'paragraph',
      text: '19.2. Qualquer alteração deste contrato deverá ser feita por escrito, inclusive por meio eletrônico, desde que haja concordância expressa das partes.',
    },
    { type: 'paragraph', text: '19.3. Caso alguma cláusula seja considerada inválida, as demais permanecerão válidas e eficazes.' },
    { type: 'paragraph', text: '19.4. Este contrato obriga as partes e seus sucessores, nos limites legais aplicáveis.' },

    { type: 'heading', text: 'CLÁUSULA 20ª: FORO' },
    {
      type: 'paragraph',
      text: '20.1. Fica eleito o foro da Comarca de Campinas/SP para dirimir eventuais controvérsias decorrentes deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.',
    },

    { type: 'paragraph', text: 'E, por estarem justas e contratadas, as partes assinam o presente instrumento.' },
    {
      type: 'paragraph',
      text: `Campinas/SP, ${formatDateExtenso(client.contractStartDate) !== '[●]' ? formatDateExtenso(client.contractStartDate) : new Date().toLocaleDateString('pt-BR')}.`,
    },
    { type: 'signature', label: 'ROCHELLE G. A. GONÇALVES', role: 'CONTRATADA' },
    { type: 'signature', label: field(client.adminName || client.companyName), role: 'CONTRATANTE' },
  ];
}
