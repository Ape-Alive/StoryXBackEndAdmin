require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5800;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🚀 Server is running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📋 API Spec JSON: http://localhost:${PORT}/api-docs.json`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});
