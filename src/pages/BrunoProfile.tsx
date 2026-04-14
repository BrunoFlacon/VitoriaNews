import React, { useState, useEffect } from "react";
import {
  Github, Linkedin, Twitter, Globe, Mail,
  ArrowLeft, Pencil, Camera, Plus, Loader2, Trash2, Check,
  ChevronUp, ChevronDown, Rocket, Shield, Target, Zap, 
  CheckCircle2, Code2, Cpu, Layout, Server, Database, 
  EyeOff, Eye, Link as LinkIcon, Edit3, GripVertical, Wand2, Image as ImageIcon, X, Star, History, Heart,
  Phone, User, Send, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystem } from "@/contexts/SystemContext";
import { useToast } from "@/hooks/use-toast";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { XIcon, InstagramIcon, LinkedinIcon } from "@/components/icons/SocialIcons";

/* ─── TIPOS & INTERFACES ──────────────────────── */
interface SocialLink {
  id: number;
  platform: string;
  url: string;
}

interface BenefitItem {
  id: number;
  icon: string;
  title: string;
  desc: string;
}

interface ModuleItem {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
}

interface FooterLink {
  id: number;
  label: string;
  url: string;
}

interface ContentState {
  layout: string[];
  navbar: {
    logoType: 'text' | 'image';
    logoText: string;
    logoUrl: string;
    brandName: string;
  };
  style: {
    fontFamily: string;
    fontSize: string;
    fontColor: string;
    primaryColor: string;
    bgColor: string;
    effects: {
      flares: boolean;
      glassmorphism: boolean;
      shadowIntensity: string;
    };
  };
  hero: {
    visible: boolean;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    avatarUrl: string;
  };
  learning: {
    visible: boolean;
    title: string;
    mediaUrl: string;
    items: string[];
  };
  benefits: {
    visible: boolean;
    title: string;
    items: BenefitItem[];
  };
  modules: {
    visible: boolean;
    title: string;
    items: ModuleItem[];
  };
  bio: {
    visible: boolean;
    name: string;
    title: string;
    paragraphs: string[];
    avatarUrl: string;
    social: SocialLink[];
    commercialWhatsapp: string;
    professionalEmail: string;
    region: string;
  };
  contact: {
    visible: boolean;
    title: string;
    subtitle: string;
    badgeText: string;
    whatsappLabel: string;
    emailLabel: string;
    regionLabel: string;
    socialTitle: string;
  };
  footer: {
    links: FooterLink[];
    copyright: string;
  };
}

/* ─── UTILS ──────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = { Rocket, Shield, Target, Zap, Layout, Server, Database, Cpu, Code2, CheckCircle2, Star };

const getIcon = (name: string, props: React.SVGProps<SVGSVGElement>) => {
  const IconCmp = ICON_MAP[name] || Star;
  return <IconCmp {...props} />;
};

const getSocialIcon = (platform: string, props: React.SVGProps<SVGSVGElement>) => {
  switch (platform.toLowerCase()) {
    case 'x':
    case 'twitter':
      return <XIcon {...props} />;
    case 'instagram':
      return <InstagramIcon {...props} />;
    case 'linkedin':
      return <LinkedinIcon {...props} />;
    case 'github':
      return <Github {...props} />;
    default:
      return <Globe {...props} />;
  }
};

/* ─── ÍCONES SOCIAIS OFICIAIS ─────────────────────────────────── */
interface OfficialIconProps {
  platform: string;
  color: string;
  className?: string;
}

