import { MongoClient } from 'mongodb';
import fs from 'node:fs';

// 1. Load environment variables (.env.local, .env)
if (typeof process.loadEnvFile === 'function') {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  } else if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
  }
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'techx-feedback-2026';

if (!uri) {
  console.error('\x1b[31m[ERROR]\x1b[0m MONGODB_URI is not defined in .env.local or environment.');
  process.exit(1);
}

// Parse optional CLI flags: --seed (re-seed after clean), --labs (also reset labs catalog)
const args = process.argv.slice(2);
const shouldReseed = args.includes('--seed');
const shouldCleanLabs = args.includes('--labs');

console.log('\n\x1b[33m========================================\x1b[0m');
console.log('\x1b[1m\x1b[36m  TechX 2026 Database Clean Utility    \x1b[0m');
console.log('\x1b[33m========================================\x1b[0m');
console.log(`Target Database: \x1b[32m${dbName}\x1b[0m`);

const client = new MongoClient(uri);

async function cleanDatabase() {
  try {
    console.log('\nConnecting to MongoDB Atlas...');
    await client.connect();
    const db = client.db(dbName);
    console.log('\x1b[32m✓ Connected successfully.\x1b[0m\n');

    // Check counts before wipe
    const feedbackCol = db.collection('feedback');
    const usersCol = db.collection('users');
    const labsCol = db.collection('labs');
    const metaCol = db.collection('_metadata');

    const [prevFeedback, prevUsers, prevLabs] = await Promise.all([
      feedbackCol.countDocuments().catch(() => 0),
      usersCol.countDocuments().catch(() => 0),
      labsCol.countDocuments().catch(() => 0),
    ]);

    console.log('Current records:');
    console.log(` • feedback: \x1b[33m${prevFeedback}\x1b[0m records`);
    console.log(` • users:    \x1b[33m${prevUsers}\x1b[0m records`);
    console.log(` • labs:     \x1b[33m${prevLabs}\x1b[0m records`);

    console.log('\nClearing database records...');

    // 1. Delete all feedback submissions
    const fbResult = await feedbackCol.deleteMany({});
    console.log(`\x1b[32m✓ Cleared feedback:\x1b[0m ${fbResult.deletedCount} submissions removed.`);

    // 2. Delete all users and explorer progress
    const usersResult = await usersCol.deleteMany({});
    console.log(`\x1b[32m✓ Cleared users:\x1b[0m ${usersResult.deletedCount} explorer profiles removed.`);

    // 3. Optional: labs collection
    if (shouldCleanLabs) {
      const labsResult = await labsCol.deleteMany({});
      console.log(`\x1b[32m✓ Cleared labs catalog:\x1b[0m ${labsResult.deletedCount} records removed.`);
    }

    // 4. Mark demo seeding disabled so app doesn't auto-generate sample users on restart
    if (shouldReseed) {
      await metaCol.deleteOne({ key: 'demo_seeded' });
      console.log('\x1b[36mℹ Reset flag: Demo data will be automatically re-seeded upon next visit.\x1b[0m');
    } else {
      await metaCol.updateOne(
        { key: 'demo_seeded' },
        { $set: { disabled: true, cleanedAt: new Date().toISOString() } },
        { upsert: true }
      );
      console.log('\x1b[32m✓ Disabled auto-demo seeding:\x1b[0m Database will stay 100% clean for live event.');
    }

    // Verify final counts
    const [finalFeedback, finalUsers] = await Promise.all([
      feedbackCol.countDocuments(),
      usersCol.countDocuments(),
    ]);

    console.log('\n\x1b[32m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[32m  Database Clean Complete!             \x1b[0m');
    console.log(`  Feedback: ${finalFeedback} | Users: ${finalUsers}`);
    console.log('\x1b[32m========================================\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31m[ERROR] Failed to clean database:\x1b[0m', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanDatabase();
