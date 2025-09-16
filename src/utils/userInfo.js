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

export async function getGeoLocation(ip) {
  const token = process.env.IPINFO_TOKEN; // free tier exists
  const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`);
  const data = await res.json();

  if (!data) return null;

  const [latitude, longitude] = data.loc.split(",");

  return {
    ip,
    city: data.city || null,
    region: data.region || null,
    country: data.country || null,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };
}
export function getDeviceInfo(req) {
  const ua = req.headers["user-agent"];
  if (!ua) return null;

  const agent = useragent.parse(ua);

  return {
    browser: agent.family,
    os: agent.os.family,
    device: agent.device.family || "Other",
  };
}
