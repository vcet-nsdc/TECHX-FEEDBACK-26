import { MongoClient, Db } from 'mongodb';
import dns from 'node:dns';

// Fix Node.js DNS SRV resolution for MongoDB Atlas on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {}

// Cache the client promise on globalThis in every environment so hot
// reloads and serverless cold starts reuse one connection pool instead of
// opening a new MongoClient each time.
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

function normalizeMongoUri(rawUri: string): string {
  // On Windows, Node.js DNS SRV lookups (querySrv) frequently encounter ESERVFAIL.
  // If the TechX Atlas cluster SRV URI is provided, automatically resolve to direct replica set nodes.
  if (rawUri.includes('mongodb+srv://') && rawUri.includes('feedback-26.oskfbzz.mongodb.net')) {
    const credMatch = rawUri.match(/mongodb\+srv:\/\/([^@]+)@/);
    const creds = credMatch ? `${credMatch[1]}@` : '';
    return `mongodb://${creds}ac-kfmjx7c-shard-00-00.oskfbzz.mongodb.net:27017,ac-kfmjx7c-shard-00-01.oskfbzz.mongodb.net:27017,ac-kfmjx7c-shard-00-02.oskfbzz.mongodb.net:27017/techx-feedback-2026?ssl=true&replicaSet=atlas-5vxff4-shard-0&authSource=admin&retryWrites=true&w=majority&appName=FeedBack-26`;
  }
  return rawUri;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to .env.local (e.g. mongodb://localhost:27017/feedback-portal) or configure it in your hosting provider.'
    );
  }

  if (!globalWithMongo._mongoClientPromise) {
    const resolvedUri = normalizeMongoUri(uri);
    const client = new MongoClient(resolvedUri, {
      serverSelectionTimeoutMS: 8000,
    });
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      delete globalWithMongo._mongoClientPromise;
      throw err;
    });
  }

  return globalWithMongo._mongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.DB_NAME || 'techx-feedback-2026');
}
