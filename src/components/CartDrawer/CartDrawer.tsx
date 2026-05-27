"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { ARTWORKS } from "@/lib/data";
import ArtPlaceholder from "@/components/ArtPlaceholder/ArtPlaceholder";
import styles from "./CartDrawer.module.css";

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty } = useApp();
  const router = useRouter();

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const shipping = cart.length ? 24 : 0;

  function goCheckout() {
    setCartOpen(false);
    router.push("/checkout");
  }

  return (
    <>
      <div className={`${styles.scrim} ${cartOpen ? styles.scrimOn : ""}`} onClick={() => setCartOpen(false)} />
      <aside className={`${styles.drawer} ${cartOpen ? styles.drawerOn : ""}`}>
        <div className={styles.hd}>
          <h2>Cart <span className={styles.count}>({cart.length})</span></h2>
          <button className={styles.close} onClick={() => setCartOpen(false)}>×</button>
        </div>

        {cart.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyMark}>◐</div>
            <p>Your cart is quiet.</p>
            <button onClick={() => setCartOpen(false)}>Browse works</button>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {cart.map((it) => {
                const a = ARTWORKS.find((x) => x.id === it.artworkId)!;
                return (
                  <li key={it.id} className={styles.item}>
                    <div className={styles.thumb}>
                      <ArtPlaceholder artwork={a} ratio="square" showLabel={false} />
                    </div>
                    <div className={styles.info}>
                      <div className={styles.itemTitle}><em>{a.title}</em></div>
                      <div className={styles.variant}>{it.variantLabel}{it.frameId !== "none" ? ` · ${it.frameLabel}` : ""}</div>
                      <div className={styles.itemBottom}>
                        <div className={styles.qty}>
                          <button onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))}>−</button>
                          <span>{it.qty}</span>
                          <button onClick={() => updateQty(it.id, it.qty + 1)}>+</button>
                        </div>
                        <div className={styles.itemPrice}>£{(it.price * it.qty).toLocaleString()}</div>
                      </div>
                    </div>
                    <button className={styles.remove} onClick={() => removeFromCart(it.id)} aria-label="Remove">×</button>
                  </li>
                );
              })}
            </ul>

            <div className={styles.foot}>
              <div className={styles.totals}>
                <div><span>Subtotal</span><span>£{subtotal.toLocaleString()}</span></div>
                <div><span>Shipping</span><span>£{shipping}</span></div>
                <div className={styles.total}><span>Total</span><span>£{(subtotal + shipping).toLocaleString()}</span></div>
              </div>
              <button className={styles.checkout} onClick={goCheckout}>Proceed to checkout →</button>
              <p className={styles.note}>Insured · packed by the studio · signed certificate of authenticity</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
