import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const router = Router();

// Configuration will be set when the user provides the Cloud Name
// We use process.env to allow flexibility
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dybuucpok', 
  api_key: process.env.CLOUDINARY_API_KEY || '129191592221355', 
  api_secret: process.env.CLOUDINARY_API_SECRET || 'E3lrXL2gMwMQjJk7C2sTSFEjNfc' 
});

// Use multer with memory storage so we can upload buffer directly to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// Upload a photo
router.post('/upload', upload.array('photos', 50), async (req, res) => {
  try {
    const { category } = req.body; // e.g., 'matchs', 'remise', 'concours'
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Aucune photo fournie' });
    }

    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `eid_hoop_fest/${category || 'general'}`,
            tags: [category || 'general']
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    res.status(201).json({ success: true, count: results.length, photos: results });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: "Erreur lors de l'upload des photos" });
  }
});

// List all photos
router.get('/', async (req, res) => {
  try {
    // Cloudinary's search API requires the Admin API. 
    // It's rate limited, but fine for our scale. 
    const result = await cloudinary.search
      .expression('folder:eid_hoop_fest/*')
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();
      
    res.json(result.resources);
  } catch (err) {
    console.error('[Fetch Photos Error]', err);
    res.status(500).json({ error: "Erreur lors de la récupération des photos" });
  }
});

export default router;
