// One-off CLI: hash a password with bcrypt and store it on the household row.
// Usage: npm run set-password -- "the new password"
//
// Reads Supabase credentials from .env.local (not from real env vars) so this
// works the same way locally as the app does. Never prints the plaintext
// password anywhere but back to your own terminal via argv (already visible
// to you, since you typed it).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: npm run set-password -- "the new password"');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const env = loadEnvLocal();
  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const hash = await bcrypt.hash(password, 10);

  const { data: households, error: findError } = await supabase
    .from("households")
    .select("id, name");
  if (findError) {
    console.error("Failed to look up household:", findError.message);
    process.exit(1);
  }
  if (!households || households.length === 0) {
    console.error(
      "No household found. Run supabase/schema.sql then supabase/seed.sql in the Supabase SQL Editor first."
    );
    process.exit(1);
  }
  if (households.length > 1) {
    console.error(
      `Found ${households.length} households, expected 1. Refusing to guess which one to update.`
    );
    process.exit(1);
  }

  const { error: updateError } = await supabase
    .from("households")
    .update({ password_hash: hash })
    .eq("id", households[0].id);
  if (updateError) {
    console.error("Failed to set password:", updateError.message);
    process.exit(1);
  }

  console.log(`Password set for household "${households[0].name}".`);
}

main();
