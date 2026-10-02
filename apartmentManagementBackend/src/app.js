require("dotenv").config();

const express = require("express");

const invoiceRoutes = require("./Routes/invoiceRoutes");
const errorHandler = require("./Middleware/errorHandler");

//routes should be here
const propertyRoutes = require("./Routes/propertyRoutes");

const app = express();

app.use(express.json());

app.use("/api/invoices", invoiceRoutes);

app.use("/properties", propertyRoutes);

const connectDB = require("./Config/db");

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();