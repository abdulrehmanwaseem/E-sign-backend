import fetch from "node-fetch";

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID;
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER;

if (!TELNYX_API_KEY) {
  console.warn("TELNYX_API_KEY is not configured");
}

// Enhanced SMS sending with better error handling and logging
export const sendPhoneOTP = async (phoneNumber, otp) => {
  if (!TELNYX_API_KEY) {
    console.error("Telnyx API key is not configured");
    throw new Error("SMS service is not configured");
  }

  const message = `Your PenginSign verification code is: ${otp}. This code will expire in 10 minutes. Do not share this code with anyone.`;

  const payload = {
    from: TELNYX_FROM_NUMBER,
    to: phoneNumber,
    text: message,
    messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID,
  };

  console.log("Sending SMS with payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TELNYX_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Log the full response for debugging
    console.log("Telnyx API Response Status:", response.status);
    console.log("Telnyx API Response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("Telnyx SMS error:", data);
      throw new Error(data.errors?.[0]?.detail || "Failed to send SMS");
    }

    const messageId = data.data?.id;
    console.log("SMS sent successfully with message ID:", messageId);

    // Store message ID for tracking (you might want to save this to database)
    if (messageId) {
      // Optionally check message status after a delay
      setTimeout(() => checkMessageStatus(messageId), 30000); // Check after 30 seconds
    }

    return data;
  } catch (error) {
    console.error("SMS sending error:", error);
    throw error;
  }
};

// Function to check message delivery status
export const checkMessageStatus = async (messageId) => {
  try {
    const response = await fetch(
      `https://api.telnyx.com/v2/messages/${messageId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TELNYX_API_KEY}`,
        },
      }
    );

    const data = await response.json();
    console.log(
      `Message ${messageId} status:`,
      data.data?.to,
      data.data?.delivery_status
    );

    return data.data;
  } catch (error) {
    console.error("Error checking message status:", error);
    return null;
  }
};

// Improved phone number formatting - more strict for US numbers
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return phoneNumber;
  const trimmed = String(phoneNumber).trim();

  // If already in E.164 format (starts with +), clean and return
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[\s\-\(\)]/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");

  // For US numbers, ensure proper formatting
  if (digits.length === 10) {
    return `+1${digits}`; // US numbers
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`; // US numbers with country code
  }

  // For other international numbers
  return digits.length >= 7 ? `+${digits}` : trimmed;
};

// Enhanced validation with better US number handling
export const validatePhoneNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);

  // US number validation
  const usNumber = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
  if (usNumber.test(formatted)) {
    return true;
  }

  // General E.164 validation for international numbers
  const e164 = /^\+[1-9]\d{6,14}$/;
  return e164.test(formatted);
};

// Enhanced webhook handler with better logging
export const telnyxWebhookHandler = (req, res) => {
  const event = req.body;

  console.log("=== Telnyx Webhook Event ===");
  console.log("Event Type:", event.event_type);
  console.log("Message ID:", event.data?.id);
  console.log("To:", event.data?.to);
  console.log("From:", event.data?.from);
  console.log("Status:", event.data?.status);
  console.log("Full Event:", JSON.stringify(event, null, 2));

  // Handle different event types
  switch (event.event_type) {
    case "message.sent":
      console.log("Message sent successfully");
      break;
    case "message.delivered":
      console.log("Message delivered to recipient");
      break;
    case "message.delivery_failed":
      console.error("Message delivery failed:", event.data?.errors);
      break;
    case "message.received":
      console.log("Received reply message");
      break;
    default:
      console.log("Unknown event type:", event.event_type);
  }

  res.status(200).json({ received: true });
};
