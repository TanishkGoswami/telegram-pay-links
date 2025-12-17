export interface Profile {
  id: string;
  email: string | null;
  created_at: string;
}

export interface LandingPage {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  slug: string;
  telegram_invite_link: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentConfig {
  id: string;
  user_id: string;
  provider: "stripe" | "razorpay" | "paypal";
  api_key: string;
  secret_key: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentLink {
  id: string;
  payment_link_id: string;
  user_id: string;
  landing_page_id: string;
  plan_id: string;
  user_telegram_id: number;
  amount: number;
  currency: string;
  provider: string;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  landing_page_id: string;
  plan_title: string;
  duration_months: number;
  price: number;
  currency: string;
  created_at: string;
}

export interface ProtectedChat {
  chat_id: number;
  chat_title: string | null;
  chat_username: string | null;
  chat_type: string | null;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface ReminderLog {
  id: string;
  user_telegram_id: number;
  chat_id: number;
  day_offset: number;
  sent_at: string;
}

export interface Subscription {
  id: string;
  user_telegram_id: number;
  chat_id: number;
  plan_title: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
