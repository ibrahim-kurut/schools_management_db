const app = require('./app');
require('./config/redis');
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`
    🚀 Server is firing up!
    📡 Listening on: http://localhost:${PORT}
    🏗️ Environment: Development
    `);
});