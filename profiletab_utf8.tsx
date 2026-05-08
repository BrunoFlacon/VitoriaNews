        <TabsContent value="profile" className="outline-none">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="glass-card rounded-2xl border border-border p-6 outline-none">
            <div className="flex flex-col gap-8">
              {/* Cabe├ºalho do Perfil */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-border/20 pb-8">
                <div className="relative group">
                  <Avatar className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl">
                    {profile?.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt={profileData.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
                      {profileData.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-sm"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                  <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background shadow-sm transition-all duration-300", isOnline ? "bg-green-500 shadow-green-500/50" : "bg-transparent border border-muted-foreground/40")} />
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display font-bold text-2xl tracking-tight">{profileData.first_name || profileData.name || "Usu├írio"} {profileData.last_name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> {profileData.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">
                        {can('system.access') ? 'Administrador Master' : 'Desenvolvedor'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Membro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formul├írio de Campos */}
              <div className="flex flex-col gap-2">
                {/* Row 1: Nome + Sobrenome + Email */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div className="space-y-1">
                    <label htmlFor="profile-first-name" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Nome
                    </label>
                    <Input
                      id="profile-first-name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      placeholder="Nome"
                      className="bg-muted/30 h-8 text-sm w-full border-border/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-last-name" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Sobrenome
                    </label>
                    <Input
                      id="profile-last-name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      placeholder="Sobrenome"
                      className="bg-muted/30 h-8 text-sm w-full border-border/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-email" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email
                    </label>
                    <Input
                      id="profile-email"
                      value={profileData.email}
                      readOnly
                      className="bg-muted/20 opacity-70 cursor-not-allowed h-8 text-sm border-border/40"
                    />
                  </div>
                </div>

                {/* Row 2: Celular, Data Nasc, Sexo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div className="space-y-1 relative">
                    <label htmlFor="profile-phone" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> Celular / WhatsApp
                    </label>
                    <div className="relative">
                      <Input
                        id="profile-phone"
                        value={profileData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(00) 00000-0000"
                        className={cn("bg-muted/30 h-8 text-sm w-full border-border/40 transition-all", isWhatsAppValid ? "border-green-500/40 pr-9" : "")}
                      />
                      {isValidatingWhatsApp && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!isValidatingWhatsApp && isWhatsAppValid === true && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500 bg-green-500/10 rounded-full px-2 py-0.5 border border-green-500/20">
                          <span className="text-[9px] font-bold uppercase tracking-tight">WhatsApp</span>
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-birthdate" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Data Nasc.
                    </label>
                    <div className="relative">
                      <Input
                        id="profile-birthdate"
                        type="date"
                        value={profileData.birthdate}
                        onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                        className="bg-muted/30 h-8 text-sm w-full border-border/40 pr-16"
                      />
                      {profileData.birthdate && calculateAge(profileData.birthdate) !== null && (
                        <span className="absolute right-[28px] top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/90 bg-muted/40 px-1 py-0.5 rounded border border-border/10 whitespace-nowrap pointer-events-none">
                          {calculateAge(profileData.birthdate)} anos
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-gender" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle2 className="w-3 h-3" /> Sexo
                    </label>
                    <select
                      id="profile-gender"
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-border/40 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    >
                      <option value="">Selecionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Bio */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between pr-1">
                    <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Pencil className="w-3 h-3" /> Biografia
                    </label>
                    <span className="text-[9px] font-medium text-muted-foreground/70 tracking-tight">
                      {profileData.bio.length} / 150 caracteres
                    </span>
                  </div>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    maxLength={150}
                    rows={2}
                    className="bg-muted/30 text-sm w-full border border-border/40 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[50px]"
                    placeholder="Fale um pouco sobre voc├¬..."
                  />
                </div>

                {/* Row 4: Redes Sociais + Status - Alinhamento Original com 180px de Respiro */}
                <div className="flex items-start gap-[180px] mt-4 mb-2 w-full">
                  {/* Icons block */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5 h-4">
                      <Globe className="w-3 h-3" /> Redes Sociais
                    </label>
                    <div className="flex flex-wrap gap-1.2 p-1 bg-muted/5 rounded-lg w-fit">
                      {profileData.social_links.length > 0 && profileData.social_links.map((link, idx) => {
                        const platform = socialPlatforms.find(p => p.id === link.platform) || socialPlatforms[0];
                        return (
                          <div key={idx} className="group relative">
                            <motion.div
                              onClick={() => setEditingSocial({ index: idx, name: link.name })}
                              className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-background border border-border/50 shadow-sm cursor-pointer hover:border-primary/50 transition-all"
                            >
                              <PlatformIconBadge platform={platform as any} size="sm" />
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Toggle Panel - Divisor Vertical */}
                  <div className="flex items-center gap-4 border-l border-border/20 pl-8 h-12 mt-4 shrink-0">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[11px] font-bold text-muted-foreground tracking-tight">Status:</span>
                      <div className="flex items-center gap-2 bg-muted/20 border border-border/10 rounded-full px-4 py-1.5 shadow-inner transition-all duration-300">
                        <Switch
                          id="online-toggle"
                          checked={isOnline}
                          onCheckedChange={toggleOnline}
                          className="data-[state=checked]:bg-green-500 scale-90"
                        />
                        <div className="flex items-center gap-1.5 ml-1">
                          {isOnline ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-transparent border border-muted-foreground/40 shadow-inner" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 5: Action Row - Bottom */}
                <div className="pt-3 border-t border-border/20 mt-1 flex items-center justify-between gap-3">
                  <div className="flex gap-2 items-center">
                    <select
                      value={newSocialLink.platform}
                      onChange={(e) => setNewSocialLink({ ...newSocialLink, platform: e.target.value })}
                      className="w-28 h-8 px-2 rounded-md border border-border/40 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                    >
                      {socialPlatforms.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Input
                      value={newSocialLink.name}
                      onChange={(e) => setNewSocialLink({ ...newSocialLink, name: e.target.value })}
                      placeholder="@user"
                      className="bg-muted/30 h-8 text-xs w-56 border-border/40"
                    />
                    <Button onClick={handleAddSocialLink} size="sm" variant="outline" className="h-8 w-8 p-0 hover:bg-primary hover:text-white shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    className="relative overflow-hidden group gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 transition-all h-9 px-6 text-xs uppercase tracking-wider"
                    style={{ textShadow: '0 0 3px rgba(255,255,255,0.2)' }}
                  >
                    {/* Shine/Flare effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] -translate-x-[200%] group-hover:animate-[shimmer_2s_infinite] transition-all duration-1000" />

                    <style>{`
                        @keyframes shimmer {
                          100% { transform: translateX(200%); }
                        }
                      `}</style>

                    <Save className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Salvar altera├º├Áes</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/*  Notifications Tab  */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6">
            <h3 className="font-display font-bold text-lg mb-6">Prefer├¬ncias de Notifica├º├úo</h3>
            <div className="space-y-6">
