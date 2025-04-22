import { type Strategy } from "remix-auth/strategy";
import { type Timings } from "~/utils/timing.server";
export type ProviderUser = {
  id: string | number;
  email: string;
  username?: string;
  name?: string;
  imageUrl?: string;
};

export interface AuthProvider {
  getAuthStrategy(): Strategy<ProviderUser, Record<string, unknown>> | null;
  resolveConnectionData(
    providerId: string,
    options?: { timings?: Timings }
  ): Promise<{
    displayName: string;
    link?: string | null;
  }>;
}

export const normalizeEmail = (s: string) => s.toLowerCase();

export const normalizeUsername = (s: string) =>
  s.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
