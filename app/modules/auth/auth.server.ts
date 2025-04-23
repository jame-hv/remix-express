import { Authenticator } from "remix-auth";
import { ProviderUser } from "./providers/provider";
import { prisma } from "~/db.server";
import { redirect } from "@remix-run/node";
import { authSessionStorage } from "./session.server";
import { Password, User } from "@prisma/client";
import { safeRedirect } from "remix-utils/safe-redirect";
import { combineHeaders } from "~/utils/misc";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export const authenticator = new Authenticator<ProviderUser>();

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14; // 2 weeks

export const getSessionExpirationDate = () =>
  new Date(Date.now() + SESSION_EXPIRATION_TIME);

export const sessionKey = "sessionId";

export async function getUserId(request: Request) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );

  const sessionId = authSession.get(sessionKey);

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    select: {
      userId: true,
    },
    where: {
      id: sessionId,
      expirationDate: { gt: new Date() },
    },
  });

  if (!session?.userId) {
    throw redirect("/", {
      headers: {
        "set-cookie": await authSessionStorage.destroySession(authSession),
      },
    });
  }
}

export async function requireUserId(
  request: Request,
  { redirectTo }: { redirectTo?: string | null } = {}
) {
  const userId = await getUserId(request);

  if (!userId) {
    const requestUrl = new URL(request.url);
    redirectTo =
      redirectTo === null
        ? null
        : redirectTo ?? requestUrl.pathname + requestUrl.search;

    const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null;
    const loginRedirect = ["/login", loginParams?.toString()]
      .filter(Boolean)
      .join("?");
    throw redirect(loginRedirect);
  }

  return userId;
}

// When defined some routes are not accessible to authenticated users
export async function requireAnonymous(request: Request) {
  const userId = await getUserId(request);
  if (userId) {
    throw redirect("/");
  }
}

export async function login({
  username,
  password,
}: {
  username: User["username"];
  password: string;
}) {
  const user = await verifyPassword({ username }, password);

  if (!user) {
    return null;
  }

  // Create new session ====
  const session = await prisma.session.create({
    select: {
      id: true,
      expirationDate: true,
      userId: true,
    },
    data: {
      expirationDate: getSessionExpirationDate(),
      userId: user.id,
    },
  });
  return session;
}
export async function resetPassword({
  username,
  password,
}: {
  username: User["username"];
  password: string;
}) {
  const hashedPassword = await getPasswordHash(password);
  return prisma.user.update({
    where: { username },
    data: {
      password: {
        update: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function signup({
  email,
  username,
  password,
  name,
}: {
  email: User["email"];
  username: User["username"];
  name: User["name"];
  password: string;
}) {
  const hashedPassword = await getPasswordHash(password);

  const session = await prisma.session.create({
    data: {
      expirationDate: getSessionExpirationDate(),
      user: {
        create: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          name,
          roles: { connect: { name: "user" } },
          password: {
            create: {
              hash: hashedPassword,
            },
          },
        },
      },
    },
    select: { id: true, expirationDate: true },
  });

  return session;
}

export async function logout(
  {
    request,
    redirectTo = "/",
  }: {
    request: Request;
    redirectTo?: string;
  },
  responseInit?: ResponseInit
) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get("cookie")
  );
  const sessionId = authSession.get(sessionKey);
  // if this fails, we still need to delete the session from the user's browser
  // and it doesn't do any harm staying in the db anyway.
  if (sessionId) {
    // the .catch is important because that's what triggers the query.
    // learn more about PrismaPromise: https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismapromise-behavior
    void prisma.session
      .deleteMany({ where: { id: sessionId } })
      .catch(() => {});
  }
  throw redirect(safeRedirect(redirectTo), {
    ...responseInit,
    headers: combineHeaders(
      { "set-cookie": await authSessionStorage.destroySession(authSession) },
      responseInit?.headers
    ),
  });
}

/**
 * Utils
 */
export async function getPasswordHash(password: string) {
  const hash = await bcrypt.hash(password, 10);
  return hash;
}

export async function verifyPassword(
  where: Pick<User, "username"> | Pick<User, "id">,
  password: Password["hash"]
) {
  const userWithPassword = await prisma.user.findUnique({
    where,
    select: {
      id: true,
      password: {
        select: {
          hash: true,
        },
      },
    },
  });
  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isvalidPassword = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );
  if (!isvalidPassword) {
    return null;
  }

  return { id: userWithPassword.id };
}

export function getPasswordHashParts(password: string) {
  const hash = crypto
    .createHash("sha1")
    .update(password, "utf8")
    .digest("hex")
    .toUpperCase();
  return [hash.slice(0, 5), hash.slice(5)] as const;
}

export async function checkIsCommonPassword(password: string) {
  const [prefix, suffix] = getPasswordHashParts(password);

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { signal: AbortSignal.timeout(1000) }
    );

    if (!response.ok) return false;

    const data = await response.text();
    return data.split(/\r?\n/).some((line) => {
      const [hashSuffix] = line.split(":");
      return hashSuffix === suffix;
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      console.warn("Password check timed out");
      return false;
    }

    console.warn("Unknown error during password check", error);
    return false;
  }
}
