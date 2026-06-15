"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./AuthModal.module.css";

// Password input with its own show/hide toggle. Each instance tracks its own
// visibility so the password and confirm fields reveal independently.
function PasswordField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span className="field-lbl">{label}</span>
      <div className={styles.pwWrap}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          className={styles.pwToggle}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          title={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

export default function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Open on the tab the caller asked for (e.g. "Sign up" in the header).
  useEffect(() => {
    if (authModalOpen) setMode(authModalMode);
  }, [authModalOpen, authModalMode]);

  if (!authModalOpen) return null;

  function clear() { setEmail(""); setPassword(""); setConfirm(""); setErr(""); setMsg(""); }
  function switchMode(m: typeof mode) { setMode(m); clear(); }

  function friendlyError(code: string) {
    if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) return "Incorrect email or password.";
    if (code.includes("email-already-in-use")) return "An account with this email already exists — try signing in instead.";
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
        const { needsVerification } = await signIn(email, password);
        if (needsVerification) {
          setMsg(`Please verify your email to sign in — we've sent a new link to ${email}.`);
        } else {
          closeAuthModal();
        }
      } else if (mode === "signup") {
        await signUp(email, password);
        // Move to the sign-in tab so the next step is clear and the user can't
        // accidentally re-submit "Create account" (which would error as a dupe).
        setMode("signin");
        setPassword("");
        setConfirm("");
        setMsg(`Account created. We've emailed ${email} a verification link — verify it, then sign in.`);
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
          <>
            <div className={styles.tabs}>
              <button className={mode === "signin" ? styles.tabOn : styles.tab} onClick={() => switchMode("signin")}>Sign in</button>
              <button className={mode === "signup" ? styles.tabOn : styles.tab} onClick={() => switchMode("signup")}>Create account</button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className="field">
                <span className="field-lbl">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </label>
              <PasswordField label="Password" value={password} onChange={setPassword} />
              {mode === "signup" && (
                <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} />
              )}
              {err && <p className={styles.err}>{err}</p>}
              <button type="submit" className="primary" disabled={loading}>
                {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
              </button>
              {mode === "signin" && (
                <button type="button" className="ghost" onClick={() => switchMode("reset")}>Forgot password?</button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
