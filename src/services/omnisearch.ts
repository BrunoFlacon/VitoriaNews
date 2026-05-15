import { supabase } from '@/integrations/supabase/client';
import type { OmniResult, OmniResultType, OmniSearchResponse } from '@/types/omnisearch';

// Dicionário de menus estáticos para busca
const STATIC_MENUS: OmniResult[] = [
  {
    id: 'menu-analytics',
    title: 'Analytics',
    type: 'menu',
    link: '/dashboard',
    highlightedText: 'Visualize métricas e estatísticas do portal',
    categoryLabel: 'Menu',
    keywords: 'dados tráfego estatísticas gráficos métricas visão geral'
  },
  {
    id: 'menu-create-post',
    title: 'Criar Post',
    type: 'menu',
    link: '/dashboard?tab=create',
    highlightedText: 'Gerencie artigos e publicações',
    categoryLabel: 'Menu',
    keywords: 'artigos posts notícias publicações blog criar novo'
  },
  {
    id: 'menu-videos',
    title: 'Stories & Lives',
    type: 'menu',
    link: '/dashboard?tab=stories',
    highlightedText: 'Biblioteca de stories, vídeos e lives',
    categoryLabel: 'Menu',
    keywords: 'vídeos lives streaming youtube player stories instagram facebook'
  },
  {
    id: 'menu-schedule',
    title: 'Calendário',
    type: 'menu',
    link: '/dashboard?tab=calendar',
    highlightedText: 'Calendário editorial e agendamentos',
    categoryLabel: 'Menu',
    keywords: 'calendário agenda programação eventos datas planejar'
  },
  {
    id: 'menu-messaging',
    title: 'Mensagens',
    type: 'menu',
    link: '/dashboard?tab=messaging',
    highlightedText: 'WhatsApp e conversas',
    categoryLabel: 'Menu',
    keywords: 'whatsapp chat bot mensagens conversas atendimento'
  },
  {
    id: 'menu-media',
    title: 'Arquivos & Galeria',
    type: 'menu',
    link: '/dashboard?tab=documents',
    highlightedText: 'Biblioteca de imagens e arquivos',
    categoryLabel: 'Menu',
    keywords: 'imagens fotos arquivos mídia galeria upload pdf docs'
  },
  {
    id: 'menu-networks',
    title: 'Redes Sociais',
    type: 'menu',
    link: '/dashboard?tab=networks',
    highlightedText: 'Conexões e redes sociais integradas',
    categoryLabel: 'Menu',
    keywords: 'redes sociais facebook instagram tiktok linkedin youtube'
  },
  {
    id: 'menu-robot',
    title: 'Artesão de Bots',
    type: 'menu',
    link: '/dashboard?tab=robot',
    highlightedText: 'Configurações de robôs e automações',
    categoryLabel: 'Menu',
    keywords: 'robô bot automação ia inteligência artificial'
  },
  {
    id: 'menu-settings',
    title: 'Configurações',
    type: 'menu',
    link: '/dashboard?tab=settings',
    highlightedText: 'Configurações do sistema',
    categoryLabel: 'Menu',
    keywords: 'configurações opções preferências ajustes sistema'
  },
  {
    id: 'menu-settings-profile',
    title: 'Meu Perfil',
    type: 'menu',
    link: '/dashboard?tab=settings&subtab=profile',
    highlightedText: 'Edite seu nome, bio e foto',
    categoryLabel: 'Configurações',
    keywords: 'perfil usuário conta dados pessoal foto bio'
  },
  {
    id: 'menu-settings-security',
    title: 'Segurança',
    type: 'menu',
    link: '/dashboard?tab=settings&subtab=security',
    highlightedText: 'Senha e proteção da conta',
    categoryLabel: 'Configurações',
    keywords: 'senha segurança 2fa proteção login'
  },
  {
    id: 'menu-settings-nav',
    title: 'Navegação',
    type: 'menu',
    link: '/dashboard?tab=settings&subtab=navigation',
    highlightedText: 'Personalize o menu e abas',
    categoryLabel: 'Configurações',
    keywords: 'navegação menu abas customização'
  },
  {
    id: 'menu-settings-seo',
    title: 'SEO & Meta',
    type: 'menu',
    link: '/dashboard?tab=settings&subtab=seo',
    highlightedText: 'Metatags e otimização de busca',
    categoryLabel: 'Configurações',
    keywords: 'seo metatags busca google otimização'
  },
  {
    id: 'menu-settings-api',
    title: 'APIs Sociais',
    type: 'menu',
    link: '/dashboard?tab=settings&subtab=api',
    highlightedText: 'Tokens e chaves de integração',
    categoryLabel: 'Configurações',
    keywords: 'api tokens chaves integração redes sociais'
  },
  {
    id: 'menu-messaging-whatsapp',
    title: 'WhatsApp Bot',
    type: 'menu',
    link: '/dashboard?tab=messaging&platform=whatsapp',
    highlightedText: 'Gerencie conversas do WhatsApp',
    categoryLabel: 'Mensagens',
    keywords: 'whatsapp bot chat conversas atendimento'
  },
  {
    id: 'menu-messaging-telegram',
    title: 'Telegram Bot',
    type: 'menu',
    link: '/dashboard?tab=messaging&platform=telegram',
    highlightedText: 'Gerencie canais do Telegram',
    categoryLabel: 'Mensagens',
    keywords: 'telegram bot canais grupos'
  },
  {
    id: 'menu-analytics-trends',
    title: 'Radar de Tendências',
    type: 'menu',
    link: '/dashboard?tab=analytics&subtab=trends',
    highlightedText: 'O que está em alta no momento',
    categoryLabel: 'Analytics',
    keywords: 'tendências radar news google notícias viral'
  },
  {
    id: 'menu-analytics-audience',
    title: 'Público & Seguidores',
    type: 'menu',
    link: '/dashboard?tab=analytics&subtab=audience',
    highlightedText: 'Análise demográfica e engajamento',
    categoryLabel: 'Analytics',
    keywords: 'público seguidores audiência demografia'
  },
  {
    id: 'action-profile',
    title: 'Editar Perfil',
    type: 'action',
    link: '/dashboard?tab=settings&subtab=profile',
    highlightedText: 'Acesso rápido ao seu perfil',
    categoryLabel: 'Ação',
    keywords: 'perfil editar mudar foto'
  }
];

