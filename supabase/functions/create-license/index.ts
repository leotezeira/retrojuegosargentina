import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function hashCode(code: string) {
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateCode() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));
  const groups = Array.from(randomBytes, (byte) => alphabet[byte & 31]);
  return `VG-${groups.join("").match(/.{1,5}/g)!.join("-")}`;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const allowedEmails = (Deno.env.get("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!supabaseUrl || !anonKey || !serviceRoleKey || allowedEmails.length === 0) {
    console.error("License generation function is missing required configuration.");
    return jsonResponse({ error: "server_configuration_error" }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user?.email || !allowedEmails.includes(user.email.toLowerCase())) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  const code = generateCode();
  const codeHash = await hashCode(normalizeCode(code));
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: insertError } = await adminClient.from("activation_codes").insert({
    code_hash: codeHash,
    created_by: user.id,
  });

  if (insertError) {
    console.error("Could not save generated activation code:", insertError.message);
    return jsonResponse({ error: "could_not_create_license" }, 500);
  }

  return jsonResponse({ code });
});
