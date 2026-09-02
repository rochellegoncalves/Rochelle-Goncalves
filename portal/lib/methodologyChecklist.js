// Checklist "Aplicação Consultoria" (o que ela normalmente monta pros
// clientes), aplicado no próprio negócio. Cada item pode ter um
// linkedFeature quando já existe uma tela do painel que cobre aquilo
// de verdade -- nesse caso a página de detalhe do item mostra um
// atalho pra ela, além do espaço pra escrever o conteúdo em si.
export const CHECKLIST_GROUPS = [
  {
    category: 'Gestão',
    items: [
      { key: 'gestao_canvas', label: 'Modelo de negócio (Canvas)' },
      { key: 'gestao_swot', label: 'Análise de Riscos e Oportunidades (SWOT)' },
      { key: 'gestao_plano_acao', label: 'Plano de ação (Matriz de Eisenhower + 5W2H)' },
      { key: 'gestao_rotina_indicadores', label: 'Rotina e indicadores (Metas SMART)' },
      { key: 'gestao_precificacao', label: 'Precificação de até 5 produtos ou serviços' },
      {
        key: 'gestao_receitas_despesas',
        label: 'Classificação de receitas e despesas',
        linkedFeature: { href: '/admin/rentabilidade', label: 'Ver Rentabilidade' },
      },
      { key: 'gestao_fluxo_caixa', label: 'Fluxo de caixa' },
      { key: 'gestao_orcamento_dre', label: 'Orçamento e DRE' },
    ],
  },
  {
    category: 'Comercial',
    items: [
      { key: 'comercial_7ps', label: '7 Ps do Marketing' },
      { key: 'comercial_jornada', label: 'Jornada do cliente' },
      {
        key: 'comercial_funil',
        label: 'Funil de vendas + Pipeline Comercial',
        linkedFeature: { href: '/admin/crm', label: 'Ver CRM' },
      },
      { key: 'comercial_scripts', label: 'Scripts de atendimento ao cliente' },
      { key: 'comercial_matriz_abc', label: 'Matriz ABC + Pareto (80/20)' },
    ],
  },
  {
    category: 'Produtos/Serviços',
    items: [
      { key: 'produtos_mapeamento', label: 'Mapeamento de processos (fluxograma + POP)' },
      { key: 'produtos_gargalos', label: 'Identificação de gargalos operacionais (Lean)' },
      { key: 'produtos_organograma', label: 'Definição de papéis e responsabilidades + organograma' },
      { key: 'produtos_kaizen', label: 'Kaizen (Melhoria Contínua)' },
    ],
  },
  {
    category: 'Jurídico',
    items: [
      {
        key: 'juridico_contratos',
        label: 'Contrato com clientes e fornecedores',
        linkedFeature: { href: '/admin/clientes', label: 'Ver Clientes (contratos)' },
      },
      { key: 'juridico_riscos', label: 'Riscos trabalhistas, tributários e patrimoniais' },
    ],
  },
];

export function findChecklistItem(itemKey) {
  for (const group of CHECKLIST_GROUPS) {
    const item = group.items.find((i) => i.key === itemKey);
    if (item) return { ...item, category: group.category };
  }
  return null;
}
