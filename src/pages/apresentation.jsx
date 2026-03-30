import React, { useState, useRef, useEffect } from "react";
import {
  Github, Linkedin, Twitter, Globe, Mail,
  ArrowLeft, Pencil, Camera, Plus, Loader2, Trash2, Check,
  ChevronUp, ChevronDown, Rocket, Shield, Target, Zap, 
  CheckCircle2, Code2, Cpu, Layout, Server, Database, 
  EyeOff, Eye, Link as LinkIcon, Edit3, GripVertical, Wand2, Image as ImageIcon, X
} from "lucide-react";

/* ─── MOCKS & UTILS ──────────────────────── */
const useToast = () => ({ toast: ({title}) => console.log("Toast:", title) });
const useAuth = () => ({ profile: { role: 'dev_master' } });

const ICON_MAP = { Rocket, Shield, Target, Zap, Layout, Server, Database, Cpu, Code2, CheckCircle2 };
const getIcon = (name, props) => {
  const IconCmp = ICON_MAP[name] || Star;
  return <IconCmp {...props} />;
};

/* ─── ÍCONES SOCIAIS OFICIAIS ─────────────────────────────────── */
const OfficialIcon = ({ platform, color, className = "w-7 h-7" }) => {
  const p = { className: `${className} fill-current transition-all duration-300`, style: { color } };
  switch (platform.toLowerCase()) {
    case 'x': 
    case 'twitter': return <svg viewBox="0 0 24 24" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.9-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case 'github': return <svg viewBox="0 0 24 24" {...p}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.011-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
    case 'linkedin': return <svg viewBox="0 0 24 24" {...p}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
    case 'instagram': return <svg viewBox="0 0 24 24" {...p}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
    default: return <Globe {...p} />;
  }
};

