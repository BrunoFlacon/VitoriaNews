import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { SystemFooter } from "@/components/SystemFooter";
import { useSystem } from "@/contexts/SystemContext";

const registerSchema = z.object({
  name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Nome contém caracteres inválidos"),
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, user } = useAuth();
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
    const result = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { success, error } = await register(email, password, name);
    
    if (success) {
      toast({
        title: "Conta criada!",
        description: "Bem-vindo ao Vitória Net.",
      });
      navigate("/dashboard");
    } else {
      toast({
        title: "Erro no cadastro",
        description: error || "Não foi possível criar a conta.",
        variant: "destructive",
      });
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
              Criar sua conta
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              Comece a gerenciar suas redes sociais
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`pl-10 h-12 bg-muted/50 border-border ${errors.name ? 'border-destructive' : ''}`}
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

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
                    autoComplete="email"
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
                    autoComplete="new-password"
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
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 h-12 bg-muted/50 border-border ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    autoComplete="new-password"
                    required
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              <div className="flex items-start gap-2">
                <input type="checkbox" className="rounded border-border mt-1" required />
                <label className="text-sm text-muted-foreground">
                  Concordo com os{" "}
                  <a href="#" className="text-primary hover:underline">Termos de Uso</a>
                  {" "}e{" "}
                  <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
                </label>
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
                    Criar conta
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Fazer login
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

export default Register;
