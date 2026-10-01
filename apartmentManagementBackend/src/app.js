require("dotenv").config();

const express = require("express");

const invoiceRoutes = require("./Routes/invoiceRoutes");
const errorHandler = require("./Middleware/errorHandler");

//routes should be here
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/invoices", invoiceRoutes);

app.use(errorHandler);

const connectDB = require("./Config/db");

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();