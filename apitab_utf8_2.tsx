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
