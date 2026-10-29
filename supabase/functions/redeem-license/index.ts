import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hashCode(code: string) {
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  let payload: { code?: unknown; installation_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ status: "invalid" }, 400);
  }

  if (typeof payload.code !== "string" || typeof payload.installation_id !== "string") {
    return jsonResponse({ status: "invalid" }, 400);
  }

  const normalizedCode = payload.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const installationId = payload.installation_id;
  if (!/^VG[A-HJ-NP-Z2-9]{20}$/.test(normalizedCode)
    || !/^[A-Za-z0-9_-]{20,128}$/.test(installationId)) {
    return jsonResponse({ status: "invalid" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("License redemption function is missing required configuration.");
    return jsonResponse({ error: "server_configuration_error" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: status, error } = await adminClient.rpc("redeem_activation_code", {
    p_code_hash: await hashCode(normalizedCode),
    p_installation_id: installationId,
  });

  if (error) {
    console.error("Could not redeem activation code:", error.message);
    return jsonResponse({ error: "could_not_redeem_license" }, 500);
  }
  if (status !== "activated" && status !== "used" && status !== "invalid") {
    console.error("Unexpected license redemption result:", status);
    return jsonResponse({ error: "unexpected_redemption_result" }, 500);
  }

  return jsonResponse({ status });
});
