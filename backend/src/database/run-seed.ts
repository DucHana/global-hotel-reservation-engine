import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { seedDatabase } from './seed';

dotenv.config();

async function run() {
  const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    username: process.env.DB_USER || 'hotel_manager',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hotel_management',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  try {
    await dataSource.initialize();
    console.log('📦 Connected to database for seeding...');

    const dbDir = __dirname;
    const files = fs.readdirSync(dbDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`📜 Executing ${file}...`);
      const filePath = path.join(dbDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split by GO if present
      const batches = sql.split(/\bGO\b/i);
      
      for (let batch of batches) {
        batch = batch.trim();
        if (!batch || batch.toUpperCase().startsWith('USE ')) continue;
        
        try {
          await dataSource.query(batch);
        } catch (err: any) {
          console.warn(`⚠️ Warning in ${file}:`, err.message);
        }
      }
    }

    console.log('🌱 Inserting mock data...');
    await seedDatabase(dataSource);

    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await dataSource.destroy();
  }
}

run();
