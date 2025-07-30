"use client";

import { signOut } from "next-auth/react";
import { Button } from "./button";

interface LogoutButtonProps {
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
}

export function LogoutButton({
  className,
  variant = "ghost",
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <Button onClick={handleLogout} variant={variant} className={className}>
      Sign Out
    </Button>
  );
}
