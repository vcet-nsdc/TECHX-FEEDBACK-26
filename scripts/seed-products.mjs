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

// 10 in Lab 502
export const PRODUCTS_LAB_502 = [
  { id: 'c1-p1', name: 'ASSETORBIT', icon: '🪐', description: 'Asset management and orbital telemetry tracking platform.', x: 32, y: 18 },
  { id: 'c1-p2', name: 'SYNKARO', icon: '🔄', description: 'Real-time synchronization and cross-platform data orchestration engine.', x: 55, y: 16 },
  { id: 'c1-p3', name: 'ABCD IT SOLUTIONS', icon: '💻', description: 'Enterprise IT infrastructure and digital solutions architecture.', x: 78, y: 22 },
  { id: 'c1-p4', name: 'MAITRI', icon: '🤝', description: 'Inclusive assistive intelligence and community collaboration platform.', x: 84, y: 38 },
  { id: 'c1-p5', name: 'R DISCOVERY', icon: '🔬', description: 'Academic paper recommendation and scholarly literature discovery suite.', x: 58, y: 42 },
  { id: 'c1-p6', name: 'PAPERPAL', icon: '📝', description: 'AI-powered scholarly writing assistant and manuscript editor.', x: 34, y: 48 },
  { id: 'c1-p7', name: 'ADSNEX AI', icon: '🤖', description: 'Next-generation neural targeting and predictive marketing AI engine.', x: 52, y: 60 },
  { id: 'c1-p8', name: 'META GLASSES', icon: '👓', description: 'Smart augmented reality vision and spatial audio computing interface.', x: 78, y: 64 },
  { id: 'c1-p9', name: 'OPTINEXT', icon: '🌐', description: 'Global optical networking and low-latency optical routing gateway.', x: 62, y: 78 },
  { id: 'c1-p10', name: 'LED LIGHT (frequency)', icon: '💡', description: 'Tunable high-frequency illumination and optical frequency analysis system.', x: 35, y: 80 },
];

// 5 in Lab 508
export const PRODUCTS_LAB_508 = [
  { id: 'c2-p1', name: 'BYTEVERSE', icon: '🌌', description: 'Decentralized spatial metaverse and interactive 3D virtual environment.', x: 34, y: 22 },
  { id: 'c2-p2', name: 'IN-OUT DESK', icon: '🪑', description: 'Smart biometric ergonomic workstation and attendance tracking telemetry.', x: 76, y: 28 },
  { id: 'c2-p3', name: 'MEND-X', icon: '🩹', description: 'Automated digital first-aid and rapid medical triage assistant.', x: 48, y: 48 },
  { id: 'c2-p4', name: 'DEUEX', icon: '⚡', description: 'Portable dual-display productivity setup and visual hardware interface.', x: 78, y: 66 },
  { id: 'c2-p5', name: 'ASTRON', icon: '🔭', description: 'Advanced space exploration telemetry and celestial observation platform.', x: 36, y: 76 },
];

// 10 in Lab 509
export const PRODUCTS_LAB_509 = [
  { id: 'c3-p1', name: 'SETH COMPUTERS', icon: '🖥️', description: 'High-performance computing architectures and customized workstation systems.', x: 34, y: 18 },
  { id: 'c3-p2', name: 'ANAY IT SOLUTIONS', icon: '📊', description: 'Business intelligence analytics and agile enterprise cloud services.', x: 56, y: 16 },
  { id: 'c3-p3', name: 'SHIVAM STOCK', icon: '📈', description: 'Real-time financial market analytics and stock portfolio intelligence.', x: 78, y: 24 },
  { id: 'c3-p4', name: 'SAMSUNG ECOSYSTEMS', icon: '📱', description: 'Interconnected multi-device smart ecosystem and unified mobile relay.', x: 84, y: 38 },
  { id: 'c3-p5', name: 'IOS SYSTEM', icon: '🍏', description: 'Modern iOS application ecosystem and mobile experience stack.', x: 56, y: 42 },
  { id: 'c3-p6', name: 'SYNERGY AUTOMATION', icon: '⚙️', description: 'Industrial process automation and coordinated smart workflow integration.', x: 32, y: 48 },
  { id: 'c3-p7', name: 'TECH SAI CARE', icon: '🩺', description: 'Digital healthcare monitoring and smart medical diagnostic telemetry.', x: 54, y: 58 },
  { id: 'c3-p8', name: 'FODUU', icon: '🚀', description: 'Creative web development, digital solutions and interactive web portal design.', x: 78, y: 64 },
  { id: 'c3-p9', name: 'AVG', icon: '🛡️', description: 'Real-time cybersecurity shield and endpoint threat prevention system.', x: 64, y: 78 },
  { id: 'c3-p10', name: 'ROBOT', icon: '🤖', description: 'Autonomous mobile robot with precision navigation and obstacle avoidance.', x: 34, y: 80 },
];

// 5 in Lab 510
export const PRODUCTS_LAB_510 = [
  { id: 'c4-p1', name: 'GLOBALNET', icon: '📡', description: 'Worldwide distributed telecommunications network and high-capacity satellite routing.', x: 34, y: 22 },
  { id: 'c4-p2', name: 'LEARNIMO', icon: '📚', description: 'Interactive gamified learning platform and adaptive digital education suite.', x: 76, y: 28 },
  { id: 'c4-p3', name: 'TECH CRYPTERS', icon: '🔐', description: 'Next-gen cryptographic protocols and decentralized blockchain security ledger.', x: 48, y: 48 },
  { id: 'c4-p4', name: 'MICROSOFT POWER AUTOMATE', icon: '⚡', description: 'Enterprise robotic process automation and cross-service workflow streamlining.', x: 78, y: 66 },
  { id: 'c4-p5', name: 'MICROSOFT ACCESS', icon: '🗄️', description: 'Rapid database application system and structured data inventory management.', x: 36, y: 76 },
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
    subtitle: 'Explore spatial metaverses, ergonomic desks, triage tech, and space platforms.',
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
    subtitle: 'Inspect mobile ecosystems, cybersecurity tools, robotics, and smart automation.',
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
  '4': {
    id: '4',
    labId: '4',
    sourceLab: '4',
    chapterNumber: 'Chapter IV',
    name: 'Lab 510',
    title: 'LAB 510',
    subtitle: 'Discover global networks, learning platforms, crypto security, and database systems.',
    badgeTitle: 'Lab 510 Mastered',
    fragmentId: '4',
    fragmentName: 'Dune Sunstone Talisman',
    fragmentImage: '/assets/images/avery-pirate-coin.webp',
    mapImage: '/assets/images/journal-spread-lab4.webp',
    themeType: 'desert',
    inkColor: '#2b1b04',
    glowColor: '#d97706',
    coreGlow: '#fef3c7',
    badgeClass: 'bg-[#b45309]/20 text-[#d97706] border-[#d97706]/40',
    checkpoints: PRODUCTS_LAB_510,
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
    console.log('\x1b[1m\x1b[32m  All 30 Products Seeded Successfully! \x1b[0m');
    console.log('  Lab 502: 10 products');
    console.log('  Lab 508: 5 products');
    console.log('  Lab 509: 10 products');
    console.log('  Lab 510: 5 products');
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