const OfficialIcon: React.FC<OfficialIconProps> = ({ platform, color, className = "w-7 h-7" }) => {
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

const INITIAL_CONTENT: ContentState = {
  layout: ['hero', 'benefits', 'learning', 'modules', 'bio', 'contact'], // Ordem das seções
  navbar: {
    logoType: 'text', 
    logoText: 'V',
    logoUrl: '',
    brandName: 'Vitória Net'
  },
  style: {
    fontFamily: '"Outfit", sans-serif',
    fontSize: '16px',
    fontColor: '#ffffff',
    primaryColor: '#3b82f6',
    bgColor: '#080C16',
    effects: {
      flares: true,
      glassmorphism: true,
      shadowIntensity: 'glow',
    }
  },
  hero: {
    visible: true,
    title: "Engenharia de Software & \nComunicação Integrada.",
    subtitle: "Conheça Bruno Flacon. De fundador da Web Rádio Vitória a engenheiro Full-Stack criando ecossistemas de alta performance para portais de notícias.",
    ctaText: "Ver Arquitetura do Sistema",
    ctaLink: "#learning",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  learning: {
    visible: true,
    title: "Vitória Net: Core Architecture",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80",
    items: [
      "Gestão e Área Unificada de Múltiplas Redes Sociais no mesmo lugar",
      "Análises Inteligentes e Predições de Engajamento Operacional",
      "Central de Produção Jornalística (Assinaturas, Newsletters e Redes)",
      "Toda a base que um Portal de Notícias precisa para operar do Back ao Front"
    ]
  },
  benefits: {
    visible: true,
    title: "Nossa Força na Região \nImpulsionando Informação.",
    items: [
      { id: 1, icon: "Target", title: "Alcance Massivo", desc: "+50.000 seguidores através das principais redes sociais." },
      { id: 2, icon: "CheckCircle2", title: "Impacto Local", desc: "Presença de destaque em Tupã - SP e em toda a região macro." },
      { id: 3, icon: "Layout", title: "Ecossistema Completo", desc: "Gestão ponta-a-ponta, da captura da notícia à entrega interativa na Web." },
      { id: 4, icon: "Zap", title: "Distribuição Imediata", desc: "Roteamento das notícias otimizado para o algoritmo das redes instantaneamente." }
    ]
  },
  modules: {
    visible: true,
    title: "Visão Técnica do \nEcossistema",
    items: [
      { id: 1, icon: "Server", title: "Social Canvas Hub", subtitle: "Distribuição em Redes" },
      { id: 2, icon: "Code2", title: "Assinaturas Vip", subtitle: "Paywalls e Membros" },
      { id: 3, icon: "Database", title: "Central Jornalística", subtitle: "Gerenciador Nativo" },
      { id: 4, icon: "Cpu", title: "Radar Analytics", subtitle: "Inteligências Artificiais" }
    ]
  },
  bio: {
    visible: true,
    name: "Bruno Flacon",
    title: "Engenheiro & Fundador \n",
    paragraphs: [
      "A jornada inteira começou atuando como fundador da Web Rádio Vitória, quando decidi arregaçar as mangas e entender as complexidades técnicas de distribuir conteúdo em larga escala para atrair a atenção local do público.",
      "Hoje, como desenvolvedor Full-Stack focado, crio arquiteturas de ponta para sanar exatamente as dores operacionais que os jornalistas das redações vivem diariamente. O Vitória Net é a consolidação técnica de anos da comunicação digital atrelada a código em um único hub.",
      "As minhas plataformas não focam apenas no painel visual: são potentes motores nos bastidores, criados para aguentarem alta disponibilidade e tráfego, simplificando a operação de portais inteiros."
    ],
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    social: [
      { id: 1, platform: 'linkedin', url: 'https://linkedin.com/' },
      { id: 2, platform: 'instagram', url: 'https://instagram.com/' },
      { id: 3, platform: 'github', url: 'https://github.com/' }
    ],
    commercialWhatsapp: "(14) 9 9999-9999",
    professionalEmail: "redacao@vitorianet.com.br",
    region: "Tupã - SP e região"
  },
  contact: {
    visible: true,
    title: "Entre em Contato",
    subtitle: "Fale com a nossa equipe. Preencha os dados abaixo e retornaremos em breve.",
    badgeText: "Fale Conosco",
    whatsappLabel: "WhatsApp / Comercial",
    emailLabel: "E-mail Profissional",
    regionLabel: "Região de Atuação",
    socialTitle: "Siga nas Redes Sociais"
  },
  footer: {
    links: [
      { id: 1, label: "PRIVACIDADE", url: "/privacy" },
      { id: 2, label: "TERMOS DE USO", url: "/terms" },
      { id: 3, label: "CONTATO TÉCNICO", url: "#contact" },
      { id: 4, label: "MÍDIA KIT - OFF", url: "/profile/bruno-flacon" }
    ],
    copyright: "© 2026 • Code & Design com ❤️ por Bruno Flacon"
  }
};

/* ─── FORMULÁRIO DE CONTATO BLINDADO ───────────────────────────── */
const ContactForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState<'idle'|'confirming'|'sending'|'success'|'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldWarning, setFieldWarning] = useState<{name?:string;email?:string;phone?:string}>({});
  const [blocked, setBlocked] = useState(false);
  const suspiciousRef = React.useRef(0);

  const VALID_DOMAINS = ['gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','live.com',
    'uol.com.br','bol.com.br','globo.com','terra.com.br','ig.com.br','protonmail.com','tutanota.com','msn.com'];

  const hasPattern = (val: string) => {
    const c = val.toLowerCase().replace(/\s/g,'');
    if (!c) return false;
    if (/(.)\1{2,}/.test(c)) return true;
    let seq = 0;
    for(let i=1;i<c.length;i++){if(c.charCodeAt(i)===c.charCodeAt(i-1)+1)seq++;else seq=0;if(seq>=3)return true;}
    return false;
  };

  const isNameLikeReal = (v: string) => {
    const parts = v.trim().split(/\s+/);
    return parts.length >= 2 && parts.every(p => p.length >= 2 && !hasPattern(p));
  };

  const isEmailRealFormat = (v: string) => {
    if(!/^[a-zA-Z][a-zA-Z0-9.]{1,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) return false;
    const domain = v.split('@')[1]?.toLowerCase()||'';
    const local = v.split('@')[0]?.toLowerCase()||'';
    if(hasPattern(local)) return false;
    return VALID_DOMAINS.some(d=>domain===d||domain.endsWith('.'+d)) || (domain.includes('.')&&domain.length>5);
  };

  const isPhoneRealFormat = (v: string) => {
    if(v.length!==11) return false;
    const ddd=parseInt(v.substring(0,2));
    if(ddd<11||ddd>99) return false;
    if(v[2]!=='9') return false;
    if(hasPattern(v)) return false;
    if(new Set(v).size<=2) return false;
    return true;
  };

  const warn = (field: string, msg: string) => {
    suspiciousRef.current++;
    if(suspiciousRef.current>=2){setBlocked(true);setErrorMsg('Formulário bloqueado. Recarregue a página para tentar novamente.');return;}
    setFieldWarning(p=>({...p,[field]:msg}));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(blocked) return;
    const val = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g,'').slice(0,45);
    setName(val); setFieldWarning(p=>({...p,name:undefined})); setErrorMsg('');
    if(val.length>=4 && hasPattern(val.replace(/\s/g,''))) warn('name','Por favor, digite seu nome real.');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(blocked) return;
    let val = e.target.value.replace(/[^a-zA-Z0-9@._-]/g,'').toLowerCase();
    if((val.match(/@/g)||[]).length>1) val=val.replace(/@/,'').replace(/@/,'@');
    setEmail(val); setFieldWarning(p=>({...p,email:undefined})); setErrorMsg('');
  };

  const handleEmailBlur = () => {
    if(!email||blocked) return;
    if(!isEmailRealFormat(email)) warn('email','Use um e-mail válido como nome@gmail.com ou nome@empresa.com.br');
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(blocked) return;
    let val = e.target.value.replace(/\D/g,'');
    if(val.startsWith('55')&&val.length>2) val=val.substring(2);
    if(val.length>11) val=val.slice(0,11);
    setWhatsapp(val); setFieldWarning(p=>({...p,phone:undefined})); setErrorMsg('');
  };

  const handleWhatsappBlur = () => {
    if(!whatsapp||blocked) return;
    if(!isPhoneRealFormat(whatsapp)){
      const msg = whatsapp.length<11 ? 'Número incompleto. Digite DDD + 9 + 8 dígitos.'
        : whatsapp[2]!=='9' ? 'WhatsApp começa com 9 após o DDD. Ex: 14 9 9999-9999'
        : 'Número inválido. Confirme seu WhatsApp.';
      warn('phone', msg);
    }
  };

  const isNameValid = isNameLikeReal(name);
  const isEmailValid = isEmailRealFormat(email);
  const isPhoneValid = isPhoneRealFormat(whatsapp);
  const formatPhone = (v: string) => v.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/,'($1) $2 $3-$4');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if(blocked) return;
    if(!isNameValid){setErrorMsg('Informe seu nome completo.');return;}
    if(!isEmailValid){setErrorMsg('Informe um e-mail válido.');return;}
    if(!isPhoneValid){setErrorMsg('Informe um número de WhatsApp válido.');return;}
    if(status==='idle'||status==='error'){setStatus('confirming');return;}
    if(status==='confirming'){
      setStatus('sending');
      try{
        const{error}=await(supabase as any).from('media_kit_leads').insert([{name:name.trim(),email,whatsapp:`55${whatsapp}`}]);
        if(error) throw new Error();
        setStatus('success');
        setTimeout(()=>{setStatus('idle');setName('');setEmail('');setWhatsapp('');},8000);
      }catch{setErrorMsg('Erro ao enviar. Tente novamente.');setStatus('error');}
    }
  };

  if(status==='success') return(
    <div className="mt-20 bg-green-500/10 border border-green-500/30 p-8 rounded-2xl flex flex-col items-center text-center w-full max-w-xl shadow-[0_0_40px_rgba(34,197,94,0.2)]">
      <CheckCircle2 className="w-14 h-14 text-green-500 mb-4"/>
      <h3 className="text-2xl font-black text-white">Mensagem Recebida!</h3>
      <p className="text-green-400 mt-2">Entraremos em contato em breve.</p>
    </div>
  );
  if(blocked) return(
    <div className="mt-20 bg-red-500/10 border border-red-500/30 p-8 rounded-2xl flex flex-col items-center text-center w-full max-w-xl">
      <AlertCircle className="w-12 h-12 text-red-500 mb-3"/>
      <p className="text-red-400 font-bold">Formulário bloqueado.</p>
      <p className="text-slate-500 text-sm mt-2">Recarregue a página para tentar novamente.</p>
    </div>
  );

  return(
    <div className="mt-20 w-full max-w-xl mx-auto md:mx-0 bg-[#0A0F1C]/90 backdrop-blur-xl rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl relative z-20 group/form">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-theme rounded-b-full shadow-[0_0_30px_rgba(var(--color-primary-rgb),1)] transition-all group-hover/form:w-full"/>
      <h3 className="text-xl font-black text-white mb-1 text-center uppercase tracking-widest flex flex-col items-center gap-2">
        <Shield className="w-5 h-5 text-theme opacity-80"/>Contato com a Redação
      </h3>
      <p className="text-slate-500 text-xs text-center mb-7">Preencha os dados abaixo e entraremos em contato em breve.</p>

      {(status==='confirming'||status==='sending')?(
        <div className="space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl text-center">
            <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-2"/>
            <p className="text-amber-400 font-bold text-sm">Confirme seus dados antes de enviar</p>
          </div>
          <div className="space-y-3 bg-black/40 p-5 rounded-2xl border border-white/5 text-sm">
            <div><span className="text-slate-500 text-xs uppercase font-bold">Nome: </span><span className="text-white">{name}</span></div>
            <div className="h-px bg-white/5"/>
            <div><span className="text-slate-500 text-xs uppercase font-bold">E-mail: </span><span className="text-theme">{email}</span></div>
            <div className="h-px bg-white/5"/>
            <div><span className="text-slate-500 text-xs uppercase font-bold">WhatsApp: </span><span className="text-green-400">+55 {formatPhone(whatsapp)}</span></div>
          </div>
          <div className="flex gap-4">
            <button onClick={()=>setStatus('idle')} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm transition-all">Corrigir</button>
            <button onClick={handleSubmit} disabled={status==='sending'} className="flex-1 py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 transition-all">
              {status==='sending'?<Loader2 className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}Confirmar Envio
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6" noValidate>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-theme transition-colors"/>
                <input type="text" value={name} onChange={handleNameChange} maxLength={45} placeholder="Seu nome"
                  className={`w-full bg-white/[0.03] border rounded-2xl pl-11 pr-11 py-4 text-white outline-none focus:bg-white/[0.08] transition-all placeholder:text-slate-600 ${fieldWarning.name?'border-red-500/60':isNameValid?'border-green-500/40':'border-white/10 focus:border-theme/50'}`}/>
                {isNameValid&&<CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-in fade-in zoom-in"/>}
              </div>
              {fieldWarning.name&&<p className="text-red-400 text-[10px] font-bold mt-1.5 flex items-center gap-1 uppercase tracking-tighter"><AlertCircle className="w-3 h-3 shrink-0"/>{fieldWarning.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-theme transition-colors"/>
                <input type="email" value={email} onChange={handleEmailChange} onBlur={handleEmailBlur} placeholder="nome@empresa.com"
                  className={`w-full bg-white/[0.03] border rounded-2xl pl-11 pr-11 py-4 text-white outline-none focus:bg-white/[0.08] transition-all placeholder:text-slate-600 ${fieldWarning.email?'border-red-500/60':isEmailValid?'border-green-500/40':'border-white/10 focus:border-theme/50'}`}/>
                {isEmailValid&&<CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-in fade-in zoom-in"/>}
              </div>
              {fieldWarning.email&&<p className="text-red-400 text-[10px] font-bold mt-1.5 flex items-center gap-1 uppercase tracking-tighter"><AlertCircle className="w-3 h-3 shrink-0"/>{fieldWarning.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">WhatsApp</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-theme transition-colors"/>
                <input type="tel" value={whatsapp} onChange={handleWhatsappChange} onBlur={handleWhatsappBlur} placeholder="DDD + número"
                  className={`w-full bg-white/[0.03] border rounded-2xl pl-11 pr-11 py-4 text-white outline-none focus:bg-white/[0.08] transition-all placeholder:text-slate-600 font-mono ${fieldWarning.phone?'border-red-500/60':isPhoneValid?'border-green-500/40':'border-white/10 focus:border-theme/50'}`}/>
                {isPhoneValid&&<div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 animate-in fade-in zoom-in"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/><CheckCircle2 className="w-4 h-4 text-green-500"/></div>}
              </div>
              {fieldWarning.phone
                ?<p className="text-red-400 text-[10px] font-bold mt-1.5 flex items-center gap-1 uppercase tracking-tighter"><AlertCircle className="w-3 h-3 shrink-0"/>{fieldWarning.phone}</p>
                :isPhoneValid&&<p className="text-green-500 text-[10px] font-bold mt-1.5 uppercase tracking-tighter">✔ Conexão Verificada</p>
              }
            </div>
          </div>

          {errorMsg&&<div className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>{errorMsg}</div>}

          <button type="submit" disabled={!isNameValid||!isEmailValid||!isPhoneValid}
            className="w-full bg-theme hover:brightness-110 text-white rounded-2xl py-4 font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group/send disabled:opacity-20 disabled:cursor-not-allowed shadow-theme relative overflow-hidden active:scale-[0.98]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
            Iniciar Conexão
          </button>
        </form>
      )}
    </div>
  );
};

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────── */
export default function PresentationPage() {
  const { user, profile } = useAuth();
  const { settings } = useSystem();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [content, setContent] = useState<ContentState>(INITIAL_CONTENT);
  const [backupContent, setBackupContent] = useState<ContentState | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<{section: string, key: string, index?: number} | null>(null);
  
  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await (supabase as any)
          .from('profiles')
          .select('profile_content')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data?.profile_content) {
          const saved = data.profile_content as unknown as ContentState;
          setContent(prev => ({
            ...prev,
            ...saved,
            // Garantir que o layout sempre inclua 'contact'
            layout: saved.layout?.includes('contact')
              ? saved.layout
              : [...(saved.layout || prev.layout), 'contact'],
            // Merge de sub-objetos para não perder campos novos
            style: {
              ...prev.style,
              ...(saved.style || {}),
              fontSize: saved.style?.fontSize || prev.style.fontSize,
              fontColor: saved.style?.fontColor || prev.style.fontColor,
              effects: { ...prev.style.effects, ...((saved.style || {}).effects || {}) }
            },
            navbar: { ...prev.navbar, ...(saved.navbar || {}) },
            contact: { ...prev.contact, ...(saved.contact || {}) },
            // Preservar social links e novos campos
            bio: saved.bio ? {
              ...prev.bio,
              ...saved.bio,
              social: Array.isArray(saved.bio.social) && saved.bio.social.length > 0
                ? saved.bio.social
                : prev.bio.social,
              commercialWhatsapp: saved.bio.commercialWhatsapp || prev.bio.commercialWhatsapp,
              professionalEmail: saved.bio.professionalEmail || prev.bio.professionalEmail,
              region: saved.bio.region || prev.bio.region
            } : prev.bio,
          }));
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const isOwner = profile?.role === 'dev_master' || profile?.role === 'admin';

  // Helpers de Atualização de Estado
  const updateStyle = (key: keyof ContentState['style'], value: string) => 
    setContent(c => ({...c, style: {...c.style, [key]: value}}));
    
  const updateEffects = (key: keyof ContentState['style']['effects'], value: boolean | string) => 
    setContent(c => ({...c, style: {...c.style, effects: {...c.style.effects, [key]: value}}}));
    
  function updateSection<K extends keyof ContentState>(section: K, key: string, value: any) {
    setContent(c => ({...c, [section]: {...(c[section] as any), [key]: value}}));
  }
    
  const toggleVisibility = (section: keyof ContentState) => {
    const s = content[section] as any;
    if (s && 'visible' in s) {
      updateSection(section, 'visible', !s.visible);
    }
  };

  // Mover Seções (Layout)
  const moveLayoutSection = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...content.layout];
    if (direction === 'up' && index > 0) {
      [newLayout[index], newLayout[index - 1]] = [newLayout[index - 1], newLayout[index]];
    } else if (direction === 'down' && index < newLayout.length - 1) {
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
    }
    setContent(c => ({...c, layout: newLayout}));
  };

  // Image Upload Logic
  const handleUploadClick = (section: string, key: string, index?: number) => {
    setUploadingFor({ section, key, index });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingFor || !user) return;

    try {
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${uploadingFor.section}_${uploadingFor.key}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      if (uploadingFor.index !== undefined) {
        // Handle array items if needed (future proofing)
      } else {
        updateSection(uploadingFor.section as any, uploadingFor.key, publicUrl);
      }

      toast({ title: "Imagem enviada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro no upload: " + err.message });
    } finally {
      setSaving(false);
      setUploadingFor(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          profile_content: content as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      toast({ title: "Alterações Salvas com Sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar: " + err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  };
  const primaryRgb = hexToRgb(primary) || '59, 130, 246';

  // Componente de Texto Editável Transparente
  interface ContentEditableProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    tag?: React.ElementType | string;
    multiline?: boolean;
  }

  const ContentEditable: React.FC<ContentEditableProps> = ({ value, onChange, className = "", tag: Tag = "div", multiline = false }) => {
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
  interface SectionControlProps {
    section: keyof ContentState;
    index: number;
  }

  const SectionControl: React.FC<SectionControlProps> = ({ section, index }) => {
    if (!isEditing) return null;
    const isVisible = (content[section] as any).visible;
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
  const renderSection = (sectionId: string, index: number) => {
    const sectionData = content[sectionId as keyof ContentState] as any;
    const isHidden = sectionData && 'visible' in sectionData ? !sectionData.visible : false;
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
                <a href={content.hero.ctaLink} className="bg-gradient-to-r from-primary to-primary/80 text-white shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.6)] hover:shadow-[0_0_60px_rgba(var(--color-primary-rgb),0.9)] px-10 py-5 rounded-lg text-lg font-black uppercase tracking-wide transition-all transform hover:-translate-y-1 w-full sm:w-auto relative group/cta flex justify-center text-center border-b-4 border-black/20">
                  {content.hero.ctaText}
                </a>
                {isEditing && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#131825]/95 backdrop-blur-xl border border-white/20 p-2 rounded-xl flex items-center gap-3 shadow-2xl z-50 w-max pointer-events-auto">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-theme uppercase tracking-tighter ml-1">Configurar Link do Botão</span>
                      <div className="flex items-center gap-2">
                        <input type="text" value={content.hero.ctaText} onChange={e => updateSection('hero', 'ctaText', e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none w-40 focus:border-theme/50" placeholder="Texto" />
                        <div className="w-px h-6 bg-white/10" />
                        <div className="relative">
                            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                            <input type="text" value={content.hero.ctaLink} onChange={e => updateSection('hero', 'ctaLink', e.target.value)} className="bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none w-48 focus:border-theme/50" placeholder="URL Destino" />
                        </div>
                      </div>
                    </div>
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
                    <div className="edit-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => handleUploadClick('hero', 'avatarUrl')}>
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
                    <div className="edit-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity cursor-pointer backdrop-blur-sm z-20" onClick={() => handleUploadClick('learning', 'mediaUrl')}>
                      <Edit3 className="w-10 h-10 text-white mb-2" />
                      <span className="text-xs font-bold uppercase text-white tracking-widest">Alterar Mídia</span>
                    </div>
                  )}
                 </div>
              </div>
              <div className="flex-1 space-y-8">
                <ContentEditable tag="h2" multiline value={content.learning.title} onChange={v => updateSection('learning', 'title', v)} className="text-3xl md:text-4xl font-black text-white" />
                <div className="space-y-0 relative border-l-2 border-white/10 ml-3 py-2">
                  {content.learning.items.map((item, idx) => (
                    <div key={idx} className="relative pl-10 py-5 group/item flex items-center">
                      {/* Ponto da linha do tempo */}
                      <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-theme rounded-full shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.6)] border-[3px] border-[#0B101E] group-hover/item:scale-125 transition-transform duration-300 z-10" />
                      
                      <div className="flex-1 bg-[#131825]/50 backdrop-blur-md rounded-2xl border border-white/5 p-5 group-hover/item:border-theme/30 group-hover/item:bg-[#131825] transition-all cursor-text relative shadow-lg">
                        <div className="text-theme/50 font-black text-[10px] mb-2 uppercase tracking-widest">Etapa {idx + 1}</div>
                        <ContentEditable tag="p" multiline value={item} onChange={v => { const newItems = [...content.learning.items]; newItems[idx] = v; updateSection('learning', 'items', newItems); }} className="text-slate-300 font-medium text-base md:text-lg leading-snug w-full" />
                      </div>

                      {isEditing && (
                        <button onClick={() => { const n = content.learning.items.filter((_,i)=>i!==idx); updateSection('learning', 'items', n); }} className="text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-3 ml-2"><Trash2 className="w-5 h-5" /></button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => updateSection('learning', 'items', [...content.learning.items, "Nova Etapa da Linha do Tempo..."])} className="text-theme font-bold text-sm uppercase flex items-center gap-2 mt-8 ml-10 hover:bg-theme/10 px-4 py-2 rounded-lg border border-dashed border-theme/50 transition-colors w-[calc(100%-2.5rem)] justify-center"><Plus className="w-4 h-4"/> Adicionar Etapa</button>
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
            <Reorder.Group 
              axis="x" 
              values={content.benefits.items} 
              onReorder={v => updateSection('benefits', 'items', v)}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
            >
              {content.benefits.items.map((item, idx) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                  drag={isEditing ? "x" : false}
                  className={`border border-[#1F2937] hover:border-theme/50 rounded-xl p-8 transition-all duration-300 relative group/card ${effects.glassmorphism ? 'glass-card' : 'bg-[#111623]'} ${effects.shadowIntensity === 'glow' ? 'hover-shadow-theme' : effects.shadowIntensity === 'normal' ? 'shadow-lg' : ''}`}
                >
                  <div className="w-14 h-14 bg-theme opacity-10 rounded-lg absolute top-8 left-8" />
                  
                  {isEditing && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-white/5 rounded border border-white/10">
                      <GripVertical className="w-3 h-3 text-slate-500" />
                    </div>
                  )}

                  <div className={`relative z-10 w-14 h-14 flex items-center justify-center mb-6 text-theme ${isEditing ? 'cursor-pointer hover:scale-110 transition-transform bg-black/40 rounded-lg border border-dashed border-theme' : ''}`}>
                    {getIcon(item.icon, { className: "w-8 h-8" })}
                    {isEditing && (
                       <select value={item.icon} onChange={e => { const n = [...content.benefits.items]; n[idx].icon = e.target.value; updateSection('benefits', 'items', n); }} className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#131825] border border-white/20 rounded px-1 py-1 text-[10px] text-white outline-none opacity-0 group-hover/card:opacity-100 transition-opacity min-w-[100px] z-50">
                         {Object.keys(ICON_MAP).map(k => <option key={k} value={k} className="bg-slate-900">{k}</option>)}
                       </select>
                    )}
                  </div>
                  <ContentEditable tag="h3" value={item.title} onChange={v => { const n = [...content.benefits.items]; n[idx].title = v; updateSection('benefits', 'items', n); }} className="text-xl font-bold text-white mb-4 leading-tight"/>
                  <ContentEditable tag="p" multiline value={item.desc} onChange={v => { const n = [...content.benefits.items]; n[idx].desc = v; updateSection('benefits', 'items', n); }} className="text-slate-400 text-sm leading-relaxed"/>
                  <div className="w-full h-1 bg-theme-gradient mt-6 transform origin-left scale-x-0 group-hover/card:scale-x-100 transition-transform duration-500" />
                  {isEditing && (
                    <button onClick={() => { const n = content.benefits.items.filter(i=>i.id!==item.id); updateSection('benefits', 'items', n); }} className="absolute top-2 right-2 text-red-500 bg-red-500/10 p-2 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  )}
                </Reorder.Item>
              ))}
              {isEditing && (
                <div onClick={() => updateSection('benefits', 'items', [...content.benefits.items, { id: Date.now(), icon: "Star", title: "Novo Benefício", desc: "Descrição..." }])} className="border-2 border-dashed border-white/10 hover:border-theme/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all min-h-[250px] text-slate-500 hover:text-theme"><Plus className="w-12 h-12 mb-4" /><span className="font-bold uppercase tracking-widest text-xs">Adicionar Card</span></div>
              )}
            </Reorder.Group>
          </section>
        );

      case 'modules':
        return (
          <section key="modules" className={`${wrapperClass} max-w-7xl mx-auto px-6 py-12 space-y-12 relative`}>
            <SectionControl section="modules" index={index} />
            <div className="text-left">
              <ContentEditable tag="h2" multiline value={content.modules.title} onChange={v => updateSection('modules', 'title', v)} className="text-3xl font-black" />
            </div>
            <Reorder.Group 
              axis="x" 
              values={content.modules.items} 
              onReorder={v => updateSection('modules', 'items', v)}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {content.modules.items.map((item, idx) => (
                <Reorder.Item 
                  key={item.id} 
                  value={item}
                  drag={isEditing ? "x" : false}
                  className={`relative rounded-2xl overflow-hidden group/card aspect-[3/4] flex flex-col items-center justify-end p-6 text-center shadow-lg ${effects.glassmorphism ? 'glass-card' : 'bg-[#111623]'} ${effects.shadowIntensity === 'glow' ? 'hover-shadow-theme' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080C16] via-[#080C16]/80 to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-0 opacity-40 group-hover/card:opacity-60 group-hover/card:scale-110 transition-all duration-700 pointer-events-none" style={{ background: `linear-gradient(to bottom right, rgba(${primaryRgb}, 0.5), #080C16)` }} />
                  
                  {isEditing && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 bg-white/10 rounded-xl border border-white/20 backdrop-blur-md">
                      <GripVertical className="w-4 h-4 text-white/50" />
                    </div>
                  )}

                  <div className={`relative z-20 w-24 h-24 mb-auto mt-12 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] text-theme ${isEditing ? 'cursor-pointer hover:scale-105 border-2 border-dashed border-theme' : ''}`}>
                    {getIcon(item.icon, { className: "w-12 h-12" })}
                    {isEditing && (
                       <select value={item.icon} onChange={e => { const n = [...content.modules.items]; n[idx].icon = e.target.value; updateSection('modules', 'items', n); }} className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#131825] border border-white/20 rounded px-1 py-1 text-[10px] text-white outline-none opacity-0 group-hover/card:opacity-100 transition-opacity min-w-[100px] z-50 cursor-pointer">
                         {Object.keys(ICON_MAP).map(k => <option key={k} value={k} className="bg-slate-900">{k}</option>)}
                       </select>
                    )}
                  </div>
                  <div className="relative z-20 mt-auto w-full">
                    <div className="w-full bg-white/10 rounded-full px-3 py-1 mb-4 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">Módulo {idx + 1}</div>
                    <ContentEditable tag="h3" value={item.title} onChange={v => { const n = [...content.modules.items]; n[idx].title = v; updateSection('modules', 'items', n); }} className="text-xl font-black text-white leading-tight mb-2 uppercase tracking-wide"/>
                    <ContentEditable tag="p" value={item.subtitle} onChange={v => { const n = [...content.modules.items]; n[idx].subtitle = v; updateSection('modules', 'items', n); }} className="text-theme font-medium text-sm"/>
                  </div>
                  {isEditing && (
                    <button onClick={() => { const n = content.modules.items.filter(i=>i.id!==item.id); updateSection('modules', 'items', n); }} className="absolute top-4 right-4 z-50 text-red-500 bg-red-500/20 p-2 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  )}
                </Reorder.Item>
              ))}
              {isEditing && (
                <div onClick={() => updateSection('modules', 'items', [...content.modules.items, { id: Date.now(), icon: "Cpu", title: "Novo Módulo", subtitle: "Tecnologia..." }])} className="relative rounded-2xl border-2 border-dashed border-white/10 hover:border-theme/50 aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all text-slate-500 hover:text-theme shadow-md"><Plus className="w-12 h-12 mb-4" /><span className="font-bold uppercase tracking-widest text-xs">Adicionar Módulo</span></div>
              )}
            </Reorder.Group>
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
                  <ContentEditable tag="span" value={content.bio.name} onChange={v => updateSection('bio', 'name', v)} className="text-theme text-glow-theme font-['Dancing_Script'] tracking-wider drop-shadow-2xl" />
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

                {/* Novos Campos */}
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-theme" />
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-bold">WhatsApp / Comercial</span>
                      <ContentEditable tag="div" value={content.bio.commercialWhatsapp} onChange={v => updateSection('bio', 'commercialWhatsapp', v)} className="text-white font-medium" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-theme" />
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-bold">E-mail Profissional</span>
                      <ContentEditable tag="div" value={content.bio.professionalEmail} onChange={v => updateSection('bio', 'professionalEmail', v)} className="text-white font-medium" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-theme" />
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-bold">Região de Atuação</span>
                      <ContentEditable tag="div" value={content.bio.region} onChange={v => updateSection('bio', 'region', v)} className="text-white font-medium" />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <span className="text-slate-500 text-xs uppercase font-bold mb-4 block">Siga nas Redes Sociais</span>
                  <div className="flex flex-wrap items-center gap-4">
                    {content.bio.social.map((link) => (
                    <div key={link.id} className="relative group/social">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className={`text-slate-400 hover:text-theme transition-colors block ${isEditing ? 'pointer-events-none' : ''}`}>{getSocialIcon(link.platform, { className: "w-8 h-8" })}</a>
                      {isEditing && (
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-[#131825]/95 backdrop-blur-xl border border-white/20 p-3 rounded-xl flex flex-col items-start gap-2 shadow-2xl z-20 opacity-0 group-hover/social:opacity-100 transition-all scale-95 group-hover/social:scale-100 w-52 pointer-events-auto">
                          <span className="text-[10px] font-black text-theme uppercase tracking-tighter">Editar Link Social</span>
                          <input type="text" value={link.platform} onChange={e => { const n = [...content.bio.social]; const i = n.findIndex(x=>x.id===link.id); n[i].platform = e.target.value; updateSection('bio', 'social', n); }} className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none w-full focus:border-theme/40" placeholder="Ex: instagram, linkedin, github" />
                          <div className="flex w-full gap-2 mt-1">
                            <input type="text" value={link.url} onChange={e => { const n = [...content.bio.social]; const i = n.findIndex(x=>x.id===link.id); n[i].url = e.target.value; updateSection('bio', 'social', n); }} className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none flex-1 focus:border-theme/40" placeholder="https://..." />
                            <button onClick={() => { const n = content.bio.social.filter(x=>x.id!==link.id); updateSection('bio', 'social', n); }} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg px-2.5 py-1.5 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                    {isEditing && (
                      <button onClick={() => updateSection('bio', 'social', [...content.bio.social, { id: Date.now(), platform: 'globe', url: '#' }])} className="w-8 h-8 rounded-full border border-dashed border-slate-500 flex items-center justify-center text-slate-500 hover:text-white hover:border-white transition-colors"><Plus className="w-4 h-4"/></button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-md flex justify-center edit-hover-group">
                <div className={`w-full aspect-[3/4] relative rounded-xl overflow-hidden ${effects.shadowIntensity === 'glow' ? 'shadow-theme' : ''}`}>
                   <img src={content.bio.avatarUrl} alt={content.bio.name} className="absolute inset-0 w-full h-full object-cover object-center opacity-80 mix-blend-luminosity" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#080C16] via-transparent to-transparent pointer-events-none" />
                   {isEditing && (
                    <div className="edit-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity cursor-pointer backdrop-blur-sm z-20" onClick={() => handleUploadClick('bio', 'avatarUrl')}>
                      <Camera className="w-10 h-10 text-white mb-2" />
                      <span className="text-xs font-bold uppercase text-white tracking-widest">Alterar Foto</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key="contact" id="contact" className={`${wrapperClass} py-24 px-6 relative overflow-hidden bg-[#0A0F1C]`}>
            <SectionControl section="contact" index={index} />

            {/* Fundo decorativo */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-theme/40 to-transparent" />
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 50%, rgba(${primaryRgb}, 0.1) 0%, transparent 60%)` }} />
              <div className="absolute right-0 top-0 bottom-0 w-1/2" style={{ background: `radial-gradient(ellipse at 70% 50%, rgba(${primaryRgb}, 0.05) 0%, transparent 70%)` }} />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
              <div className="grid md:grid-cols-2 gap-16 items-start">

                {/* Coluna Esquerda: Texto + Info */}
                <div className="space-y-10">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-theme/10 border border-theme/30 rounded-full px-4 py-1.5 text-xs font-black text-theme uppercase tracking-widest mb-6">
                      <span className="w-1.5 h-1.5 rounded-full bg-theme animate-pulse"/> 
                      <ContentEditable value={content.contact.badgeText} onChange={v => updateSection('contact', 'badgeText', v)} />
                    </div>
                    <ContentEditable tag="h2" value={content.contact.title} onChange={v => updateSection('contact', 'title', v)} className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight" />
                    <ContentEditable tag="p" value={content.contact.subtitle} onChange={v => updateSection('contact', 'subtitle', v)} className="text-slate-400 text-lg leading-relaxed" />
                  </div>

                  {/* Cards de info de contato */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className={`flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] ${effects.glassmorphism ? 'backdrop-blur-sm' : ''} hover:border-theme/30 transition-colors`}>
                      <div className="w-12 h-12 rounded-xl bg-theme/15 border border-theme/20 flex items-center justify-center shrink-0 shadow-lg">
                        <Phone className="w-5 h-5 text-theme" />
                      </div>
                      <div>
                        <ContentEditable tag="p" value={content.contact.whatsappLabel} onChange={v => updateSection('contact', 'whatsappLabel', v)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest" />
                        <ContentEditable tag="p" value={content.bio.commercialWhatsapp} onChange={v => updateSection('bio', 'commercialWhatsapp', v)} className="text-white font-semibold text-sm outline-none" />
                      </div>
                    </div>
                    <div className={`flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] ${effects.glassmorphism ? 'backdrop-blur-sm' : ''} hover:border-theme/30 transition-colors`}>
                      <div className="w-12 h-12 rounded-xl bg-theme/15 border border-theme/20 flex items-center justify-center shrink-0 shadow-lg">
                        <Mail className="w-5 h-5 text-theme" />
                      </div>
                      <div>
                        <ContentEditable tag="p" value={content.contact.emailLabel} onChange={v => updateSection('contact', 'emailLabel', v)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest" />
                        <ContentEditable tag="p" value={content.bio.professionalEmail} onChange={v => updateSection('bio', 'professionalEmail', v)} className="text-white font-semibold text-sm outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] ${effects.glassmorphism ? 'backdrop-blur-sm' : ''} hover:border-theme/30 transition-colors max-w-sm`}>
                    <div className="w-12 h-12 rounded-xl bg-theme/15 border border-theme/20 flex items-center justify-center shrink-0 shadow-lg">
                      <Globe className="w-5 h-5 text-theme" />
                    </div>
                    <div>
                      <ContentEditable tag="p" value={content.contact.regionLabel} onChange={v => updateSection('contact', 'regionLabel', v)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest" />
                      <ContentEditable tag="p" value={content.bio.region} onChange={v => updateSection('bio', 'region', v)} className="text-white font-semibold text-sm outline-none" />
                    </div>
                  </div>

                  {/* Divisor com redes sociais */}
                  <div>
                    <div className="flex items-center justify-between mb-4 max-w-sm">
                      <ContentEditable tag="p" value={content.contact.socialTitle} onChange={v => updateSection('contact', 'socialTitle', v)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest" />
                      {isEditing && <span className="text-[9px] text-slate-600 font-bold uppercase italic">* Editar na seção BIO acima</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {content.bio.social.map(link => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 hover:border-theme hover:bg-theme/10 flex items-center justify-center text-white/50 hover:text-theme transition-all group/social-link shadow-lg">
                          <OfficialIcon platform={link.platform} color="currentColor" className="w-6 h-6" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Formulário */}
                <div className="relative">
                   <div className="absolute -inset-4 bg-theme/5 blur-3xl rounded-full opacity-30 pointer-events-none" />
                   <div className="relative bg-[#131825]/40 backdrop-blur-md border border-white/10 rounded-3xl p-1 shadow-2xl overflow-hidden hover:border-theme/30 transition-colors">
                      <ContactForm />
                   </div>
                </div>
              </div>
            </div>
          </section>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen text-slate-50 relative overflow-x-hidden" style={{ backgroundColor: content.style.bgColor, fontFamily: content.style.fontFamily, fontSize: content.style.fontSize, color: content.style.fontColor }}>
      
      {/* Hidden File Input for Image Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Style Editor Panel */}
      {isEditing && (
        <div className="fixed top-20 right-6 z-[100] bg-[#131825]/95 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl w-80">
          <h3 className="text-sm font-black text-theme uppercase tracking-wider mb-4">Configurações de Estilo</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Fonte</label>
              <select value={content.style.fontFamily} onChange={e => updateStyle('fontFamily', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-theme">
                {FONTS.map(f => <option key={f.value} value={f.value} className="bg-slate-900">{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Tamanho da Fonte (px)</label>
              <input type="number" value={parseInt(content.style.fontSize)} onChange={e => updateStyle('fontSize', e.target.value + 'px')} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:border-theme" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Cor da Fonte</label>
              <input type="color" value={content.style.fontColor} onChange={e => updateStyle('fontColor', e.target.value)} className="w-full h-10 bg-black/40 border border-white/10 rounded cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* ── ESTILOS GLOBAIS E INJEÇÃO DE CORES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Inter:wght@300;400;600;800;900&family=Space+Grotesk:wght@300;400;600;700&family=Playfair+Display:wght@400;700;900&display=swap');
        
        :root {
          --color-primary: ${primary};
          --color-primary-rgb: ${primaryRgb};
        }

        html { scroll-behavior: smooth; }
        #contact { scroll-margin-top: 80px; }
        
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
            <button onClick={() => { if(confirm('Isso resetará o conteúdo para o novo Mídia Kit Padrão. Continuar?')) { setContent(INITIAL_CONTENT); toast({title: "Mídia Kit Restaurado!"}); } }} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <History className="w-4 h-4"/> Restaurar Template Oficial
            </button>
            <button onClick={handleCancel} className="text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-transparent hover:border-red-500/30">
              <X className="w-4 h-4"/> Cancelar
            </button>
            <button onClick={() => setIsEditing(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
              <Eye className="w-4 h-4"/> Preview Mode
            </button>
            <button onClick={() => handleSave()} disabled={saving} className="bg-theme hover:opacity-80 text-white px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-theme">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} Salvar Página
            </button>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <nav className={`w-full z-50 transition-all duration-500 border-b border-white/5 bg-[#080C16]/80 backdrop-blur-md sticky top-0 ${isEditing ? 'translate-y-[100px] lg:translate-y-[60px]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          
          {/* Logo Customizável */}
          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 group/logo relative drop-shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.5)] transition-transform hover:scale-105 z-50">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-9 h-9 md:w-11 md:h-11 object-contain shrink-0 rounded-xl shadow-xl" />
            ) : (
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-primary to-accent border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-black font-black text-xl">V</span>
              </div>
            )}
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent font-display font-black tracking-tight text-2xl md:text-3xl whitespace-nowrap">
               {settings?.platform_name || "Vitória Net"}
            </div>
          </Link>

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
        <footer className="w-full border-t border-white/[0.05] bg-[#050810] py-12 px-6 flex flex-col relative overflow-hidden mt-12">
           <style>{`
             @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
             
             .signature-watermark {
               font-family: 'Dancing Script', cursive;
               font-size: 5.5rem;
               color: rgba(255, 255, 255, 0.4);
               transform: rotate(-5deg);
               opacity: 0.4;
             }
           `}</style>
           
           <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 relative z-10">
              {/* Linha Superior (Centro) */}
              <div className="flex justify-center text-xs md:text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                 <span className="flex items-center gap-2">
                   DESENVOLVIDO COM <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> POR BRUNO FLACON
                 </span>
              </div>
              
              {/* Linha do Meio (Datas dos Projetos) Centro */}
              <div className="flex items-center justify-center gap-3 md:gap-5 text-[9px] md:text-[10px] font-mono text-slate-600 font-bold tracking-widest flex-wrap uppercase">
                 <span>Ago/2012 Web Rádio Vitória</span>
                 <span className="w-1.5 h-1.5 bg-theme/30 rotate-45" />
                 <span>Out/2025 Social Hub</span>
                 <span className="w-1.5 h-1.5 bg-theme/30 rotate-45" />
                 <span>© Jan/2026 Vitória Net</span>
              </div>

              {/* Linha Inferior (Links Editáveis à Esquerda e Copyright removido) */}
              <div className="flex flex-col md:flex-row items-center justify-start text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mt-6 md:mt-8">
                <div className="flex flex-wrap items-center gap-4 md:gap-6 border-t border-white/10 pt-3 md:pt-4">
                  {content.footer.links.map((link, idx) => (
                    <div key={link.id} className="relative group/link flex items-center">
                      <a href="#contact" className={`hover:text-theme cursor-pointer transition-colors ${isEditing ? 'pointer-events-none' : ''}`}>
                        <ContentEditable tag="span" value={link.label} onChange={v => { const n = [...content.footer.links]; n[idx].label = v; updateSection('footer', 'links', n); }} />
                      </a>
                      {isEditing && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#131825] border border-white/10 p-1.5 rounded-lg flex items-center gap-1 shadow-xl z-50 opacity-0 group-hover/link:opacity-100 transition-opacity pointer-events-auto min-w-[200px]">
                           <input type="text" value={link.url} onChange={e => { const n = [...content.footer.links]; n[idx].url = e.target.value; updateSection('footer', 'links', n); }} className="bg-black/50 border border-white/20 rounded px-2 py-1 text-[10px] text-white outline-none flex-1" placeholder="URL Destino / Link" />
                           <button onClick={() => { const n = content.footer.links.filter(x=>x.id!==link.id); updateSection('footer', 'links', n); }} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white p-1 rounded transition-colors"><Trash2 className="w-3 h-3"/></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => updateSection('footer', 'links', [...content.footer.links, { id: Date.now(), label: "Novo Link", url: "#" }])} className="text-theme flex items-center gap-1 hover:bg-theme/10 px-2 py-1 rounded border border-dashed border-theme/50"><Plus className="w-3 h-3"/> Add Link</button>
                  )}
                  {isEditing && isOwner && (
                    <Link to="/system-history" className="bg-theme/20 text-theme border border-theme/30 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-theme/30 transition-all font-black text-[10px] ml-4">
                      <History className="w-3 h-3" /> VER HISTÓRICO
                    </Link>
                  )}
                </div>
              </div>
           </div>

           {/* Marca d'água Assinatura Canto Direito Mais Destacada */}
           <div className="absolute right-4 bottom-4 md:right-8 md:bottom-2 pointer-events-none select-none z-0">
             <span className="signature-watermark text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] whitespace-nowrap">Bruno Flacon</span>
           </div>
        </footer>
      </main>
    </div>
  );
}