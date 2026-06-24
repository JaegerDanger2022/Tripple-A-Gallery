"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./checkout.module.css";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}

function Field({ label, value, onChange, placeholder, error, type = "text" }: FieldProps) {
  return (
    <label className={`field ${error ? "err" : ""}`}>
      <span className="field-lbl">{label}{error && <span className="field-err"> · {error}</span>}</span>
      <input type={type} value={value} placeholder={placeholder ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// Common shipping destinations first, then the rest alphabetically.
const COUNTRIES = [
  "United Kingdom", "United States", "Canada", "Ireland", "France", "Germany",
  "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Austria",
  "Sweden", "Norway", "Denmark", "Finland", "Portugal", "Poland",
  "Australia", "New Zealand", "Japan", "Singapore", "Hong Kong",
  "United Arab Emirates", "Ghana", "Nigeria", "South Africa", "Kenya",
];

function SelectField({ label, value, onChange, options, error }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; error?: string;
}) {
  return (
    <label className={`field ${error ? "err" : ""}`}>
      <span className="field-lbl">{label}{error && <span className="field-err"> · {error}</span>}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default function CheckoutPage() {
  const { cart, artworks, shippingFee } = useApp();
  const { user, authLoading, openAuthModal, profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "", name: "", address1: "", address2: "", city: "",
    postal: "", country: "United Kingdom",
  });

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: f.email || user.email! }));
  }, [user]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Saved shipping address (from the user's profile, written on their last
  // checkout). When present we default to it and let the buyer enter a new one.
  const saved = profile?.shipTo;
  const [useNewAddress, setUseNewAddress] = useState(false);
  const prefilled = useRef(false);

  // Pre-fill the address form from the saved address once, when it first loads.
  useEffect(() => {
    if (saved && !prefilled.current) {
      prefilled.current = true;
      setForm((f) => ({
        ...f,
        name: saved.name, address1: saved.address1, address2: saved.address2 ?? "",
        city: saved.city, postal: saved.postal, country: saved.country,
      }));
    }
  }, [saved]);

  function useSavedAddress() {
    if (!saved) return;
    setForm((f) => ({
      ...f,
      name: saved.name, address1: saved.address1, address2: saved.address2 ?? "",
      city: saved.city, postal: saved.postal, country: saved.country,
    }));
    setUseNewAddress(false);
    setErrors({});
  }

  function useDifferentAddress() {
    setForm((f) => ({ ...f, name: "", address1: "", address2: "", city: "", postal: "", country: "United Kingdom" }));
    setUseNewAddress(true);
    setErrors({});
  }

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  // Digital downloads aren't shipped — only charge shipping when a physical item is present.
  const hasPhysical = cart.some((it) => !it.isDigital);
  const shipping = hasPhysical ? shippingFee : 0;
  const total = subtotal + shipping;

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function validate(stepN: number) {
    const e: Record<string, string> = {};
    if (stepN === 1) {
      if (!form.email.includes("@")) e.email = "Please enter a valid email";
    } else if (stepN === 2) {
      if (!form.name) e.name = "Required";
      if (!form.address1) e.address1 = "Required";
      if (!form.city) e.city = "Required";
      if (!form.postal) e.postal = "Required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() { if (validate(step)) setStep(step + 1); }

  const [placing, setPlacing] = useState(false);
  const [payErr, setPayErr] = useState("");

  // Hand off to Stripe Checkout. The cart is recomputed + charged server-side;
  // we only send item references (artwork/variant/frame), never prices. The
  // order is recorded server-side and marked paid on return / via webhook.
  async function payNow() {
    setPayErr("");
    if (!user) { openAuthModal("signin"); return; }

    setPlacing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/stripe/cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: form.email || user.email || "",
          shipTo: hasPhysical ? {
            name: form.name, address1: form.address1, address2: form.address2,
            city: form.city, postal: form.postal, country: form.country,
          } : undefined,
          items: cart.map((it) => ({
            artworkId: it.artworkId,
            variantId: it.variantId,
            frameId: it.frameId,
            qty: it.qty,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) {
        // Full-page redirect to Stripe's hosted checkout.
        window.location.href = body.url;
        return;
      }
      setPayErr(body.error || "Could not start checkout. Please try again.");
    } catch {
      setPayErr("Could not reach the payment service. Please try again.");
    } finally {
      setPlacing(false);
    }
  }

  if (authLoading) {
    return (
      <main className={styles.checkout}>
        <div className={styles.empty}><p className="form-note">Loading…</p></div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className={styles.checkout}>
        <div className={styles.empty}>
          <h1><em>Your cart is empty.</em></h1>
          <button onClick={() => router.push("/")}>← Back to works</button>
        </div>
      </main>
    );
  }

  // No guest checkout — orders, receipts and digital downloads are tied to an
  // account, so a buyer must be signed in before they can pay.
  if (!user) {
    return (
      <main className={styles.checkout}>
        <div className={styles.empty}>
          <h1><em>Sign in to check out.</em></h1>
          <p className="form-note">Your order, receipt and any downloads are saved to your account.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="primary" onClick={() => openAuthModal("signup")}>Create account</button>
            <button className="ghost" onClick={() => openAuthModal("signin")}>Sign in</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.checkout}>
      <div className={styles.grid}>
        <section className={styles.main}>
          <a className={styles.back} onClick={() => router.push("/")}>← Back to gallery</a>
          <h1 className={styles.title}><em>Checkout</em></h1>

          <ol className={styles.steps}>
            {["Contact", "Shipping", "Payment"].map((s, i) => (
              <li key={s} className={`${styles.step} ${step === i + 1 ? styles.stepOn : ""} ${step > i + 1 ? styles.stepDone : ""}`}>
                <span className={styles.stepNum}>{step > i + 1 ? "✓" : String(i + 1).padStart(2, "0")}</span>
                <span className={styles.stepLbl}>{s}</span>
              </li>
            ))}
          </ol>

          {step === 1 && (
            <div className="form">
              <Field label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@studio.com" error={errors.email} type="email" />
              <p className="form-note">We'll send the receipt and shipping updates here. No mailing list, ever.</p>
              <button className="primary" onClick={next}>Continue to shipping →</button>
            </div>
          )}

          {step === 2 && (
            <div className="form">
              {saved && !useNewAddress ? (
                <>
                  <div className={styles.payBox}>
                    <div className="kicker">Saved shipping address</div>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>
                      <strong>{saved.name}</strong><br />
                      {saved.address1}{saved.address2 ? `, ${saved.address2}` : ""}<br />
                      {saved.city}, {saved.postal}<br />
                      {saved.country}
                    </p>
                  </div>
                  <button className="ghost" type="button" onClick={useDifferentAddress}>
                    Ship to a different address
                  </button>
                  <div className="form-actions">
                    <button className="ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="primary" onClick={next}>Continue to payment →</button>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Full name" value={form.name} onChange={(v) => set("name", v)} error={errors.name} />
                  <Field label="Address line 1" value={form.address1} onChange={(v) => set("address1", v)} error={errors.address1} />
                  <Field label="Address line 2 (optional)" value={form.address2} onChange={(v) => set("address2", v)} />
                  <div className="form-row">
                    <Field label="City" value={form.city} onChange={(v) => set("city", v)} error={errors.city} />
                    <Field label="Postal code" value={form.postal} onChange={(v) => set("postal", v)} error={errors.postal} />
                  </div>
                  <SelectField label="Country" value={form.country} onChange={(v) => set("country", v)} options={COUNTRIES} />
                  {saved && (
                    <button className="ghost" type="button" onClick={useSavedAddress}>
                      ← Use saved address
                    </button>
                  )}
                  <p className="form-note">This address is saved to your account for next time.</p>
                  <div className="form-actions">
                    <button className="ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="primary" onClick={next}>Continue to payment →</button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="form">
              <div className={styles.payBox}>
                <div className={styles.payBoxHd}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Secure payment via Stripe</span>
                </div>
                <p className="form-note">
                  You&apos;ll be taken to Stripe&apos;s secure checkout to pay by card, then brought straight back here. We never see or store your card details.
                </p>
              </div>
              {!user && (
                <p className="form-note">Sign in to complete your purchase — your order and any downloads are saved to your account.</p>
              )}
              {payErr && <p className={styles.payErr}>{payErr}</p>}
              <div className="form-actions">
                <button className="ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="primary" onClick={payNow} disabled={placing}>
                  {placing ? "Redirecting…" : user ? `Pay $${total.toLocaleString()} →` : "Sign in to pay →"}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.side}>
          <div className="kicker">Order summary</div>
          <ul className={styles.items}>
            {cart.map((it) => {
              const a = artworks.find((x) => x.id === it.artworkId);
              if (!a) return null;
              return (
                <li key={it.id}>
                  <div className={styles.coThumb}><ArtPlaceholder artwork={a} ratio="square" showLabel={false} /></div>
                  <div className={styles.coInfo}>
                    <div className={styles.coTitle}><em>{a.title}</em></div>
                    <div className={styles.coMeta}>{it.variantLabel}{it.frameId !== "none" ? ` · ${it.frameLabel}` : ""}</div>
                    <div className={styles.coQty}>Qty {it.qty}</div>
                  </div>
                  <div className={styles.coPrice}>${(it.price * it.qty).toLocaleString()}</div>
                </li>
              );
            })}
          </ul>
          <dl className={styles.totals}>
            <div><dt>Subtotal</dt><dd>${subtotal.toLocaleString()}</dd></div>
            <div><dt>Shipping</dt><dd>${shipping}</dd></div>
            <div className={styles.totalRow}><dt>Total</dt><dd>${total.toLocaleString()}</dd></div>
          </dl>
          <p className={styles.coNote}>Ships within 5–7 working days. Originals are packed in custom crates; expect +3 days.</p>
        </aside>
      </div>
    </main>
  );
}
