// Orchestrates the membership-change email: looks for a tier change that hasn't
// been emailed yet (transactional, exactly-once) and sends the matching email.
// Safe to call from every tier-changing path — confirm redirect + webhook — it
// no-ops once the user has already been notified of their current tier.
import { adminNotifyTierChange } from "./userAdmin";
import { sendTierChangeEmail } from "./email";

export async function notifyMembershipChange(uid: string): Promise<void> {
  try {
    const change = await adminNotifyTierChange(uid);
    if (change?.email) await sendTierChangeEmail(change.email, change.from, change.to);
  } catch {
    // Mail is non-critical — never block Stripe fulfilment on a send failure.
  }
}
