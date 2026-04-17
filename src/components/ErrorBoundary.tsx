import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            Ops! Algo deu errado.
          </h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página.
          </p>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Ir para o início
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Recarregar
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left font-mono text-xs text-muted-foreground">
              {this.state.error?.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.children;
  }
}

export default ErrorBoundary;
