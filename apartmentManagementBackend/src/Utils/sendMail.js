const nodemailer = require("nodemailer");

// Create Brevo SMTP transporter
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT) || 587,
    secure: Number(process.env.BREVO_SMTP_PORT || 587) === 465,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
    },
});

// Verify SMTP connection
transporter.verify()
    .then(() => {
        console.log("SMTP connection successful");
    })
    .catch((error) => {
        console.error("SMTP connection failed:", error.message);
    });

// FRONTEND_URL may contain multiple origins.
// Email links use the first configured origin.
const frontendUrl = () =>
    (process.env.FRONTEND_URL || "http://localhost:5173")
        .split(",")[0]
        .trim()
        .replace(/\/$/, "");

// Escape HTML to prevent user-provided text from injecting markup
const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);

// Shared email sender for all email types
const sendMail = async ({ email, subject, html, text }) => {
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
    const senderName =
        process.env.BREVO_SENDER_NAME?.trim() || "RENT A HOME";

    // Validate sender configuration
    if (
        !senderEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)
    ) {
        throw new Error(
            "Invalid or missing BREVO_SENDER_EMAIL. Check your .env file."
        );
    }

    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
        throw new Error(
            "Missing BREVO_SMTP_USER or BREVO_SMTP_PASSWORD in .env."
        );
    }

    return transporter.sendMail({
        from: {
            name: senderName,
            address: senderEmail,
        },
        to: email,
        subject,
        text,
        html,
    });
};

// Send email verification code
const sendVerificationMail = async (email, code) => {
    await sendMail({
        email,
        subject: "Verify Your Email Address",
        text: `Your email verification code is ${code}. This code expires in 15 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                <h2>Email Verification</h2>

                <p>Thank you for registering with RENT A HOME.</p>

                <p>Use the code below to verify your email address:</p>

                <h1 style="letter-spacing: 8px; color: #2563eb;">
                    ${escapeHtml(code)}
                </h1>

                <p>This code expires in <strong>15 minutes</strong>.</p>

                <p>If you did not create this account, you can safely ignore this email.</p>
            </div>
        `,
    });
};

// Send password reset email
const sendPasswordResetMail = async (email, resetToken) => {
    const resetUrl =
        `${frontendUrl()}/reset-password/${encodeURIComponent(resetToken)}`;

    await sendMail({
        email,
        subject: "Reset Your Password",
        text: `We received a request to reset your password. Open this link to continue: ${resetUrl}. This link expires in 15 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2>Reset Your Password</h2>

                <p>We received a request to reset your password.</p>

                <p>Click the button below to create a new password.</p>

                <div style="margin: 30px 0;">
                    <a href="${escapeHtml(resetUrl)}"
                       style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </div>

                <p>This link expires in <strong>15 minutes</strong>.</p>

                <p>If you did not request a password reset, you can safely ignore this email.</p>

                <p style="color: #888; font-size: 12px;">
                    If the button doesn't work, copy this link:
                </p>

                <p style="color: #666; font-size: 12px; word-break: break-all;">
                    ${escapeHtml(resetUrl)}
                </p>
            </div>
        `,
    });
};

// Notify a manager whether their account request was approved
const sendManagerRequestDecisionMail = async (email, name, approved) => {
    const loginUrl = `${frontendUrl()}/login`;

    const subject = approved
        ? "Your Manager Account Has Been Approved"
        : "Update on Your Manager Account Request";

    const html = approved
        ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2>Hello ${escapeHtml(name)},</h2>

                <p>Your request for a manager account has been <strong>approved</strong>.</p>

                <p>You can now log in and start adding your properties.</p>

                <div style="margin: 30px 0;">
                    <a href="${escapeHtml(loginUrl)}"
                       style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Log In
                    </a>
                </div>

                <p>Welcome to RENT A HOME!</p>
            </div>
        `
        : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2>Hello ${escapeHtml(name)},</h2>

                <p>Your request for a manager account was <strong>not approved</strong>.</p>

                <p>You can still use your account as a tenant.</p>

                <p>If you think this is a mistake, please contact the administrator.</p>
            </div>
        `;

    const text = approved
        ? `Hello ${name}, your manager account request has been approved. Log in here: ${loginUrl}`
        : `Hello ${name}, your manager account request was not approved. You can still use your account as a tenant. Please contact the administrator if you think this is a mistake.`;

    await sendMail({
        email,
        subject,
        text,
        html,
    });
};

module.exports = {
    sendPasswordResetMail,
    sendVerificationMail,
    sendManagerRequestDecisionMail,
};