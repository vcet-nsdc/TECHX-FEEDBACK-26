import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import dns from 'node:dns';

// Fix for Node.js SRV resolution issue on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {}

// Load environment variables (.env.local, .env)
function loadEnv() {
  if (typeof process.loadEnvFile === 'function') {
    try {
      if (fs.existsSync('.env.local')) {
        process.loadEnvFile('.env.local');
        return;
      } else if (fs.existsSync('.env')) {
        process.loadEnvFile('.env');
        return;
      }
    } catch {}
  }
  for (const file of ['.env.local', '.env']) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'techx-feedback-2026';

if (!uri) {
  console.error('\x1b[31m[ERROR]\x1b[0m MONGODB_URI is not defined in .env.local or environment.');
  process.exit(1);
}

const client = new MongoClient(uri);

async function cleanReviews() {
  try {
    console.log('\n\x1b[33m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[36m   TechX 2026 Clean Reviews Utility     \x1b[0m');
    console.log('\x1b[33m========================================\x1b[0m');
    console.log(`Target Database: \x1b[32m${dbName}\x1b[0m\n`);

    await client.connect();
    const db = client.db(dbName);
    const feedbackCol = db.collection('feedback');
    const usersCol = db.collection('users');
    const metaCol = db.collection('_metadata');

    const [prevFeedbackCount, prevUsersCount] = await Promise.all([
      feedbackCol.countDocuments(),
      usersCol.countDocuments(),
    ]);

    console.log(`Current reviews in database: \x1b[33m${prevFeedbackCount}\x1b[0m`);
    console.log(`Registered users in database: \x1b[33m${prevUsersCount}\x1b[0m\n`);

    // 1. Delete all feedback documents
    const deleteResult = await feedbackCol.deleteMany({});
    console.log(`\x1b[32m✓ Cleared feedback:\x1b[0m ${deleteResult.deletedCount} reviews deleted.`);

    // 2. Reset user completion counters (so users remain, but have 0 completed products)
    const resetUsersResult = await usersCol.updateMany(
      {},
      {
        $set: {
          completedProducts: [],
          completedLabs: [],
          shards: [],
        },
      }
    );
    console.log(`\x1b[32m✓ Reset user progress:\x1b[0m ${resetUsersResult.modifiedCount} user records reset to 0 reviews.`);

    // 3. Mark demo seeding disabled so app doesn't auto-generate sample users on restart
    await metaCol.updateOne(
      { key: 'demo_seeded' },
      { $set: { disabled: true, cleanedAt: new Date().toISOString() } },
      { upsert: true }
    );
    console.log('\x1b[32m✓ Auto-demo seeding:\x1b[0m Disabled to keep reviews 100% clean.');

    console.log('\n\x1b[32m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[32m  All Reviews Cleaned Successfully!    \x1b[0m');
    console.log(`  Total Reviews Now: 0`);
    console.log('\x1b[32m========================================\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31m[ERROR] Failed to clean reviews:\x1b[0m', err.message || err);
    if (err.message?.includes('SSL alert') || err.message?.includes('tlsv1 alert') || err.name === 'MongoServerSelectionError') {
      console.log('\n\x1b[33m--------------------------------------------------------\x1b[0m');
      console.log('\x1b[1m\x1b[33m  MongoDB Atlas IP Access Notice:                      \x1b[0m');
      console.log('  Your current IP address is not whitelisted on Atlas.');
      console.log('  1. Log into cloud.mongodb.com');
      console.log('  2. Go to Security -> Network Access -> IP Access List');
      console.log('  3. Click "Add IP Address" -> Add 0.0.0.0/0 (Allow Anywhere)');
      console.log('\x1b[33m--------------------------------------------------------\x1b[0m\n');
    }
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanReviews();
