import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
import { supabase } from "./lib/supabase";
import { useAuthStore } from "./store/auth";
import "./index.css";

initAnalytics();

const queryClient = new QueryClient();

function Bootstrap() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        localStorage.removeItem("user");
        useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const raw = localStorage.getItem("user");
        if (raw) {
          setUser(JSON.parse(raw));
        } else {
          useAuthStore.setState({ isAuthenticated: true, isLoading: false });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [initAuth, setUser, clearAuth]);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Bootstrap />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
