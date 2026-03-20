"use client";

import { useUI } from "@/context/UIContext";
import Header from "@/components/Header";
import { ModernHeader } from "@/components/new-look/header";

export default function AdaptiveHeader() {
  const { mode } = useUI();
  return mode === "modern" ? <ModernHeader /> : <Header />;
}
