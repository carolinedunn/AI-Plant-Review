import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory data store for image
  let latestImage: string | null = null;
  let lastUploadTime: number | null = null;

  // API Route for receiving images from Raspberry Pi
  app.post('/api/upload-image', (req, res) => {
    const { image, secret } = req.body;
    
    // Optional security: Check for a secret token
    // You can define UPLOAD_SECRET in your .env
    const expectedSecret = process.env.UPLOAD_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      console.log(`[POST] /api/upload-image: Invalid secret provided`);
      return res.status(401).json({ error: 'Unauthorized: Invalid secret' });
    }

    if (!image) return res.status(400).json({ error: 'No image data provided' });
    
    latestImage = image; // Base64 string
    lastUploadTime = Date.now();
    console.log(`[POST] /api/upload-image: Received new snapshot (${Math.round(image.length / 1024)}KB)`);
    res.json({ status: 'ok', timestamp: lastUploadTime });
  });

  // API Route to fetch latest image
  app.get('/api/latest-image', (req, res) => {
    if (!latestImage) return res.status(404).json({ error: 'No image available' });
    res.json({ 
      image: latestImage,
      timestamp: lastUploadTime
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
