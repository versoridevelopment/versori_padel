import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const id_club = 1; // ⚠️ poné el ID real del club
  const accessTokenTest = ""; // ⚠️ tu token TEST real
    
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  if (!process.env.MP_TOKEN_MASTER_KEY_B64) {
    throw new Error("Falta MP_TOKEN_MASTER_KEY_B64 en .env.local");
  }

  // Import dinámico (env ya cargado)
  const { supabaseAdmin } = await import("../src/lib/supabase/supabaseAdmin");
  const { encryptToken } = await import("../src/lib/crypto/tokenCrypto");

  const enc = encryptToken(accessTokenTest);

  const { error } = await supabaseAdmin
    .from("club_mercadopago")
    .upsert({
      id_club,
      modo: "prod",                 // 👈 coincide con tu tabla
      access_token_enc: enc.enc,
      access_token_iv: enc.iv,
      access_token_tag: enc.tag,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("❌ Error guardando token:", error);
    return;
  }

  console.log("✅ Token TEST de Mercado Pago guardado para el club", id_club);
}

run().catch((e) => {
  console.error("❌ Script falló:", e);
});