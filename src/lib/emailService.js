import nodemailer from "nodemailer";

// Create transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER || "93e6cb001@smtp-brevo.com",
    pass: process.env.SMTP_PASS || "ZsU4nDORV1NHPKdj",
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to take our messages");
  }
});

/**
 * Send signing invitation email to recipient
 * @param {Object} recipient - The document recipient
 * @param {Object} document - The document to be signed
 * @param {Object} sender - The document sender
 */
export const sendSigningInvitation = async (recipient, document, sender) => {
  try {
    const signingUrl = `${process.env.CLIENT_URL}/signing/${document.accessToken}`;

    // Use sender's name if available, otherwise use email
    const senderName =
      sender?.firstName || sender?.lastName
        ? `${sender?.firstName} ${sender?.lastName}`.trim()
        : sender.email;

    // Create HTML email template
    const htmlTemplate = createSigningInvitationTemplate({
      recipientName: recipient.name,
      senderName,
      senderEmail: sender.email,
      documentName: document.name,
      signingUrl,
    });

    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || "PenginSign",
        address: process.env.FROM_EMAIL || "93e6cb001@smtp-brevo.com",
      },
      to: recipient.email,
      subject: `${senderName} sent you a document to review and sign`,
      html: htmlTemplate,
    };
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send signing invitation email");
  }
};

/**
 * Create HTML email template for signing invitation
 */
