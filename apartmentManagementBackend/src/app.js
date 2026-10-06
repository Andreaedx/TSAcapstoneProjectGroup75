require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const propertyRoutes = require("./Routes/propertyRoutes");
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");
const invoiceRoutes = require("./Routes/invoiceRoutes");
const apartmentRoutes = require("./Routes/apartmentRoutes");
const maintenanceRoutes = require("./Routes/maintenanceRoutes");
const tenancyRoutes = require("./Routes/tenancyRoutes");
const paymentRoutes = require("./Routes/paymentRoutes");

const errorHandler = require("./Middleware/errorHandler");

const connectDB = require("./Config/db");

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/properties", propertyRoutes);
app.use("/api/apartments", apartmentRoutes);
app.use("/api/maintenaces", maintenanceRoutes);
app.use("/api/tenancies", tenancyRoutes);
app.use("/api/payments", paymentRoutes);


// Error handler MUST come after all routes
app.use(errorHandler);

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();
