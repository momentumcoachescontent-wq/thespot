import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardHome from "./pages/DashboardHome";
import FeedPage from "./pages/FeedPage";
import MapPage from "./pages/MapPage";
import PodcastPage from "./pages/PodcastPage";
import EventsPage from "./pages/EventsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";
import DashboardLayout from "./components/DashboardLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<AuthGuard><DashboardLayout><DashboardHome /></DashboardLayout></AuthGuard>} />
          <Route path="/feed" element={<AuthGuard><DashboardLayout><FeedPage /></DashboardLayout></AuthGuard>} />
          <Route path="/map" element={<AuthGuard><DashboardLayout><MapPage /></DashboardLayout></AuthGuard>} />
          <Route path="/podcast" element={<AuthGuard><DashboardLayout><PodcastPage /></DashboardLayout></AuthGuard>} />
          <Route path="/events" element={<AuthGuard><DashboardLayout><EventsPage /></DashboardLayout></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><DashboardLayout><ProfilePage /></DashboardLayout></AuthGuard>} />
          <Route path="/admin" element={<AuthGuard><DashboardLayout><AdminPage /></DashboardLayout></AuthGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
