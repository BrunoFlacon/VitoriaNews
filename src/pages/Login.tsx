import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Phone, Key as KeyIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, Profile } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { SystemFooter } from "@/components/SystemFooter";
import { useSystem } from "@/contexts/SystemContext";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; otp?: string; phone?: string }>({});
  const [show2FA, setShow2FA] = useState(false);
  const [otp, setOtp] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<"email" | "sms" | "whatsapp" | "mfa" | null>(null);
  const [phone, setPhone] = useState("");
  const [tempProfile, setTempProfile] = useState<any>(null);
  const { login, user, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useSystem();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate inputs
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { success, error } = await login(email, password);
    
    if (success) {
      // Check for 2FA
      const { data: profile } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).single() as { data: Profile | null };
      
      if (profile?.two_factor_enabled && profile?.phone) {
        setTempProfile(profile);
        const otpRes = await sendOtp(profile.phone);
        if (otpRes.success) {
          setShow2FA(true);
          toast({ title: "2FA Requerido", description: `Enviamos um código para o número ${profile.phone}` });
        } else {
          toast({ title: "Erro ao enviar 2FA", description: otpRes.error, variant: "destructive" });
        }
      } else {
        toast({ title: "Bem-vindo ao Vitória Net.", description: "Login realizado com sucesso." });
        navigate("/dashboard");
      }
    } else {
      toast({ title: "Erro no login", description: error || "Email ou senha incorretos.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await verifyOtp(tempProfile.phone, otp);
    if (res.success) {
      toast({ title: "Sucesso", description: "Identidade verificada." });
      navigate("/dashboard");
    } else {
      toast({ title: "Código Inválido", description: "O código digitado está incorreto ou expirou.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handlePhoneRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await sendOtp(phone);
    if (res.success) {
      setShow2FA(true);
      setTempProfile({ phone }); // For verification
      toast({ title: "Código enviado", description: "Verifique seu SMS ou WhatsApp." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass-card rounded-3xl border border-border p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {settings?.show_logo !== false && (
                settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-12 h-12 object-contain rounded-xl bg-background/50" />
                ) : (
                  /* INÍCIO LOGOMARCA PADRÃO DO SISTEMA (SVG NOVO) */
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] flex items-center justify-center">
                    <svg viewBox="0 0 64 64" className="w-[98%] h-[98%] text-black fill-current">
                      <path d="M45.9,26.4l5.2-5.2c-11.8-11.7-26.4-11.7-38.1,0l5.2,5.2C27.1,17.5,37,17.5,45.9,26.4L45.9,26.4z" />
                      <path d="M44.2,38.1L32,26l-12.1,12L7.7,26l-5.2,5.2l17.3,17.2l12.1-12l12.1,12l17.3-17.2L56.3,26L44.2,38.1z" />
                    </svg>
                  </div>
                  /* FIM LOGOMARCA PADRÃO DO SISTEMA */
                )
              )}
              <span className="font-display font-bold text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4F8AFF] to-[#8B5CF6] truncate">
                {settings?.platform_name || "Vitória Net"}
              </span>
            </div>

            <h1 className="text-2xl font-display font-bold text-center mb-2">
              Entrar na sua conta
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Gerencie todas as suas redes sociais
            </p>

          {show2FA ? (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Verificação de Segurança</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Digite o código de 6 dígitos enviado para seu telefone.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Código de Verificação</label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 bg-primary">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar e Entrar"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShow2FA(false)} className="w-full">
                Voltar
              </Button>
            </form>
          ) : showRecovery ? (
            <div className="space-y-6">
              {!recoveryMethod ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-center">Recuperar Acesso</h2>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Selecione como deseja receber o código de recuperação:
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-14 justify-start gap-4 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setRecoveryMethod("email")}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">E-mail</div>
                        <div className="text-[10px] text-muted-foreground italic">Link para resetar senha</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-14 justify-start gap-4 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setRecoveryMethod("sms")}
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">SMS</div>
                        <div className="text-[10px] text-muted-foreground italic">Código no celular</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-14 justify-start gap-4 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setRecoveryMethod("whatsapp")}
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">WhatsApp</div>
                        <div className="text-[10px] text-muted-foreground italic">Código via WhatsApp</div>
                      </div>
                    </Button>
                    {/* Only show 2FA app option if we could somehow verify it, but since we are not logged in, we can't easily check profile.two_factor_enabled here without email. We'll show it as a fallback. */}
                    <Button 
                      variant="outline" 
                      className="h-14 justify-start gap-4 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setRecoveryMethod("mfa")}
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold">App de Autenticação</div>
                        <div className="text-[10px] text-muted-foreground italic">Código Authy / 2FA</div>
                      </div>
                    </Button>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setShowRecovery(false)} className="w-full">
                    Voltar para Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={recoveryMethod === "email" ? (e) => {
                  e.preventDefault();
                  toast({ title: "Check seu e-mail", description: "Enviamos o link de recuperação para " + email });
                  supabase.auth.resetPasswordForEmail(email);
                } : handlePhoneRecovery} className="space-y-4">
                  <h2 className="text-xl font-bold text-center">{recoveryMethod === "email" ? "Recuperar via E-mail" : "Recuperar via " + recoveryMethod.toUpperCase()}</h2>
                  <p className="text-sm text-muted-foreground text-center">
                    {recoveryMethod === "email" ? "Informe seu e-mail cadastrado." : "Informe seu número de celular/WhatsApp."}
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{recoveryMethod === "email" ? "E-mail" : "Celular / WhatsApp"}</label>
                    <div className="relative">
                      {recoveryMethod === "email" ? (
                        <>
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-12 bg-muted/50 border-border"
                            required
                          />
                        </>
                      ) : (
                        <>
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="(00) 00000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="pl-10 h-12 bg-muted/50 border-border"
                            required
                          />
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={isLoading} className="w-full h-12 bg-gradient-to-r from-primary to-accent">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Código / Link"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRecoveryMethod(null)} className="w-full">
                    Escolher outro método
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 h-12 bg-muted/50 border-border ${errors.email ? 'border-destructive' : ''}`}
                    autoComplete="username"
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-10 pr-10 h-12 bg-muted/50 border-border ${errors.password ? 'border-destructive' : ''}`}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  Lembrar de mim
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowRecovery(true);
                    setRecoveryMethod(null);
                  }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Esqueci a senha
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Criar conta
              </Link>
            </p>
          </div>
          </div>
        </motion.div>
      </div>

      <SystemFooter />
    </div>
  );
};

export default Login;
