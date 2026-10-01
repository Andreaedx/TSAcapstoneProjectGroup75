require("dotenv").config();

const express = require("express");

const connectDB = require("./Config/db");

const authRoutes = require("./Routes/authRoutes");
const invoiceRoutes = require("./Routes/invoiceRoutes");
const errorHandler = require("./Middleware/errorHandler");

//routes should be here

const apartmentRoutes = require("./Routes/apartmentRoutes");

const app = express();

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/apartments", apartmentRoutes);
app.use("/api/invoices", invoiceRoutes);

app.use(errorHandler);

app.get("/", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Apartment Management API is running"
    });
});

const startServer = async () => {
    try {
        await connectDB();

        app.listen(process.env.PORT, () => {
            console.log(`server running on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();