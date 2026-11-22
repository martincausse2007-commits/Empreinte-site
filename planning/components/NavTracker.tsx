"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackNavigation } from "@/lib/history";

/** Compte les écrans visités, pour que « ← Retour » sache s'il peut revenir en arrière. */
export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    trackNavigation();
  }, [path]);
  return null;
}
