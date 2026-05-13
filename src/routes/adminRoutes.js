import express from 'express';
import { getUsers, updateUser, getAuditLogs } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Super Admin', 'Admin'));

router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.get('/logs', getAuditLogs);

export default router;
