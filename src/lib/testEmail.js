import { sendSigningInvitation } from "./emailService.js";

// Test email function - you can call this to test email functionality
export const testEmail = async () => {
  const testRecipient = {
    name: "Test Recipient",
    email: "test@example.com", // Replace with your email for testing
  };

  const testDocument = {
    name: "Test Document",
    accessToken: "test-token-123",
  };

  const testSender = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
  };

  try {
    const result = await sendSigningInvitation(
      testRecipient,
      testDocument,
      testSender
    );
    console.log("Test email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Test email failed:", error);
    throw error;
  }
};
