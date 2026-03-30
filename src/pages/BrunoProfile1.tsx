import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Github, Linkedin, Twitter, Globe, Mail,
  Briefcase, GraduationCap, ArrowLeft, Pencil,
  X, Camera, Plus, Loader2, Trash2, Check,
  ChevronUp, ChevronDown, Palette, Download, ExternalLink, 
  Facebook, Instagram, Youtube, Send, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";

/* ─── PLATAFORMAS & LINKS ────────────────────────────────────── */
const PLATFORM_URLS: Record<string, string> = {
  facebook:  'https://www.facebook.com/',
  instagram: 'https://www.instagram.com/',
  threads:   'https://www.threads.net/@',
  tiktok:    'https://www.tiktok.com/@',
  telegram:  'https://t.me/',
  linkedin:  'https://www.linkedin.com/in/',
  pinterest: 'https://www.pinterest.com/',
  snapchat:  'https://www.snapchat.com/add/',
  x:         'https://x.com/',
  whatsapp:  'https://wa.me/',
  youtube:   'https://www.youtube.com/@',
  github:    'https://github.com/',
  website:   '',
};

const BRAND_COLORS: Record<string, string> = {
  github: '#cbd5e1', linkedin: '#0077B5', twitter: '#1DA1F2',
  x: '#ffffff', instagram: '#E1306C', facebook: '#1877F2',
  youtube: '#FF0000', tiktok: '#ffffff', whatsapp: '#25D366',
  telegram: '#0088CC', pinterest: '#E60023', snapchat: '#FFFC00',
  threads: '#ffffff', website: '#60a5fa',
};

