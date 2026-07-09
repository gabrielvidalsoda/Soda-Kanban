import { useEffect, useRef, useState } from "react";
import { userApi } from "../api/client";
import type { User } from "../types";

interface UserAvatarProps {
  user: User | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClass = {
  sm: "h-10 w-10 text-sm",
  md: "h-24 w-24 text-2xl",
  lg: "h-28 w-28 text-3xl",
  xl: "h-32 w-32 text-4xl",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSrc(null);

    if (!user?.avatar_url) return;

    let cancelled = false;
    userApi
      .fetchAvatar(user.id)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [user?.avatar_url, user?.id]);

  const baseClass = `${sizeClass[size]} rounded-full flex items-center justify-center font-semibold shrink-0 overflow-hidden`;

  if (src) {
    return <img src={src} alt={user?.name ?? "Profile"} className={`${baseClass} object-cover ${className}`} />;
  }

  return (
    <div className={`${baseClass} bg-blue-600 text-white ${className}`}>
      {user?.name ? getInitials(user.name) : "?"}
    </div>
  );
}
