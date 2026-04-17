import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { handleError } from "@/lib/error-handler";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NutriDashboard from "./pages/NutriDashboard.tsx";
import ManagerDashboard from "./pages/ManagerDashboard.tsx";
import Auth from "./pages/Auth.tsx";
import { FloatingChat } from "@/components/chat/FloatingChat";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Don't show toast for every fetch error if we want more control
      // But for global handling, it's a good place
      if (query.meta?.errorMessage) {
        handleError(error, query.meta.errorMessage as string);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.errorMessage) {
        handleError(error, mutation.meta.errorMessage as string);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="nutri-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner position="top-right" richColors />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/nutri" element={<NutriDashboard />} />
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <FloatingChat />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
