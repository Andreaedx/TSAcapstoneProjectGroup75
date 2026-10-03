require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");

const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");

const errorHandler = require("./Middleware/errorHandler");

const connectDB = require("./Config/db");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Error handler MUST come after all routes
app.use(errorHandler);

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();
