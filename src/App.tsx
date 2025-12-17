import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "@/pages/Index";
import RestaurantPage from "@/pages/RestaurantPage";
import DashboardPage from "@/pages/DashboardPage";
import QueueStatusPage from "@/pages/QueueStatusPage";
import SeedPage from "@/pages/SeedPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/seed" element={<SeedPage />} />
            <Route path="/dashboard/:restaurantSlug" element={<DashboardPage />} />
            <Route path="/queue/:queueId" element={<QueueStatusPage />} />
            <Route path="/:slug" element={<RestaurantPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
