'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function runMigration() {
  const dbUrl = (process.env.DATABASE_URL || '').trim();

  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL is not set in your .env file.');
    process.exit(1);
  }

  const isCloud = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isCloud ? { rejectUnauthorized: false } : false,
  });

  try {
    const files = fs.readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sqlFilePath = path.join(__dirname, file);
      console.log(`[Migration] Running ${file}...`);
      const sql = fs.readFileSync(sqlFilePath, 'utf8');
      await pool.query(sql);
      console.log(`✅ [Migration] Completed ${file}`);
    }

    console.log('🎉 All migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
