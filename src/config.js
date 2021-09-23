require("dotenv").config();

const config = {
    prefix: process.env.prefix,
    token: process.env.token,
}

module.exports = config;