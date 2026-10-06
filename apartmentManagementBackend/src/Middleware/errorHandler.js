const mongoose = require("mongoose");

const errorHandler = (error, req, res, next) => {
    console.error(error);

    if(error instanceof mongoose.Error.CastError){
        return res.status(400).json({
            success: false,
            message: `Invalid ${error.path}`
        });
    }

    if(error instanceof mongoose.Error.ValidationError){
        const messages = Object.values(error.errors).map(
            (error) => error.message
        );

        return res.status(400).json({
            success: false,
            message: "Validation failed", error: error.messages
        });
    }

    if(error.statusCode){
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    return res.status(500).json({
        success: false,
        message: "Something went wrong"
    });
}

module.exports = errorHandler;