import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi, userApi } from "../api/client";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { btnPrimary, inputClass, labelClass } from "../components/ui/styles";
import { workspaceHomePath } from "../utils/workspace";

function AuthFormShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

async function loadAppUser(inviteToken?: string, name?: string) {
  try {
    const { data } = await userApi.me();
    return data;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 && name) {
      return authApi.completeRegistration({ name, invite_token: inviteToken });
    }
    throw err;
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("Invalid email or password");
        return;
      }
      const user = await loadAppUser();
      setUser(user);
      navigate(workspaceHomePath(user));
    } catch {
      setError("Could not load your profile. Try again or complete registration.");
    }
  };

  return (
    <AuthFormShell>
      <h1 className="text-2xl font-bold text-white mb-6">Sign in to SODA KANBAN</h1>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <p className="text-right text-sm">
          <Link to="/reset-password" className="text-blue-400 hover:text-blue-300 hover:underline">
            Forgot password?
          </Link>
        </p>
        <button type="submit" className={`w-full ${btnPrimary} py-2.5`}>
          Sign in
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        No account?{" "}
        <Link to="/register" className="text-blue-400 hover:text-blue-300 hover:underline">
          Register
        </Link>
      </p>
    </AuthFormShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const inviteToken = searchParams.get("token") ?? undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already")) {
          setError("This email is already registered. Sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }
      if (!signUpData.session) {
        setError("Check your email to confirm your account, then sign in.");
        return;
      }
      const user = await authApi.completeRegistration({ name, invite_token: inviteToken });
      setUser(user);
      navigate(workspaceHomePath(user));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (status === 409) {
        setError("This email is already registered. Sign in instead.");
        return;
      }
      setError(
        typeof detail === "string" && detail
          ? detail
          : inviteToken
            ? "Registration failed. The invite may be invalid or your email is already registered."
            : "Registration failed. Please try again.",
      );
    }
  };

  return (
    <AuthFormShell>
      <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
      {inviteToken && (
        <p className="text-sm text-green-400 mb-4">You have been invited to join a workspace.</p>
      )}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Name</label>
          <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            required
            minLength={8}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className={`w-full ${btnPrimary} py-2.5`}>
          Register
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthFormShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("Check your email for a password reset link.");
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      const user = await userApi.me().then((r) => r.data);
      setUser(user);
      navigate(workspaceHomePath(user));
    } catch {
      setError("Could not update password. Try the reset link again.");
    }
  };

  if (recoveryMode) {
    return (
      <AuthFormShell>
        <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
        <p className="text-sm text-gray-400 mb-6">Choose a new password for your account.</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className={labelClass}>New password</label>
            <input
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={`w-full ${btnPrimary} py-2.5`}>
            Update password
          </button>
        </form>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell>
      <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
      <p className="text-sm text-gray-400 mb-6">Enter your email and we will send you a reset link.</p>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {message && <p className="text-green-400 text-sm mb-4">{message}</p>}
      <form onSubmit={handleRequestReset} className="space-y-4">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className={`w-full ${btnPrimary} py-2.5`}>
          Send reset link
        </button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Remember your password?{" "}
        <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthFormShell>
  );
}
