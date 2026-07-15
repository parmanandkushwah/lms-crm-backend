const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'uploads', folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });

const fileFilter = (allowed) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`File type ${ext} not allowed`), false);
};

const MAX = parseInt(process.env.MAX_FILE_SIZE) || 20971520;

const uploadAvatar = multer({
  storage: storage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.webp']),
}).single('avatar');

const uploadLeadFile = multer({
  storage: storage('lead-files'),
  limits: { fileSize: MAX },
  fileFilter: fileFilter(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip', '.txt']),
}).single('file');

const uploadDocument = multer({
  storage: storage('documents'),
  limits: { fileSize: MAX },
  fileFilter: fileFilter(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.txt', '.csv', '.zip', '.mp4', '.mov', '.webm']),
}).single('document');

module.exports = { uploadAvatar, uploadLeadFile, uploadDocument };
