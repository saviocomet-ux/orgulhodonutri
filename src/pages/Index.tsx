import { useAuth } from "@/hooks/useAuth";
import Auth from "./Auth";
import Dashboard from "./Dashboard";
import NutriDashboard from "./NutriDashboard";

import ManagerDashboard from "./ManagerDashboard";

const Index = () => {
  const { session, role, isManager, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Auth />;

  if (isManager) return <ManagerDashboard />;

  return role === "admin" ? <NutriDashboard /> : <Dashboard />;
};

export default Index;
