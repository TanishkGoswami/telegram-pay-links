import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, Check } from 'lucide-react';
import { z } from 'zod';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LandingPage, Plan } from '@/types/database';
import { addMonths } from 'date-fns';

const usernameSchema = z.string()
  .min(1, 'Username is required')
  .max(50, 'Username is too long')
  .refine(val => val.startsWith('@') || !val.includes(' '), 'Invalid username format');

export default function LandingPageView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [page, setPage] = useState<LandingPage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [username, setUsername] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPage() {
      if (!slug) return;

      try {
        // Fetch landing page
        const { data: pageData, error: pageError } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (pageError) throw pageError;

        if (!pageData) {
          navigate('/404');
          return;
        }

        setPage(pageData as LandingPage);

        // Fetch plans
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('landing_page_id', pageData.id)
          .order('duration_months', { ascending: true });

        if (plansError) throw plansError;

        setPlans(plansData as Plan[]);
        if (plansData && plansData.length > 0) {
          setSelectedPlan(plansData[0] as Plan);
        }
      } catch (error) {
        console.error('Error fetching page:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug, navigate]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const getDurationLabel = (months: number) => {
    if (months === 1) return '1 Month';
    if (months === 6) return '6 Months';
    if (months === 12) return '1 Year';
    return `${months} Months`;
  };

  const handlePayment = async () => {
    setError('');

    // Validate username
    const formattedUsername = username.startsWith('@') ? username : `@${username}`;
    const result = usernameSchema.safeParse(formattedUsername);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!selectedPlan || !page) return;

    setProcessing(true);

    try {
      const expiryDate = addMonths(new Date(), selectedPlan.duration_months);

      // Create subscription with pending status
      const { data: subscription, error: subError } = await supabase
        .from('page_subscriptions')
        .insert({
          landing_page_id: page.id,
          subscriber_username: formattedUsername,
          status: 'pending',
          plan_id: selectedPlan.id,
          expiry_date: expiryDate.toISOString(),
        })
        .select()
        .single();

      if (subError) throw subError;

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update to active
      const { error: updateError } = await supabase
        .from('page_subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription.id);

      if (updateError) throw updateError;

      // Navigate to success page
      navigate(`/p/${slug}/success?sub=${subscription.id}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment failed",
        description: "Something went wrong. Please try again.",
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
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username">Your Telegram Username</Label>
              <Input
                id="username"
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                        ? 'border-primary bg-primary/5 shadow-soft'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          {getDurationLabel(plan.duration_months)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatPrice(plan.price / plan.duration_months, plan.currency)}/month
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
              disabled={!selectedPlan || !username || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {selectedPlan && formatPrice(selectedPlan.price, selectedPlan.currency)}
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
