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
  try {
    const token = process.env.IPINFO_TOKEN;
    const url = `https://ipinfo.io/${ip}?token=${token}`;

    console.log(`Fetching geolocation for IP: ${ip}`);
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(
        `GeoLocation API failed with status: ${res.status} for IP: ${ip}`
      );
      return createFallbackGeoData(ip);
    }

    const data = await res.json();
    console.log(`GeoLocation response for ${ip}:`, data);

    if (!data) {
      console.warn("Empty geolocation response");
      return createFallbackGeoData(ip);
    }

    // Handle case where loc field might be missing or empty
    let latitude = null;
    let longitude = null;

    if (data.loc && typeof data.loc === "string" && data.loc.includes(",")) {
      const [lat, lng] = data.loc.split(",");
      latitude = lat ? parseFloat(lat.trim()) : null;
      longitude = lng ? parseFloat(lng.trim()) : null;
    } else {
      console.warn(`Invalid or missing loc field for IP ${ip}:`, data.loc);
    }

    return {
      ip,
      city: data.city || null,
      region: data.region || null,
      country: data.country || null,
      latitude,
      longitude,
      timezone: data.timezone || null,
      org: data.org || null,
    };
  } catch (error) {
    console.error("GeoLocation error for IP", ip, ":", error.message);
    return createFallbackGeoData(ip);
  }
}

function createFallbackGeoData(ip) {
  return {
    ip,
    city: null,
    region: null,
    country: null,
    latitude: null,
    longitude: null,
    timezone: null,
    org: null,
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
