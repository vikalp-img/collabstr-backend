module.exports = {
    APP_SHORT_NAME: process.env.APP_SHORT_NAME || 'Collab',
    JWT_KEY: process.env.JWT_KEY,
    EMAIL_CONFIG: {
        host: process.env.smshost,
        port: process.env.smsport,
        username: process.env.mail_username,
        password: process.env.password,
        from_name: process.env.from_name,
        from_address: process.env.from_address
    },
    HOST: process.env.HOST || '',
    PORT: process.env.PORT || 5005,
    ADMINPORT: process.env.ADMINPORT || 5005,
    // CRONPORT: process.env.CRONPORT || 6363,
    // SOCKETPORT: process.env.SOCKETPORT || 3738,
    DB_URL: process.env.DB_URL,
    apk: '----',
    url: process.env.url || '',
    PER_PAGE: process.env.PER_PAGE || 10
};
