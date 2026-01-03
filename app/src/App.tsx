import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import Sessions from "./pages/Sessions";
import LogSession from "./pages/LogSession";
import Quiver from "./pages/Quiver";
import SpotReports from "./pages/SpotReports";
import Maps from "./pages/Maps";
import ExploreDisclaimer from "./pages/ExploreDisclaimer";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import FindFriends from "./pages/FindFriends";
import UserProfile from "./pages/UserProfile";
import Connections from "./pages/Connections";
import Admin from "./pages/Admin";
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
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/log-session" element={<LogSession />} />
            <Route path="/quiver" element={<Quiver />} />
            <Route path="/quiver/:userId" element={<Quiver />} />
            <Route path="/reports" element={<SpotReports />} />
            <Route path="/maps" element={<ExploreDisclaimer />} />
            <Route path="/explore" element={<Maps />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/find-friends" element={<FindFriends />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/connections/:userId" element={<Connections />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
