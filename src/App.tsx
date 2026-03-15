import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { FilterProvider } from "./contexts/FilterContext";
import LandingPage from "./pages/LandingPage";
import DashboardHome from "./pages/DashboardHome";
import FeedPage from "./pages/FeedPage";
import MapPage from "./pages/MapPage";
import PodcastPage from "./pages/PodcastPage";
import EventsPage from "./pages/EventsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import DataDeletionPage from "./pages/DataDeletionPage";
import NotFound from "./pages/NotFound";
import ProtectedLayout from "./components/ProtectedLayout";
import PremiumPage from "./pages/PremiumPage";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <FilterProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Rutas públicas — no requieren autenticación */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/data-deletion" element={<DataDeletionPage />} />

              {/* Rutas Protegidas bajo Layout común */}
              <Route element={<ProtectedLayout />}>
                <Route path="/home" element={<DashboardHome />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/podcast" element={<PodcastPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/premium" element={<PremiumPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:conversationId" element={<ChatPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FilterProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
