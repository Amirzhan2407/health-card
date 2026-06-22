import { URL } from "url";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://health-card-rose.vercel.app",
];

export function csrfProtection(req, res, next) {
  const whitelist = [...ALLOWED_ORIGINS];
  if (process.env.FRONTEND_URL) {
    whitelist.push(process.env.FRONTEND_URL);
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  let requestOrigin = origin;
  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch (e) {
      // Invalid URL in referer
    }
  }

  if (!requestOrigin) {
    return res.status(403).json({
      success: false,
      message: "CSRF Protection Blocked: Missing Origin or Referer header.",
    });
  }

  if (!whitelist.includes(requestOrigin)) {
    return res.status(403).json({
      success: false,
      message: `CSRF Protection Blocked: Origin '${requestOrigin}' is not recognized.`,
    });
  }

  // Also enforce credentials: true and restrict wildcard
  res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");

  next();
}
