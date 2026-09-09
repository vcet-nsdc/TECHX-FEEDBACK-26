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

const SAMPLE_STUDENTS = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@techx.vcet.edu.in', department: 'AI-DS' },
  { name: 'Diya Patel', email: 'diya.patel@techx.vcet.edu.in', department: 'COMPS' },
  { name: 'Rohan Mehta', email: 'rohan.mehta@techx.vcet.edu.in', department: 'IT' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@techx.vcet.edu.in', department: 'EXTC' },
  { name: 'Siddharth Verma', email: 'siddharth.verma@techx.vcet.edu.in', department: 'MECH' },
  { name: 'Tanvi Kulkarni', email: 'tanvi.kulkarni@techx.vcet.edu.in', department: 'AI-DS' },
  { name: 'Aditya Joshi', email: 'aditya.joshi@techx.vcet.edu.in', department: 'COMPS' },
  { name: 'Ishaan Nair', email: 'ishaan.nair@techx.vcet.edu.in', department: 'IT' },
  { name: 'Sneha Deshmukh', email: 'sneha.deshmukh@techx.vcet.edu.in', department: 'EXTC' },
  { name: 'Varun Gupta', email: 'varun.gupta@techx.vcet.edu.in', department: 'AI-DS' },
  { name: 'Riya Sen', email: 'riya.sen@techx.vcet.edu.in', department: 'COMPS' },
  { name: 'Kabir Rao', email: 'kabir.rao@techx.vcet.edu.in', department: 'IT' },
  { name: 'Nathan Drake', email: 'drake@uncharted.com', department: 'AI-DS' },
  { name: 'Elena Fisher', email: 'elena@press.org', department: 'COMPS' },
  { name: 'Victor Sullivan', email: 'sully@treasure.net', department: 'EXTC' },
  { name: 'Chloe Frazer', email: 'chloe@expedition.io', department: 'IT' },
];

const SAMPLE_COMMENTS = [
  'Incredible innovation and very smooth interface!',
  'Very practical real-world solution. Tested without any lag.',
  'Impressive hardware-software integration and clean architecture.',
  'Great presentation and thorough explanation by the project team.',
  'Solid prototype, has strong potential for commercial scalability.',
  'Very responsive, intuitive UX and fast data retrieval.',
  'Creative concept and thoughtful design implementation.',
  'Clean code and seamless real-time synchronization.',
  'Loved the concept! Well executed telemetry and layout.',
  'Outstanding effort by the developers. Works reliably.',
  'Intuitive features, works smoothly on mobile as well.',
  'Innovative project with great future potential.',
];

const client = new MongoClient(uri);

