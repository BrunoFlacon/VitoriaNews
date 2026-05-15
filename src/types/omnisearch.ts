export type OmniResultType = 
  | 'video' 
  | 'article' 
  | 'page' 
  | 'schedule' 
  | 'menu' 
  | 'action';

export interface OmniResult {
  id: string;
  title: string;
  type: OmniResultType;
  link: string;
  thumbnail?: string;
  highlightedText: string;
  categoryLabel: string;
  rank?: number;
  snippet?: string;
  keywords?: string; // Para busca em menus estáticos
}

export interface OmniSearchResponse {
  results: OmniResult[];
  total: number;
  query: string;
  duration: number;
}

export interface OmniSearchState {
  query: string;
  results: OmniResult[];
  isLoading: boolean;
  isOpen: boolean;
  error: string | null;
}
