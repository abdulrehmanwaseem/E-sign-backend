import geoip from "geoip-lite";
import useragent from "useragent";

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  let ip =
    (forwarded ? forwarded.split(",")[0] : req.socket.remoteAddress) || "";

  // Handle local dev addresses
  if (ip === "::1" || ip.startsWith("127.")) {
    ip = "8.8.8.8"; // fallback to Google DNS or any test IP
  }

  return ip;
}

export function getGeoLocation(ip) {
  const geo = geoip.lookup(ip);
  if (!geo) return null;

  return {
    ip,
    city: geo.city || null,
    region: geo.region || null,
    country: geo.country || null,
    latitude: geo.ll ? geo.ll[0] : null,
    longitude: geo.ll ? geo.ll[1] : null,
  };
}

export function getDeviceInfo(req) {
  const ua = req.headers["user-agent"];
  if (!ua) return null;

  const agent = useragent.parse(ua);

  return {
    browser: agent.family,
    os: agent.os.family,
    device: agent.device.family || "Desktop",
  };
}
