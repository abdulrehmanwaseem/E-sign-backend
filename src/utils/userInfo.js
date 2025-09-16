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

    // Only try API if token exists
    if (token && token.trim() !== "") {
      const url = `https://ipinfo.io/${ip}?token=${token}`;

      console.log(`Fetching geolocation for IP: ${ip} using ipinfo.io`);
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        console.log(`GeoLocation response for ${ip}:`, data);

        if (data && !data.error) {
          // Handle case where loc field might be missing or empty
          let latitude = null;
          let longitude = null;

          if (
            data.loc &&
            typeof data.loc === "string" &&
            data.loc.includes(",")
          ) {
            const [lat, lng] = data.loc.split(",");
            latitude = lat ? parseFloat(lat.trim()) : null;
            longitude = lng ? parseFloat(lng.trim()) : null;
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
        }
      } else {
        console.warn(
          `ipinfo.io API failed with status: ${res.status} for IP: ${ip}. Falling back to geoip-lite.`
        );
      }
    } else {
      console.log(`No ipinfo.io token found. Using geoip-lite for IP: ${ip}`);
    }

    // Fallback to geoip-lite (offline database)
    console.log(`Using geoip-lite fallback for IP: ${ip}`);
    const geoData = geoip.lookup(ip);

    if (geoData) {
      return {
        ip,
        city: geoData.city || null,
        region: geoData.region || null,
        country: geoData.country || null,
        latitude: geoData.ll ? geoData.ll[0] : null,
        longitude: geoData.ll ? geoData.ll[1] : null,
        timezone: geoData.timezone || null,
        org: null, // geoip-lite doesn't provide org info
      };
    }

    console.warn(`No geolocation data found for IP: ${ip}`);
    return createFallbackGeoData(ip);
  } catch (error) {
    console.error("GeoLocation error for IP", ip, ":", error.message);

    // Try geoip-lite as last resort
    try {
      const geoData = geoip.lookup(ip);
      if (geoData) {
        return {
          ip,
          city: geoData.city || null,
          region: geoData.region || null,
          country: geoData.country || null,
          latitude: geoData.ll ? geoData.ll[0] : null,
          longitude: geoData.ll ? geoData.ll[1] : null,
          timezone: geoData.timezone || null,
          org: null,
        };
      }
    } catch (fallbackError) {
      console.error("Geoip-lite fallback also failed:", fallbackError.message);
    }

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
