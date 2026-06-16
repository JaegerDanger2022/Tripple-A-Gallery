"use client";

// Custom Firebase email-action handler. Firebase links every auth email
// (verify email, password reset, email recovery) to whatever "action URL" is
// configured in the Console — point that at /auth/action and this branded page
// replaces Firebase's default screen, so users never see *.firebaseapp.com.
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import styles from "./action.module.css";

type View = "loading" | "success" | "error" | "resetForm";

function ActionInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { openAuthModal } = useAuth();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") ?? "";

  const [view, setView] = useState<View>("loading");
  const [heading, setHeading] = useState("");
  const [message, setMessage] = useState("");
  // Password-reset form state
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Run the code-handling effect once.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      if (!mode || !oobCode) {
        setView("error");
        setHeading("Link not recognised");
        setMessage("This link is missing information. Please use the most recent email we sent you.");
        return;
      }
      try {
        switch (mode) {
          case "verifyEmail":
          case "verifyAndChangeEmail": {
            await applyActionCode(auth, oobCode);
            setView("success");
            setHeading("Your email is verified");
            setMessage("Thank you — your email address has been confirmed. You can now sign in and explore the collection.");
            break;
          }
          case "recoverEmail": {
            await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            setView("success");
            setHeading("Your email has been restored");
            setMessage("The change has been reversed and your original email address is back in place. If this wasn't you, please reset your password.");
            break;
          }
          case "resetPassword": {
            // Validate the code first; reveals the form only if it's good.
            await verifyPasswordResetCode(auth, oobCode);
            setView("resetForm");
            setHeading("Choose a new password");
            break;
          }
          default: {
            setView("error");
            setHeading("Unsupported request");
            setMessage("We couldn't process this link.");
          }
        }
      } catch {
        setView("error");
        if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
          // The account may have been removed (unverified accounts are purged),
          // which invalidates the link — guide them to start over.
          setHeading("This link is no longer valid");
          setMessage("Your verification link has expired, or the account was removed because it wasn't verified in time. Please create your account again — it only takes a moment.");
        } else {
          setHeading("This link has expired");
          setMessage("For your security, these links are single-use and time-limited. Please request a fresh one.");
        }
      }
    })();
  }, [mode, oobCode]);

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    if (pw.length < 6) { setFormErr("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setFormErr("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw);
      setView("success");
      setHeading("Your password is set");
      setMessage("Your password has been updated. You can now sign in with it.");
    } catch {
      setFormErr("We couldn't reset your password — this link may have expired. Please request a new one.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>A</div>
        <div className="kicker">Triple A Gallery</div>

        {view === "loading" && <p className={styles.muted}>One moment…</p>}

        {view === "resetForm" && (
          <>
            <h1 className={styles.heading}>{heading}</h1>
            <form className="form" onSubmit={submitReset}>
              <label className="field">
                <span className="field-lbl">New password</span>
                <div className={styles.pwWrap}>
                  <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} required style={{ paddingRight: 40 }} />
                  <button type="button" className={styles.pwToggle} onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="field">
                <span className="field-lbl">Confirm new password</span>
                <input type={show ? "text" : "password"} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
              </label>
              {formErr && <p className={styles.err}>{formErr}</p>}
              <button type="submit" className="primary" disabled={submitting}>{submitting ? "Saving…" : "Set new password"}</button>
            </form>
          </>
        )}

        {view === "success" && (
          <>
            <h1 className={styles.heading}>{heading}</h1>
            <p className={styles.body}>{message}</p>
            <div className={styles.actions}>
              <button className="primary" onClick={() => { router.push("/"); openAuthModal("signin"); }}>Sign in →</button>
              <button className="ghost" onClick={() => router.push("/")}>Go to the gallery</button>
            </div>
          </>
        )}

        {view === "error" && (
          <>
            <h1 className={styles.heading}>{heading}</h1>
            <p className={styles.body}>{message}</p>
            <div className={styles.actions}>
              {mode === "verifyEmail" || mode === "verifyAndChangeEmail" ? (
                <>
                  <button className="primary" onClick={() => { router.push("/"); openAuthModal("signup"); }}>Create an account →</button>
                  <button className="ghost" onClick={() => { router.push("/"); openAuthModal("signin"); }}>Sign in</button>
                </>
              ) : (
                <button className="primary" onClick={() => router.push("/")}>Back to the gallery</button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={<main className={styles.wrap}><div className={styles.card}><p className={styles.muted}>One moment…</p></div></main>}>
      <ActionInner />
    </Suspense>
  );
}
