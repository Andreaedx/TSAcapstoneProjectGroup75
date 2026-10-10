const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASSWORD,
    },
});

transporter.verify()
    .then(() => {
        console.log("SMTP connection successful");
    })
    .catch((error) => {
        console.error("SMTP connection failed:", error.message);
    });
    
// FRONTEND_URL may list several origins for CORS; email links use the first one
const frontendUrl = () =>
    (process.env.FRONTEND_URL || "http://localhost:5173")
        .split(",")[0]
        .trim()
        .replace(/\/$/, "");

const sendMail = async ({ email, subject, html }) => {
    return transporter.sendMail({
        from: {
            name: process.env.BREVO_SENDER_NAME || "RENT A HOME",
            address: process.env.BREVO_SENDER_EMAIL,
        },
        to: email,
        subject,
        html,
    });
};

const sendPasswordResetMail = async (email, resetToken) => {
    const resetUrl = `${frontendUrl()}/reset-password/${resetToken}`;

    await sendMail({
        email,
        subject: "Reset your password",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2>Reset Your Password</h2>

                <p>We received a request to reset your password.</p>
                <p>Click the button below to create a new password.</p>

                <div style="margin: 30px 0;">
                    <a href="${resetUrl}"
                        style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
                        Reset Password
                    </a>
                </div>

                <p>This link expires in <strong>15 minutes</strong>.</p>
                <p>If you did not request a password reset, you can safely ignore this email.</p>

                <p style="color: #888; font-size: 12px;">
                    If the button doesn't work, copy this link:
                </p>
                <p style="color: #666; font-size: 12px; word-break: break-all;">
                    ${resetUrl}
                </p>
            </div>
        `,
    });
};

const sendVerificationMail = async (email, code) => {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Verify Your Email Address",
        text: `Your email verification code is ${code}. This code expires in 15 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Email Verification</h2>
                <p>Use the code below to verify your email address:</p>
                <h1 style="letter-spacing: 8px;">${code}</h1>
                <p>This code expires in 15 minutes.</p>
                <p>If you did not create this account, ignore this email.</p>
            </div>
        `
    });
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            

const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);

const sendManagerRequestDecisionMail = async (email, name, approved) => {
    const loginUrl = `${frontendUrl()}/login`;

    await sendMail({
        email,
        subject: approved
            ? "Your manager account has been approved"
            : "Update on your manager account request",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2>Hello ${escapeHtml(name)},</h2>

                ${approved
                    ? `
                        <p>Your request for a manager account has been <strong>approved</strong>.</p>
                        <p>You can now log in and start adding your properties.</p>

                        <div style="margin: 30px 0;">
                            <a href="${loginUrl}"
                                style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
                                Log In
                            </a>
                        </div>
                    `
                    : `
                        <p>Your request for a manager account was <strong>not approved</strong>.</p>
                        <p>You can still use your account as a tenant. If you think this is a mistake, please contact the administrator.</p>
                    `
                }
            </div>
        `,
    });
};

module.exports = {
    sendPasswordResetMail,
    sendVerificationMail,
    sendManagerRequestDecisionMail,
};