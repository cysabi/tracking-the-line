import nacl from "tweetnacl";
import { respond } from "../_shared/utils.ts";

export async function verifySignature(
  request: Request,
): Promise<{ valid: boolean; body: string }> {
  const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY");
  if (!PUBLIC_KEY) {
    throw Error("missing `DISCORD_PUBLIC_KEY`");
  }
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp || request.method !== "POST") {
    return { valid: false, body: "" };
  }
  const body = await request.text();
  const valid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(PUBLIC_KEY),
  );

  return { valid, body };
}

function hexToUint8Array(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
}

export function respondError(message: string) {
  return respond({
    type: 4,
    data: {
      flags: 64,
      content: `🚫 ${message}`,
    },
  });
}
