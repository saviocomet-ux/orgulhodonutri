import { useAuth } from "@/hooks/useAuth";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import NutriDashboard from "./NutriDashboard";

const Index = () => {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Auth />;

  return role === "admin" ? <NutriDashboard /> : <Dashboard />;
};

export default Index;
