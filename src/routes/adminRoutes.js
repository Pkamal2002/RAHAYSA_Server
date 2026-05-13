import express from 'express';
import { 
  getUsers, 
  updateUser, 
  getAuditLogs,
  deleteUser,
  clearAuditLogs 
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('Super Admin', 'Admin'));

router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/logs', getAuditLogs);
router.delete('/logs', clearAuditLogs);

export default router;
