require("dotenv").config();

const express = require("express");

//routes should be here


const app = express();

app.use(express.json());



const connectDB = require("./Config/db");

const startServer = async () => {
    await connectDB();

    app.listen(process.env.PORT, () => {
        console.log(`server running on port ${process.env.PORT}`);
    });
};

startServer();