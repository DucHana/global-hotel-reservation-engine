const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');

async function run() {
  const ds = new DataSource({
    type: 'mssql',
    host: 'localhost',
    port: 1433,
    username: 'hotel_manager',
    password: '123456',
    database: 'hotel_management',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  try {
    await ds.initialize();
    const sqlPath = path.join(__dirname, 'backend/src/database/04-stored-procedures.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by GO but be careful with comments
    const parts = sql.split(/\nGO\s*\n|\nGO$/i);
    
    for (let part of parts) {
      part = part.trim();
      if (part && !part.startsWith('USE ')) {
        try {
          await ds.query(part);
        } catch (e) {
          console.error(`Error executing part: ${part.substring(0, 100)}...`);
          console.error(`Message: ${e.message}`);
        }
      }
    }
    console.log('Stored procedures updated successfully');
    await ds.destroy();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
