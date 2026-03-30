import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SystemFooter } from "@/components/SystemFooter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md w-full">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-6xl font-display font-bold text-primary">404</span>
        </div>
        <h1 className="text-3xl font-display font-bold mb-3">Página não encontrada</h1>
        <p className="text-muted-foreground mb-8">
          A página que você está procurando no SocialHub não existe ou foi movida.
        </p>
        <Link to="/">
          <Button className="rounded-full px-8 h-12 gap-2">
            <Home className="w-4 h-4" />
            Voltar para o Início
          </Button>
        </Link>
      </div>

      <SystemFooter />
    </div>
  );
};

export default NotFound;
