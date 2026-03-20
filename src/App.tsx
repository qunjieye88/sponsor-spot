import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, RequireProfile } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import EventFormPage from "./pages/EventFormPage";
import EventDetailPage from "./pages/EventDetailPage";
import SponsorsPage from "./pages/SponsorsPage";
import SponsorDetailPage from "./pages/SponsorDetailPage";
import OrganizerProfilePage from "./pages/OrganizerProfilePage";
import ContactRequestsPage from "./pages/ContactRequestsPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireProfile>
                  <DashboardPage />
                </RequireProfile>
              }
            />
            <Route
              path="/events/new"
              element={
                <RequireProfile>
                  <EventFormPage />
                </RequireProfile>
              }
            />
            <Route
              path="/events/:id/edit"
              element={
                <RequireProfile>
                  <EventFormPage />
                </RequireProfile>
              }
            />
            <Route
              path="/events/:id"
              element={
                <RequireProfile>
                  <EventDetailPage />
                </RequireProfile>
              }
            />
            <Route
              path="/sponsors"
              element={
                <RequireProfile>
                  <SponsorsPage />
                </RequireProfile>
              }
            />
            <Route
              path="/sponsors/:id"
              element={
                <RequireProfile>
                  <SponsorDetailPage />
                </RequireProfile>
              }
            />
            <Route
              path="/organizers/:id"
              element={
                <RequireProfile>
                  <OrganizerProfilePage />
                </RequireProfile>
              }
            />
            <Route
              path="/contact-requests"
              element={
                <RequireProfile>
                  <ContactRequestsPage />
                </RequireProfile>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireProfile>
                  <ProfilePage />
                </RequireProfile>
              }
            />
            <Route
              path="/messages"
              element={
                <RequireProfile>
                  <MessagesPage />
                </RequireProfile>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