async function seedReviews() {
  try {
    console.log('\n\x1b[33m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[36m   TechX 2026 Sample Reviews Seeder     \x1b[0m');
    console.log('\x1b[33m========================================\x1b[0m');
    console.log(`Target Database: \x1b[32m${dbName}\x1b[0m\n`);

    await client.connect();
    const db = client.db(dbName);
    const labsCol = db.collection('labs');
    const feedbackCol = db.collection('feedback');
    const usersCol = db.collection('users');

    // 1. Fetch current labs & products from DB
    const labDocs = await labsCol.find({ labKey: { $in: ['1', '2', '3'] } }).toArray();
    
    // Mapping of labKey to canonical lab id: '1' -> 'a', '2' -> 'c', '3' -> 'd'
    const CANONICAL_MAP = { '1': 'a', '2': 'c', '3': 'd' };

    const allProducts = [];
    const productsByLab = { '1': [], '2': [], '3': [] };

    for (const doc of labDocs) {
      const labKey = doc.labKey;
      const checkpoints = doc.lab?.checkpoints || [];
      for (const cp of checkpoints) {
        const item = {
          tableId: cp.id,
          name: cp.name,
          labKey,
          canonicalLabId: CANONICAL_MAP[labKey] || labKey,
          labName: doc.lab?.name || `Lab ${labKey === '1' ? '502' : labKey === '2' ? '508' : '509'}`,
        };
        allProducts.push(item);
        productsByLab[labKey]?.push(item);
      }
    }

    if (allProducts.length === 0) {
      console.log('\x1b[31m[ERROR] No products found in labs collection. Please run npm run seed:products first.\x1b[0m');
      process.exit(1);
    }

    console.log(`Found \x1b[32m${allProducts.length} products\x1b[0m across ${labDocs.length} labs.`);

    // 2. Clear existing feedback so fresh realistic sample reviews are inserted cleanly
    await feedbackCol.deleteMany({});
    console.log('\x1b[32m✓ Cleared previous feedback submissions.\x1b[0m');

    // 3. Generate sample feedback entries
    const feedbackEntries = [];
    const userMap = new Map();

    const now = Date.now();

    // Define different participation depths for students
    // First 4 students complete ALL 22 products across all 3 labs!
    // Next 6 students complete 10-15 products across multiple labs.
    // Remaining students complete 5-8 products.
    SAMPLE_STUDENTS.forEach((student, sIdx) => {
      let ratedProducts = [];
      if (sIdx < 4) {
        // Complete ALL products
        ratedProducts = [...allProducts];
      } else if (sIdx < 10) {
        // Complete 12-16 products distributed across all labs
        ratedProducts = allProducts.filter((_, pIdx) => (pIdx + sIdx) % 3 !== 0);
      } else {
        // Complete 6-9 products
        ratedProducts = allProducts.filter((_, pIdx) => (pIdx + sIdx) % 2 === 0).slice(0, 8);
      }

      const completedProductIds = [];
      const completedLabKeys = new Set();

      ratedProducts.forEach((prod, pIdx) => {
        completedProductIds.push(prod.tableId);

        // Weighted rating generator (mostly 4 and 5, occasional 3)
        // Certain top products get consistently high ratings for a realistic leaderboard
        let rating = 5;
        const seedVal = (sIdx * 13 + pIdx * 7) % 10;
        if (prod.name.includes('ASSETORBIT') || prod.name.includes('PAPERPAL') || prod.name.includes('SAMSUNG')) {
          rating = seedVal > 2 ? 5 : 4;
        } else if (prod.name.includes('META') || prod.name.includes('R DISCOVERY') || prod.name.includes('Robotic')) {
          rating = seedVal > 4 ? 5 : 4;
        } else {
          rating = seedVal === 0 ? 3 : seedVal < 5 ? 4 : 5;
        }

        // Realistic timestamp staggered in past 4 hours
        const timeOffsetMs = (allProducts.length - pIdx) * 180000 + (sIdx * 45000);
        const timestamp = new Date(now - timeOffsetMs).toISOString();

        const comment = SAMPLE_COMMENTS[(sIdx * 3 + pIdx) % SAMPLE_COMMENTS.length];

        feedbackEntries.push({
          submissionId: `sub-${student.email.slice(0, 5)}-${prod.tableId}`,
          studentName: student.name,
          studentEmail: student.email,
          studentDepartment: student.department,
          labId: prod.canonicalLabId,
          tableId: prod.tableId,
          rating,
          comment,
          timestamp,
          createdAt: new Date(timestamp),
        });
      });

      // Check which labs this user fully completed
      ['1', '2', '3'].forEach((labKey) => {
        const labProds = productsByLab[labKey] || [];
        if (labProds.length > 0 && labProds.every((p) => completedProductIds.includes(p.tableId))) {
          completedLabKeys.add(CANONICAL_MAP[labKey] || labKey);
        }
      });

      userMap.set(student.email, {
        email: student.email,
        name: student.name,
        department: student.department,
        completedProducts: completedProductIds,
        unlockedLabs: ['a', 'c', 'd'],
        completedLabs: Array.from(completedLabKeys),
        shards: Array.from(completedLabKeys),
        discoveredClues: ['clue-a-1'],
        discoveredTreasures: ['tr-coin'],
        updatedAt: new Date(),
      });
    });

    // 4. Batch insert feedback entries
    if (feedbackEntries.length > 0) {
      await feedbackCol.insertMany(feedbackEntries);
      console.log(`\x1b[32m✓ Inserted ${feedbackEntries.length} sample reviews.\x1b[0m`);
    }

    // 5. Update users collection
    for (const userData of userMap.values()) {
      await usersCol.updateOne(
        { email: userData.email },
        { $set: userData },
        { upsert: true }
      );
    }
    console.log(`\x1b[32m✓ Updated ${userMap.size} student explorer profiles.\x1b[0m`);

    // 6. Print summary
    console.log('\n\x1b[32m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[32m  Sample Reviews Seeded Successfully!  \x1b[0m');
    console.log(`  Total Reviews Created: \x1b[1m${feedbackEntries.length}\x1b[0m`);
    console.log(`  Active Reviewers:      \x1b[1m${userMap.size}\x1b[0m`);
    console.log(`  Products Covered:      \x1b[1m${allProducts.length} / 22\x1b[0m`);
    console.log('\x1b[32m========================================\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31m[ERROR] Failed to seed reviews:\x1b[0m', err.message || err);
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

seedReviews();
