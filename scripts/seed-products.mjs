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

// 7 in Lab 502
export const PRODUCTS_LAB_502 = [
  { id: 'c1-p1', name: 'ASSETORBIT', icon: '🪐', description: 'Asset management and orbital telemetry tracking platform.', x: 35, y: 20 },
  { id: 'c1-p2', name: 'SUNTECH TECHNOLOGY', icon: '☀️', description: 'Solar intelligence and smart power distribution matrix.', x: 74, y: 22 },
  { id: 'c1-p3', name: 'ABCD IT SOLUTIONS', icon: '💻', description: 'Enterprise IT infrastructure and software acceleration.', x: 82, y: 40 },
  { id: 'c1-p4', name: 'ADSNEX AI', icon: '🤖', description: 'Next-generation neural targeting and AI analytics engine.', x: 44, y: 46 },
  { id: 'c1-p5', name: 'META GLASSES', icon: '👓', description: 'Augmented reality vision and spatial computing interface.', x: 76, y: 58 },
  { id: 'c1-p6', name: 'OPTINEXT GLOBAL.IN', icon: '🌐', description: 'Global optical networking and low-latency routing gateway.', x: 34, y: 68 },
  { id: 'c1-p7', name: 'PRELAUNCH', icon: '🚀', description: 'Product readiness telemetry and agile launchpad monitor.', x: 66, y: 76 },
];

// 7 in Lab 508
export const PRODUCTS_LAB_508 = [
  { id: 'c2-p1', name: 'MAITRI', icon: '🤝', description: 'Collaborative community intelligence and inclusive assistive tech.', x: 32, y: 20 },
  { id: 'c2-p2', name: 'R DISCOVERY', icon: '🔬', description: 'Academic paper recommendation and research synthesis platform.', x: 72, y: 24 },
  { id: 'c2-p3', name: 'PAPERPAL', icon: '📝', description: 'Real-time scholarly writing assistance and citation analysis.', x: 80, y: 42 },
  { id: 'c2-p4', name: 'LED LIGHT (frequency)', icon: '💡', description: 'High-frequency tunable illumination and stroboscopic telemetry.', x: 44, y: 48 },
  { id: 'c2-p5', name: 'SETH COMPUTERS', icon: '🖥️', description: 'Custom computing architectures and high-throughput systems.', x: 74, y: 60 },
  { id: 'c2-p6', name: 'ANAY IT SOLUTIONS', icon: '📊', description: 'Business analytics and agile technology infrastructure.', x: 30, y: 70 },
  { id: 'c2-p7', name: 'SHIVAM STOCKS', icon: '📈', description: 'Real-time equity market analysis and algorithmic trading signals.', x: 62, y: 78 },
];

// 8 in Lab 509
export const PRODUCTS_LAB_509 = [
  { id: 'c3-p1', name: 'SAMSUNG ECOSYSTEM', icon: '📱', description: 'Unified multi-device interconnectivity and smart home relay.', x: 35, y: 18 },
  { id: 'c3-p2', name: 'ios', icon: '🍏', description: 'Modern iOS application ecosystem and mobile experience stack.', x: 72, y: 22 },
  { id: 'c3-p3', name: 'AVG', icon: '🛡️', description: 'Real-time threat detection and endpoint cybersecurity shield.', x: 82, y: 36 },
  { id: 'c3-p4', name: 'Robotic arm', icon: '🦾', description: 'Precision multi-axis articulated robotic arm for automated tasks.', x: 46, y: 42 },
  { id: 'c3-p5', name: 'robot', icon: '🤖', description: 'Autonomous mobile robot with LIDAR navigation and obstacle avoidance.', x: 70, y: 54 },
  { id: 'c3-p6', name: 'Byteverse', icon: '🪐', description: 'Decentralized digital realm and interactive 3D virtual environment.', x: 28, y: 62 },
  { id: 'c3-p7', name: 'In-Out Desk', icon: '🪑', description: 'Smart biometric ergonomic workstation and attendance tracking.', x: 55, y: 72 },
  { id: 'c3-p8', name: 'Mend-x', icon: '🩹', description: 'Automated digital first-aid and medical diagnostics assistant.', x: 78, y: 80 },
];

