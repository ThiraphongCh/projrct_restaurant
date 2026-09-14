const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : '.jpg';
    const base = `menu_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Verify the actual file content matches a known image format (magic bytes).
// This stops files that merely claim an image MIME type but aren't real images.
const magicSignatures = [
  { ext: '.jpg', bytes: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png', bytes: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: '.gif', bytes: (b) => b.toString('ascii', 0, 4) === 'GIF8' },
  { ext: '.webp', bytes: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
];

const validateImage = (req, res, next) => {
  if (!req.file) return next();
  try {
    const buf = fs.readFileSync(req.file.path);
    const ok = magicSignatures.some((sig) => sig.bytes(buf));
    if (!ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'Uploaded file is not a valid image' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = upload;
module.exports.validateImage = validateImage;