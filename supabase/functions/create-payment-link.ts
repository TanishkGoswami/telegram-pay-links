import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: Require JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const jwt = authHeader.replace("Bearer ", "");

    // Create regular client for auth (uses JWT)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Create admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      amount,
      currency,
      plan_title,
      user_telegram_id,
      chat_id,
      provider,
      user_id,
      landing_page_id,
      plan_id,
    } = body ?? {};

    if (
      amount == null ||
      !currency ||
      !plan_title ||
      !user_telegram_id ||
      !chat_id ||
      !provider ||
      !user_id
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields (amount, currency, plan_title, user_telegram_id, chat_id, provider, user_id)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stripe
    if (provider === "stripe") {
      // Ensure bigint fields are numbers
      const userTelegramId =
        typeof user_telegram_id === "string"
          ? Number(user_telegram_id)
          : user_telegram_id;
      const chatId = typeof chat_id === "string" ? Number(chat_id) : chat_id;
      if (isNaN(userTelegramId) || isNaN(chatId)) {
        return new Response(
          JSON.stringify({
            error: "user_telegram_id and chat_id must be numbers (bigint)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

      // Fetch user's Stripe config from database
      const { data: config, error: configError } = await supabase
        .from("payment_configs")
        .select("secret_key")
        .eq("user_id", user_id)
        .eq("provider", "stripe")
        .maybeSingle();

      if (configError || !config || !config.secret_key) {
        // Fallback to environment variable if no user config
        if (!stripeSecret) {
          return new Response(
            JSON.stringify({
              error:
                "No Stripe config found. Please configure in Integrations.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      const secretKey = config?.secret_key || stripeSecret;

      const params = new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][product_data][name]": plan_title,
        "line_items[0][price_data][unit_amount]": Math.round(
          Number(amount) * 100
        ).toString(),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: "https://yourdomain.com/success",
        cancel_url: "https://yourdomain.com/cancel",
        "metadata[user_telegram_id]": String(userTelegramId),
        "metadata[chat_id]": String(chatId),
      });

      const stripeRes = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        }
      );

      const session = await stripeRes.json();

      if (!stripeRes.ok || !session?.url) {
        return new Response(
          JSON.stringify({
            error: session?.error?.message || "Stripe error",
            details: session,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          url: session.url,
          payment_id: session.id,
          payment_provider: "stripe",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Razorpay
    if (provider === "razorpay") {
      // Ensure bigint fields are numbers
      const userTelegramId =
        typeof user_telegram_id === "string"
          ? Number(user_telegram_id)
          : user_telegram_id;
      const chatId = typeof chat_id === "string" ? Number(chat_id) : chat_id;
      if (isNaN(userTelegramId) || isNaN(chatId)) {
        return new Response(
          JSON.stringify({
            error: "user_telegram_id and chat_id must be numbers (bigint)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Fetch payment config for this user and provider (using user_id from request)
      const { data: config, error: configError } = await supabase
        .from("payment_configs")
        .select("api_key, secret_key")
        .eq("user_id", user_id)
        .eq("provider", "razorpay")
        .maybeSingle();

      if (configError || !config || !config.api_key || !config.secret_key) {
        return new Response(
          JSON.stringify({
            error:
              "No Razorpay config found for user. Please configure in Integrations.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create Razorpay Payment Link
      const razorpayAuth = btoa(`${config.api_key}:${config.secret_key}`);
      const razorpayPayload = {
        amount: Math.round(Number(amount) * 100), // Razorpay expects amount in paise (smallest currency unit)
        currency: currency.toUpperCase(),
        description: plan_title,
        customer: {
          contact: String(userTelegramId),
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        callback_url: `${Deno.env.get(
          "SUPABASE_URL"
        )}/functions/v1/verify-payment`,
        callback_method: "get",
        notes: {
          user_telegram_id: String(userTelegramId),
          chat_id: String(chatId),
          plan_title: plan_title,
        },
      };

      const razorpayRes = await fetch(
        "https://api.razorpay.com/v1/payment_links",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${razorpayAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(razorpayPayload),
        }
      );

      const razorpayData = await razorpayRes.json();

      if (!razorpayRes.ok || !razorpayData?.short_url) {
        return new Response(
          JSON.stringify({
            error: razorpayData?.error?.description || "Razorpay error",
            details: razorpayData,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Store payment link metadata in database for verification
      console.log("[create-payment-link] Storing payment metadata:", {
        payment_link_id: razorpayData.id,
        user_id,
        landing_page_id: body.landing_page_id,
        plan_id: body.plan_id,
        user_telegram_id: userTelegramId,
      });

      const { data: insertedLink, error: insertError } = await supabaseAdmin
        .from("payment_links")
        .insert({
          payment_link_id: razorpayData.id,
          user_id: user_id,
          landing_page_id: body.landing_page_id,
          plan_id: body.plan_id,
          user_telegram_id: userTelegramId,
          amount: amount,
          currency: currency,
          provider: "razorpay",
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "[create-payment-link] Error storing payment link:",
          insertError
        );
        // Don't fail the payment link creation, but log the error
        console.error(
          "[create-payment-link] Payment link created but not stored in DB"
        );
      } else {
        console.log(
          "[create-payment-link] Payment link stored successfully:",
          insertedLink.id
        );
      }

      return new Response(
        JSON.stringify({
          url: razorpayData.short_url,
          payment_id: razorpayData.id,
          payment_provider: "razorpay",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // PayPal placeholder
    if (provider === "paypal") {
      // For now, return demo link for PayPal
      return new Response(
        JSON.stringify({
          url: `https://www.paypal.com/checkoutnow?token=paypal_demo_token_${Date.now()}`,
          payment_id: `paypal_demo_id_${Date.now()}`,
          payment_provider: "paypal",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Unknown provider
    return new Response(
      JSON.stringify({ error: `Unsupported payment provider: ${provider}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-payment-link:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
