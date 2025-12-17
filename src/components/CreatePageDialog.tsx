import { useState } from "react";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const step1Schema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  telegramLink: z
    .string()
    .url("Please enter a valid URL")
    .refine(
      (url) => url.includes("t.me") || url.includes("telegram"),
      "Please enter a valid Telegram invite link"
    ),
});

interface PlanInput {
  months: number;
  price: string;
  currency: string;
}

export function CreatePageDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePageDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [telegramLink, setTelegramLink] = useState("");

  // Step 2 state
  const [plans, setPlans] = useState<PlanInput[]>([
    { months: 1, price: "", currency: "USD" },
    { months: 6, price: "", currency: "USD" },
    { months: 12, price: "", currency: "USD" },
  ]);

  const generateSlug = (text: string) => {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50) +
      "-" +
      Date.now().toString(36)
    );
  };

  const validateStep1 = () => {
    const result = step1Schema.safeParse({ title, description, telegramLink });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    const validPlans = plans.filter((p) => p.price && parseFloat(p.price) > 0);
    if (validPlans.length === 0) {
      toast({
        title: "At least one plan required",
        description: "Please add a price for at least one subscription plan.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!validateStep2()) return;

    setLoading(true);

    try {
      const slug = generateSlug(title);

      // Create landing page
      const { data: pageData, error: pageError } = await supabase
        .from("landing_pages")
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          slug,
          telegram_invite_link: telegramLink,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      // Create plans
      const validPlans = plans
        .filter((p) => p.price && parseFloat(p.price) > 0)
        .map((p) => ({
          landing_page_id: pageData.id,
          plan_title:
            p.months === 1
              ? "1 Month"
              : p.months === 6
              ? "6 Months"
              : p.months === 12
              ? "1 Year"
              : `${p.months} Months`,
          duration_months: p.months,
          price: parseFloat(p.price),
          currency: p.currency,
        }));

      if (validPlans.length > 0) {
        const { error: plansError } = await supabase
          .from("plans")
          .insert(validPlans);

        if (plansError) throw plansError;
      }

      toast({
        title: "Page created!",
        description: "Your landing page is now live.",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setTelegramLink("");
      setPlans([
        { months: 1, price: "", currency: "INR" },
        { months: 6, price: "", currency: "INR" },
        { months: 12, price: "", currency: "INR" },
      ]);
      setStep(1);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating page:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = (index: number, field: keyof PlanInput, value: string) => {
    setPlans(plans.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Landing Page</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Set up your channel information"
              : "Configure your subscription plans"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 py-2">
          <div
            className={`flex-1 h-1 rounded-full ${
              step >= 1 ? "bg-primary" : "bg-muted"
            }`}
          />
          <div
            className={`flex-1 h-1 rounded-full ${
              step >= 2 ? "bg-primary" : "bg-muted"
            }`}
          />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Channel Name *</Label>
              <Input
                id="title"
                placeholder="Premium Trading Signals"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Get exclusive access to daily trading signals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegramLink">Telegram Invite Link *</Label>
              <Input
                id="telegramLink"
                placeholder="https://t.me/+AbCdEfGhIjK"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
              />
              {errors.telegramLink && (
                <p className="text-sm text-destructive">
                  {errors.telegramLink}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The private invite link to your Telegram channel
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {plans.map((plan, index) => (
                <div
                  key={plan.months}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-shrink-0 w-20">
                    <span className="text-sm font-medium">
                      {plan.months === 1
                        ? "1 Month"
                        : plan.months === 6
                        ? "6 Months"
                        : "1 Year"}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={plan.price}
                      onChange={(e) =>
                        updatePlan(index, "price", e.target.value)
                      }
                      className="w-24"
                      min="0"
                      step="0.01"
                    />
                    <select
                      value={plan.currency}
                      onChange={(e) =>
                        updatePlan(index, "currency", e.target.value)
                      }
                      className="h-10 px-3 rounded-md border bg-background text-sm"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Leave price empty to disable a plan. At least one plan is
              required.
            </p>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                variant="gradient"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create Page
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
