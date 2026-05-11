import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ContactButton from "@/components/ContactButton";
import Landing from "./pages/Landing";

const Index = lazy(() => import("./pages/Index"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const WorkSession = lazy(() => import("./pages/WorkSession"));
const Progress = lazy(() => import("./pages/Progress"));
const Annales = lazy(() => import("./pages/Annales"));
const Profile = lazy(() => import("./pages/Profile"));
const History = lazy(() => import("./pages/History"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Trophies = lazy(() => import("./pages/Trophies"));
const Qcm = lazy(() => import("./pages/Qcm"));
const Bibliotheque = lazy(() => import("./pages/Bibliotheque"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ContactButton />
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Index />} />
            <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/work" element={<ProtectedRoute><WorkSession /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/annales" element={<ProtectedRoute><Annales /></ProtectedRoute>} />
            <Route path="/annales/:annaleSource" element={<ProtectedRoute><Annales /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/trophees" element={<ProtectedRoute><Trophies /></ProtectedRoute>} />
            <Route path="/qcm" element={<ProtectedRoute><Qcm /></ProtectedRoute>} />
            <Route path="/bibliotheque" element={<Bibliotheque />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
