import { Suspense } from "react";
import BrowsePage from "./BrowsePage";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: 80 }}>Loading…</div>}>
      <BrowsePage />
    </Suspense>
  );
}
