import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY not set");
  if (hex.length !== 64) throw new Error("ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes for AES-256)");
  return Buffer.from(hex, "hex");
}

/** Encrypts plaintext with AES-256-GCM. Returns `iv:tag:ciphertext` hex string. Requires ENCRYPTION_KEY (64 hex chars). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

/** Decrypts a value produced by `encrypt`. Throws if the auth tag fails (tampered data). */
export function decrypt(encrypted: string): string {
  const [ivHex, tagHex, ctHex] = encrypted.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(ctHex, "hex")).toString("utf8") +
    decipher.final("utf8")
  );
}
