import { useState, useEffect } from "react";

import { useParams, useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Send, Loader2, ExternalLink } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Subscription, LandingPage } from "@/types/database";

export default function Success() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const subId = searchParams.get("sub");

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!subId || !slug) return;

      try {
        // Use public endpoint to fetch subscription data without auth
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/verify-payment?subscription_id=${subId}&slug=${slug}`,
          {
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch subscription");
        }

        const data = await response.json();

        // Set subscription data
        setSubscription({
          id: data.id,
          user_telegram_id: data.user_telegram_id,
          chat_id: data.chat_id,
          plan_title: data.plan_title,
          status: data.status,
          expires_at: data.expires_at,
          created_at: data.created_at,
        } as Subscription);

        // Set page data from landing_page
        if (data.landing_page) {
          setPage({
            slug: data.landing_page.slug,
            title: data.landing_page.title,
            telegram_invite_link: data.landing_page.telegram_invite_link,
          } as LandingPage);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [subId, slug]);

  const handleJoinChannel = () => {
    if (page?.telegram_invite_link) {
      window.open(page.telegram_invite_link, "_blank");
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

  if (!subscription || subscription.status !== "active") {
    return (
      <PublicLayout>
        <Card variant="elevated" className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <Send className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Subscription Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              We couldn't verify your subscription. Please try again or contact
              support.
            </p>
            <Link to={`/p/${slug}`}>
              <Button variant="outline" className="w-full">
                Go Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="w-full max-w-md animate-fade-in">
        <Card variant="elevated" className="overflow-hidden">
          {/* Success Header */}
          <div className="bg-success/10 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Payment Successful!
            </h1>
            <p className="text-muted-foreground">
              Your subscription is now active
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Subscription Details */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-medium">
                  {subscription.user_telegram_id.toString()}
                </span>
              </div>
              {subscription.plan_title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{subscription.plan_title}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-success capitalize">
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">
                  {new Date(subscription.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Join Button */}
            <Button
              variant="gradient"
              size="xl"
              className="w-full"
              onClick={handleJoinChannel}
            >
              <Send className="w-5 h-5" />
              Join {page?.title || "Channel"}
              <ExternalLink className="w-4 h-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Click the button above to join the private Telegram channel.
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
