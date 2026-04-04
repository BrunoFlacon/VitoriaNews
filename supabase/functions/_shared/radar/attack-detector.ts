
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

interface PostData {
  id: string;
  content: string;
  platform: string;
  created_at: string;
  author_id: string;
}

export const detectCoordinatedAttack = async (posts: PostData[]) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`Analyzing ${posts.length} posts for coordinated patterns...`);

  // Simple detection logic:
  // 1. Identical content in multiple posts
  // 2. High frequency from new/limited accounts (if account data available)
  // 3. Sychronized posting times

  const contentMap = new Map<string, PostData[]>();
  posts.forEach(post => {
    const existing = contentMap.get(post.content) || [];
    existing.push(post);
    contentMap.set(post.content, existing);
  });

  for (const [content, identicalPosts] of contentMap.entries()) {
    if (identicalPosts.length >= 3) {
      // Potential coordinated attack
      const platforms = [...new Set(identicalPosts.map(p => p.platform))];
      const accounts = identicalPosts.map(p => p.author_id);
      
      console.warn(`Detected coordinated pattern: "${content.substring(0, 50)}..." across ${platforms.join(', ')}`);

      const { data, error } = await supabase
        .from('eventos_de_ataque')
        .insert({
          topico: content.substring(0, 50),
          plataforma: platforms.join(', '),
          pontuacao_de_intensidade: identicalPosts.length * 10,
          padrao_detectado: 'Publicações idênticas sincronizadas',
          contas_envolvidas: accounts,
          nivel_de_risco: identicalPosts.length > 10 ? 'alto' : (identicalPosts.length > 5 ? 'médio' : 'baixo')
        })
        .select();

      if (error) console.error('Error recording attack event:', error);
      else console.log('Attack event recorded:', data);
    }
  }
};