const FONTS = [
  { name: 'Inter', value: 'var(--font-inter, "Inter", sans-serif)' },
  { name: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
  { name: 'Roboto', value: '"Roboto", sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'Outfit', value: '"Outfit", sans-serif' },
];

function buildUrl(platform: string, value: string): string {
  if (!value?.trim()) return '#';
  if (value.startsWith('http')) return value;
  const base = PLATFORM_URLS[platform.toLowerCase()] || '';
  const clean = value.startsWith('@') ? value.slice(1) : value;
  return base ? `${base}${clean}` : `https://${clean}`;
}

/* ─── ÍCONES OFICIAIS (SVG) ─────────────────────────────────── */
const OfficialIcon = ({ platform, color, className = "w-7 h-7" }: { platform: string; color: string; className?: string }) => {
  const p = { className: `${className} fill-current transition-all duration-300`, style: { color } };
  switch (platform.toLowerCase()) {
    case 'x': return <svg viewBox="0 0 24 24" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.9-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'threads': return <svg viewBox="0 0 24 24" {...p}><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.267-.883-2.239-.887h-.006c-.9 0-1.992.275-2.636 1.287l-1.692-1.118c.826-1.306 2.257-2.055 3.851-2.013 3.164.027 5.037 1.887 5.292 5.104.626.359 1.145.786 1.563 1.28 1.292 1.558 1.571 3.946.734 6.032-.906 2.209-2.858 3.738-5.494 4.315-.835.183-1.72.274-2.639.28z"/></svg>;
    case 'tiktok': return <svg viewBox="0 0 24 24" {...p}><path d="M12.525.02c1.31-.032 2.612-.019 3.916-.01.07.674.313 1.35.748 1.886 1.103 1.352 2.805 2.053 4.475 2.373a.138.138 0 0 1 .1.14v3.316a.135.135 0 0 1-.144.13c-1.127-.08-2.226-.452-3.15-.992a5.72 5.72 0 0 1-1.385-1.1s-.019 3.497-.024 5.378c-.015 3.864-2.35 7.545-6.19 8.653-4.148 1.25-8.875-1.01-10.222-5.187C-.635 11.234 1.21 6.536 5.41 5.305c1.23-.332 2.585-.297 3.74.225V8.92c-.68-.31-1.465-.436-2.21-.303-1.795.341-3.109 2.227-2.81 3.966.388 2.022 2.805 3.13 4.542 2.193 1.348-.732 1.823-2.31 1.848-3.778.02-3.82.013-7.638.005-11.436l-.01-.54z"/></svg>;
    case 'github': return <svg viewBox="0 0 24 24" {...p}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.011-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
    default: return <Globe {...p} />;
  }
};

/* ─── ESTILO PADRÃO COMPLETO ───────────────────────────────── */
const PREMIUM_STYLE = {
  fontFamily: 'Outfit',
  primaryColor: '#3b82f6',
  bgColor: '#020617',
  headingBaseSize: 84,
  bodyBaseSize: 16,
};

const INITIAL_CONTENT = {
  subtitle: "Desenvolvedor Full-stack, Arquiteto de Software & Fundador Visionário da Vitória Net.",
  style: PREMIUM_STYLE,
  sections: [
    { 
      id: 'bio', 
      type: 'text', 
      title: 'A VISÃO', 
      content: 'Liderando a evolução técnica da Vitória Net com foco em escalabilidade e design de elite. Minha missão é transformar ideias complexas em produtos digitais de alto impacto que definem novos padrões de mercado.' 
    },
    {
      id: 'skills',
      type: 'skills',
      title: 'EXPERTISE',
      items: [
        { label: 'Sistemas Escaláveis', pct: 98 },
        { label: 'React / Next.js', pct: 95 },
        { label: 'Cloud Architecture', pct: 92 },
        { label: 'Design System', pct: 90 },
      ]
    },
    {
      id: 'experience',
      type: 'experience',
      title: 'TRAJETÓRIA',
      items: [
        { date: '2023 - Presente', title: 'Fundador & CTO', company: 'Vitória Net', desc: 'Direção estratégica e arquitetura do núcleo da plataforma Vitória Net.' },
        { date: '2021 - 2023', title: 'Sênior Architecture', company: 'Flacon Tech', desc: 'Desenvolvimento de ecossistemas digitais para gestão inteligente.' },
      ]
    }
  ]
};

export default function BrunoProfile() {
  const { profile: loggedUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>({ name: '', bio: '', social_links: [], website: '', avatar_url: '' });
  const [content, setContent] = useState<any>(INITIAL_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = loggedUser?.role === 'dev_master' || loggedUser?.role === 'admin_master';

  useEffect(() => {
    supabase.from('profiles').select('*').or(`role.eq.dev_master,role.eq.admin_master`).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            id: data.id,
            name: data.name || '',
            bio: data.bio || '',
            social_links: data.social_links || [],
            website: data.website || '',
            avatar_url: data.avatar_url || ''
          });
          if (data.profile_content && Object.keys(data.profile_content).length > 0) {
            setContent({ ...INITIAL_CONTENT, ...(data.profile_content as any) });
          }
        }
        setLoading(false);
      });
  }, []);

  const handleSave = useCallback(async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      // Fix: Explicit field mapping instead of spread to avoid TS issues
      const { error } = await supabase.from('profiles').update({
        name: profile.name,
        bio: profile.bio,
        social_links: profile.social_links,
        avatar_url: profile.avatar_url,
        website: profile.website,
        profile_content: content,
      } as any).eq('id', profile.id);
      
      if (error) throw error;
      toast({ title: "Identidade Preservada!", description: "Seu perfil foi atualizado com sucesso." });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [profile, content, toast]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    setUploading(true);
    try {
      const path = `avatars/${profile.id}_${Date.now()}`;
      await supabase.storage.from('avatars').upload(path, file);
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setProfile((p: any) => ({ ...p, avatar_url: urlData.publicUrl }));
    } catch {
      toast({ title: "Upload falhou", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const updateStyle = (key: string, val: any) => setContent((c: any) => ({ ...c, style: { ...c.style, [key]: val } }));
  const updateSection = (id: string, update: any) => setContent((c: any) => ({ ...c, sections: c.sections.map((s:any) => s.id === id ? {...s, ...update} : s) }));
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const n = [...content.sections];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= n.length) return;
    [n[index], n[target]] = [n[target], n[index]];
    setContent((c:any) => ({ ...c, sections: n }));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen text-slate-50 relative overflow-x-hidden" style={{ backgroundColor: content.style.bgColor, fontFamily: content.style.fontFamily }}>
      
      {/* ── ESTILOS GLOBAIS ── */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background-size: 200% auto;
          animation: shimmer 5s linear infinite;
        }
        .reveal-up {
          animation: revealUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── EDITOR ── */}
      {isEditing && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900/90 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Design</span>
              <Select value={content.style.fontFamily} onValueChange={v => updateStyle('fontFamily', v)}>
                <SelectTrigger className="w-40 h-10 bg-white/5 border-white/10 uppercase text-[10px] font-black tracking-widest"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">{FONTS.map(f => <SelectItem key={f.name} value={f.value} className="text-xs uppercase font-bold">{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500">Destaque</span>
              <input type="color" value={content.style.primaryColor} onChange={e => updateStyle('primaryColor', e.target.value)} className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer" />
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:scale-105 transition-transform font-black uppercase text-xs tracking-widest px-8">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} Salvar Alterações
            </Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-red-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</Button>
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav className={`sticky top-0 z-50 transition-all duration-500 bg-slate-950/20 backdrop-blur-md border-b border-white/5 px-8 py-4 ${isEditing ? 'translate-y-[80px]' : ''}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link to="/" className="group flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 group-hover:text-white transition-colors">Portal Vitória Net</span>
          </Link>
          <div className="flex items-center gap-6">
            {isOwner && !isEditing && (
              <Button size="sm" onClick={() => setIsEditing(true)} className="bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 font-black uppercase text-[10px] tracking-widest px-6 h-9">Editar Página</Button>
            )}
            <Mail className="w-5 h-5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-20 md:py-32 space-y-32">
        
        {/* ── HERO ── */}
        <section className="reveal-up flex flex-col md:flex-row gap-16 items-center text-center md:text-left">
          
          <div className="relative group shrink-0" onClick={() => isEditing && fileInputRef.current?.click()}>
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-[42px] bg-gradient-to-br from-primary to-blue-600 p-[2.5px] shadow-2xl shadow-primary/30 group-hover:scale-105 transition-transform duration-500">
              <div className="w-full h-full rounded-[40px] bg-slate-950 overflow-hidden relative flex items-center justify-center">
                {profile.avatar_url 
                  ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                  : <span className="text-6xl font-black text-white/5 uppercase">{profile.name?.substring(0,2)}</span>
                }
                {isEditing && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    {uploading ? <Loader2 className="animate-spin text-white"/> : <Camera className="w-8 h-8 text-white"/>}
                    <span className="text-[10px] font-black uppercase tracking-widest text-white mt-2">Alterar</span>
                  </div>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              {isEditing ? (
                <Input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="bg-white/5 border-white/10 text-5xl h-20 font-black tracking-tight" />
              ) : (
                <h1 
                  className="font-black leading-[0.85] tracking-tighter bg-clip-text text-transparent shimmer-text"
                  style={{ 
                    fontSize: `${content.style.headingBaseSize}px`,
                    backgroundImage: `linear-gradient(to right, #ffffff 0%, #cbd5e1 50%, #ffffff 100%)` 
                  }}
                >
                  {profile.name || "Bruno Flacon"}
                </h1>
              )}
              {isEditing ? (
                <Textarea value={content.subtitle} onChange={e => setContent({...content, subtitle: e.target.value})} className="bg-white/5 border-white/10 text-slate-400 text-lg" />
              ) : (
                <p className="text-2xl text-slate-400 font-medium leading-relaxed max-w-xl">
                  {content.subtitle}
                </p>
              )}
            </div>

            {/* Ícones Sociais Oficiais */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-12 pt-6">
              <Button className="rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] px-10 h-14 bg-primary hover:scale-110 transition-all shadow-xl shadow-primary/30">Download Resume</Button>
              
              <div className="flex items-center gap-10">
                {profile.social_links.map((s: any, i: number) => {
                  const url = buildUrl(s.platform, s.url);
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:scale-150 transition-all duration-300 transform">
                      <OfficialIcon platform={s.platform} color={BRAND_COLORS[s.platform.toLowerCase()] || '#cbd5e1'} />
                    </a>
                  );
                })}
                {isEditing && (
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full border border-dashed border-white/20 text-primary" onClick={() => {
                    const p = prompt('Plataforma?'); const u = prompt('Username?');
                    if(p && u) setProfile({...profile, social_links: [...profile.social_links, {platform:p, url:u}]});
                  }}><Plus className="w-5 h-5"/></Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── SEÇÕES DE CONTEÚDO RESTAURADO ── */}
        <div className="space-y-40">
          {content.sections.map((section: any, idx: number) => (
            <section key={section.id} className="reveal-up relative group grid grid-cols-1 md:grid-cols-4 gap-16">
              
              <div className="relative">
                <div className="sticky top-40 space-y-4">
                  <div className="h-0.5 w-12 bg-primary/40 rounded-full" />
                  {isEditing ? (
                    <div className="space-y-2">
                       <Input value={section.title} onChange={e => updateSection(section.id, {title: e.target.value})} className="bg-transparent border-none p-0 h-auto text-[11px] font-black uppercase tracking-[0.5em] text-primary" />
                       <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={()=>moveSection(idx,'up')}><ChevronUp size={10}/></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={()=>moveSection(idx,'down')}><ChevronDown size={10}/></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={()=>setContent({...content, sections: content.sections.filter((s:any)=>s.id!==section.id)})}><Trash2 size={10}/></Button>
                       </div>
                    </div>
                  ) : (
                    <h2 className="text-[11px] font-black uppercase tracking-[0.6em] text-primary/80">{section.title}</h2>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                {section.type === 'text' && (
                  isEditing ? (
                    <Textarea value={section.content} onChange={e => updateSection(section.id, {content: e.target.value})} className="bg-white/5 border-white/10 text-2xl font-bold min-h-[150px]" />
                  ) : <p className="text-3xl font-bold leading-tight text-slate-200">{section.content}</p>
                )}

                {section.type === 'skills' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
                    {section.items.map((skill: any, sIdx: number) => (
                      <div key={sIdx} className="space-y-4">
                        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {isEditing ? <Input value={skill.label} onChange={e => updateSection(section.id, {items: section.items.map((it:any,i:number)=>i===sIdx?{...it,label:e.target.value}:it)})} className="h-4 p-0 bg-transparent border-none w-40" /> : <span>{skill.label}</span>}
                          <span>{skill.pct}%</span>
                        </div>
                        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${skill.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'experience' && (
                  <div className="space-y-16 pl-8 border-l border-white/5">
                    {section.items.map((exp: any, eIdx: number) => (
                      <div key={eIdx} className="relative space-y-4">
                        <div className="absolute -left-[37px] top-2 w-2.5 h-2.5 rounded-full border-2 border-primary bg-slate-950 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        {isEditing ? (
                          <div className="space-y-2">
                             <Input value={exp.date} onChange={e => updateSection(section.id, {items: section.items.map((it:any,i:number)=>i===eIdx?{...it,date:e.target.value}:it)})} className="h-6 text-[10px] font-black uppercase tracking-widest text-primary" />
                             <Input value={exp.title} onChange={e => updateSection(section.id, {items: section.items.map((it:any,i:number)=>i===eIdx?{...it,title:e.target.value}:it)})} className="text-2xl font-bold h-10" />
                             <Input value={exp.company} onChange={e => updateSection(section.id, {items: section.items.map((it:any,i:number)=>i===eIdx?{...it,company:e.target.value}:it)})} className="text-slate-500 uppercase text-[10px] font-black tracking-widest h-6" />
                             <Textarea value={exp.desc} onChange={e => updateSection(section.id, {items: section.items.map((it:any,i:number)=>i===eIdx?{...it,desc:e.target.value}:it)})} className="text-slate-400 mt-2" />
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{exp.date}</span>
                            <h3 className="text-4xl font-black tracking-tight">{exp.title}</h3>
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{exp.company}</p>
                            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl">{exp.desc}</p>
                          </>
                        )}
                      </div>
                    ))}
                    {isEditing && <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-primary" onClick={()=>updateSection(section.id, {items:[...section.items, {date:'2024', title:'Cargo', company:'Empresa', desc:''}]})}>+ Adicionar Experiência</Button>}
                  </div>
                )}
              </div>
            </section>
          ))}
          {isEditing && (
            <div className="flex justify-center">
              <Button variant="outline" className="border border-dashed border-primary/40 px-12 h-16 font-black uppercase text-xs tracking-widest text-primary" onClick={()=>{
                const t = prompt('Tipo (text, skills, experience):');
                if(t) setContent({...content, sections: [...content.sections, {id:'s'+Date.now(), type:t, title: 'NOVA SEÇÃO', content: 'Escreva algo aqui', items: []}]});
              }}>Adicionar Bloco de Conteúdo</Button>
            </div>
          )}
        </div>

        {/* ── FOOTER (RESTRICTED TO PRINT STYLE) ── */}
        <footer className="pt-32 pb-16 space-y-12 flex flex-col items-center">
          <div className="w-full h-px bg-white/[0.05]" />
          
          <div className="flex items-center gap-12 font-black uppercase tracking-[0.4em] text-[10px] text-slate-400">
            <span className="hover:text-white cursor-pointer transition-colors">Privacidade</span>
            <span className="hover:text-white cursor-pointer transition-colors">Termos</span>
            <span className="hover:text-white cursor-pointer transition-colors">Manual</span>
          </div>

          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            © {new Date().getFullYear()} • Desenvolvido com <span className="text-red-500 text-base">❤️</span> por Bruno Flacon.
          </p>
        </footer>

      </main>

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 -z-50 pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-10" style={{ backgroundImage: `radial-gradient(circle, ${content.style.primaryColor} 0%, transparent 70%)` }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-5 bg-blue-600" />
      </div>

    </div>
  );
}
