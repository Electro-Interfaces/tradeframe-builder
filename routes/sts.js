import express from 'express';

const router = express.Router();

router.use((req, res) => {
  res.status(410).json({
    error: 'Legacy route removed',
    message: 'Используйте server/routes/sts.js через server/index.js.'
  });
});

export default router;
