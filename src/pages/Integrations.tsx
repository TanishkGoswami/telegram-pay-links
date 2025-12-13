import { useState, useEffect } from 'react';
import { CreditCard, Check, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PaymentConfig } from '@/types/database';

const providers = [
  { value: 'stripe', label: 'Stripe', description: 'Accept cards globally' },
  { value: 'razorpay', label: 'Razorpay', description: 'Popular in India' },
  { value: 'paypal', label: 'PayPal', description: 'Trusted worldwide' },
] as const;

export default function Integrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<'stripe' | 'razorpay' | 'paypal'>('stripe');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [existingConfig, setExistingConfig] = useState<PaymentConfig | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('payment_configs')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setExistingConfig(data as PaymentConfig);
          setProvider(data.provider as 'stripe' | 'razorpay' | 'paypal');
          setApiKey(data.api_key);
          setSecretKey(data.secret_key);
        }
      } catch (error) {
        console.error('Error fetching payment config:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!apiKey.trim() || !secretKey.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both API Key and Secret Key.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('payment_configs')
          .update({
            provider,
            api_key: apiKey,
            secret_key: secretKey,
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Insert new config
        const { error } = await supabase
          .from('payment_configs')
          .insert({
            user_id: user.id,
            provider,
            api_key: apiKey,
            secret_key: secretKey,
          });

        if (error) throw error;
      }

      toast({
        title: "Configuration saved",
        description: "Your payment provider has been configured successfully.",
      });

      // Refresh config
      const { data } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setExistingConfig(data as PaymentConfig);
      }
    } catch (error) {
      console.error('Error saving payment config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Integrations</h1>
          <p className="text-muted-foreground">
            Configure your payment provider to accept subscriptions.
          </p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Payment Provider</CardTitle>
                <CardDescription>
                  Select your preferred payment gateway
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <RadioGroup
              value={provider}
              onValueChange={(v) => setProvider(v as typeof provider)}
              className="grid gap-3"
            >
              {providers.map((p) => (
                <Label
                  key={p.value}
                  htmlFor={p.value}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    provider === p.value 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={p.value} id={p.value} />
                  <div className="flex-1">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-sm text-muted-foreground">{p.description}</div>
                  </div>
                  {existingConfig?.provider === p.value && (
                    <div className="flex items-center gap-1 text-sm text-success">
                      <Check className="w-4 h-4" />
                      Active
                    </div>
                  )}
                </Label>
              ))}
            </RadioGroup>

            {/* API Keys */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key (Publishable)</Label>
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="pk_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="sk_live_..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your secret key is encrypted and stored securely.
                </p>
              </div>
            </div>

            <Button 
              variant="gradient" 
              className="w-full" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {existingConfig ? 'Update Configuration' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
