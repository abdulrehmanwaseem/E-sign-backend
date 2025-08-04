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
      sender.firstName && sender.lastName
        ? `${sender.firstName} ${sender.lastName}`.trim()
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
            
            <a href="${signingUrl}" class="cta-button">Review & Sign Document</a>
            
            <div class="document-details">
                <div class="detail-row">
                    <span class="detail-label">Sent by: </span>
                    <span class="detail-value">${senderName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label"></span>
                    <a href="mailto:${senderEmail}" class="sender-email">${senderEmail}</a>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Document: </span>
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

export default transporter;
