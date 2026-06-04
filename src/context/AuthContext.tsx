"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/firestore";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  // Tiered-access profile — created on first sign-in. Null when signed out
  // or while it loads. `profileLoading` is true until the first fetch resolves.
  profile: UserProfile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  authModalOpen: boolean;
  openAuthModal: (mode?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [, setModalMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);

      if (!u) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      // Load (or create on first sign-in) the tiered-access profile.
      setProfileLoading(true);
      try {
        const p = await ensureUserProfile(u.uid, u.email ?? "");
        setProfile(p);
      } catch {
        // Firestore unavailable — treat as no profile (everything locked).
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    });
  }, []);

  async function refreshProfile() {
    if (!user) return;
    try {
      const p = await ensureUserProfile(user.uid, user.email ?? "");
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }

  function openAuthModal(mode: "signin" | "signup" = "signin") {
    setModalMode(mode);
    setAuthModalOpen(true);
  }

  function closeAuthModal() { setAuthModalOpen(false); }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, profile, profileLoading, refreshProfile, authModalOpen, openAuthModal, closeAuthModal, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
