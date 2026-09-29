import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = Router();

// Test protected route - requires valid JWT
router.get('/protected', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Protected route accessed successfully',
    user: req.user,
  });
});

// Alias for auth verification test
router.get('/auth-test', protect, (req, res) => {
  res.json({
    success: true,
    message: 'JWT authentication verified',
    user: req.user,
  });
});

// Test role-protected route - requires manager or admin role
router.get('/manager-only', protect, requireRole('manager', 'admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Manager route accessed successfully',
    user: req.user,
  });
});

export default router;
