import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../api/client";
import { UserAvatar } from "../components/UserAvatar";
import { AppHeader } from "../components/layout/AppHeader";
import { useAuthStore } from "../store/auth";

function MenuRow({
  to,
  onClick,
  icon,
  label,
  danger,
}: {
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  const className = `flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors w-full text-left ${
    danger
      ? "text-red-400 hover:bg-red-500/10"
      : "text-gray-200 hover:bg-gray-800"
  }`;

  const content = (
    <>
      <span className={danger ? "text-red-400" : "text-gray-400"}>{icon}</span>
      <span className="text-base font-medium">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-white text-right break-all">{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const updateUser = useAuthStore((s) => s.updateUser);
  const storedUser = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => userApi.me().then((r) => r.data),
    initialData: storedUser ?? undefined,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.setQueryData(["me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setUploadError("");
    },
    onError: () => setUploadError("Could not upload image. Use JPEG, PNG, WebP, or GIF up to 5MB."),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const handleLogout = async () => {
    await clearAuth();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <AppHeader backTo={{ label: "Back to workspaces", href: "/" }} title="Profile" />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
          {/* Banner + identity */}
          <div className="relative bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 px-6 md:px-10 pt-8 pb-10 md:pb-12">
            <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative self-center md:self-auto rounded-full border-4 border-gray-900 shadow-xl shrink-0"
                aria-label="Change profile picture"
              >
                <UserAvatar user={user} size="xl" />
                <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-2 ring-gray-900">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="text-center md:text-left flex-1 min-w-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white">{user.name}</h2>
                <p className="mt-1 text-gray-400">{user.email}</p>
                {uploadMutation.isPending && (
                  <p className="mt-2 text-sm text-blue-400">Uploading photo...</p>
                )}
                {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
              </div>
            </div>
          </div>

          {/* Desktop two-column body */}
          <div className="grid md:grid-cols-2 gap-0 md:gap-0 md:divide-x divide-gray-800">
            <section className="p-6 md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Contact information
              </h3>
              <div className="rounded-xl border border-gray-800 bg-gray-950/50 px-5">
                <InfoRow label="Phone" value={user.phone || "Not set"} />
                <InfoRow label="Mail" value={user.email} />
              </div>
            </section>

            <section className="p-6 md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Account
              </h3>
              <div className="space-y-1">
                <MenuRow
                  to="/profile/edit"
                  label="Profile details"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  }
                />
                <MenuRow
                  to="/settings"
                  label="Settings"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                  }
                />
                <MenuRow
                  onClick={handleLogout}
                  label="Log out"
                  danger
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
