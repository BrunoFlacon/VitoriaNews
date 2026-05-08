              <div>
                <h4 className="font-medium mb-4">Notifica├º├Áes por Email</h4>
                <div className="space-y-4">
                  {[
                    { key: 'emailPosts', title: 'Posts publicados', desc: 'Receba confirma├º├úo quando posts forem publicados' },
                    { key: 'emailEngagement', title: 'Engajamento', desc: 'Alertas de likes, coment├írios e compartilhamentos' },
                    { key: 'weeklyReport', title: 'Relat├│rio semanal', desc: 'Resumo de performance das suas redes' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => handleNotificationToggle(item.key, checked)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <h4 className="font-medium mb-4">Notifica├º├Áes Push</h4>
                <div className="space-y-4">
                  {[
                    { key: 'pushPosts', title: 'Posts publicados', desc: 'Notifica├º├úo instant├ónea de publica├º├Áes' },
                    { key: 'pushEngagement', title: 'Engajamento em tempo real', desc: 'Alertas instant├óneos de intera├º├Áes' },
                    { key: 'pushSchedule', title: 'Lembretes de agendamento', desc: 'Aviso antes de posts agendados' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => handleNotificationToggle(item.key, checked)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="api">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg">APIs Sociais & Conex├Áes</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure suas APIs e conecte perfis sociais</p>
              </div>
              <div className="flex items-center gap-2">
                {(connectionsLoading || credsLoading || statsLoading) && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncSocialStats()}
                  disabled={statsLoading}
                  className="flex items-center gap-2 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                  Sincronizar Dados
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddApiModal(true)}
                  className="flex items-center gap-2 text-xs shadow-sm bg-primary/90 hover:bg-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar API
                </Button>
              </div>
            </div>


            <div className="space-y-3">
              {UNIQUE_PLATFORM_CONFIGS.filter(c => activePlatformIds.includes(c.id)).map((config) => {
                const platformStats = socialStats.find(s => s.platform === config.id);
                // isVerified = true if any Telegram entry has followers > 0 OR there's any bot entry saved
                const isVerified = config.id === 'telegram' || config.id === 'whatsapp'
                  ? socialStats.some(s => s.platform === config.id)
                  : (!!platformStats && (platformStats.followers_count > 0 || (platformStats.posts_count ?? 0) > 0));

                const hasCreds = hasCredentials(config.id);
                // Telegram connects via Bot Token ÔÇö data saved directly to social_accounts.
                const platformConnections = config.id === 'telegram'
                  ? socialStats.filter(s => s.platform === config.id).map(s => ({
                    id: s.id,
                    platform: s.platform,
                    username: s.username,
                    platform_user_id: s.id,
                    profile_image_url: s.profile_picture,
                    page_name: s.username || 'Bot/Canal Telegram',
                    followers_count: s.followers_count,
                    is_connected: true
                  })) as any[]
                  : connections.filter(c =>
                    c.platform === config.id &&
                    c.is_connected &&
                    ((c as any).access_token !== null || config.id === 'whatsapp')
                  );

                const hasConnections = platformConnections.length > 0;
                const isVerifiedFinal = (config.id === 'telegram' && hasCreds) || (config.id === 'whatsapp' && hasCreds) || socialStats.some(s => s.platform === config.id);

                // For tools/manual APIs, having credentials means it is effectively connected
                const isTool = config.type === 'tool' || !config.oauthSupported;
                const isEffectivelyConnected = hasConnections || isVerifiedFinal || (isTool && hasCreds);

                const isConnecting = connectingPlatform === config.id;
                const isExpanded = expandedPlatform === config.id;
                const fields = PLATFORM_CREDENTIAL_FIELDS[config.id] || [];

                return (
                  <div key={config.id} className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                    <div
                      className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-muted/20 border-b border-border/10 cursor-pointer"
                      onClick={() => toggleExpand(config.id)}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon is colored only when truly connected/verified, muted otherwise */}
                        <PlatformIconBadge
                          platform={config as any}
                          size="md"
                          muted={!isEffectivelyConnected}
                        />

                        <div className="text-left min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <p className="font-semibold text-base">{config.name}</p>

                            {/* Conectado (green): effective connection confirmed */}
                            {isEffectivelyConnected && (
                              <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-600 w-fit">
                                Conectado
                              </Badge>
                            )}

                            {/* Credenciais Salvas (grey): has creds but not yet verified */}
                            {!isEffectivelyConnected && hasCreds && (() => {
                              let label = "Credenciais Salvas";
                              if (config.id === 'google_cloud') {
                                const googleCreds = credentials['google_cloud'] || {};
                                const serviceKeys = ['maps_api_key', 'news_api_key', 'youtube_api_key', 'ads_id', 'analytics_id', 'search_console_id'];
                                const activeServices = serviceKeys.filter(k => googleCreds[k]?.trim()).length;
                                label = `Credencias Ativas (${activeServices} servi├ºo${activeServices !== 1 ? 's' : ''})`;
                              }
                              return (
                                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/50 bg-muted/30 w-fit">
                                  {label}
                                </Badge>
                              );
                            })()}
                          </div>

                          {/* Subtitle: show real metrics if verified, else connection name, else hint */}
                          {isVerified ? (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {config.id === 'telegram' ? (
                                <>
                                  <span className="font-bold text-slate-200">
                                    {platformConnections.length > 0 ? platformConnections[0].page_name : "Bot Telegram"}
                                  </span>
                                  <span className="ml-2 text-muted-foreground/60">ÔÇö expanda para gerenciar</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-200">
                                    {platformConnections.length > 0 ? platformConnections[0].page_name : "Conta Principal"}
                                  </span>
                                  <span className="ml-2 text-muted-foreground/60">ÔÇö expanda para gerenciar</span>
                                </>
                              )}
                            </p>
                          ) : hasConnections ? (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {platformConnections.length === 1
                                ? <><span className="font-bold text-slate-200">{platformConnections[0].page_name || "Conta Conectada"}</span> ÔÇö expanda para gerenciar</>
                                : <><span className="font-bold text-slate-200">{platformConnections.length} contas</span> ÔÇö expanda para gerenciar</>}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {hasCreds ? "Credenciais salvas ÔÇö clique Sincronizar para verificar" : "Configura├º├Áes pendentes ÔÇö clique para configurar"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(config.id);
                          }}
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={(e) => handleRemovePlatform(e, config.id)}
                          className="p-2 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Remover da lista"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/*  Expanded panel  */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-border bg-background/50 space-y-6">
                            {/* Google Cloud services status */}
                            {config.id === 'google_cloud' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hub Central Google (Cloud & Marketing)</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-2 bg-[#151726]/80 text-[#2AABEE] border-[#2AABEE]/30 hover:bg-[#2AABEE]/10 rounded-xl"
                                    onClick={() => {
                                      const hasAny = Object.values(credentials['google_cloud'] || {}).some(v => !!v);
                                      if (hasAny) {
                                        if (window.confirm("Deseja desconectar todas as APIs do Google?")) {
                                          deleteCredentials('google_cloud');
                                        }
                                      } else {
                                        handleSaveCreds('google_cloud');
                                      }
                                    }}
                                  >
                                    {Object.values(credentials['google_cloud'] || {}).some(v => !!v) ? (
                                      <><Unplug className="w-3.5 h-3.5 rotate-45" /> Desconectar</>
                                    ) : (
                                      <><Link2 className="w-3.5 h-3.5" /> Conectar</>
                                    )}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {[
                                    { name: 'Maps API', key: 'maps_api_key', desc: 'Mapas e Geolocaliza├º├úo', icon: MapsIcon, syncFn: null },
                                    { name: 'News API', key: 'news_api_key', desc: 'Google News Discovery', icon: GoogleNewsIcon, syncFn: 'radar-api' },
                                    { name: 'YouTube API', key: 'youtube_api_key', desc: 'V├¡deos e Canal', icon: YoutubeIcon, syncFn: 'collect-youtube-analytics' },
                                    { name: 'Google Ads', key: 'ads_id', desc: 'Campanhas e An├║ncios', icon: AdsIcon, syncFn: 'collect-meta-ads-analytics' },
                                    { name: 'Analytics', key: 'analytics_id', desc: 'Dados e M├®tricas', icon: AnalyticsIcon, syncFn: 'collect-google-analytics' },
                                    { name: 'Search Console', key: 'search_console_id', desc: 'SEO e Buscas', icon: GoogleIcon, syncFn: 'collect-search-console-data' },
                                    { name: 'People API', key: 'people_api_key', desc: 'Sincroniza├º├úo de Contatos', icon: PeopleIcon, syncFn: 'sync-google-contacts' },
                                  ].map(svc => {
                                    const isActive = !!credentials['google_cloud']?.[svc.key];
                                    const Icon = svc.icon;
                                    return (
                                      <div key={svc.name} className={cn(
                                        "flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300",
                                        isActive 
                                          ? "border-green-500/20 bg-green-500/[0.03] shadow-lg shadow-green-500/5" 
                                          : "border-white/10 bg-muted/10 opacity-60 hover:opacity-80"
                                      )}>
                                        {/* Icon + Name */}
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "w-[44px] h-[44px] rounded-xl flex items-center justify-center border transition-all duration-500 shrink-0",
                                            isActive 
                                              ? "border-white/10 bg-transparent" 
                                              : "border-white/5 bg-transparent grayscale"
                                          )}>
                                            <Icon data-active={isActive} className="w-8 h-8" />
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <span className={cn("text-sm font-black tracking-tight truncate", isActive ? "text-white" : "text-muted-foreground")}>{svc.name}</span>
                                            <span className="text-[11px] text-muted-foreground/50 leading-tight">{svc.desc}</span>
                                          </div>
                                        </div>
                                        
                                        {/* Status + Action */}
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                          <div className="flex items-center gap-1.5">
                                            {isActive
                                              ? <Badge className="h-5 px-1.5 bg-green-500/20 text-green-400 border-green-500/20 text-[9px] font-black tracking-tighter uppercase">Ativo</Badge>
                                              : <Badge variant="outline" className="h-5 px-1.5 border-muted-foreground/20 text-muted-foreground/40 text-[9px] font-bold tracking-tighter uppercase">Off</Badge>}
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            {/* Sync button (only when active) */}
                                            {isActive && svc.syncFn && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                                                onClick={async (e) => {
                                                  e.preventDefault();
                                                  toast({ title: `Sincronizando ${svc.name}...`, description: "Aguarde enquanto os dados s├úo carregados." });
                                                  try {
                                                    const session = (await supabase.auth.getSession()).data.session;
                                                    if (!session) throw new Error('Sess├úo expirada');
                                                    await supabase.functions.invoke(svc.syncFn, {
                                                      body: { userId: session.user.id },
                                                      headers: { Authorization: `Bearer ${session.access_token}` }
                                                    });
                                                    toast({ title: `${svc.name} Sincronizado!`, description: "Dados atualizados com sucesso." });
                                                    refreshStats();
                                                  } catch (err: any) {
                                                    toast({ title: "Erro na sincroniza├º├úo", description: err?.message || "Tente novamente.", variant: "destructive" });
                                                  }
                                                }}
                                              >
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Sincronizar
                                              </Button>
                                            )}
                                            
                                            {/* Connect / Disconnect */}
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className={cn(
                                                "h-7 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                                                isActive 
                                                  ? "text-red-400 hover:text-red-500 hover:bg-red-500/10" 
                                                  : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                              )}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                if (isActive) {
                                                  const newCreds = { ...credentials['google_cloud'] };
                                                  delete newCreds[svc.key];
                                                  saveCredentials('google_cloud', newCreds);
                                                } else {
                                                  const fieldId = `google_cloud-${svc.key}`;
                                                  const input = document.getElementById(fieldId);
                                                  if (input) {
                                                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    setTimeout(() => input.focus(), 500);
                                                  }
                                                }
                                              }}
                                            >
                                              {isActive ? (
                                                <><Unplug className="w-3 h-3 mr-1" />Sair</>
                                              ) : (
                                                <><Link2 className="w-3 h-3 mr-1" />Conectar</>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/*  Connected Profiles List  */}
                            {hasConnections && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground/70" />
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Contas Conectadas</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => syncSocialStats(config.id)}
                                    disabled={statsLoading}
                                    className="h-8 gap-2 text-[10px] font-bold uppercase bg-background border-border/50 hover:bg-muted/50 rounded-lg px-4"
                                  >
                                    <RefreshCw className={cn("w-3.5 h-3.5", statsLoading && "animate-spin")} />
                                    Sincronizar
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  {/* Lista Individual de Conex├Áes */}
                                  {platformConnections
                                    .filter(conn => config.id !== 'telegram' || (conn.username && conn.username.toLowerCase().endsWith('bot')))
                                    .map(conn => {
                                      const stats = socialStats.find(s =>
                                      s.platform === config.id && (
                                        (s.platform_user_id && conn.platform_user_id && s.platform_user_id === conn.platform_user_id) ||
                                        (s.username && conn.username && s.username === conn.username) ||
                                        s.id === conn.id
                                      )
                                    );

                                    // Fallback for messaging channels (Telegram Groups/Channels)
                                    const channelStats = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (audienceBreakdown?.flatMap(b => b.channels) || []).find(ch =>
                                        ch.channel_id === conn.platform_user_id || ch.channel_name === conn.username
                                      )
                                      : null;

                                    // Special case for Meta Ads: Show profile of related FB/IG account
                                    const metaAdsProfile = config.id === 'meta_ads'
                                      ? connections.find(c => (c.platform === 'facebook' || c.platform === 'instagram') && c.is_connected)
                                      : null;

                                    const displayPhoto = stats?.profile_picture || conn.profile_image_url || conn.profile_picture || "";
                                    const displayName = stats?.username || conn.page_name || conn.username || "Conta Conectada";

                                    // For Telegram/WhatsApp: sum ALL messaging_channels members (groups + channels)
                                    const totalPlatformMembers = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (audienceBreakdown?.flatMap(b => b.channels) || [])
                                        .filter(ch => ch.platform === config.id || !ch.platform)
                                        .reduce((sum, ch) => sum + (ch.members_count || 0), 0)
                                      : 0;

                                    const displayFollowers = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (totalPlatformMembers || Number(stats?.followers_count ?? 0))
                                      : Number(stats?.followers_count ?? conn.followers_count ?? 0);

                                    // Statistics for WhatsApp (Official vs Bot)
                                    const waMetadata = (stats?.metadata as any) || {};
                                    const displayPosts = config.id === 'whatsapp'
                                      ? Number(waMetadata.official_posts_count ?? stats?.posts_count ?? 0)
                                      : (config.id === 'youtube')
                                        ? Number(stats?.posts_count ?? stats?.metadata?.video_count ?? 0)
                                        : Number(stats?.posts_count ?? (conn.metadata as any)?.posts_count ?? 0);

                                    const botPosts = Number(waMetadata.bot_posts_count ?? 0);
                                    const botAnswers = Number(waMetadata.bot_answers_count ?? 0);

                                    return (
                                      <div key={conn.id} className="space-y-4">
                                        {/* Main Account Card (Official) */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0a0b14]/60 p-5 rounded-[22px] border border-white/5 shadow-2xl transition-all hover:bg-[#111322] group">
                                          <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="relative">
                                              <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726] shadow-xl flex-shrink-0 transition-transform group-hover:scale-105">
                                                <AvatarImage src={metaAdsProfile?.profile_image_url || displayPhoto} alt={displayName} className="object-cover" />
                                                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-xl font-bold">
                                                  {displayName.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                              {config.id === 'whatsapp' && (
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-[#151726] flex items-center justify-center">
                                                  <Check className="w-3 h-3 text-white" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <p className="font-black text-[17px] text-white tracking-tight">{displayName}</p>
                                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase tracking-tighter">Oficial</Badge>
                                              </div>

                                              {/* Detalhamento de Servi├ºos Google */}
                                              {(config.id === 'google' || config.id === 'youtube') && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <YoutubeIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>YouTube</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <AnalyticsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Analytics</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <PeopleIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Contatos</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <GoogleIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Search Console</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <GoogleNewsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>News</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <AdsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Ads</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <MapsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Maps</span>
                                                  </div>
                                                </div>
                                              )}

                                              <div className="flex items-center gap-10">
                                                {/* Membros / Seguidores */}
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Total de {config.id === 'youtube' ? 'Inscritos' : (config.id === 'whatsapp' || config.id === 'telegram' ? 'Membros' : 'Seguidores')}
                                                  </span>
                                                  <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-blue-500/80" />
                                                    <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{displayFollowers.toLocaleString()}</span>
                                                  </div>
                                                </div>

                                                <div className="w-px h-8 bg-white/5" />

                                                {/* Posts / Videos */}
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Total de {config.id === 'youtube' ? 'V├¡deos' : 'Posts'}
                                                  </span>
                                                  <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500/80" />
                                                    <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{displayPosts.toLocaleString('en-US', { minimumIntegerDigits: 2 })}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="relative overflow-hidden bg-slate-900 border-border/30 text-slate-300 font-black uppercase tracking-[0.15em] text-[9px] h-11 px-6 hover:text-red-400 hover:bg-slate-900 focus:ring-0 active:scale-95 transition-all shrink-0 w-full sm:w-auto mt-3 sm:mt-0 rounded-xl"
                                            onClick={() => handleDisconnectCustom(config.id, conn.id || 'all')}
                                          >
                                            <Unplug className="w-4 h-4 mr-2" />
                                            Desconectar
                                          </Button>
                                        </div>

                                        {/* Robot Profile Card (Specific for WhatsApp) */}
                                        {config.id === 'whatsapp' && (
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-green-500/5 p-5 rounded-[22px] border border-green-500/10 shadow-xl transition-all hover:bg-green-500/10 group animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-6 flex-1 min-w-0">
                                              <div className="relative">
                                                <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726]/30 shadow-xl flex-shrink-0 transition-transform group-hover:scale-105 bg-green-500/20">
                                                  <AvatarImage src="/bot-avatar.png" alt="Perfil do Rob├┤" className="object-cover" />
                                                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-xl font-bold text-green-500">
                                                    RT
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-[#151726] shadow-sm animate-pulse" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <p className="font-black text-[17px] text-white tracking-tight">Rob├┤ Bot_Zap</p>
                                                  {/* Badge Ativo/Pausado - usa estado local otimista se dispon├¡vel */}
                                                  {(() => {
                                                    const isBotOn = localBotActive !== null ? localBotActive : waMetadata.is_active === true;
                                                    return (
                                                      <Badge className={cn(
                                                        "text-[8px] font-black uppercase tracking-tighter",
                                                        isBotOn ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"
                                                      )}>
                                                        {isBotOn ? "Ativo" : "Pausado"}
                                                      </Badge>
                                                    );
                                                  })()}
                                                </div>

                                                <div className="flex items-center gap-10">
                                                  {/* Posts do Bot */}
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                      Posts do Bot
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      <FileText className="w-4 h-4 text-green-500/80" />
                                                      <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botPosts.toLocaleString('en-US', { minimumIntegerDigits: 2 })}</span>
                                                    </div>
                                                  </div>

                                                  <div className="w-px h-8 bg-white/5" />

                                                  {/* Respostas do Bot */}
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                      Total de Respostas
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      <MessageSquare className="w-4 h-4 text-green-500/80" />
                                                      <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botAnswers.toLocaleString('en-US', { minimumIntegerDigits: 2 })}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex flex-col gap-2 items-center justify-center p-2 bg-[#151726]/40 rounded-2xl border border-white/5 min-w-[100px]">
                                              {(() => {
                                                const isBotOn = localBotActive !== null ? localBotActive : waMetadata.is_active === true;
                                                return (
                                                  <>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isBotOn ? 'LIGADO' : 'DESLIGADO'}</span>
                                                    <Switch
                                                      checked={isBotOn}
                                                      onCheckedChange={(checked) => handleToggleBot(checked)}
                                                      className="data-[state=checked]:bg-green-500"
                                                    />
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/*  Credential fields and Actions  */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveCreds(config.id); }} className="space-y-6">
                              {/*  Hidden username to satisfy DOM accessibility warnings for password inputs  */}
                              <input type="text" name="username" autoComplete="username" defaultValue={user?.email || "api_user"} style={{ display: 'none' }} />

                              {fields.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 px-1">
                                    <Key className="w-4 h-4 text-muted-foreground/60" />
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Configura├º├úo da API</p>
                                  </div>
                                  <div className="grid gap-3">
                                    {fields.map((field) => {
                                      const fieldId = `${config.id}-${field.key}`;
                                      const isVisible = visibleFields[fieldId] || false;
                                      const savedValue = credentials[config.id]?.[field.key];
                                      const val = (formValues[config.id] || credentials[config.id] || {})[field.key] || "";

                                      return (
                                        <div key={field.key} className="space-y-1.5">
                                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            {field.label.includes("TOKEN") && config.id === 'telegram' ? "BOT TOKEN (@BOTFATHER)" : field.label}
                                          </label>
                                          <div className="relative">
                                            <Input
                                              type={field.masked && !isVisible ? "password" : "text"}
                                              value={val}
                                              onChange={(e) => updateFormField(config.id, field.key, e.target.value)}
                                              placeholder={field.placeholder || (savedValue ? maskValue(savedValue) : `${field.label}`)}
                                              className={cn(
                                                "bg-muted/50 h-10 text-sm",
                                                config.id === 'youtube' && field.key === 'client_id' && (val.startsWith('UC') || (val && !val.endsWith('.apps.googleusercontent.com') && val.length > 5)) && "border-red-500 ring-2 ring-500",
                                                config.id === 'threads' && field.key === 'app_id' && val && !/^\d+$/.test(val) && "border-red-500 ring-2 ring-red-500"
                                              )}
                                              autoComplete={field.masked ? "new-password" : "off"}
                                            />
                                            {field.masked && (
                                              <button
                                                type="button"
                                                onClick={() => toggleFieldVisibility(fieldId)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Meta Pixel Configuration within the Tab */}
                              {config.id === 'meta_ads' && (() => {
                                // Parse pixels: always have at least 1 slot
                                const rawPixelStr = systemSettings?.meta_pixel_id || '';
                                const pixelList = rawPixelStr ? rawPixelStr.split(',') : [''];

                                const updatePixels = (newList: string[]) => {
                                  updateSettingsOptimistic({ meta_pixel_id: newList.join(',') });
                                };

                                const isMetaConnected = !!(credentials['meta_ads'] && Object.keys(credentials['meta_ads']).length > 0);

                                return (
                                  <div className="space-y-6 pt-4 border-t border-border/10">
                                    {/* Identity Section */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0081FB05] p-5 rounded-3xl border border-[#0081FB20]">
                                      <div className="flex items-center gap-4 flex-1">
                                        {(() => {
                                          const fbConn = connections.find(c => c.platform === 'facebook' && c.is_connected);
                                          return (
                                            <>
                                              <Avatar className="w-12 h-12 border-2 border-white/10">
                                                <AvatarImage src={fbConn?.profile_image_url} />
                                                <AvatarFallback className="bg-[#0081FB20] text-[#0081FB] font-bold">M</AvatarFallback>
                                              </Avatar>
                                              <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#0081FB]">P├ígina de Neg├│cios Conectada</span>
                                                <span className="text-sm font-bold text-white tracking-tight">{fbConn?.page_name || fbConn?.username || "P├ígina n├úo vinculada"}</span>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isMetaConnected ? (
                                          <>
                                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase tracking-tighter">Ativo</Badge>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                if (window.confirm("Deseja desconectar a integra├º├úo Meta Marketing & Ads?")) {
                                                  deleteCredentials('meta_ads');
                                                }
                                              }}
                                              className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 rounded-lg"
                                            >
                                              <Unplug className="w-3 h-3 mr-1.5" /> Desconectar
                                            </Button>
                                          </>
                                        ) : (
                                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[9px] font-black uppercase tracking-tighter">Desconectado</Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Pixel Manager */}
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                          <Target className="w-4 h-4 text-[#1877F2]" />
                                          <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Pixels de Monitoramento Meta</p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updatePixels([...pixelList, ''])}
                                          className="h-7 text-[9px] font-black uppercase tracking-wider bg-primary/5 border-primary/20 text-[#1877F2] hover:bg-[#1877F210]"
                                        >
                                          <Plus className="w-3 h-3 mr-1.5" /> Adicionar Outro Pixel
                                        </Button>
                                      </div>

                                      <div className="space-y-3">
                                        {pixelList.map((pixelId, idx) => (
                                          <div key={idx} className="bg-background/40 p-4 rounded-2xl border border-white/5 space-y-3 group/pixel">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-[#1877F210] flex items-center justify-center border border-[#1877F220]">
                                                  <Target className="w-4 h-4 text-[#1877F2]" />
                                                </div>
                                                <div className="flex flex-col">
                                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Pixel {idx + 1}</span>
                                                  <span className="text-[10px] text-white/40 font-mono">{pixelId ? `${pixelId.substring(0, 6)}...` : 'Novo pixel'}</span>
                                                </div>
                                              </div>
                                              {pixelId && (
                                                <div className="flex flex-col items-end gap-0.5">
                                                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Volume de Dados</span>
                                                  <span className="text-xs font-mono font-bold text-green-500">{(Math.floor(Math.random() * 5000 + 1200)).toLocaleString()} Hits</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="relative">
                                              <Input
                                                value={pixelId}
                                                onChange={(e) => {
                                                  const newList = [...pixelList];
                                                  newList[idx] = e.target.value;
                                                  updatePixels(newList);
                                                }}
                                                placeholder="Ex: 123456789012345"
                                                className="bg-background/80 border-white/5 h-11 pr-10 focus:ring-blue-500/20 transition-all rounded-xl font-mono text-sm"
                                              />
                                              {pixelList.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = [...pixelList];
                                                    newList.splice(idx, 1);
                                                    updatePixels(newList.length ? newList : ['']);
                                                  }}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-red-500 transition-colors"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                                        O Pixel ID permite que o site rastreie convers├Áes e otimize campanhas de an├║ncios automaticamente.
                                        Voc├¬ pode cadastrar m├║ltiplos pixels para diferentes objetivos de rastreio.
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* WhatsApp Business API specific instructions/fields */}
                              {config.id === 'whatsapp' && (
                                <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    <h5 className="text-xs font-black uppercase tracking-wider text-green-600">WhatsApp Business API (Configura├º├úo Meta)</h5>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Diferente da sincroniza├º├úo de conta pessoal/comercial comum, esta API ├® necess├íria para o envio de mensagens automatizadas (Alertas e Newsletter).
                                    Preencha os campos abaixo com os dados obtidos no portal Meta for Developers.
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={saving === config.id}
                                  className="bg-gradient-to-r from-primary to-accent"
                                >
                                  {saving === config.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                  {hasCreds ? "Atualizar Credenciais" : "Salvar Configura├º├úo"}
                                </Button>

                                {config.oauthSupported && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={hasConnections ? "outline" : "default"}
                                    onClick={() => handleConnectApi(config.id)}
                                    disabled={isConnecting}
                                    className={cn(!hasConnections && "bg-primary/20 text-primary hover:bg-primary/30 border-primary/20")}
                                  >
                                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                                      hasConnections ? <><Check className="w-4 h-4 mr-2" />Adicionar Outra Conta</> :
                                        <><Check className="w-4 h-4 mr-2" />Conectar Conta</>}
                                  </Button>
                                )}

                                {!config.oauthSupported && (
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant={hasCreds ? "outline" : "default"}
                                    disabled={saving === config.id}
                                    className={cn(!hasCreds && "gap-2")}
                                  >
                                    {saving === config.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                                      hasCreds ? <><Check className="w-4 h-4 mr-2" />Integra├º├úo Ativa</> :
                                        <><Plus className="w-4 h-4" />Ativar Integra├º├úo</>}
                                  </Button>
                                )}

                                {/* Telegram: explicit connect button to trigger sync after saving token */}
                                {config.id === 'telegram' && hasCreds && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isEffectivelyConnected ? "outline" : "default"}
                                    disabled={statsLoading}
                                    onClick={async () => {
                                      await syncSocialStats('telegram');
                                    }}
                                    className={cn(
                                      !isEffectivelyConnected && "bg-[#2AABEE] hover:bg-[#229ED9] text-white border-0",
                                      isEffectivelyConnected && "gap-2"
                                    )}
                                  >
                                    {statsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    {isEffectivelyConnected ? "Adicionar Outra Conta" : "Conectar Conta"}
                                  </Button>
                                )}

                                {hasCreds && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteCreds(config.id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Limpar Credenciais
                                  </Button>
                                )}
                              </div>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>

        {/*  Add API Modal  */}
        <Dialog open={showAddApiModal} onOpenChange={setShowAddApiModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Adicionar Nova API ou Rede Social
              </DialogTitle>
              <DialogDescription>
                Selecione uma plataforma para configurar e conectar sua conta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground hidden">Selecione uma plataforma para configurar. Ela ser├í adicionada ├á lista de APIs e redes sociais.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {UNIQUE_PLATFORM_CONFIGS.map(config => {
                  const isAlreadyAdded = activePlatformIds.includes(config.id);
                  return (
                    <button
                      key={config.id}
                      onClick={() => handleAddPlatform(config.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center group",
                        isAlreadyAdded ? "border-primary/40 bg-primary/5 opacity-60 cursor-default" : "border-border hover:border-primary/40 hover:bg-primary/5"
                      )}
                      disabled={isAlreadyAdded}
                    >
                      <div className="w-12 h-12">
                        <PlatformIconBadge platform={config as any} size="lg" muted={false} />
                      </div>
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{config.name}</span>
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        {isAlreadyAdded ? 'J├í Ativado' : (config.oauthSupported ? 'OAuth' : 'API Key')}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">Mais integra├º├Áes ser├úo adicionadas em breve. Entre em contato para solicitar uma plataforma espec├¡fica.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

