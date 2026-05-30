import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function isChunkError(error: Error): boolean {
  const msg = error?.message || "";
  return (
    msg.includes("dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("Failed to fetch") ||
    msg.includes("script error")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunk = isChunkError(this.state.error!);

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center glass-card rounded-3xl border border-white/5 m-4">
          <div className={`w-16 h-16 ${isChunk ? 'bg-amber-500/10' : 'bg-red-500/10'} rounded-full flex items-center justify-center mb-6`}>
            {isChunk ? <WifiOff className="w-8 h-8 text-amber-500" /> : <AlertCircle className="w-8 h-8 text-red-500" />}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isChunk ? "Atualização necessária" : "Ops! Algo deu errado."}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            {isChunk
              ? "Uma nova versão do app foi publicada. Recarregue para continuar usando normalmente."
              : "Ocorreu um erro inesperado ao carregar esta seção. Você pode tentar recarregar ou voltar para o dashboard."}
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={this.handleReload}
              className="rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar App
            </Button>
            <Button
              onClick={this.handleReset}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              Tentar Novamente
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-black/40 rounded-xl text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-400">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
