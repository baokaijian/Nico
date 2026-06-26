import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const DB_PATH = path.join(__dirname, 'db.json');

// Helper to read DB
const readDB = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { growth: [], swim: [], media: [] };
  }
};

// Helper to write DB
const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to database:', error);
  }
};

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images and video files are allowed!'));
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// API Routes

// Growth Records
app.get('/api/growth', (req, res) => {
  const db = readDB();
  res.json(db.growth || []);
});

app.post('/api/growth', (req, res) => {
  const { date, height, armSpan, weight, handLength, handWidth, footLength } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  const db = readDB();
  const newRecord = {
    id: 'g-' + Date.now(),
    date,
    height: height ? parseFloat(height) : null,
    armSpan: armSpan ? parseFloat(armSpan) : null,
    weight: weight ? parseFloat(weight) : null,
    handLength: handLength ? parseFloat(handLength) : null,
    handWidth: handWidth ? parseFloat(handWidth) : null,
    footLength: footLength ? parseFloat(footLength) : null
  };

  db.growth = db.growth || [];
  db.growth.push(newRecord);
  db.growth.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);

  res.status(201).json(newRecord);
});

app.put('/api/growth/:id', (req, res) => {
  const { id } = req.params;
  const { date, height, armSpan, weight, handLength, handWidth, footLength } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  const db = readDB();
  const index = (db.growth || []).findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }

  db.growth[index] = {
    id,
    date,
    height: height ? parseFloat(height) : null,
    armSpan: armSpan ? parseFloat(armSpan) : null,
    weight: weight ? parseFloat(weight) : null,
    handLength: handLength ? parseFloat(handLength) : null,
    handWidth: handWidth ? parseFloat(handWidth) : null,
    footLength: footLength ? parseFloat(footLength) : null
  };
  writeDB(db);

  res.json(db.growth[index]);
});

app.delete('/api/growth/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.growth = (db.growth || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Record deleted.' });
});

// Swim Records
app.get('/api/swim', (req, res) => {
  const db = readDB();
  res.json(db.swim || []);
});

app.post('/api/swim', (req, res) => {
  const { date, distance, stroke, time, poolLength, notes } = req.body;
  if (!date || !distance || !stroke || !time || !poolLength) {
    return res.status(400).json({ error: 'Required fields: date, distance, stroke, time, poolLength.' });
  }

  let seconds = 0;
  const parts = time.split(':');
  if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  } else if (parts.length === 1) {
    seconds = parseFloat(parts[0]);
  } else {
    return res.status(400).json({ error: 'Invalid time format. Please use MM:SS.hh or SS.hh' });
  }

  const db = readDB();
  const newRecord = {
    id: 's-' + Date.now(),
    date,
    distance,
    stroke,
    time,
    seconds: parseFloat(seconds.toFixed(2)),
    poolLength,
    notes: notes || ''
  };

  db.swim = db.swim || [];
  db.swim.push(newRecord);
  db.swim.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);

  res.status(201).json(newRecord);
});

app.put('/api/swim/:id', (req, res) => {
  const { id } = req.params;
  const { date, distance, stroke, time, poolLength, notes } = req.body;
  if (!date || !distance || !stroke || !time || !poolLength) {
    return res.status(400).json({ error: 'Required fields: date, distance, stroke, time, poolLength.' });
  }

  let seconds = 0;
  const parts = time.split(':');
  if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  } else if (parts.length === 1) {
    seconds = parseFloat(parts[0]);
  } else {
    return res.status(400).json({ error: 'Invalid time format. Please use MM:SS.hh or SS.hh' });
  }

  const db = readDB();
  const index = (db.swim || []).findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Record not found' });
  }

  db.swim[index] = {
    id,
    date,
    distance,
    stroke,
    time,
    seconds: parseFloat(seconds.toFixed(2)),
    poolLength,
    notes: notes || ''
  };
  writeDB(db);

  res.json(db.swim[index]);
});

app.delete('/api/swim/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.swim = (db.swim || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Record deleted.' });
});

// Media Routes
app.get('/api/media', (req, res) => {
  const db = readDB();
  res.json(db.media || []);
});

app.post('/api/media', upload.single('file'), (req, res) => {
  const { date, title, description, category } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'No media file was uploaded.' });
  }

  const db = readDB();
  const isVideo = req.file.mimetype.startsWith('video/');
  
  const newMedia = {
    id: 'm-' + Date.now(),
    date: date || new Date().toISOString().split('T')[0],
    title: title || 'Untitled',
    description: description || '',
    type: isVideo ? 'video' : 'photo',
    url: `/uploads/${req.file.filename}`,
    category: category || 'General'
  };

  db.media = db.media || [];
  db.media.push(newMedia);
  // Sort by date descending (newest first for gallery feed)
  db.media.sort((a, b) => new Date(b.date) - new Date(a.date));
  writeDB(db);

  res.status(201).json(newMedia);
});

app.delete('/api/media/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const mediaItem = (db.media || []).find(item => item.id === id);

  if (mediaItem) {
    // Delete local file
    const filename = path.basename(mediaItem.url);
    const filepath = path.join(uploadsDir, filename);
    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
      } catch (err) {
        console.error('Error deleting local file:', err);
      }
    }
  }

  db.media = (db.media || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: 'Media entry and file deleted.' });
});

app.listen(PORT, () => {
  console.log(`Server is running locally on port ${PORT}`);
});