const createSigningInvitationTemplate = ({
  recipientName,
  senderName,
  senderEmail,
  documentName,
  signingUrl,
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Signing Request</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background-color: #ffffff;
            padding: 30px 40px 20px;
            border-bottom: 1px solid #e5e5e5;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 0;
        }
        
        .main-content {
            padding: 40px;
        }
        
        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .message {
            font-size: 16px;
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            line-height: 1.5;
        }
        
        .cta-button {
            display: block;
            width: 280px;
            margin: 0 auto 40px;
            padding: 16px 24px;
            background-color: #4285f4;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }
        
        .cta-button:hover {
            background-color: #3367d6;
        }
        
        .document-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 30px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e5e5;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 600;
            color: #1a1a1a;
            font-size: 14px;
        }
        
        .detail-value {
            color: #666;
            font-size: 14px;
        }
        
        .sender-email {
            color: #4285f4;
            text-decoration: none;
        }
        
        .warning-box {
            background-color: #fff3cd;
            border: 1px solid #ffecb3;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 30px;
        }
        
        .warning-title {
            font-weight: 600;
            color: #856404;
            margin-bottom: 8px;
        }
        
        .warning-text {
            color: #856404;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px 40px;
            border-top: 1px solid #e5e5e5;
        }
        
        .footer-section {
            margin-bottom: 20px;
        }
        
        .footer-title {
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .footer-text {
            color: #666;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .footer-link {
            color: #4285f4;
            text-decoration: none;
        }
        
        .footer-link:hover {
            text-decoration: underline;
        }
        
        .small-text {
            font-size: 12px;
            color: #999;
            line-height: 1.4;
            margin-top: 20px;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .main-content, .footer {
                padding: 20px;
            }
            
            .cta-button {
                width: 100%;
            }
            
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="logo">PenginSign</h1>
        </div>
        
        <div class="main-content">
            <h2 class="greeting">${senderName} sent you a document to review and sign.</h2>
            
            <p class="message">
                Hello ${recipientName}, please review the document details below and proceed to sign when ready.
            </p>
            
            <a href="${signingUrl}" 
                style="display: block; width: 280px; margin: 0 auto 40px; padding: 16px 24px; background-color: #4285f4; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; text-align: center; font-size: 16px; font-weight: 600;">
                Review & Sign Document
            </a>            
            <div class="document-details">
                <div class="detail-row">
                    <span class="detail-label">Sent by:&nbsp;</span>
                    <span class="detail-value">${senderName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"></span>
                    <a href="mailto:${senderEmail}" class="sender-email">${senderEmail}</a>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Document:&nbsp;</span>
                    <span class="detail-value">${documentName}</span>
                </div>
            </div>
            
            <div class="warning-box">
                <div class="warning-title">Do Not Share This Email</div>
                <div class="warning-text">
                    This email contains a secure link to PenginSign. Please do not share this email, link, or access code with others.
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-section">
                <div class="footer-title">About PenginSign</div>
                <div class="footer-text">
                    Sign documents electronically in just minutes. It's safe, secure, and legally binding. Whether you're in an office, at home, on-the-go -- or even across the globe -- PenginSign provides a professional trusted solution for Digital Transaction Management.
                </div>
            </div>
            
            <div class="footer-section">
                <div class="footer-title">Questions about the Document?</div>
                <div class="footer-text">
                    If you need to modify the document or have questions about the details in the document, please reach out to the sender by emailing them directly at <a href="mailto:${senderEmail}" class="footer-link">${senderEmail}</a>.
                </div>
            </div>
            
            <div class="footer-section">
                <div class="footer-title">Stop receiving this email</div>
                <div class="footer-text">
                    If you believe this email was sent to you in error or if you no longer wish to receive emails from this sender, please report it to our support team at <a href="mailto:support@penginsign.com" class="footer-link">support@penginsign.com</a>.
                </div>
            </div>
            
            <div class="footer-text">
                If you have trouble signing, please contact our support team at <a href="mailto:support@penginsign.com" class="footer-link">support@penginsign.com</a>.
            </div>
            
            <div class="small-text">
                This message was sent to you by ${senderName} who is using the PenginSign Electronic Signature Service. If you would rather not receive email from this sender you may contact the sender with your request.
                <br><br>
                If you're having trouble with the button above, copy and paste the following URL into your browser: <br>
                ${signingUrl}
            </div>
        </div>
    </div>
</body>
</html>
`;
};

/**
 * Send completion notification email to document sender
 * @param {Object} sender - The document sender
 * @param {Object} document - The signed document
 * @param {Object} recipient - The document recipient who signed
 */
export const sendCompletionNotification = async (
  sender,
  document,
  recipient
) => {
  try {
    const downloadUrl = `${process.env.CLIENT_URL}/dashboard/documents/${document.id}`;

    // Use sender's name if available, otherwise use email
    const senderName =
      sender.firstName || sender.lastName
        ? `${sender?.firstName} ${sender?.lastName}`.trim()
        : sender.email;

    // Create HTML email template
    const htmlTemplate = createCompletionNotificationTemplate({
      senderName,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      documentName: document.name,
      signedAt: document.signedAt,
      downloadUrl,
    });

    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || "PenginSign",
        address: process.env.FROM_EMAIL || "93e6cb001@smtp-brevo.com",
      },
      to: sender.email,
      subject: `${recipient.name} has signed "${document.name}"`,
      html: htmlTemplate,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Completion notification sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending completion notification:", error);
    throw new Error("Failed to send completion notification email");
  }
};

/**
 * Send OTP email for email verification
 * @param {string} email - The email address
 * @param {string} otp - The 6-digit OTP
 */
export const sendOTPEmail = async (email, otp) => {
  try {
    const htmlTemplate = createOTPEmailTemplate({ email, otp });

    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || "PenginSign",
        address: process.env.FROM_EMAIL || "93e6cb001@smtp-brevo.com",
      },
      to: email,
      subject: "Email Verification - PenginSign",
      html: htmlTemplate,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */

/**
 * Create HTML email template for completion notification
 */
const createCompletionNotificationTemplate = ({
  senderName,
  recipientName,
  recipientEmail,
  documentName,
  signedAt,
  downloadUrl,
}) => {
  const formattedDate = new Date(signedAt).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Completed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .header {
            background-color: #ffffff;
            padding: 30px 40px 20px;
            border-bottom: 1px solid #e5e5e5;
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 0;
        }

        .main-content {
            padding: 40px;
        }

        .success-icon {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
        }

        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 20px;
            text-align: center;
        }

        .message {
            font-size: 16px;
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            line-height: 1.5;
        }

        .cta-button {
            display: block;
            width: 280px;
            margin: 0 auto 40px;
            padding: 16px 24px;
            background-color: #4285f4;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }

        .cta-button:hover {
            background-color: #3367d6;
        }

        .document-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 30px;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e5e5;
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-weight: 600;
            color: #1a1a1a;
            font-size: 14px;
        }

        .detail-value {
            color: #666;
            font-size: 14px;
        }

        .footer {
            background-color: #f8f9fa;
            padding: 30px 40px;
            border-top: 1px solid #e5e5e5;
        }

        .footer-title {
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .footer-text {
            color: #666;
            font-size: 14px;
            line-height: 1.4;
        }

        .footer-link {
            color: #4285f4;
            text-decoration: none;
        }

        .footer-link:hover {
            text-decoration: underline;
        }

        .small-text {
            font-size: 12px;
            color: #999;
            line-height: 1.4;
            margin-top: 20px;
        }

        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }

            .header, .main-content, .footer {
                padding: 20px;
            }

            .cta-button {
                width: 100%;
            }

            .detail-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1 class="logo">PenginSign</h1>
        </div>

        <div class="main-content">
            <div class="success-icon">✅</div>

            <h2 class="greeting">Document Signed Successfully!</h2>

            <p class="message">
                Great news! <strong>${recipientName}</strong> has successfully signed your document.
            </p>

            <a href="${downloadUrl}" class="cta-button">View & Download Document</a>

            <div class="document-details">
                <div class="detail-row">
                    <span class="detail-label">Document Name:&nbsp;</span>
                    <span class="detail-value">${documentName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Signed By:&nbsp;</span>
                    <span class="detail-value">${recipientName} (${recipientEmail})</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Signed On:&nbsp;</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
            </div>

            <p class="message" style="font-size: 14px;">
                You can now download the completed document with all signatures embedded. The signed document is legally binding and ready for your records.
            </p>
        </div>

        <div class="footer">
            <div class="footer-title">About PenginSign</div>
            <div class="footer-text">
                This document was signed using PenginSign's secure electronic signature platform.
            </div>

            <div class="footer-text">
                If you have any questions about this signed document, please contact our support team at 
                <a href="mailto:support@penginsign.com" class="footer-link">support@penginsign.com</a>.
            </div>

            <div class="small-text">
                If you're having trouble with the button above, copy and paste the following URL into your browser: <br>
                ${downloadUrl}
            </div>
        </div>
    </div>
</body>
</html>
`;
};

/**
 * Create HTML email template for OTP verification
 */
const createOTPEmailTemplate = ({ email, otp }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - PenginSign</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #4285f4 0%, #667eea 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        
        .verification-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        .message {
            font-size: 18px;
            color: #2d3748;
            margin-bottom: 30px;
            line-height: 1.5;
        }
        
        .otp-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #4285f4;
            border-radius: 12px;
            padding: 30px;
            margin: 30px 0;
            position: relative;
        }
        
        .otp-label {
            font-size: 14px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .otp-code {
            font-size: 36px;
            font-weight: 700;
            color: #4285f4;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .expiry-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0;
            color: #856404;
            font-size: 14px;
        }
        
        .expiry-notice strong {
            color: #533f03;
        }
        
        .instructions {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: left;
        }
        
        .instructions h3 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .instructions ol {
            color: #4a5568;
            padding-left: 20px;
        }
        
        .instructions li {
            margin-bottom: 5px;
        }
        
        .security-notice {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 25px 0;
            font-size: 14px;
            color: #1565c0;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #718096;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .footer-link {
            color: #4285f4;
            text-decoration: none;
        }
        
        .small-text {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 15px;
            line-height: 1.4;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .otp-code {
                font-size: 28px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Verify Your Email</h1>
            <p>Complete your PenginSign registration</p>
        </div>
        
        <div class="content">
            <div class="verification-icon">🔐</div>
            
            <div class="message">
                Thank you for signing up with PenginSign!<br>
                Please use the verification code below to complete your account setup.
            </div>
            
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
            </div>
            
            <div class="expiry-notice">
                <strong>⏰ Important:</strong> This verification code will expire in <strong>10 minutes</strong>. 
                Please complete verification promptly.
            </div>
            
            <div class="instructions">
                <h3>How to verify:</h3>
                <ol>
                    <li>Return to the PenginSign verification page</li>
                    <li>Enter the 6-digit code shown above</li>
                    <li>Click "Verify Email" to complete setup</li>
                </ol>
            </div>
            
            <div class="security-notice">
                🛡️ <strong>Security Note:</strong> If you didn't create a PenginSign account, please ignore this email. 
                Never share this verification code with anyone.
            </div>
        </div>
        
        <div class="footer">
            <div>
                This email was sent to <strong>${email}</strong> because you started the registration process for PenginSign.
            </div>
            
            <div class="small-text">
                Need help? Contact our support team at 
                <a href="mailto:support@penginsign.com" class="footer-link">support@penginsign.com</a>
                <br><br>
                PenginSign - Secure Electronic Signature Platform<br>
                Making document signing simple, secure, and legally binding.
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export default transporter;
