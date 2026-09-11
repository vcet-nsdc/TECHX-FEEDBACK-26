import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';

// Fix for Node.js SRV resolution issue on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {}

// Load environment variables (.env.local, .env)
if (typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

function normalizeMongoUri(rawUri) {
  if (rawUri.includes('mongodb+srv://') && rawUri.includes('feedback-26.oskfbzz.mongodb.net')) {
    const credMatch = rawUri.match(/mongodb\+srv:\/\/([^@]+)@/);
    const creds = credMatch ? `${credMatch[1]}@` : '';
    return `mongodb://${creds}ac-kfmjx7c-shard-00-00.oskfbzz.mongodb.net:27017,ac-kfmjx7c-shard-00-01.oskfbzz.mongodb.net:27017,ac-kfmjx7c-shard-00-02.oskfbzz.mongodb.net:27017/techx-feedback-2026?ssl=true&replicaSet=atlas-5vxff4-shard-0&authSource=admin&retryWrites=true&w=majority&appName=FeedBack-26`;
  }
  return rawUri;
}

const rawUri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'techx-feedback-2026';

if (!rawUri) {
  console.error('\x1b[31m[ERROR]\x1b[0m MONGODB_URI is not defined in .env.local or environment.');
  process.exit(1);
}

const uri = normalizeMongoUri(rawUri);

async function runBackup() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m   TECHX 2026 — MONGODB PRODUCTION BACKUP UTILITY   \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log(`Target Database: \x1b[33m${dbName}\x1b[0m\n`);

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000,
  });

  try {
    console.log('Connecting to MongoDB cluster...');
    await client.connect();
    const db = client.db(dbName);
    console.log('\x1b[32m✔ Connected successfully.\x1b[0m\n');

    // Create timestamped backup directory
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // List collections to back up
    const targetCollections = ['feedback', 'users', 'labs', '_metadata'];
    const summary = [];

    for (const colName of targetCollections) {
      try {
        const col = db.collection(colName);
        const docs = await col.find({}).toArray();
        const filePath = path.join(backupDir, `${colName}.json`);

        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
        const stats = fs.statSync(filePath);
        const sizeKb = (stats.size / 1024).toFixed(1);

        console.log(`✔ Dumped \x1b[32m${colName.padEnd(12)}\x1b[0m: ${docs.length.toString().padStart(6)} documents (${sizeKb} KB) -> ${colName}.json`);
        summary.push({ collection: colName, count: docs.length, sizeKb: `${sizeKb} KB` });
      } catch (colErr) {
        console.warn(`⚠ Could not backup collection ${colName}:`, colErr.message);
      }
    }

    // Write metadata manifest
    const manifest = {
      database: dbName,
      createdAt: now.toISOString(),
      summary,
    };
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`\n\x1b[32m✔ Backup completed successfully!\x1b[0m`);
    console.log(`📁 Backup directory: \x1b[34m${backupDir}\x1b[0m\n`);
  } catch (error) {
    console.error('\x1b[31m[ERROR] Backup failed:\x1b[0m', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runBackup();