const LAB_CONFIG = {
  '1': {
    id: '1',
    labId: '1',
    sourceLab: '1',
    chapterNumber: 'Chapter I',
    name: 'Lab 502',
    title: 'LAB 502',
    subtitle: 'Uncover innovative student tech, AI systems, and smart computing solutions.',
    badgeTitle: 'Lab 502 Mastered',
    fragmentId: '1',
    fragmentName: 'Avery Pirate Seal',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab1.webp',
    themeType: 'jungle',
    inkColor: '#1b381e',
    glowColor: '#10b981',
    coreGlow: '#d1fae5',
    badgeClass: 'bg-[#14532d]/20 text-[#166534] border-[#166534]/40',
    checkpoints: PRODUCTS_LAB_502,
  },
  '2': {
    id: '2',
    labId: '2',
    sourceLab: '2',
    chapterNumber: 'Chapter II',
    name: 'Lab 508',
    title: 'LAB 508',
    subtitle: 'Explore research assistants, smart frequency systems, and market platforms.',
    badgeTitle: 'Lab 508 Mastered',
    fragmentId: '2',
    fragmentName: 'Magellan Cross Key',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab2.webp',
    themeType: 'frost',
    inkColor: '#0f2238',
    glowColor: '#38bdf8',
    coreGlow: '#e0f2fe',
    badgeClass: 'bg-[#0369a1]/20 text-[#0284c7] border-[#0284c7]/40',
    checkpoints: PRODUCTS_LAB_508,
  },
  '3': {
    id: '3',
    labId: '3',
    sourceLab: '3',
    chapterNumber: 'Chapter III',
    name: 'Lab 509',
    title: 'LAB 509',
    subtitle: 'Inspect mobile ecosystems, cybersecurity tools, robotics, and smart desks.',
    badgeTitle: 'Lab 509 Mastered',
    fragmentId: '3',
    fragmentName: 'King’s Astrolabe Crest',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab3.webp',
    themeType: 'volcano',
    inkColor: '#240902',
    glowColor: '#f97316',
    coreGlow: '#fef08a',
    badgeClass: 'bg-[#9a3412]/20 text-[#c2410c] border-[#ea580c]/40',
    checkpoints: PRODUCTS_LAB_509,
  },
};

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  tls: true,
  tlsAllowInvalidCertificates: true,
});

async function seedProducts() {
  try {
    console.log('\n\x1b[33m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[36m  TechX 2026 Product Seeder Utility    \x1b[0m');
    console.log('\x1b[33m========================================\x1b[0m');
    console.log(`Target Database: \x1b[32m${dbName}\x1b[0m\n`);

    await client.connect();
    const db = client.db(dbName);
    const labsCol = db.collection('labs');

    const now = new Date();

    for (const [labKey, lab] of Object.entries(LAB_CONFIG)) {
      await labsCol.updateOne(
        { labKey },
        { $set: { lab, updatedAt: now } },
        { upsert: true }
      );
      console.log(`\x1b[32m✓ Seeded ${lab.name}:\x1b[0m ${lab.checkpoints.length} products`);
      lab.checkpoints.forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p.icon}] ${p.name}`);
      });
    }

    console.log('\n\x1b[32m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[32m  All 22 Products Seeded Successfully! \x1b[0m');
    console.log('  Lab 502: 7 products');
    console.log('  Lab 508: 7 products');
    console.log('  Lab 509: 8 products');
    console.log('\x1b[32m========================================\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31m[ERROR] Failed to seed products:\x1b[0m', err.message || err);
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

seedProducts();
