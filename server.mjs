// Server MJS

import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const IS_PROD = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;
const ALLOW_INDEXING = process.env.ALLOW_INDEX !== "false";

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// No ending slashes for SEO reasons
app.get("*", (req, res, next) => {
  if (req.path.endsWith("/") && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    const safepath = req.path.slice(0, -1).replace(/\/+/g, "/");
    res.redirect(302, safepath + query);
  } else {
    next();
  }
});

// The referrerPolicy
app.use((_, res, next) => {
  helmet(res, { general: { referrerPolicy: false } });
  next();
});

// Development configuration
const viteDevServer = IS_PROD
  ? undefined
  : await import("vite").then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
      })
    );

// Handler remix server
const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
});

// Handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  app.use(express.static("build/client", { maxAge: "1h" }));
}

app.get(["img/*", "/favicons/*"], (req, res) => {
  return res.status(200).send("Not Found");
});

morgan.token("url", (req) => {
  try {
    return decodeURIComponent(req.url ?? "");
  } catch {
    return req.url ?? "";
  }
});

// When running tests or running in development, we want to effectively disable
// rate limiting because playwright tests are very fast and we don't want to
// have to wait for the rate limit to reset between tests.
const maxMultiple =
  !IS_PROD || process.env.PLAYWRIGHT_TEST_BASE_URL ? 10_000 : 1;
const rateLimitDefault = {
  windowMs: 60 * 1000,
  limit: 1000 * maxMultiple,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  // Malicious users can spoof their IP address which means we should not default
  // to trusting req.ip when hosted on Fly.io. However, users cannot spoof Fly-Client-Ip.
  // When sitting behind a CDN such as cloudflare, replace fly-client-ip with the CDN
  // specific header such as cf-connecting-ip
  keyGenerator: (req) => {
    return req.get("fly-client-ip") ?? `${req.ip}`;
  },
};

const strongestRateLimit = rateLimit({
  ...rateLimitDefault,
  windowMs: 60 * 1000,
  limit: 10 * maxMultiple,
});

const strongRateLimit = rateLimit({
  ...rateLimitDefault,
  windowMs: 60 * 1000,
  limit: 100 * maxMultiple,
});

const generalRateLimit = rateLimit(rateLimitDefault);
app.use((req, res, next) => {
  const strongPaths = ["/login", "/signup"];
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (strongPaths.some((p) => req.path.includes(p))) {
      return strongestRateLimit(req, res, next);
    }
    return strongRateLimit(req, res, next);
  }

  // the verify route is a special case because it's a GET route that
  // can have a token in the query string
  if (req.path.includes("/verify")) {
    return strongestRateLimit(req, res, next);
  }

  return generalRateLimit(req, res, next);
});

// Middleware
app.use(
  morgan("tiny", {
    skip: (req, res) =>
      res.statusCode === 200 &&
      (req.url?.startsWith("/resources/images") ||
        req.url?.startsWith("/resources/healthcheck")),
  })
);

if (!ALLOW_INDEXING) {
  app.use((_, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow");
    next();
  });
}

// Handle SSR requests
app.all("*", remixHandler);

app.listen(PORT, () =>
  console.log(`Server is running at http://localhost:${PORT}`)
);
