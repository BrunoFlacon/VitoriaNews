import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { SubscriberCapture } from '@/components/portal/SubscriberCapture';
import './PortalLanding.css';

export default function PortalLanding() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState({
    whatsapp: true,
    telegram: true,
    newsletter: true
  });

  const handleChannelToggle = (channel: 'whatsapp' | 'telegram') => {
    setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create metadata based on selected channels
      const preferredMessenger = channels.whatsapp ? 'whatsapp' : (channels.telegram ? 'telegram' : 'whatsapp');

      const { error } = await supabase.from('portal_subscribers' as any).insert([
        { 
          full_name: name, 
          email: email, 
          whatsapp: whatsapp, 
          tier: 'lead',
          metadata: { 
            channels: channels,
            preferred_messenger: preferredMessenger,
            source: 'pre_launch_landing'
          }
        }
      ]);

      if (error) throw error;

      // Save preference to localStorage
      localStorage.setItem('vitoria_messenger_pref', preferredMessenger);

      toast({ 
        title: "Pré-Cadastro Realizado!", 
        description: "Seu lugar está garantido. Redirecionando..." 
      });

      // Redirect to WhatsApp or Dashboard after a short delay
      setTimeout(() => {
        window.location.href = "https://whatsapp.com/channel/0029Va5QcmhISTkQc6Md6V3n";
      }, 1500);

    } catch (error: any) {
      toast({ 
        title: "Erro no cadastro", 
        description: error.message || "Tente novamente mais tarde.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-landing-root">
      <main className="portal-landing-main">
        <div className="portal-landing-container">
            
          {/* Cabeçalho */}
          <div className="brand-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 -2.5 69 69">
              <defs>
                <linearGradient id="vitoriaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="10%" stopColor="#6FA8FF"/>
                  <stop offset="100%" stopColor="#A27BFF"/>
                </linearGradient>
                <linearGradient id="premiumStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="50%" stopColor="#5C82FF"/>
                  <stop offset="100%" stopColor="#ffffff"/>
                </linearGradient>
                <filter id="premiumShadow" x="-15%" y="-9%" width="120%" height="140%">
                  <feDropShadow dx="1" dy="0.9" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.50"/>
                </filter>
              </defs>
              <circle cx="32" cy="32" r="32" fill="url(#vitoriaGrad)" stroke="url(#premiumStroke)" strokeWidth="0.8" filter="url(#premiumShadow)"/>
              <g fill="#010202">
                <path d="M45.9,26.4l5.2-5.2c-11.8-11.7-26.4-11.7-38.1,0l5.2,5.2C27.1,17.5,37,17.5,45.9,26.4L45.9,26.4z"/>
                <path d="M44.2,38.1L32,26l-12.1,12L7.7,26l-5.2,5.2l17.3,17.2l12.1-12l12.1,12l17.3-17.2L56.3,26L44.2,38.1z"/>
              </g>
            </svg>
            <h1>Web Rádio Vitória</h1>
          </div>
          <div className="pre-title">Um novo portal está chegando. Aguardem...</div>

          <div className="hero-and-form-wrapper">
            {/* Copywriting Atualizada */}
            <div className="hero-section">
              <h1 className="main-title">
                Vem aí, o renascimento do portal <strong>Web Rádio Vitória</strong> com novos formatos inéditos no jornalismo para Tupã e Região.
              </h1>
              <div className="highlight-features">
                <span className="feature-list-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Informação de Valor
                </span>
                <span className="feature-list-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                  Bastidores do Poder
                </span>
                <span className="feature-list-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Jornalismo de Verdade
                </span>
              </div>
              <p className="cta-text" style={{ textAlign: 'center', marginTop: '2rem' }}>Não fique de fora!</p>
            </div>

            {/* Formulário Premium Ultramoderno */}
            <div className="card-wrapper">
            <div className="card">
              <div className="card-header">
                <h3>Faça seu Pré-Cadastro para o lançamento!</h3>
              </div>
              
              <form className="form-group" onSubmit={handleSubmit}>
                <input 
                  type="text" 
                  placeholder="Seu nome completo" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
                <input 
                  type="email" 
                  placeholder="Seu melhor e-mail" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
                <input 
                  type="tel" 
                  placeholder="Celular / WhatsApp (com DDD)" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required 
                />
                
                <div className="channel-selectors">
                  {/* WhatsApp */}
                  <label className="channel-option" onClick={() => handleChannelToggle('whatsapp')}>
                    <div className="channel-label">
                      <svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                      Alertas no WhatsApp
                    </div>
                    <input type="checkbox" checked={channels.whatsapp} readOnly />
                  </label>

                  {/* Telegram */}
                  <label className="channel-option" onClick={() => handleChannelToggle('telegram')}>
                    <div className="channel-label">
                      <svg viewBox="0 0 24 24" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Alertas no Telegram
                    </div>
                    <input type="checkbox" checked={channels.telegram} readOnly />
                  </label>

                  {/* Email */}
                  <label className="channel-option" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                    <div className="channel-label" style={{ cursor: 'not-allowed' }}>
                      <svg viewBox="0 0 24 24" fill="#94a3b8"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                      Newsletter Diária (Incluso)
                    </div>
                    <input type="checkbox" checked={true} disabled />
                  </label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "PROCESSANDO..." : "GARANTIR MEU ACESSO"}
                </button>
              </form>
            </div>
          </div>
        </div>

          {/* Seção VIP */}
          <div className="vip-section">
            <div className="vip-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Área Exclusiva Para Assinantes
            </div>
            <h2>CONTEÚDO EXCLUSIVO <span>VIP</span></h2>
            <p className="main-title" style={{ margin: '0 auto 2rem auto', maxWidth: '600px' }}>
             O jornalismo de verdade exige independência.</p>
             <p className="main-title" style={{ margin: '0 auto 1rem auto', maxWidth: '800px' }}>
             Garanta o seu acesso antecipado aos nossos planos de assinatura exclusivos e
             Tenha acesso ilimitado às análises de notícias,
             Breaking News, Podcasts e Reportagens Exclusivas.</p>

            <div className="vip-price">Apenas R$ 22,00 / mês</div>
            
            <SubscriberCapture 
              planType="paid" 
              showTrigger={true} 
              triggerLabel="Assine Já!" 
              triggerClassName="btn-vip" 
              showFloating={false}
            />
          </div>

        </div>
      </main>

      {/* Rodapé Premium */}
      <footer className="site-footer">
        <div className="footer-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* Esquerda: Redes e Links Legais */}
          <div className="footer-left" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="social-links" style={{ justifyContent: 'flex-start', gap: '0.8rem' }}>
              <a href="https://facebook.com/webradiovitoria" target="_blank" rel="noreferrer" className="social-icon" aria-label="Facebook">
                <svg viewBox="0 0 320 512"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
              </a>
              <a href="https://instagram.com/webradiovitoriaa" target="_blank" rel="noreferrer" className="social-icon" aria-label="Instagram">
                <svg viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>
              </a>
              <a href="https://threads.com/webradiovitoriaa" target="_blank" rel="noreferrer" className="social-icon" aria-label="Threads">
                <svg viewBox="0 0 192 192"><path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.708C154.894 45.6981 159.199 54.5758 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.194473 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.0476C101.049 97.8663 102.994 97.7376 104.912 97.649C104.914 97.6492 104.916 97.6492 104.918 97.6493C105.212 97.6338 105.503 97.6198 105.792 97.6074C106.878 97.5615 107.943 97.5254 108.986 97.4988C108.689 116.143 106.586 129.043 98.4405 129.507Z"/></svg>
              </a>
              <a href="https://whatsapp.com/channel/0029Va5QcmhISTkQc6Md6V3n" target="_blank" rel="noreferrer" className="social-icon" aria-label="WhatsApp">
                <svg viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
              </a>
              <a href="https://www.tiktok.com/@webradiovitoria" target="_blank" rel="noreferrer" className="social-icon" aria-label="TikTok">
                <svg viewBox="0 0 448 512"><path d="M448 209.9a210.1 210.1 0 0 1 -122.8-39.3V349.4A162.6 162.6 0 1 1 185 188.3V278.2a74.6 74.6 0 1 0 52.2 71.2V0l88 0a121.2 121.2 0 0 0 1.9 22.2h0A122.2 122.2 0 0 0 381 102.4a121.4 121.4 0 0 0 67 20.1z"/></svg>
              </a>
              <a href="https://youtube.com/@webradiovitoria" target="_blank" rel="noreferrer" className="social-icon" aria-label="YouTube">
                <svg viewBox="0 0 576 512"><path d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zm-317.5 213.5V175.2l142.7 81.2-142.7 81.2z"/></svg>
              </a>
              <a href="https://x.com/webradi0vitoria" target="_blank" rel="noreferrer" className="social-icon" aria-label="X (Twitter)">
                <svg viewBox="0 0 512 512"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/></svg>
              </a>
            </div>
            
            {/* Links Legais (Política/Termos) */}
            <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link to="/privacy" className="hover:text-primary transition-colors text-slate-400 uppercase tracking-wider font-bold">Política de Privacidade</Link>
              <span className="text-slate-600">&amp;</span>
              <Link to="/terms" className="hover:text-primary transition-colors text-slate-400 uppercase tracking-wider font-bold">Termos de Uso</Link>
            </div>
          </div>

          {/* Direita: Direitos Autorais */}
          <div className="footer-right" style={{ display: 'flex', alignItems: 'flex-end', height: '100%', marginBottom: '0.2rem' }}>
            <div className="footer-copyright" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ color: '#ef4444' }}>❤️</span> Desde 2012 - <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-primary transition-colors font-bold text-white/80">Web Rádio Vitória</Link> &copy; 2026
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
