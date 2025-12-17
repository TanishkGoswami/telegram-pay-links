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
        // Fetch subscription
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("id", subId)
          .maybeSingle();

        if (subError) throw subError;
        setSubscription(subData as unknown as Subscription);

        // Fetch landing page
        const { data: pageData, error: pageError } = await supabase
          .from("landing_pages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (pageError) throw pageError;
        setPage(pageData as unknown as LandingPage);
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
