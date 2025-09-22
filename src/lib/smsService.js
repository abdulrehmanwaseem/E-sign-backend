import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  console.warn("Twilio credentials are not properly configured");
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Send OTP using Twilio Verify service
export const sendPhoneOTP = async (phoneNumber, customOtp = null) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("SMS service is not configured");
  }

  // Phone number should already be validated and formatted by the controller
  const formattedPhone = formatPhoneNumber(phoneNumber);

  console.log(`Sending OTP to: ${formattedPhone}`);

  try {
    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedPhone,
        channel: "sms",
        customCode: customOtp,
      });

    console.log("OTP sent successfully with SID:", verification.sid);
    console.log("Verification status:", verification.status);

    return {
      success: true,
      sid: verification.sid,
      status: verification.status,
      to: verification.to,
      channel: verification.channel,
    };
  } catch (error) {
    console.error("Twilio SMS error:", error);

    // Handle specific Twilio error codes
    if (error.code === 60203) {
      // Phone number is already verified
      console.log("Phone number already verified, treating as success");
      return {
        success: true,
        status: "approved",
        message: "Phone number already verified",
        skipVerification: true,
      };
    }

    if (error.code === 60202) {
      // Max send attempts reached
      throw new Error(
        "Too many verification attempts. Please wait before trying again."
      );
    }

    throw new Error(error.message || "Failed to send SMS");
  }
};

// Verify OTP using Twilio Verify service
export const twilioVerifyOTP = async (phoneNumber, code) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    console.error("Twilio credentials are not configured");
    throw new Error("SMS service is not configured");
  }

  // Phone number should already be validated and formatted by the controller
  const formattedPhone = formatPhoneNumber(phoneNumber);

  console.log(`Verifying OTP for: ${formattedPhone} with code: ${code}`);

  try {
    const verificationCheck = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: formattedPhone,
        code: code,
      });

    console.log("OTP verification result:", verificationCheck.status);

    return {
      success: verificationCheck.status === "approved",
      status: verificationCheck.status,
      sid: verificationCheck.sid,
      to: verificationCheck.to,
    };
  } catch (error) {
    console.error("Twilio OTP verification error:", error);
    throw new Error(error.message || "Failed to verify OTP");
  }
};

// Get verification status from Twilio
export const getVerificationStatus = async (phoneNumber) => {
  const formattedPhone = formatPhoneNumber(phoneNumber);

  try {
    const verifications = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.list({
        to: formattedPhone,
        limit: 1,
      });

    if (verifications.length > 0) {
      const verification = verifications[0];
      return {
        status: verification.status,
        channel: verification.channel,
        to: verification.to,
        dateCreated: verification.dateCreated,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting verification status:", error);
    return null;
  }
};

// Enhanced phone number formatting - supports international numbers
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return phoneNumber;
  const trimmed = String(phoneNumber).trim();

  // If already in E.164 format (starts with +), clean and return
  if (trimmed.startsWith("+")) {
    return trimmed.replace(/[\s\-\(\)]/g, "");
  }

  const digits = trimmed.replace(/\D/g, "");

  // For Pakistani numbers starting with 92
  if (digits.startsWith("92") && digits.length >= 12) {
    return `+${digits}`;
  }

  // For Pakistani numbers starting with 03 (convert to +92)
  if (digits.startsWith("03") && digits.length === 11) {
    return `+92${digits.substring(1)}`;
  }

  // For US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // For other international numbers
  return digits.length >= 7 ? `+${digits}` : trimmed;
};

// Enhanced validation with better international number handling
export const validatePhoneNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);

  // Pakistani number validation
  const pkNumber = /^\+92[3][0-9]{9}$/;
  if (pkNumber.test(formatted)) {
    return true;
  }

  // US number validation
  const usNumber = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
  if (usNumber.test(formatted)) {
    return true;
  }

  // General E.164 validation for international numbers
  const e164 = /^\+[1-9]\d{6,14}$/;
  return e164.test(formatted);
};

// Twilio webhook handler for delivery status updates
export const twilioWebhookHandler = (req, res) => {
  const event = req.body;

  console.log("=== Twilio Webhook Event ===");
  console.log("Event Type:", event.EventType);
  console.log("Service SID:", event.ServiceSid);
  console.log("To:", event.To);
  console.log("Status:", event.Status);
  console.log("Channel:", event.Channel);
  console.log("Full Event:", JSON.stringify(event, null, 2));

  // Handle different event types
  switch (event.EventType) {
    case "verification.started":
      console.log("Verification started");
      break;
    case "verification.completed":
      console.log("Verification completed successfully");
      break;
    case "verification.failed":
      console.error("Verification failed:", event.Reason);
      break;
    default:
      console.log("Unknown event type:", event.EventType);
  }

  res.status(200).json({ received: true });
};