/**
 * Busca em menus estáticos
 */
function searchStaticMenus(query: string): OmniResult[] {
  const lowerQuery = query.toLowerCase().trim();
  
  return STATIC_MENUS.filter(item => {
    // Busca em título
    if (item.title.toLowerCase().includes(lowerQuery)) return true;
    // Busca em keywords
    if (item.keywords?.toLowerCase().includes(lowerQuery)) return true;
    // Busca em texto destacado
    if (item.highlightedText.toLowerCase().includes(lowerQuery)) return true;
    return false;
  }).map(item => ({
    ...item,
    // Adiciona highlight visual no título
    title: highlightText(item.title, lowerQuery)
  }));
}

/**
 * Adiciona highlight visual em texto
 */
function highlightText(text: string, query: string): string {
  // Escapar regex
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeQuery})`, 'gi');
  return text.replace(regex, '<b>$1</b>');
}

/**
 * Busca unificada (estática + dinâmica)
 */
export async function omniSearch(
  query: string, 
  limit: number = 10
): Promise<OmniSearchResponse> {
  const startTime = performance.now();
  
  if (!query || query.trim().length < 2) {
    return {
      results: [],
      total: 0,
      query: query || '',
      duration: 0
    };
  }

  try {
    // Busca em paralelo
    const [staticResults, { data: dynamicResults, error }] = await Promise.all([
      // Busca em menus estáticos
      Promise.resolve(searchStaticMenus(query)),
      
      // Busca dinâmica no banco via RPC
      // @ts-ignore - função recém adicionada ao BD
      supabase.rpc('omni_search', {
        p_search_term: query.trim(),
        p_limit: limit
      })
    ]);

    if (error) {
      console.warn(`Database search error: ${error.message}`);
    }

    // Mapear resultados dinâmicos
    const dynamicArray = (dynamicResults as any[]) || [];
    const mappedDynamicResults: OmniResult[] = dynamicArray.map((item: any) => ({
      id: item.id,
      title: item.title,
      type: item.type as OmniResultType,
      link: item.slug, // O SQL já retorna o link correto com ?tab=
      thumbnail: item.thumbnail_url,
      highlightedText: item.snippet || '',
      categoryLabel: getCategoryLabel(item.type),
      rank: item.rank
    }));

    // Mesclar e ordenar resultados (estáticos ficam um pouco acima se houver relevância)
    const combinedResults: OmniResult[] = [
      ...staticResults.slice(0, Math.ceil(limit / 2)),
      ...mappedDynamicResults
    ]
    // Apenas sortear por rank os dinâmicos, ou exibir os estáticos primeiro
    .sort((a, b) => {
      // Prioridade para menus se o nome for idêntico
      if (a.type === 'menu' || a.type === 'action') return -1;
      if (b.type === 'menu' || b.type === 'action') return 1;
      return (b.rank || 0) - (a.rank || 0);
    })
    .slice(0, limit);

    const duration = performance.now() - startTime;

    return {
      results: combinedResults,
      total: combinedResults.length,
      query,
      duration: Math.round(duration)
    };

  } catch (error) {
    console.error('OmniSearch error:', error);
    
    // Fallback: retornar apenas menus estáticos em caso de erro
    const staticResults = searchStaticMenus(query).slice(0, limit);
    
    return {
      results: staticResults,
      total: staticResults.length,
      query,
      duration: 0
    };
  }
}

/**
 * Obtém label de categoria baseado no tipo
 */
function getCategoryLabel(type: string): string {
  const labels: Record<string, string> = {
    'article': 'Artigo',
    'video': 'Vídeo',
    'schedule': 'Agenda',
    'menu': 'Menu',
    'action': 'Ação',
    'page': 'Página'
  };
  return labels[type] || 'Conteúdo';
}
