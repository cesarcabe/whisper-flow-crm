import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import WorkspaceAdmin from "./pages/WorkspaceAdmin";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

// QueryClient instance - stable reference
const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();

  if (authLoading || workspaceLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no workspace, show a message
  if (!workspaceId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Sem Workspace</h2>
          <p className="text-muted-foreground">Você precisa ser adicionado a um workspace para continuar.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Public Route wrapper (redirects to home if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/admin"
        element={
          <ProtectedRoute>
            <WorkspaceAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route path="/invite/:token" element={<AcceptInvitation />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <WorkspaceProvider>
              <AppRoutes />
            </WorkspaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;