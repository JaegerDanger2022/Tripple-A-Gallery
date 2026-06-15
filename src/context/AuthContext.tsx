"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile, getUserProfileFresh } from "@/lib/firestore";
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
  authModalMode: "signin" | "signup";
  openAuthModal: (mode?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  // Both resolve with whether the account still needs email verification. When
  // true the session has been ended (verification is required to use the app),
  // so the caller should prompt the user to verify rather than grant access.
  signIn: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  signUp: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
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
  const [authModalMode, setModalMode] = useState<"signin" | "signup">("signin");

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
      // Force a server read — the caller (e.g. post-Stripe fulfilment) needs the
      // tier just written by the Admin SDK, which a cached read would miss.
      const p = (await getUserProfileFresh(user.uid)) ??
        (await ensureUserProfile(user.uid, user.email ?? ""));
      setProfile(p);
    } catch {
      // Keep whatever profile we already have rather than blanking it.
    }
  }

  function openAuthModal(mode: "signin" | "signup" = "signin") {
    setModalMode(mode);
    setAuthModalOpen(true);
  }

  function closeAuthModal() { setAuthModalOpen(false); }

  async function signIn(email: string, password: string): Promise<{ needsVerification: boolean }> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Email verification is REQUIRED. An unverified account can't hold a session:
    // resend the link and sign back out so they must verify first.
    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user).catch(() => {});
      await firebaseSignOut(auth);
      return { needsVerification: true };
    }
    // First verified sign-in: fire the branded welcome (deduped server-side, so
    // it sends exactly once — and never to an unverified/spam address).
    cred.user
      .getIdToken()
      .then((token) =>
        fetch("/api/account/welcome", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .catch(() => {});
    return { needsVerification: false };
  }

  async function signUp(email: string, password: string): Promise<{ needsVerification: boolean }> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Send the verification link, then end the session — the account must be
    // verified before it can be used (lets us purge unverified/spam signups).
    // The welcome email is deferred to the first verified sign-in.
    await sendEmailVerification(cred.user).catch(() => {});
    await firebaseSignOut(auth);
    return { needsVerification: true };
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, profile, profileLoading, refreshProfile, authModalOpen, authModalMode, openAuthModal, closeAuthModal, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
