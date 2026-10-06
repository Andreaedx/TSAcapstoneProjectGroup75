const nodemailer = require("nodemailer");

const createTransporter = () => {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
    const port = Number(EMAIL_PORT);

    if (
        !EMAIL_HOST ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !EMAIL_USER ||
        !EMAIL_PASSWORD
    ) {
        throw new Error("SMTP configuration requires EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASSWORD");
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port,
        secure: port === 465,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD
        }
    });
};

const getFromAddress = () => `"RENT A HOME" <${process.env.EMAIL_USER}>`;

const sendPasswordResetMail = async (email, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await createTransporter().sendMail({
        from: getFromAddress(),
        to: email,
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

                <p>
                    If you did not request a password reset,
                    you can safely ignore this email.
                </p>

                <p style="color: #888; font-size: 12px;">
                    If the button doesn't work, copy this link:
                </p>

                <p style="color: #666; font-size: 12px; word-break: break-all;">
                    ${resetUrl}
                </p>
            </div>
        `
    });
};


const sendVerificationMail = async (email, verificationToken) => {
    const verificationUrl =
        `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await createTransporter().sendMail({
        from: getFromAddress(),
        to: email,
        subject: "Verify your email address",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px;">
                <h2>Verify Your Email</h2>

                <p>
                    Thank you for creating an account with RENT A HOME.
                </p>

                <p>
                    Please click the button below to verify your email address.
                </p>

                <div style="margin: 30px 0;">
                    <a href="${verificationUrl}"
                        style="background: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
                        Verify Email
                    </a>
                </div>

                <p>
                    This verification link expires in <strong>15 minutes</strong>.
                </p>

                <p>
                    If you did not create this account, you can safely ignore this email.
                </p>

                <p style="color: #888; font-size: 12px;">
                    If the button doesn't work, copy this link:
                </p>

                <p style="color: #666; font-size: 12px; word-break: break-all;">
                    ${verificationUrl}
                </p>
            </div>
        `
    });
};


module.exports = {
    sendPasswordResetMail,
    sendVerificationMail
};
