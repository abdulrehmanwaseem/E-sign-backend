import fetch from "node-fetch";

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID;
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER;

if (!TELNYX_API_KEY) {
  console.warn("TELNYX_API_KEY is not configured");
}

// Generate 6-digit OTP
export const generatePhoneOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS OTP using Telnyx
export const sendPhoneOTP = async (phoneNumber, otp) => {
  if (!TELNYX_API_KEY) {
    console.error("Telnyx API key is not configured");
    throw new Error("SMS service is not configured");
  }

  const message = `Your PenginSign verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;

  try {
    const response = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TELNYX_API_KEY}`,
      },
      body: JSON.stringify({
        from: TELNYX_FROM_NUMBER,
        to: phoneNumber,
        text: message,
        messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Telnyx SMS error:", data);
      throw new Error(data.errors?.[0]?.detail || "Failed to send SMS");
    }

    console.log("SMS sent successfully:", data.data.id);
    return data;
  } catch (error) {
    console.error("SMS sending error:", error);
    throw error;
  }
};

// Format phone number to E.164 - handles international numbers from frontend
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return phoneNumber;
  const trimmed = String(phoneNumber).trim();

  // If already in E.164 format (starts with +), clean and return
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[\s\-\(\)]/g, "");
  }

  // If it's a raw number, assume it's already in international format
  // Frontend PhoneInput component should provide properly formatted numbers
  const digits = trimmed.replace(/\D/g, "");

  // If digits don't start with a country code, it might need formatting
  // But since frontend validation is handling this, we'll be permissive
  return digits.length >= 7 ? `+${digits}` : trimmed;
};

// Validate general E.164: + followed by 1 to 15 digits (more permissive for international)
export const validatePhoneNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);
  // More permissive E.164 validation - allows any country code including single digits
  const e164 = /^\+[1-9]\d{6,14}$/;
  return e164.test(formatted);
};
