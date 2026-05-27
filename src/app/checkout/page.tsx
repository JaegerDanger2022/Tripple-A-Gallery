"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./checkout.module.css";

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}

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

export default function CheckoutPage() {
  const { cart, clearCart, artworks } = useApp();
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "", name: "", address1: "", address2: "", city: "",
    postal: "", country: "United Kingdom", card: "", exp: "", cvc: "",
  });

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, email: f.email || user.email! }));
  }, [user]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = cart.length ? 24 : 0;
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
    } else if (stepN === 3) {
      if (form.card.replace(/\s/g, "").length < 14) e.card = "Card number looks short";
      if (!/^\d{2}\/\d{2}$/.test(form.exp)) e.exp = "MM/YY";
      if (form.cvc.length < 3) e.cvc = "3 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() { if (validate(step)) setStep(step + 1); }

  function placeOrder() {
    if (!validate(3)) return;
    const sub = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const orderId = "AI-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    clearCart();
    router.push(`/confirmation?orderId=${orderId}&total=${sub + 24}`);
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
              <Field label="Full name" value={form.name} onChange={(v) => set("name", v)} error={errors.name} />
              <Field label="Address line 1" value={form.address1} onChange={(v) => set("address1", v)} error={errors.address1} />
              <Field label="Address line 2 (optional)" value={form.address2} onChange={(v) => set("address2", v)} />
              <div className="form-row">
                <Field label="City" value={form.city} onChange={(v) => set("city", v)} error={errors.city} />
                <Field label="Postal code" value={form.postal} onChange={(v) => set("postal", v)} error={errors.postal} />
              </div>
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
              <div className="form-actions">
                <button className="ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="primary" onClick={next}>Continue to payment →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form">
              <Field label="Card number" value={form.card} onChange={(v) => set("card", formatCard(v))} placeholder="4242 4242 4242 4242" error={errors.card} />
              <div className="form-row">
                <Field label="Expiry" value={form.exp} onChange={(v) => set("exp", formatExp(v))} placeholder="MM/YY" error={errors.exp} />
                <Field label="CVC" value={form.cvc} onChange={(v) => set("cvc", v.replace(/\D/g, "").slice(0, 4))} placeholder="123" error={errors.cvc} />
              </div>
              <p className="form-note">Payment processed securely. Card details aren't stored on our end.</p>
              <div className="form-actions">
                <button className="ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="primary" onClick={placeOrder}>Place order · £{total.toLocaleString()}</button>
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
                  <div className={styles.coPrice}>£{(it.price * it.qty).toLocaleString()}</div>
                </li>
              );
            })}
          </ul>
          <dl className={styles.totals}>
            <div><dt>Subtotal</dt><dd>£{subtotal.toLocaleString()}</dd></div>
            <div><dt>Shipping</dt><dd>£{shipping}</dd></div>
            <div className={styles.totalRow}><dt>Total</dt><dd>£{total.toLocaleString()}</dd></div>
          </dl>
          <p className={styles.coNote}>Ships within 5–7 working days. Originals are packed in custom crates; expect +3 days.</p>
        </aside>
      </div>
    </main>
  );
}