/* ─── ESTADOS INICIAIS EXPANVIDOS ─────────────────────── */
const FONTS = [
  { name: 'Outfit', value: '"Outfit", sans-serif' },
  { name: 'Inter', value: '"Inter", sans-serif' },
  { name: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
];

const INITIAL_CONTENT = {
  layout: ['hero', 'learning', 'benefits', 'modules', 'bio'], // Ordem das seções
  navbar: {
    logoType: 'text', // 'text' ou 'image'
    logoText: 'V',
    logoUrl: '',
    brandName: 'Vitória Net'
  },
  style: {
    fontFamily: '"Outfit", sans-serif',
    primaryColor: '#3b82f6', // Cor base principal
    bgColor: '#080C16',
    effects: {
      flares: true,       // Brilhos de fundo
      glassmorphism: true, // Efeito vidro nos cards
      shadowIntensity: 'glow', // 'none', 'normal', 'glow'
    }
  },
  hero: {
    visible: true,
    title: "Aprenda A Criar Sistemas De Alto Retorno E \nMultiplique Seus Resultados!",
    subtitle: "Descubra a estratégia e arquitetura que os profissionais de elite usam para transformar ideias em plataformas de alto rendimento.",
    ctaText: "Garantir Minha Vaga Agora!",
    ctaLink: "#vaga",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  learning: {
    visible: true,
    title: "O Que Você Vai Aprender?",
    mediaUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1000",
    items: [
      "Criação De Arquiteturas Web No React e Next.js Do Zero",
      "Estratégia Para Encontrar O Banco de Dados Certo E Escalar Mais",
      "Escalando Aplicações Lucrativas Sem Desperdícios de Servidor",
      "Erros Que Fazem Você Perder Dinheiro Na AWS E Como Evitá-Los",
      "Passo A Passo Para Lançar Seu Primeiro SaaS Hoje"
    ]
  },
  benefits: {
    visible: true,
    title: "4 Benefícios Exclusivos Ao \nAcessar Este Material",
    items: [
      { id: 1, icon: "Rocket", title: "Do zero ao avançado", desc: "Desenvolvimento de Arquitetura de Software de Forma Simples, Mesmo Que o Projeto Seja Complexo." },
      { id: 2, icon: "Shield", title: "Evite erros e gaste menos", desc: "Descubra Como Estruturar Do Jeito Certo E Evitar Desperdícios Com Servidores." },
      { id: 3, icon: "Target", title: "Técnicas validadas", desc: "Métodos Testados E Aplicados Por Profissionais Do Mercado Para Garantir Escalabilidade." },
      { id: 4, icon: "Zap", title: "Next.js e Node", desc: "Domine As Principais Stacks De Alta Performance Para Alavancar Sua Plataforma." }
    ]
  },
  modules: {
    visible: true,
    title: "O Que Você Vai \nAprender Na Prática",
    items: [
      { id: 1, icon: "Layout", title: "Front-end de Alta Conversão", subtitle: "React & Next.js" },
      { id: 2, icon: "Server", title: "Back-end Robusto", subtitle: "Node & NestJS" },
      { id: 3, icon: "Database", title: "Banco de Dados Escalável", subtitle: "PostgreSQL & Prisma" },
      { id: 4, icon: "Cpu", title: "Infra & Cloud", subtitle: "AWS & Docker" }
    ]
  },
  bio: {
    visible: true,
    name: "Bruno Flacon",
    title: "Quem É O Arquiteto de Software \n",
    paragraphs: [
      "Com anos de experiência em desenvolvimento Full-Stack, já ajudei dezenas de empresas a transformarem suas ideias em plataformas escaláveis e seguras.",
      "Meu foco é ensinar o que realmente funciona no mercado de tecnologia, sem complicação e sem código inútil. Se você quer aprender a criar aplicações robustas no ecossistema moderno (React, Node, Cloud), está no lugar certo.",
      "Meu objetivo é te levar do zero à arquitetura de elite, mostrando o caminho das pedras de forma simples e direta."
    ],
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    social: [
      { id: 1, platform: 'linkedin', url: 'https://linkedin.com' },
      { id: 2, platform: 'instagram', url: 'https://instagram.com' },
      { id: 3, platform: 'github', url: 'https://github.com' }
    ]
  },
  footer: {
    links: [
      { id: 1, label: "Política de Privacidade", url: "#" },
      { id: 2, label: "Termos de Uso", url: "#" }
    ],
    copyright: "Todos Os Direitos Reservados • Vitória Net."
  }
};

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────── */
export default function PresentationPage() {
  const { profile: loggedUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [backupContent, setBackupContent] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState(null);

  const isOwner = loggedUser?.role === 'dev_master';

  // Helpers de Atualização de Estado
  const updateStyle = (key, value) => setContent(c => ({...c, style: {...c.style, [key]: value}}));
  const updateEffects = (key, value) => setContent(c => ({...c, style: {...c.style, effects: {...c.style.effects, [key]: value}}}));
  const updateSection = (section, key, value) => setContent(c => ({...c, [section]: {...c[section], [key]: value}}));
  const toggleVisibility = (section) => updateSection(section, 'visible', !content[section].visible);

  // Mover Seções (Layout)
  const moveLayoutSection = (index, direction) => {
    const newLayout = [...content.layout];
    if (direction === 'up' && index > 0) {
      [newLayout[index], newLayout[index - 1]] = [newLayout[index - 1], newLayout[index]];
    } else if (direction === 'down' && index < newLayout.length - 1) {
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
    }
    setContent(c => ({...c, layout: newLayout}));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setIsEditing(false);
      toast({ title: "Alterações Salvas com Sucesso!" });
    }, 800);
  };

  const handleCancel = () => {
    if (backupContent) {
      setContent(backupContent);
    }
    setIsEditing(false);
    toast({ title: "Edição Cancelada" });
  };

  const enterEditMode = () => {
    setBackupContent(JSON.parse(JSON.stringify(content)));
    setIsEditing(true);
  };

  /* ── CSS DINÂMICO BASEADO NA COR E EFEITOS ── */
  const primary = content.style.primaryColor;
  const effects = content.style.effects;
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  };
  const primaryRgb = hexToRgb(primary) || '59, 130, 246';

  // Componente de Texto Editável Transparente
  const ContentEditable = ({ value, onChange, className = "", tag: Tag = "div", multiline = false }) => {
    if (!isEditing) {
      return <Tag className={className}>{value.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</Tag>;
    }
    
    if (multiline) {
      return (
        <textarea 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className={`bg-white/5 border border-dashed border-white/30 rounded-md outline-none focus:border-white focus:bg-white/10 p-2 w-full resize-none transition-all ${className}`}
          rows={value.split('\n').length || 2}
        />
      );
    }
    
    return (
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={`bg-white/5 border border-dashed border-white/30 rounded-md outline-none focus:border-white focus:bg-white/10 p-1 w-full transition-all ${className}`}
      />
    );
  };

  // Botão de Controle de Seção (Arraste, Subir, Descer, Ocultar)
  const SectionControl = ({ section, index }) => {
    if (!isEditing) return null;
    const isVisible = content[section].visible;
    return (
      <div className="absolute top-4 right-4 z-[60] flex items-center gap-2 bg-[#131825]/90 backdrop-blur border border-white/10 p-1.5 rounded-lg shadow-2xl">
        <div 
          draggable 
          onDragStart={() => setDraggedItem(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if(draggedItem === null || draggedItem === index) return;
            const newLayout = [...content.layout];
            const item = newLayout.splice(draggedItem, 1)[0];
            newLayout.splice(index, 0, item);
            setContent(c => ({...c, layout: newLayout}));
            setDraggedItem(null);
          }}
          className="cursor-grab hover:bg-white/10 p-1 rounded text-slate-400 active:cursor-grabbing"
          title="Arrastar Seção"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button onClick={() => moveLayoutSection(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
        <button onClick={() => moveLayoutSection(index, 'down')} disabled={index === content.layout.length - 1} className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button 
          onClick={() => toggleVisibility(section)}
          className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${isVisible ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
        >
          {isVisible ? <><EyeOff className="w-3 h-3"/> Ocultar</> : <><Eye className="w-3 h-3"/> Mostrar</>}
        </button>
      </div>
    );
  };

  /* ── RENDERIZAÇÃO DINÂMICA DAS SEÇÕES ── */
  const renderSection = (sectionId, index) => {
    const isHidden = !content[sectionId].visible;
    const wrapperClass = `w-full relative transition-all duration-500 ${isHidden && !isEditing ? 'hidden' : isHidden ? 'opacity-40 grayscale outline outline-2 outline-dashed outline-red-500/50' : ''}`;

    switch (sectionId) {
      case 'hero':
        return (
          <section key="hero" className={`${wrapperClass} max-w-7xl mx-auto px-6 py-20 md:py-32 flex flex-col md:flex-row items-center gap-16`}>
            <SectionControl section="hero" index={index} />
            <div className="flex-1 space-y-8 text-center md:text-left z-10">
              <ContentEditable tag="h1" multiline value={content.hero.title} onChange={v => updateSection('hero', 'title', v)} className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white" />
              {!isEditing && <div className="h-1 w-32 bg-theme rounded-full my-4 hidden md:block" />}
              <ContentEditable tag="p" multiline value={content.hero.subtitle} onChange={v => updateSection('hero', 'subtitle', v)} className="text-xl text-slate-300 leading-relaxed max-w-2xl font-light" />
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 group/btn relative">
                <button className="bg-theme-gradient text-white shadow-theme hover-shadow-theme px-10 py-5 rounded-lg text-lg font-bold uppercase tracking-wide transition-all transform hover:-translate-y-1 w-full sm:w-auto">
                  {content.hero.ctaText}
                </button>
                {isEditing && (
                  <div className="absolute -top-12 left-0 bg-[#131825] border border-white/10 p-2 rounded-lg flex items-center gap-2 shadow-xl z-20">
                    <input type="text" value={content.hero.ctaText} onChange={e => updateSection('hero', 'ctaText', e.target.value)} className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-white outline-none w-32" placeholder="Texto Botão" />
                    <LinkIcon className="w-4 h-4 text-slate-400" />
                    <input type="text" value={content.hero.ctaLink} onChange={e => updateSection('hero', 'ctaLink', e.target.value)} className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-white outline-none w-32" placeholder="URL Destino" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 relative w-full max-w-lg md:max-w-none flex justify-center edit-hover-group">
              {effects.flares && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${primaryRgb}, 0.2) 0%, transparent 70%)`, filter: 'blur(60px)' }} />}
              <div className="relative z-10 w-64 h-64 md:w-96 md:h-96 rounded-full p-2 bg-theme-gradient-b shadow-theme">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0B101E] border-4 border-[#0B101E] relative">
                  <img src={content.hero.avatarUrl} alt="Hero" className="w-full h-full object-cover object-top" />
                  {isEditing && (
                    <div className="edit-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => { const url = prompt("URL da nova imagem:"); if(url) updateSection('hero', 'avatarUrl', url); }}>
                      <Camera className="w-10 h-10 text-white mb-2" />
                      <span className="text-xs font-bold uppercase text-white tracking-widest">Trocar Imagem</span>
                    </div>
                  )}
                </div>
                <div className={`absolute -left-8 top-1/4 bg-[#131825] border border-theme/30 p-3 rounded-xl shadow-2xl animate-bounce ${effects.glassmorphism ? 'glass-card' : ''}`} style={{ animationDuration: '3s'}}>
                  <Code2 className="w-8 h-8 text-theme" />
                </div>
                <div className={`absolute -right-4 bottom-1/4 bg-[#131825] border border-theme/30 p-3 rounded-xl shadow-2xl animate-bounce ${effects.glassmorphism ? 'glass-card' : ''}`} style={{ animationDuration: '4s', animationDelay: '1s'}}>
                  <Target className="w-8 h-8 text-theme" />
                </div>
              </div>
            </div>
          </section>
        );

      case 'learning':
        return (
          <section key="learning" className={`${wrapperClass} bg-[#0B101E] border-y border-white/[0.02] py-24 relative`}>
            <SectionControl section="learning" index={index} />
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-20">
              <div className="flex-1 w-full edit-hover-group">
                 <div className={`relative w-full aspect-video rounded-2xl border border-white/10 bg-[#131825] overflow-hidden shadow-theme flex items-center justify-center group ${effects.glassmorphism ? 'backdrop-blur-md' : ''}`}>
                   <div className="absolute inset-0 bg-theme opacity-10" />
                   <img src={content.learning.mediaUrl} alt="Dashboard" className="w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 bg-theme rounded-full flex items-center justify-center shadow-theme cursor-pointer hover:scale-110 transition-transform">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[15px] border-l-white border-b-[10px] border-b-transparent ml-2" />
                      </div>
                   </div>
                   {isEditing && (
                    <div className="edit-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity cursor-pointer backdrop-blur-sm z-20" onClick={() => { const url = prompt("URL da nova imagem de fundo/video thumbnail:"); if(url) updateSection('learning', 'mediaUrl', url); }}>
                      <Edit3 className="w-10 h-10 text-white mb-2" />
                      <span className="text-xs font-bold uppercase text-white tracking-widest">Alterar Mídia</span>
                    </div>
                  )}
                 </div>
              </div>
              <div className="flex-1 space-y-8">
                <ContentEditable tag="h2" multiline value={content.learning.title} onChange={v => updateSection('learning', 'title', v)} className="text-3xl md:text-4xl font-black text-white" />
                <div className="space-y-4">
                  {content.learning.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 group/item">
                      <CheckCircle2 className="w-6 h-6 text-theme shrink-0 mt-0.5" />
                      <ContentEditable tag="p" multiline value={item} onChange={v => { const newItems = [...content.learning.items]; newItems[idx] = v; updateSection('learning', 'items', newItems); }} className="text-slate-300 font-medium text-lg leading-snug flex-1" />
                      {isEditing && (
                        <button onClick={() => { const n = content.learning.items.filter((_,i)=>i!==idx); updateSection('learning', 'items', n); }} className="text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => updateSection('learning', 'items', [...content.learning.items, "Novo item na lista..."])} className="text-theme font-bold text-sm uppercase flex items-center gap-2 mt-4 hover:bg-theme/10 px-4 py-2 rounded-lg border border-dashed border-theme/50 transition-colors w-full justify-center"><Plus className="w-4 h-4"/> Adicionar Item</button>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'benefits':
        return (
          <section key="benefits" className={`${wrapperClass} max-w-7xl mx-auto px-6 py-24 space-y-16 relative`}>
            {effects.flares && <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-theme/5 blur-[120px] rounded-full pointer-events-none" />}
            <SectionControl section="benefits" index={index} />
            <div className="text-center space-y-4 relative z-10">
              <ContentEditable tag="h2" multiline value={content.benefits.title} onChange={v => updateSection('benefits', 'title', v)} className="text-3xl md:text-4xl font-black" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
              {content.benefits.items.map((item, idx) => (
                <div key={item.id} className={`border border-[#1F2937] hover:border-theme/50 rounded-xl p-8 transition-all duration-300 relative group/card ${effects.glassmorphism ? 'glass-card' : 'bg-[#111623]'} ${effects.shadowIntensity === 'glow' ? 'hover-shadow-theme' : effects.shadowIntensity === 'normal' ? 'shadow-lg' : ''}`}>
                  <div className="w-14 h-14 bg-theme opacity-10 rounded-lg absolute top-8 left-8" />
                  <div className={`relative z-10 w-14 h-14 flex items-center justify-center mb-6 text-theme ${isEditing ? 'cursor-pointer hover:scale-110 transition-transform bg-black/40 rounded-lg border border-dashed border-theme' : ''}`} onClick={() => { if(isEditing){ const icon = prompt("Nome do ícone (Rocket, Shield, Target, Zap, Layout, Server, Database, Cpu, Code2):", item.icon); if(icon) { const n = [...content.benefits.items]; n[idx].icon = icon; updateSection('benefits', 'items', n); } } }}>
                    {getIcon(item.icon, { className: "w-8 h-8" })}
                  </div>
                  <ContentEditable tag="h3" value={item.title} onChange={v => { const n = [...content.benefits.items]; n[idx].title = v; updateSection('benefits', 'items', n); }} className="text-xl font-bold text-white mb-4 leading-tight"/>
                  <ContentEditable tag="p" multiline value={item.desc} onChange={v => { const n = [...content.benefits.items]; n[idx].desc = v; updateSection('benefits', 'items', n); }} className="text-slate-400 text-sm leading-relaxed"/>
                  <div className="w-full h-1 bg-theme-gradient mt-6 transform origin-left scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500" />
                  {isEditing && (
                    <button onClick={() => { const n = content.benefits.items.filter(i=>i.id!==item.id); updateSection('benefits', 'items', n); }} className="absolute top-2 right-2 text-red-500 bg-red-500/10 p-2 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div onClick={() => updateSection('benefits', 'items', [...content.benefits.items, { id: Date.now(), icon: "Star", title: "Novo Benefício", desc: "Descrição..." }])} className="border-2 border-dashed border-white/10 hover:border-theme/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all min-h-[250px] text-slate-500 hover:text-theme"><Plus className="w-12 h-12 mb-4" /><span className="font-bold uppercase tracking-widest text-xs">Adicionar Card</span></div>
              )}
            </div>
          </section>
        );

      case 'modules':
        return (
          <section key="modules" className={`${wrapperClass} max-w-7xl mx-auto px-6 py-12 space-y-12 relative`}>
            <SectionControl section="modules" index={index} />
            <div className="text-left">
              <ContentEditable tag="h2" multiline value={content.modules.title} onChange={v => updateSection('modules', 'title', v)} className="text-3xl font-black" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.modules.items.map((item, idx) => (
                <div key={item.id} className={`relative rounded-2xl overflow-hidden group/card aspect-[3/4] flex flex-col items-center justify-end p-6 text-center ${effects.glassmorphism ? 'glass-card' : 'bg-[#111623]'} ${effects.shadowIntensity === 'glow' ? 'hover-shadow-theme' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080C16] via-[#080C16]/80 to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-0 opacity-40 group-hover/card:opacity-60 group-hover/card:scale-110 transition-all duration-700 pointer-events-none" style={{ background: `linear-gradient(to bottom right, rgba(${primaryRgb}, 0.5), #080C16)` }} />
                  <div className={`relative z-20 w-24 h-24 mb-auto mt-12 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] text-theme ${isEditing ? 'cursor-pointer hover:scale-105 border-2 border-dashed border-theme' : ''}`} onClick={() => { if(isEditing){ const icon = prompt("Nome do ícone:", item.icon); if(icon) { const n = [...content.modules.items]; n[idx].icon = icon; updateSection('modules', 'items', n); } } }}>
                    {getIcon(item.icon, { className: "w-12 h-12" })}
                  </div>
                  <div className="relative z-20 mt-auto w-full">
                    <div className="w-full bg-white/10 rounded-full px-3 py-1 mb-4 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">Módulo {idx + 1}</div>
                    <ContentEditable tag="h3" value={item.title} onChange={v => { const n = [...content.modules.items]; n[idx].title = v; updateSection('modules', 'items', n); }} className="text-xl font-black text-white leading-tight mb-2 uppercase tracking-wide"/>
                    <ContentEditable tag="p" value={item.subtitle} onChange={v => { const n = [...content.modules.items]; n[idx].subtitle = v; updateSection('modules', 'items', n); }} className="text-theme font-medium text-sm"/>
                  </div>
                  {isEditing && (
                    <button onClick={() => { const n = content.modules.items.filter(i=>i.id!==item.id); updateSection('modules', 'items', n); }} className="absolute top-4 right-4 z-50 text-red-500 bg-red-500/20 p-2 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div onClick={() => updateSection('modules', 'items', [...content.modules.items, { id: Date.now(), icon: "Cpu", title: "Novo Módulo", subtitle: "Tecnologia..." }])} className="relative rounded-2xl border-2 border-dashed border-white/10 hover:border-theme/50 aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all text-slate-500 hover:text-theme"><Plus className="w-12 h-12 mb-4" /><span className="font-bold uppercase tracking-widest text-xs">Adicionar Módulo</span></div>
              )}
            </div>
          </section>
        );

      case 'bio':
        return (
          <section key="bio" className={`${wrapperClass} bg-[#0B101E] border-t border-white/[0.05] mt-24 py-24 relative overflow-hidden`}>
            {effects.flares && <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none w-1/2 h-full flex items-end justify-end"><svg viewBox="0 0 200 100" className="w-full h-auto" preserveAspectRatio="none"><path d="M0 100 L 50 80 L 100 90 L 150 40 L 200 20 L 200 100 Z" fill={primary} /></svg></div>}
            <SectionControl section="bio" index={index} />
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 relative z-10">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight flex flex-col gap-2">
                  <ContentEditable tag="span" multiline value={content.bio.title} onChange={v => updateSection('bio', 'title', v)} />
                  <ContentEditable tag="span" value={content.bio.name} onChange={v => updateSection('bio', 'name', v)} className="text-theme text-glow-theme" />
                </h2>
                <div className="space-y-4 text-slate-300 text-lg leading-relaxed">
                  {content.bio.paragraphs.map((p, idx) => (
                    <div key={idx} className="relative group/p">
                      <ContentEditable tag="p" multiline value={p} onChange={v => { const n = [...content.bio.paragraphs]; n[idx] = v; updateSection('bio', 'paragraphs', n); }} />
                      {isEditing && (
                        <button onClick={() => { const n = content.bio.paragraphs.filter((_,i)=>i!==idx); updateSection('bio', 'paragraphs', n); }} className="absolute -right-8 top-1 text-red-500 opacity-0 group-hover/p:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => updateSection('bio', 'paragraphs', [...content.bio.paragraphs, "Novo parágrafo..."])} className="text-theme font-bold text-xs uppercase flex items-center gap-2 mt-2 hover:bg-theme/10 px-3 py-1.5 rounded border border-dashed border-theme/50 transition-colors"><Plus className="w-3 h-3"/> Adicionar Parágrafo</button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-6">
                  {content.bio.social.map((link) => (
                    <div key={link.id} className="relative group/social">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className={`text-slate-400 hover:text-theme transition-colors block ${isEditing ? 'pointer-events-none' : ''}`}><OfficialIcon platform={link.platform} color="currentColor" className="w-8 h-8" /></a>
                      {isEditing && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#131825] border border-white/10 p-1.5 rounded-lg flex items-center gap-1 shadow-xl z-20 opacity-0 group-hover/social:opacity-100 transition-opacity">
                          <button onClick={() => { const p = prompt("Plataforma (ex: linkedin, instagram, github, x):", link.platform); if(p){ const n = [...content.bio.social]; const i = n.findIndex(x=>x.id===link.id); n[i].platform = p; updateSection('bio', 'social', n); } }} className="text-slate-400 hover:text-white p-1"><Edit3 className="w-3 h-3"/></button>
                          <button onClick={() => { const u = prompt("URL da rede social:", link.url); if(u){ const n = [...content.bio.social]; const i = n.findIndex(x=>x.id===link.id); n[i].url = u; updateSection('bio', 'social', n); } }} className="text-slate-400 hover:text-white p-1"><LinkIcon className="w-3 h-3"/></button>
                          <button onClick={() => { const n = content.bio.social.filter(x=>x.id!==link.id); updateSection('bio', 'social', n); }} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => updateSection('bio', 'social', [...content.bio.social, { id: Date.now(), platform: 'globe', url: '#' }])} className="w-8 h-8 rounded-full border border-dashed border-slate-500 flex items-center justify-center text-slate-500 hover:text-white hover:border-white transition-colors"><Plus className="w-4 h-4"/></button>
                  )}
                </div>
              </div>
              <div className="flex-1 w-full max-w-md flex justify-center edit-hover-group">
                <div className={`w-full aspect-[3/4] relative rounded-xl overflow-hidden ${effects.shadowIntensity === 'glow' ? 'shadow-theme' : ''}`}>
                   <img src={content.bio.avatarUrl} alt={content.bio.name} className="absolute inset-0 w-full h-full object-cover object-center opacity-80 mix-blend-luminosity" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#080C16] via-transparent to-transparent pointer-events-none" />
                   {isEditing && (
                    <div className="edit-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity cursor-pointer backdrop-blur-sm z-20" onClick={() => { const url = prompt("Cole a URL da foto do fundador:"); if(url) updateSection('bio', 'avatarUrl', url); }}>
                      <Camera className="w-10 h-10 text-white mb-2" />
                      <span className="text-xs font-bold uppercase text-white tracking-widest">Alterar Foto</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen text-slate-50 relative overflow-x-hidden" style={{ backgroundColor: content.style.bgColor, fontFamily: content.style.fontFamily }}>
      
      {/* ── ESTILOS GLOBAIS E INJEÇÃO DE CORES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Inter:wght@300;400;600;800;900&family=Space+Grotesk:wght@300;400;600;700&family=Playfair+Display:wght@400;700;900&display=swap');
        
        :root {
          --color-primary: ${primary};
          --color-primary-rgb: ${primaryRgb};
        }
        
        .text-theme { color: var(--color-primary); }
        .bg-theme { background-color: var(--color-primary); }
        .border-theme { border-color: var(--color-primary); }
        
        .bg-theme-gradient { background: linear-gradient(to right, var(--color-primary), rgba(var(--color-primary-rgb), 0.6)); }
        .bg-theme-gradient-b { background: linear-gradient(to bottom, var(--color-primary), transparent); }
        
        .shadow-theme { box-shadow: 0 0 30px rgba(var(--color-primary-rgb), 0.4); }
        .hover-shadow-theme:hover { box-shadow: 0 0 40px rgba(var(--color-primary-rgb), 0.7); transform: translateY(-5px); }
        
        .text-glow-theme { text-shadow: 0 0 30px rgba(var(--color-primary-rgb), 0.8); }
        
        .glass-card {
          background: rgba(19, 24, 37, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .edit-hover-group:hover .edit-overlay { opacity: 1; }
      `}</style>

      {/* ── BARRA DE FERRAMENTAS GLOBAL (Flutuante) ── */}
      {isEditing && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#0A0F1C]/95 backdrop-blur-xl border-b border-theme/30 px-6 py-3 flex items-center justify-between shadow-2xl flex-wrap gap-4">
          <div className="flex gap-6 items-center flex-wrap">
            <span className="text-theme font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Pencil className="w-4 h-4"/> Page Builder
            </span>
            
            {/* Controles de Cores e Fontes */}
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
              <input type="color" value={content.style.primaryColor} onChange={e => updateStyle('primaryColor', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent" />
              <select value={content.style.fontFamily} onChange={e => updateStyle('fontFamily', e.target.value)} className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer">
                {FONTS.map(f => <option key={f.name} value={f.value} className="bg-slate-900">{f.name}</option>)}
              </select>
            </div>

            {/* Menu de Efeitos Visuais */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
              <Wand2 className="w-4 h-4 text-slate-400 ml-1 mr-2"/>
              <button onClick={() => updateEffects('flares', !effects.flares)} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${effects.flares ? 'bg-theme text-white' : 'text-slate-400 hover:bg-white/10'}`}>Flares</button>
              <button onClick={() => updateEffects('glassmorphism', !effects.glassmorphism)} className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${effects.glassmorphism ? 'bg-theme text-white' : 'text-slate-400 hover:bg-white/10'}`}>Glass</button>
              <select value={effects.shadowIntensity} onChange={e => updateEffects('shadowIntensity', e.target.value)} className="bg-transparent text-slate-400 text-[10px] font-bold uppercase outline-none cursor-pointer px-2">
                <option value="none" className="bg-slate-900">Sombra Off</option>
                <option value="normal" className="bg-slate-900">Sombra Leve</option>
                <option value="glow" className="bg-slate-900">Neon Glow</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={handleCancel} className="text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-transparent hover:border-red-500/30">
              <X className="w-4 h-4"/> Cancelar
            </button>
            <button onClick={() => setIsEditing(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
              <Eye className="w-4 h-4"/> Preview Mode
            </button>
            <button onClick={handleSave} disabled={saving} className="bg-theme hover:opacity-80 text-white px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-theme">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} Salvar Página
            </button>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <nav className={`w-full z-50 transition-all duration-500 border-b border-white/5 bg-[#080C16]/80 backdrop-blur-md sticky top-0 ${isEditing ? 'translate-y-[100px] lg:translate-y-[60px]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          
          {/* Logo Customizável */}
          <div className={`flex items-center gap-2 group/logo relative ${isEditing ? 'cursor-pointer hover:bg-white/5 p-1 rounded transition-colors' : ''}`}>
            {content.navbar.logoType === 'image' && content.navbar.logoUrl ? (
              <img src={content.navbar.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-8 h-8 rounded bg-theme flex items-center justify-center font-black text-xl text-white shadow-theme">
                <ContentEditable tag="span" value={content.navbar.logoText} onChange={v => updateSection('navbar', 'logoText', v)} />
              </div>
            )}
            <ContentEditable tag="span" value={content.navbar.brandName} onChange={v => updateSection('navbar', 'brandName', v)} className="text-lg font-black tracking-widest text-white uppercase ml-1" />
            
            {isEditing && (
              <div className="absolute top-full left-0 mt-2 bg-[#131825] border border-white/10 p-2 rounded-lg shadow-xl opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col gap-1 z-50">
                <button onClick={() => updateSection('navbar', 'logoType', 'text')} className="text-xs text-white hover:bg-theme/20 px-2 py-1 rounded text-left flex items-center gap-2"><Edit3 className="w-3 h-3"/> Usar Texto</button>
                <button onClick={() => { const url = prompt("URL da imagem Logo:"); if(url){ updateSection('navbar', 'logoUrl', url); updateSection('navbar', 'logoType', 'image'); } }} className="text-xs text-white hover:bg-theme/20 px-2 py-1 rounded text-left flex items-center gap-2"><ImageIcon className="w-3 h-3"/> Usar Imagem</button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {!isEditing && isOwner && (
              <button onClick={enterEditMode} className="border-2 border-theme/50 text-theme hover:bg-theme/10 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-theme">
                <Pencil className="w-3 h-3"/> Editar Página
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT (Mapeando o Layout Arrastável) ── */}
      <main className="flex flex-col items-center min-h-[50vh]">
        {content.layout.map((sectionId, index) => renderSection(sectionId, index))}

        {/* ── FOOTER Fixo no final ── */}
        <footer className="w-full border-t border-white/[0.05] bg-[#050810] py-12 flex flex-col items-center justify-center text-center space-y-6 mt-12">
          <div className="flex flex-wrap items-center justify-center gap-4 font-bold text-xs uppercase tracking-widest text-slate-500">
            {content.footer.links.map((link, idx) => (
              <div key={link.id} className="relative group/link flex items-center">
                <ContentEditable tag="span" value={link.label} onChange={v => { const n = [...content.footer.links]; n[idx].label = v; updateSection('footer', 'links', n); }} className="hover:text-white cursor-pointer transition-colors" />
                {isEditing && (
                  <div className="flex items-center ml-2 bg-white/5 rounded px-1">
                     <button onClick={() => { const u = prompt("URL do link:", link.url); if(u){ const n = [...content.footer.links]; n[idx].url = u; updateSection('footer', 'links', n); } }} className="p-1 text-slate-400 hover:text-white"><LinkIcon className="w-3 h-3"/></button>
                     <button onClick={() => { const n = content.footer.links.filter(x=>x.id!==link.id); updateSection('footer', 'links', n); }} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                  </div>
                )}
              </div>
            ))}
            {isEditing && (
              <button onClick={() => updateSection('footer', 'links', [...content.footer.links, { id: Date.now(), label: "Novo Link", url: "#" }])} className="text-theme flex items-center gap-1 hover:bg-theme/10 px-2 py-1 rounded border border-dashed border-theme/50"><Plus className="w-3 h-3"/> Add Link</button>
            )}
          </div>
          <ContentEditable tag="p" value={content.footer.copyright} onChange={v => updateSection('footer', 'copyright', v)} className="text-slate-600 text-sm font-medium"/>
        </footer>
      </main>
    </div>
  );
}