export const VIEW_PATHS: Record<string, string> = {
    'Inbox': '/',
    'Pipeline': '/pipeline',
    'Leads': '/leads',
    'Clientes': '/clientes',
    'Tarefas': '/tarefas',
    'Atividades': '/atividades',
    'Calendário': '/calendario',
    'Relatórios': '/relatorios',
    'Grupos': '/grupos',
    'Painel360': '/painel360',
    'Recuperação': '/recuperacao',
    'Conversas': '/conversas',
    'Omnichannel': '/omnichannel',
    'Integrações': '/integracoes',
    'Notificações': '/notificacoes',
    'Configurações': '/configuracoes',
    'Playbooks': '/playbooks',
    'Perfil': '/perfil',
    'Dashboard': '/dashboard',
    'Agentes': '/agentes',
};

export const PATH_VIEWS: Record<string, string> = Object.fromEntries(
    Object.entries(VIEW_PATHS).map(([k, v]) => [v, k])
);
