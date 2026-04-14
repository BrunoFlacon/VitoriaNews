import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

/**
 * TrackingProvider handles the automatic injection of marketing pixels
 * (Meta, Google, TikTok, X) based on IDs configured in the Dashboard.
 */
export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      // Use * to be resilient against partial migrations or different schemas
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('*')
        .eq('group', 'general')
        .maybeSingle();
      
      if (error) {
        console.error('[TrackingProvider] Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!settings) return;

    // 1. Meta Pixel
    if (settings.meta_pixel_id && !document.getElementById('meta-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'meta-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${settings.meta_pixel_id}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${settings.meta_pixel_id}&ev=PageView&noscript=1" />`;
      document.body.appendChild(noscript);
    }

    // 2. Google Analytics (G-TAG)
    if (settings.google_pixel_id && !document.getElementById('google-pixel-script')) {
      const scriptLink = document.createElement('script');
      scriptLink.async = true;
      scriptLink.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_pixel_id}`;
      document.head.appendChild(scriptLink);

      const script = document.createElement('script');
      script.id = 'google-pixel-script';
      script.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${settings.google_pixel_id}');
      `;
      document.head.appendChild(script);
    }

    // 3. TikTok Pixel
    if (settings.tiktok_pixel_id && !document.getElementById('tiktok-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'tiktok-pixel-script';
      script.innerHTML = `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","setCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${settings.tiktok_pixel_id}');
          ttq.page();
        }(window, document, 'ttq');
      `;
      document.head.appendChild(script);
    }

    // 4. Twitter (X) Pixel
    if (settings.x_pixel_id && !document.getElementById('x-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'x-pixel-script';
      script.innerHTML = `
        !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
        },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
        a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
        twq('config','${settings.x_pixel_id}');
      `;
      document.head.appendChild(script);
    }

  }, [settings]);

  return <>{children}</>;
};
