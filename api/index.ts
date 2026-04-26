import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config safely
let firebaseConfig: any = {};
const configPath = path.join(__dirname, '..', 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.warn('Could not parse firebase-applet-config.json');
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  });
}

// Connect to the specific database instance
const db = getFirestore(process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)');
const snapshotsCol = db.collection('snapshots');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Debug logging
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// API Routes
app.post('/api/upload-image', async (req, res) => {
  const { image, secret, score, analysis } = req.body;
  
  const expectedSecret = process.env.UPLOAD_SECRET;
  if (!expectedSecret || (secret !== expectedSecret && secret !== 'Caroline')) { // Allow fallback for now
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing secret' });
  }

  if (!image) return res.status(400).json({ error: 'No image data provided' });
  
  const timestamp = Date.now();

  try {
    // Save to Firestore
    await snapshotsCol.add({
      image,
      timestamp,
      score: score || null,
      analysis: analysis || null
    });

    res.json({ status: 'ok', timestamp });
  } catch (err: any) {
    console.error('Error saving snapshot to Firestore:', err);
    res.status(500).json({ error: 'Failed to persist snapshot' });
  }
});

app.get('/api/latest-image', async (req, res) => {
  try {
    const snapshot = await snapshotsCol.orderBy('timestamp', 'desc').limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'No image available' });
    }
    const data = snapshot.docs[0].data();
    res.json({ 
      image: data.image,
      timestamp: data.timestamp
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest image' });
  }
});

async function setupApp() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production (or Vercel function serving locally), serve static files
    // The dist directory will be one level up from /api
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }
}

// Start server if not running as a function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  setupApp().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  });
}

export default app;
