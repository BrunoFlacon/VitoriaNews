/**
 * Tipagem local para as tabelas de pagamento criadas na migração EFI Bank.
 * Este arquivo será substituído quando as types do Supabase forem regeradas via CLI:
 *   supabase gen types typescript --local > src/integrations/supabase/types.ts
 */

export type PaymentChargeStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancelled"
  | "error";

export interface PaymentCharge {
  id: string;
  user_id: string | null;
  subscriber_id: string | null;
  txid: string;
  status: PaymentChargeStatus;
  amount: number;
  plan_type: string | null;
  pix_copy_paste: string | null;
  qr_code_base64: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "past_due";

export interface Subscription {
  id: string;
  user_id: string | null;
  subscriber_id: string | null;
  plan_type: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
