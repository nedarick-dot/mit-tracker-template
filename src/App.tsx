import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import Login from "./pages/Login";
import Index from "./pages/Index";
import DepartmentView from "./pages/DepartmentView";
import MitDetail from "./pages/MitDetail";
import DailyInput from "./pages/DailyInput";
import WeeklyRollups from "./pages/WeeklyRollups";
import WeeklyView from "./pages/WeeklyCheckpointView";
import MonthlyMilestoneView from "./pages/MonthlyMilestoneView";
import BlockersPage from "./pages/Blockers";
import SetupPage from "./pages/Setup";
import MyWork from "./pages/MyWork";
import LeadershipBrief from "./pages/LeadershipBrief";
import EvanReport from "./pages/EvanReport";
import TuesdayMeeting from "./pages/TuesdayMeeting";
import MondayBrief from "./pages/MondayBrief";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();
  useRealtimeSync();
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!session) return <Login />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/department/:dept" element={<DepartmentView />} />
        <Route path="/mit/:id" element={<MitDetail />} />
        <Route path="/milestones" element={<MonthlyMilestoneView />} />
        <Route path="/checkin" element={<DailyInput />} />
        <Route path="/daily" element={<DailyInput />} />
        <Route path="/rollups" element={<WeeklyRollups />} />
        <Route path="/weekly" element={<WeeklyView />} />
        <Route path="/blockers" element={<BlockersPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/my-work" element={<MyWork />} />
        <Route path="/brief" element={<LeadershipBrief />} />
        <Route path="/evan" element={<EvanReport />} />
        <Route path="/tuesday" element={<TuesdayMeeting />} />
        <Route path="/monday" element={<MondayBrief />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <ProtectedRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
