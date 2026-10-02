require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");

//routes should be here
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

const connectDB = require("./Config/db");

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();