import express from 'express';
import { getNotifications, markAsRead, deleteNotification } from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/mark-as-read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
