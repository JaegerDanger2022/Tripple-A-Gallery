"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import CartDrawer from "@/components/CartDrawer/CartDrawer";
import TweaksPanel from "@/components/TweaksPanel/TweaksPanel";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { tweaks, cssVars } = useApp();
  const [query, setQuery] = useState("");

  return (
    <div className="app" style={cssVars} data-density={tweaks.density}>
      <Header query={query} setQuery={setQuery} />
      <main>{children}</main>
      <Footer />
      <CartDrawer />
      {process.env.NODE_ENV === "development" && <TweaksPanel />}
    </div>
  );
}
