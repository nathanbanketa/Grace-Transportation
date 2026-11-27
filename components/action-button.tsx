"use client";

import { useFormStatus } from "react-dom";

export function ActionButton({ children, pendingLabel = "Saving…", variant = "light", ...props }: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "light" | "outline";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return <button {...props} type="submit" className={`button button-${variant}`} disabled={pending}>
    {pending ? pendingLabel : children}
  </button>;
}
