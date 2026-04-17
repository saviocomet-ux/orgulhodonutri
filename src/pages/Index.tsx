import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import NutriDashboard from "./NutriDashboard";
import ManagerDashboard from "./ManagerDashboard";
import Landing from "./Landing";

const Index = () => {
  const { session, role, isManager, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Se não estiver logado
  if (!session) {
    if (showAuth) {
      return (
        <div className="relative">
          <Button 
            variant="ghost" 
            className="absolute top-4 left-4 z-50"
            onClick={() => setShowAuth(false)}
          >
            ← Voltar para o site
          </Button>
          <Auth />
        </div>
      );
    }
    return <Landing onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
  }

  // Se for o Manager (super-admin)
  if (isManager) return <ManagerDashboard />;

  // Redireciona para o dashboard correto baseado no role
  return role === "admin" ? <NutriDashboard /> : <Dashboard />;
};

const Button = ({ children, variant, className, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-md transition-colors ${
      variant === "ghost" ? "hover:bg-muted" : "bg-primary text-primary-foreground"
    } ${className}`}
  >
    {children}
  </button>
);

export default Index;
