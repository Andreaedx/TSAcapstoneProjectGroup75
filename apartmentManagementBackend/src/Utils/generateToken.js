const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
    const token = jwt.sign(
        { 
            id: userId 
        }, 
        process.env.JWT_SECRET, 
        { 
            expiresIn: process.env.JWT_EXPIRES_IN 
        }
    );
    return token;
};

const generateRefreshToken = (userId) => {
    const token = jwt.sign(
        {
            id: userId
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
        }
    );
    return token;
}

module.exports = {
    generateToken,
    generateRefreshToken
};