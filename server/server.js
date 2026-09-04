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
    return { growth: [], swim: [], media: [], trainings: [], fitness: [], nutrition: [], goals: [] };
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

// Water Training Logs Routes
app.get('/api/trainings', (req, res) => {
  const db = readDB();
  res.json(db.trainings || []);
});

app.post('/api/trainings', (req, res) => {
  const {
    date, session, trainingType, totalMeters, kickMeters,
    intensity, focusSkills, rpe, coachNotes, completionRate
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: '训练日期为必填项。' });
  }

  const db = readDB();
  const newRecord = {
    id: 't-' + Date.now(),
    date,
    session: session || '下午主训',
    trainingType: trainingType || '技术水感课',
    totalMeters: totalMeters ? parseInt(totalMeters, 10) : 0,
    kickMeters: kickMeters ? parseInt(kickMeters, 10) : 0,
    intensity: intensity || '中强度 (A2有氧基础)',
    focusSkills: focusSkills || '',
    rpe: rpe ? parseInt(rpe, 10) : 7,
    coachNotes: coachNotes || '',
    completionRate: completionRate ? parseInt(completionRate, 10) : 100
  };

  db.trainings = db.trainings || [];
  db.trainings.push(newRecord);
  db.trainings.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);
  res.status(201).json(newRecord);
});

app.put('/api/trainings/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.trainings || []).findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '训练记录未找到。' });
  }

  const {
    date, session, trainingType, totalMeters, kickMeters,
    intensity, focusSkills, rpe, coachNotes, completionRate
  } = req.body;

  db.trainings[index] = {
    id,
    date: date || db.trainings[index].date,
    session: session || db.trainings[index].session,
    trainingType: trainingType || db.trainings[index].trainingType,
    totalMeters: totalMeters !== undefined ? parseInt(totalMeters, 10) : db.trainings[index].totalMeters,
    kickMeters: kickMeters !== undefined ? parseInt(kickMeters, 10) : db.trainings[index].kickMeters,
    intensity: intensity || db.trainings[index].intensity,
    focusSkills: focusSkills !== undefined ? focusSkills : db.trainings[index].focusSkills,
    rpe: rpe !== undefined ? parseInt(rpe, 10) : db.trainings[index].rpe,
    coachNotes: coachNotes !== undefined ? coachNotes : db.trainings[index].coachNotes,
    completionRate: completionRate !== undefined ? parseInt(completionRate, 10) : db.trainings[index].completionRate
  };

  db.trainings.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);
  res.json(db.trainings[index]);
});

app.delete('/api/trainings/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.trainings = (db.trainings || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: '训练记录已删除。' });
});

// Dryland Fitness & Flexibility Routes
app.get('/api/fitness', (req, res) => {
  const db = readDB();
  res.json(db.fitness || []);
});

app.post('/api/fitness', (req, res) => {
  const {
    date, standingJump, plankSeconds, sitAndReach,
    shoulderFlex, ankleFlex, shuttleRun, notes
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: '测试日期为必填项。' });
  }

  const db = readDB();
  const newRecord = {
    id: 'f-' + Date.now(),
    date,
    standingJump: standingJump ? parseFloat(standingJump) : null,
    plankSeconds: plankSeconds ? parseInt(plankSeconds, 10) : null,
    sitAndReach: sitAndReach ? parseFloat(sitAndReach) : null,
    shoulderFlex: shoulderFlex || '',
    ankleFlex: ankleFlex || '极佳 (天生脚蹼特征)',
    shuttleRun: shuttleRun ? parseFloat(shuttleRun) : null,
    notes: notes || ''
  };

  db.fitness = db.fitness || [];
  db.fitness.push(newRecord);
  db.fitness.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);
  res.status(201).json(newRecord);
});

app.put('/api/fitness/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.fitness || []).findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '体能记录未找到。' });
  }

  const {
    date, standingJump, plankSeconds, sitAndReach,
    shoulderFlex, ankleFlex, shuttleRun, notes
  } = req.body;

  db.fitness[index] = {
    id,
    date: date || db.fitness[index].date,
    standingJump: standingJump !== undefined ? (standingJump ? parseFloat(standingJump) : null) : db.fitness[index].standingJump,
    plankSeconds: plankSeconds !== undefined ? (plankSeconds ? parseInt(plankSeconds, 10) : null) : db.fitness[index].plankSeconds,
    sitAndReach: sitAndReach !== undefined ? (sitAndReach ? parseFloat(sitAndReach) : null) : db.fitness[index].sitAndReach,
    shoulderFlex: shoulderFlex !== undefined ? shoulderFlex : db.fitness[index].shoulderFlex,
    ankleFlex: ankleFlex !== undefined ? ankleFlex : db.fitness[index].ankleFlex,
    shuttleRun: shuttleRun !== undefined ? (shuttleRun ? parseFloat(shuttleRun) : null) : db.fitness[index].shuttleRun,
    notes: notes !== undefined ? notes : db.fitness[index].notes
  };

  db.fitness.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);
  res.json(db.fitness[index]);
});

