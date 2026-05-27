"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./AuthModal.module.css";

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!authModalOpen) return null;

  function reset() { setEmail(""); setPassword(""); setConfirm(""); setErr(""); setMsg(""); }

  function switchMode(m: "signin" | "signup" | "reset") { setMode(m); reset(); }

  function friendlyError(code: string) {
    if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) return "Incorrect email or password.";
    if (code.includes("email-already-in-use")) return "An account with this email already exists.";
    if (code.includes("weak-password")) return "Password must be at least 6 characters.";
    if (code.includes("invalid-email")) return "Please enter a valid email address.";
    return "Something went wrong. Please try again.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (mode === "signup" && password !== confirm) { setErr("Passwords don't match."); return; }
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        closeAuthModal();
      } else if (mode === "signup") {
        await signUp(email, password);
        closeAuthModal();
      } else {
        await resetPassword(email);
        setMsg("Password reset email sent. Check your inbox.");
      }
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      setErr(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={closeAuthModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={closeAuthModal} aria-label="Close">×</button>

        <div className={styles.tabs}>
          <button className={mode === "signin" ? styles.tabOn : styles.tab} onClick={() => switchMode("signin")}>Sign in</button>
          <button className={mode === "signup" ? styles.tabOn : styles.tab} onClick={() => switchMode("signup")}>Create account</button>
        </div>

        {mode === "reset" ? (
          <>
            <p className={styles.hint}>Enter your email and we'll send a reset link.</p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className="field">
                <span className="field-lbl">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </label>
              {err && <p className={styles.err}>{err}</p>}
              {msg && <p className={styles.msg}>{msg}</p>}
              <button type="submit" className="primary" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
              <button type="button" className="ghost" onClick={() => switchMode("signin")}>← Back to sign in</button>
            </form>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-lbl">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </label>
            <label className="field">
              <span className="field-lbl">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {mode === "signup" && (
              <label className="field">
                <span className="field-lbl">Confirm password</span>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </label>
            )}
            {err && <p className={styles.err}>{err}</p>}
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
            </button>
            {mode === "signin" && (
              <button type="button" className="ghost" onClick={() => switchMode("reset")}>Forgot password?</button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
