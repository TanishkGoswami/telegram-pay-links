import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, Loader2, Check } from "lucide-react";
import { z } from "zod";
import { PublicLayout } from "@/components/layout/PublicLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { LandingPage, Plan } from "@/types/database";
import { addMonths } from "date-fns";

const telegramIdSchema = z
  .string()
  .min(5, "Telegram User ID is required")
  .regex(/^\d+$/, "Telegram User ID must be numeric");

export default function LandingPageView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState<LandingPage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [telegramId, setTelegramId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<
    "razorpay" | "stripe" | "paypal"
  >("razorpay");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPage() {
      if (!slug) return;

      try {
        // Fetch landing page
        const { data: pageData, error: pageError } = await supabase
          .from("landing_pages")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (pageError) throw pageError;

        if (!pageData) {
          navigate("/404");
          return;
        }

        setPage(pageData as LandingPage);

        // Fetch plans
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("*")
          .eq("landing_page_id", pageData.id)
          .order("duration_months", { ascending: true });

        if (plansError) throw plansError;

        setPlans(plansData as Plan[]);
        if (plansData && plansData.length > 0) {
          setSelectedPlan(plansData[0] as Plan);
        }

        // Fetch payment config for this user to get the configured provider
        const { data: paymentConfig, error: configError } = await supabase
          .from("payment_configs")
          .select("provider")
          .eq("user_id", pageData.user_id)
          .maybeSingle();

        if (!configError && paymentConfig) {
          setPaymentProvider(
            paymentConfig.provider as "razorpay" | "stripe" | "paypal"
          );
        }
      } catch (error) {
        console.error("Error fetching page:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug, navigate]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getDurationLabel = (months: number) => {
    if (months === 1) return "1 Month";
    if (months === 6) return "6 Months";
    if (months === 12) return "1 Year";
    return `${months} Months`;
  };

  const handlePayment = async () => {
    setError("");

    // Validate Telegram User ID
    const result = telegramIdSchema.safeParse(telegramId.trim());
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!selectedPlan || !page) return;

    setProcessing(true);

    try {
      // Debug logging
      console.log("🔍 Debug Info:");
      console.log("Landing Page user_id:", page.user_id);
      console.log("Payment Provider:", paymentProvider);
      console.log("Selected Plan:", selectedPlan);
      console.log("Telegram ID:", telegramId);

      // Call Edge Function to create payment link
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        "https://fvqwtfsohpgrdelhplvq.supabase.co/functions/v1/create-payment-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
            }`,
          },
          body: JSON.stringify({
            amount: selectedPlan.price,
            currency: selectedPlan.currency,
            plan_title: selectedPlan.plan_title || "",
            user_telegram_id: parseInt(telegramId.trim(), 10),
            chat_id: parseInt(telegramId.trim(), 10), // Using user's telegram ID as chat_id for direct messages
            provider: paymentProvider, // Use provider from payment_configs (Integrations page)
            user_id: page.user_id, // Landing page owner's user_id for fetching payment config
            landing_page_id: page.id, // Landing page ID for verification
            plan_id: selectedPlan.id, // Plan ID for creating subscription
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to create payment link");
      }
      // Redirect to payment link
      window.location.href = data.url;
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <PublicLayout>
      <div className="w-full max-w-md animate-fade-in">
        <Card variant="elevated" className="overflow-hidden">
          {/* Hero */}
          <div className="gradient-primary p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-foreground/20 flex items-center justify-center backdrop-blur">
              <Send className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground mb-2">
              {page.title}
            </h1>
            {page.description && (
              <p className="text-primary-foreground/80 text-sm">
                {page.description}
              </p>
            )}
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Telegram User ID Input */}
            <div className="space-y-2">
              <Label htmlFor="telegramId">Your Telegram User ID</Label>
              <Input
                id="telegramId"
                placeholder="e.g. 123456789"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                className="text-center text-lg"
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>

            {/* Plan Selection */}
            <div className="space-y-3">
              <Label>Select Plan</Label>
              <div className="grid gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      selectedPlan?.id === plan.id
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {getDurationLabel(plan.duration_months)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatPrice(
                            plan.price / plan.duration_months,
                            plan.currency
                          )}
                          /month
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                          {formatPrice(plan.price, plan.currency)}
                        </div>
                      </div>
                    </div>
                    {selectedPlan?.id === plan.id && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              variant="gradient"
              size="xl"
              className="w-full"
              onClick={handlePayment}
              disabled={!selectedPlan || !telegramId || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay{" "}
                  {selectedPlan &&
                    formatPrice(selectedPlan.price, selectedPlan.currency)}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment. Cancel anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
