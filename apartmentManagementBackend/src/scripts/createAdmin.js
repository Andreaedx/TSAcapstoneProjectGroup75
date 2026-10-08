// Creates (or promotes) the admin account. Admins can't register through the API.
// Usage: npm run create-admin -- "Admin Name" admin@example.com "StrongPassword"
// or set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env and run: npm run create-admin
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../Models/User");

const [, , argName, argEmail, argPassword] = process.argv;

const name = argName || process.env.ADMIN_NAME;
const email = (argEmail || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const password = argPassword || process.env.ADMIN_PASSWORD;

const run = async () => {
    if (!name || !email || !password) {
        console.error("Provide name, email and password: npm run create-admin -- \"Admin Name\" admin@example.com \"StrongPassword\"");
        process.exit(1);
    }

    if (password.length < 6) {
        console.error("Password must be at least 6 characters");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const existing = await User.findOne({ email });

    if (existing) {
        existing.name = name;
        existing.password = hashedPassword;
        existing.role = "admin";
        existing.isEmailVerified = true;
        await existing.save();
        console.log(`Updated ${email} to admin`);
    } else {
        await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin",
            isEmailVerified: true
        });
        console.log(`Created admin ${email}`);
    }

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error("Failed to create admin:", error.message);
    await mongoose.disconnect();
    process.exit(1);
});