app.delete('/api/fitness/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.fitness = (db.fitness || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: '体能记录已删除。' });
});

// Nutrition & Recovery Routes
app.get('/api/nutrition', (req, res) => {
  const db = readDB();
  res.json(db.nutrition || []);
});

app.post('/api/nutrition', (req, res) => {
  const {
    date, preMeal, postMeal, waterMl,
    calciumTaken, ironTaken, zincTaken, sleepHours,
    morningPulse, recoveryScore, notes
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: '记录日期为必填项。' });
  }

  const db = readDB();
  const newRecord = {
    id: 'n-' + Date.now(),
    date,
    preMeal: preMeal || '',
    postMeal: postMeal || '',
    waterMl: waterMl ? parseInt(waterMl, 10) : 1500,
    calciumTaken: Boolean(calciumTaken),
    ironTaken: Boolean(ironTaken),
    zincTaken: Boolean(zincTaken),
    sleepHours: sleepHours ? parseFloat(sleepHours) : 9.5,
    morningPulse: morningPulse ? parseInt(morningPulse, 10) : null,
    recoveryScore: recoveryScore ? parseInt(recoveryScore, 10) : 5,
    notes: notes || ''
  };

  db.nutrition = db.nutrition || [];
  db.nutrition.push(newRecord);
  db.nutrition.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);
  res.status(201).json(newRecord);
});

app.put('/api/nutrition/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.nutrition || []).findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '饮食营养记录未找到。' });
  }

  const {
    date, preMeal, postMeal, waterMl,
    calciumTaken, ironTaken, zincTaken, sleepHours,
    morningPulse, recoveryScore, notes
  } = req.body;

  db.nutrition[index] = {
    id,
    date: date || db.nutrition[index].date,
    preMeal: preMeal !== undefined ? preMeal : db.nutrition[index].preMeal,
    postMeal: postMeal !== undefined ? postMeal : db.nutrition[index].postMeal,
    waterMl: waterMl !== undefined ? parseInt(waterMl, 10) : db.nutrition[index].waterMl,
    calciumTaken: calciumTaken !== undefined ? Boolean(calciumTaken) : db.nutrition[index].calciumTaken,
    ironTaken: ironTaken !== undefined ? Boolean(ironTaken) : db.nutrition[index].ironTaken,
    zincTaken: zincTaken !== undefined ? Boolean(zincTaken) : db.nutrition[index].zincTaken,
    sleepHours: sleepHours !== undefined ? parseFloat(sleepHours) : db.nutrition[index].sleepHours,
    morningPulse: morningPulse !== undefined ? (morningPulse ? parseInt(morningPulse, 10) : null) : db.nutrition[index].morningPulse,
    recoveryScore: recoveryScore !== undefined ? parseInt(recoveryScore, 10) : db.nutrition[index].recoveryScore,
    notes: notes !== undefined ? notes : db.nutrition[index].notes
  };

  db.nutrition.sort((a, b) => new Date(a.date) - new Date(b.date));
  writeDB(db);
  res.json(db.nutrition[index]);
});

app.delete('/api/nutrition/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.nutrition = (db.nutrition || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: '饮食营养记录已删除。' });
});

// Goals & Milestones Routes
app.get('/api/goals', (req, res) => {
  const db = readDB();
  res.json(db.goals || []);
});

app.post('/api/goals', (req, res) => {
  const { title, category, targetMetric, currentProgress, deadline, status, notes } = req.body;
  if (!title) {
    return res.status(400).json({ error: '目标名称为必填项。' });
  }

  const db = readDB();
  const newRecord = {
    id: 'goal-' + Date.now(),
    title,
    category: category || '赛事达级',
    targetMetric: targetMetric || '',
    currentProgress: currentProgress !== undefined ? parseInt(currentProgress, 10) : 0,
    deadline: deadline || '',
    status: status || '进行中',
    notes: notes || ''
  };

  db.goals = db.goals || [];
  db.goals.push(newRecord);
  writeDB(db);
  res.status(201).json(newRecord);
});

app.put('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = (db.goals || []).findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '目标未找到。' });
  }

  const { title, category, targetMetric, currentProgress, deadline, status, notes } = req.body;
  db.goals[index] = {
    id,
    title: title || db.goals[index].title,
    category: category || db.goals[index].category,
    targetMetric: targetMetric !== undefined ? targetMetric : db.goals[index].targetMetric,
    currentProgress: currentProgress !== undefined ? parseInt(currentProgress, 10) : db.goals[index].currentProgress,
    deadline: deadline !== undefined ? deadline : db.goals[index].deadline,
    status: status || db.goals[index].status,
    notes: notes !== undefined ? notes : db.goals[index].notes
  };

  writeDB(db);
  res.json(db.goals[index]);
});

app.delete('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.goals = (db.goals || []).filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true, message: '目标已删除。' });
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
