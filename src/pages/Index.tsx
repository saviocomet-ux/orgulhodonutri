import { useAuth } from "@/hooks/useAuth";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

const Index = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return session ? <Dashboard /> : <Auth />;
};

export default Index;
