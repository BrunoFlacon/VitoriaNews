import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SystemProvider } from "@/contexts/SystemContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TrackingProvider } from "./components/analytics/TrackingProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import OAuthCallback from "./pages/OAuthCallback";
import { ThemeEngine } from "./components/ThemeEngine";
const BrunoProfile = lazy(() => import("./pages/BrunoProfile"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ManualPage = lazy(() => import("./pages/ManualPage"));
const PortalLanding = lazy(() => import("./pages/PortalLanding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const News = lazy(() => import("./pages/News"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const SystemEvolutionPage = lazy(() => import("./pages/SystemEvolutionPage"));
const Radar2 = lazy(() => import("./pages/radar2"));
const RadarNews = lazy(() => import("./pages/radarnews"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

// Instant skeleton screen matching the dashboard layout - no spinner
const LoadingFallback = () => (
  <div className="min-h-screen bg-[hsl(222,47%,6%)] flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  // Check localStorage cache to prevent flash of loading screen on return visits
  const hasCachedSession = Object.keys(localStorage).some(
    k => k.includes('auth-token') || k.includes('supabase.auth.token')
  );

  if (isLoading && !hasCachedSession) {
    return <LoadingFallback />;
  }

  if (!user && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SystemProvider>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            <TrackingProvider>
              <Toaster />
              <Sonner />
              <ThemeEngine />
              <ErrorBoundary>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<PortalLanding />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/oauth/callback" element={<OAuthCallback />} />
                    <Route path="/oauth/callback/:platform" element={<OAuthCallback />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/news/:slug" element={<ArticlePage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/manual" element={<ManualPage />} />
                    <Route path="/profile/bruno-flacon" element={<BrunoProfile />} />
                    <Route path="/system-history" element={<ProtectedRoute><SystemEvolutionPage /></ProtectedRoute>} />
                    <Route path="/radar2" element={<ProtectedRoute><Radar2 /></ProtectedRoute>} />
                    <Route path="/radarnews" element={<ProtectedRoute><RadarNews /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/profile/bruno-flacon" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              </ErrorBoundary>
            </TrackingProvider>

          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </SystemProvider>
  </QueryClientProvider>
);

export default App;
