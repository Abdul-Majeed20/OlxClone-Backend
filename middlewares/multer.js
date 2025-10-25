import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage({
});

// ✅ Export without .single() - apply it in the route
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});