import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { usePageView } from "./hooks/usePageView";
import { useAuthStore } from "./store/auth";
import { LoginPage, RegisterPage, ResetPasswordPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { WorkspaceAdminPage } from "./pages/WorkspaceAdminPage";
import { BoardPage } from "./pages/BoardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProfileEditPage } from "./pages/ProfileEditPage";
import { WorkspaceGuard } from "./components/WorkspaceGuard";

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  usePageView();

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/workspaces/:workspaceId"
          element={
            <WorkspaceGuard>
              <WorkspacePage />
            </WorkspaceGuard>
          }
        />
        <Route
          path="/workspaces/:workspaceId/admin"
          element={
            <WorkspaceGuard>
              <WorkspaceAdminPage />
            </WorkspaceGuard>
          }
        />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
