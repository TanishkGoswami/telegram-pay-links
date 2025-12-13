export interface Profile {
  id: string;
  email: string | null;
  created_at: string;
}

export interface PaymentConfig {
  id: string;
  user_id: string;
  provider: 'stripe' | 'razorpay' | 'paypal';
  api_key: string;
  secret_key: string;
  created_at: string;
  updated_at: string;
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

export interface Plan {
  id: string;
  landing_page_id: string;
  duration_months: number;
  price: number;
  currency: string;
  created_at: string;
}

export interface PageSubscription {
  id: string;
  landing_page_id: string;
  subscriber_username: string;
  status: 'pending' | 'active' | 'expired';
  plan_id: string | null;
  start_date: string;
  expiry_date: string;
  created_at: string;
}

export interface LandingPageWithPlans extends LandingPage {
  plans: Plan[];
}

export interface LandingPageWithSubscribers extends LandingPage {
  subscribers_count: number;
}
