import { Honeypot, SpamError } from "remix-utils/honeypot/server";

// Honeypot module for authentication - detect spam bots
export const honeypot = new Honeypot({
  // Khi test, honeypot se khong duoc su dung
  validFromFieldName: process.env.NODE_ENV === "test" ? null : undefined,
  encryptionSeed: process.env.HONEYPOT_SECRET,
});

export async function checkHoneypot(formData: FormData) {
  try {
    await honeypot.check(formData);
  } catch (error) {
    if (error instanceof SpamError) {
      throw new Response("Form not submitted properly", { status: 400 });
    }
    throw error;
  }
}
