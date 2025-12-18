import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function errorHtml(title: string, message: string, details?: any) {
  return new Response(
    `
    <html>
      <head>
        <title>Payment Verification Failed</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; background: #fff5f5; color: #c53030; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { margin-top: 0; }
          pre { background: #f7fafc; padding: 1rem; border-radius: 4px; overflow-x: auto; color: #2d3748; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>⚠️ ${title}</h1>
          <p>${message}</p>
          ${details ? `<pre>${JSON.stringify(details, null, 2)}</pre>` : ''}
          <p>Please contact support or try again.</p>
        </div>
      </body>
    </html>
    `,
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[verify-payment] Function called - method:", req.method);

    // Create Supabase admin client (bypasses all RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return errorHtml("Configuration Error", "Missing Supabase environment variables on server.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle GET request
    if (req.method === "GET") {
      const url = new URL(req.url);
      const razorpayPaymentLinkId = url.searchParams.get("razorpay_payment_link_id");
      const razorpayPaymentId = url.searchParams.get("razorpay_payment_id");
      
      // Public endpoint to fetch subscription data (for success page)
      const subId = url.searchParams.get("subscription_id");
      const slug = url.searchParams.get("slug");
      
      if (subId && slug && !razorpayPaymentLinkId) {
        try {
          // Fetch subscription
          const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("id", subId)
            .maybeSingle();

          if (subError) throw subError;
          if (!subscription) {
            return new Response(JSON.stringify({ error: "Subscription not found" }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Fetch landing page
          const { data: landingPage, error: pageError } = await supabase
            .from("landing_pages")
            .select("slug, title, telegram_invite_link")
            .eq("slug", slug)
            .maybeSingle();

          if (pageError) throw pageError;
          
          return new Response(JSON.stringify({
            ...subscription,
            landing_page: landingPage
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("[verify-payment] Error fetching subscription:", error);
          return new Response(JSON.stringify({ error: "Subscription not found", details: error.message }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (!razorpayPaymentLinkId) {
        return errorHtml("Invalid Request", "Missing payment link ID in URL parameters.");
      }

      console.log("[verify-payment] Processing:", { razorpayPaymentLinkId, razorpayPaymentId });

      // 1. Fetch payment link
      const { data: paymentLink, error: fetchError } = await supabase
        .from("payment_links")
        .select("*")
        .eq("payment_link_id", razorpayPaymentLinkId)
        .maybeSingle();

      if (fetchError) return errorHtml("Database Error", "Failed to fetch payment link.", fetchError);
      if (!paymentLink) return errorHtml("Payment Link Not Found", `Could not find payment link ID: ${razorpayPaymentLinkId}`);

      // 2. Fetch Config
      const { data: config, error: configError } = await supabase
        .from("payment_configs")
        .select("api_key, secret_key")
        .eq("user_id", paymentLink.user_id)
        .eq("provider", "razorpay")
        .maybeSingle();

      if (configError || !config) return errorHtml("Config Error", "Razorpay configuration not found for this user.");

      // 3. Verify with Razorpay
      const razorpayAuth = btoa(`${config.api_key}:${config.secret_key}`);
      const razorpayRes = await fetch(
        `https://api.razorpay.com/v1/payment_links/${razorpayPaymentLinkId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${razorpayAuth}`,
            "Content-Type": "application/json",
          },
        }
      );

      const razorpayData = await razorpayRes.json();
      if (!razorpayRes.ok) return errorHtml("Razorpay Error", "Failed to verify payment with Razorpay.", razorpayData);

      const isPaid = razorpayData.status === "paid";

      if (isPaid) {
        // 4. Update Status
        await supabase
          .from("payment_links")
          .update({ status: "completed" })
          .eq("payment_link_id", razorpayPaymentLinkId);

        // 5. Get Landing Page
        const { data: landingPage, error: pageError } = await supabase
          .from("landing_pages")
          .select("slug")
          .eq("id", paymentLink.landing_page_id)
          .maybeSingle();

        if (pageError || !landingPage) return errorHtml("Landing Page Error", "Landing page not found found for this payment.");

        // 6. Get Plan
        const { data: plan, error: planError } = await supabase
          .from("plans")
          .select("plan_title, duration_months")
          .eq("id", paymentLink.plan_id)
          .maybeSingle();

        if (planError || !plan) return errorHtml("Plan Error", "Plan details not found.");

        // 7. Create Subscription
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + plan.duration_months);

        const chatId = razorpayData.notes?.chat_id
          ? Number(razorpayData.notes.chat_id)
          : Number(paymentLink.user_telegram_id);
          // Create subscription in subscriptions table
        console.log("[verify-payment] Creating subscription...");

        let subscriptionId = "pending";

        const { data: subscription, error: subError } = await supabase
          .from("subscriptions")
          .insert({
            user_telegram_id: Number(paymentLink.user_telegram_id),
            chat_id: chatId,
            plan_title: plan.plan_title,
            status: "active",
            expires_at: expiryDate.toISOString(),
          })
          .select()
          .single();

        if (subError) {
           console.error("[verify-payment] Error creating subscription:", subError);
           // Don't block redirect on subscription error, but log it.
           // Ideally we should show an error, but priority is redirecting user back to app.
        } else {
           subscriptionId = subscription.id;
        }

        const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:8080";
        // Ensure frontendUrl doesn't have a trailing slash
        const cleanFrontendUrl = frontendUrl.replace(/\/$/, "");

        const redirectUrl = `${cleanFrontendUrl}/p/${landingPage.slug}/success?sub=${subscriptionId}`;

        console.log("[verify-payment] Success! Redirecting to:", redirectUrl);

        // Use proper HTTP 302 redirect for better browser compatibility
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": redirectUrl,
          },
        });
      } else {
        // Payment not paid yet
        return errorHtml("Payment Pending", `Payment status is: ${razorpayData.status}. Please complete payment.`);
      }
    }

    return new Response("Method not allowed", { status: 405 });

  } catch (err) {
    return errorHtml("System Error", "An unexpected error occurred in the edge function.", { message: err.message, stack: err.stack });
  }
});
