import express from 'express';
import { 
  getPasswords, 
  createPassword, 
  updatePassword, 
  deletePassword,
  checkVaultHealth,
  sharePassword,
  unsharePassword
} from '../controllers/passwordController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPasswords)
  .post(createPassword);

router.route('/:id')
  .put(updatePassword)
  .delete(deletePassword);

router.post('/health-scan', checkVaultHealth);
router.post('/:id/share', sharePassword);
router.delete('/:id/share/:userId', unsharePassword);

export default router;
