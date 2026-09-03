import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@mikayla.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. JWT validation (Objective 6)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid JWT token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Recipient and payload extraction
    let recipientUserId = body.recipient_id || body.recipientId || body.userId;
    let title = body.title || "Mikayla";
    let messageBody = body.body || body.content || "Nouveau message reçu 💌";
    let notificationUrl = body.url || body.data?.url || "/";
    let coupleId = body.coupleId || body.couple_id;

    // Support direct invocation or Database Webhook on messages INSERT
    if (body.record) {
      const record = body.record;
      recipientUserId = record.receiver_id;
      coupleId = record.couple_id;
      const messageType = record.type || "text";
      
      if (messageType === "heartbeat") {
        title = "Battement de cœur 💓";
        messageBody = record.content || "Tu me manques fort mon amour...";
      } else if (messageType === "photo") {
        title = "Nouvelle photo 📷";
        messageBody = record.content ? `Photo : ${record.content}` : "Une nouvelle photo a été partagée";
      } else if (messageType === "audio") {
        title = "Message vocal 🎙️";
        messageBody = "Nouveau message vocal reçu";
      } else if (messageType === "video") {
        title = "Nouvelle vidéo 📹";
        messageBody = "Une nouvelle vidéo a été partagée";
      } else {
        title = "Nouveau message 💌";
        messageBody = record.content || "Nouveau message reçu";
      }
      notificationUrl = `/?couple=${coupleId}`;
    }

    if (!recipientUserId && coupleId) {
      const { data: coupleData } = await supabase
        .from("couples")
        .select("user1_id, user2_id")
        .eq("id", coupleId)
        .maybeSingle();

      if (coupleData) {
        recipientUserId = coupleData.user1_id === callerUser.id ? coupleData.user2_id : coupleData.user1_id;
      }
    }

    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: "Missing recipient user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify caller and recipient belong to the same active couple (Objective 7)
    let coupleQuery = supabase
      .from("couples")
      .select("id, user1_id, user2_id")
      .or(`and(user1_id.eq.${callerUser.id},user2_id.eq.${recipientUserId}),and(user1_id.eq.${recipientUserId},user2_id.eq.${callerUser.id})`);

    if (coupleId) {
      coupleQuery = coupleQuery.eq("id", coupleId);
    }

    const { data: activeCouple, error: coupleCheckErr } = await coupleQuery.maybeSingle();

    if (coupleCheckErr || !activeCouple) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Sender and recipient do not belong to the same active couple" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query active push subscriptions for recipient
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientUserId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscription found for user", recipientUserId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: messageBody,
      icon: "/icons/icon-purple-192.png",
      badge: "/icons/icon-purple-192.png",
      data: {
        url: notificationUrl,
        timestamp: Date.now()
      }
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh || (sub.keys && sub.keys.p256dh),
          auth: sub.auth || (sub.keys && sub.keys.auth)
        }
      };

      try {
        await webpush.sendNotification(pushSub, payload);
        return { success: true, endpoint: sub.endpoint };
      } catch (err: any) {
        console.error("Failed to send push to endpoint:", sub.endpoint, err);
        // Clean up expired subscriptions (410 Gone / 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        return { success: false, endpoint: sub.endpoint, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);

    return new Response(
      JSON.stringify({ success: true, delivered: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
