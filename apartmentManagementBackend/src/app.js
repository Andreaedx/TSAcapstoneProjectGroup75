require("dotenv").config();

const express = require("express");
const tenancyRoutes = require("./Routes/tenancyRoutes");

//routes should be here
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");

const app = express();

app.use(express.json());
app.use("/api/tenancies", tenancyRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

const connectDB = require("./Config/db");

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();