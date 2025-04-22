import { combineResponseInits } from "~/utils/misc";
import { authSessionStorage } from "./session.server";
import { sessionKey } from "./auth.server";
import { safeRedirect } from "remix-utils/safe-redirect";
import { redirect } from "@remix-run/node";

// const verifiedTimeKey = "verified-time";
// const unverifiedSessionIdKey = "unverified-session-id";
// const rememberKey = "remember";

export async function handleNewSession(
  {
    request,
    session,
    redirectTo,
    remember,
  }: {
    request: Request;
    session: { userId: string; id: string; expirationDate: Date };
    redirectTo?: string;
    remember?: boolean;
  },
  responseInit?: ResponseInit
) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );
  authSession.set(sessionKey, session.id);

  return redirect(
    safeRedirect(redirectTo),
    combineResponseInits(
      {
        headers: {
          "set-cookie": await authSessionStorage.commitSession(authSession, {
            expires: remember ? session.expirationDate : undefined,
          }),
        },
      },
      responseInit
    )
  );
}
