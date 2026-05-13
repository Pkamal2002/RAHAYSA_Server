import Password from '../models/Password.js';
import { encrypt, decrypt } from '../services/encryptionService.js';
import AuditLog from '../models/AuditLog.js';
import { getIO } from '../socket.js';
import Notification from '../models/Notification.js';

const toDecryptedObject = (p) => {
  const obj = p.toObject();
  obj.password = decrypt(obj.password);
  if (obj.versionHistory) {
    obj.versionHistory = obj.versionHistory.map(v => ({
      ...v,
      password: decrypt(v.password)
    }));
  }
  return obj;
};

// @desc    Get all passwords for user
// @route   GET /api/passwords
// @access  Private
export const getPasswords = async (req, res, next) => {
  try {
    let query = {
      $or: [
        { owner: req.user.id },
        { 'sharedWith.user': req.user.id }
      ]
    };

    // If user is Admin or Super Admin, they can see ALL credentials
    if (req.user.role === 'Admin' || req.user.role === 'Super Admin') {
      query = {}; // Empty query matches all
    }

    const passwords = await Password.find(query)
      .populate('owner', 'name email department')
      .populate('sharedWith.user', 'name email department');

    const decryptedPasswords = passwords.map(p => toDecryptedObject(p));

    res.json({
      success: true,
      count: decryptedPasswords.length,
      data: decryptedPasswords
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new password
// @route   POST /api/passwords
// @access  Private
export const createPassword = async (req, res, next) => {
  try {
    const { title, username, password, url, notes, category, department, tags } = req.body;

    const encryptedPassword = encrypt(password);

    const newPassword = await Password.create({
      title,
      username,
      password: encryptedPassword,
      url,
      notes,
      category,
      department,
      tags,
      owner: req.user.id
    });

    await AuditLog.create({
      action: 'PASSWORD_CREATED',
      user: req.user.id,
      target: `Password: ${title}`,
      details: `Created new password entry for ${username}`,
      ip: req.ip
    });

    const decrypted = toDecryptedObject(newPassword);
    getIO().emit('vault_update', { action: 'create', data: decrypted });

    res.status(201).json({
      success: true,
      data: decrypted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a password
// @route   PUT /api/passwords/:id
// @access  Private
export const updatePassword = async (req, res, next) => {
  try {
    let vaultItem = await Password.findById(req.params.id);

    if (!vaultItem) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const isOwner = vaultItem.owner.toString() === req.user.id;
    const isSharedWithEdit = vaultItem.sharedWith.some(
      s => s.user.toString() === req.user.id && s.permission === 'edit'
    );
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super Admin';

    if (!isOwner && !isSharedWithEdit && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this password' });
    }

    if (req.body.password) {
      vaultItem.versionHistory.push({
        password: vaultItem.password,
        updatedBy: req.user.id,
        updatedAt: Date.now()
      });
      req.body.password = encrypt(req.body.password);
    }

    vaultItem.set(req.body);
    await vaultItem.save();

    await AuditLog.create({
      action: 'PASSWORD_UPDATED',
      user: req.user.id,
      target: `Password: ${vaultItem.title}`,
      details: `Updated password entry for ${vaultItem.username}`,
      ip: req.ip
    });

    const decrypted = toDecryptedObject(vaultItem);
    getIO().emit('vault_update', { action: 'update', data: decrypted });

    res.json({
      success: true,
      data: decrypted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a password
// @route   DELETE /api/passwords/:id
// @access  Private
export const deletePassword = async (req, res, next) => {
  try {
    const vaultItem = await Password.findById(req.params.id);

    if (!vaultItem) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const isOwner = vaultItem.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only owner or administrators can delete this password' });
    }

    await vaultItem.deleteOne();

    await AuditLog.create({
      action: 'PASSWORD_DELETED',
      user: req.user.id,
      target: `Password: ${vaultItem.title}`,
      details: `Deleted password entry for ${vaultItem.username}`,
      ip: req.ip
    });

    getIO().emit('vault_update', { action: 'delete', id: req.params.id });

    res.json({
      success: true,
      message: 'Password deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Check vault health
// @route   POST /api/passwords/health-scan
// @access  Private
export const checkVaultHealth = async (req, res, next) => {
  try {
    const passwords = await Password.find({ owner: req.user.id });
    
    let weakCount = 0;
    let breachedCount = 0;
    let reusedMap = new Map();

    for (let p of passwords) {
      const decrypted = decrypt(p.password);
      
      // 1. Check Strength
      const isWeak = decrypted.length < 10;
      if (isWeak) weakCount++;

      // 2. Check Reused
      reusedMap.set(decrypted, (reusedMap.get(decrypted) || 0) + 1);

      // 3. Mock Breach Check (Simulating API call)
      const isBreached = Math.random() < 0.05; // 5% chance for demo
      if (isBreached) breachedCount++;

      p.isBreached = isBreached;
      p.lastHealthCheck = Date.now();
      await p.save();
    }

    const reusedCount = Array.from(reusedMap.values()).filter(count => count > 1).length;

    res.json({
      success: true,
      report: {
        total: passwords.length,
        weak: weakCount,
        breached: breachedCount,
        reused: reusedCount,
        score: Math.max(0, 100 - (weakCount * 10) - (reusedCount * 5) - (breachedCount * 25))
      }
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Share a password
// @route   POST /api/passwords/:id/share
// @access  Private
export const sharePassword = async (req, res, next) => {
  try {
    const { userId, permission } = req.body;
    const vaultItem = await Password.findById(req.params.id);

    if (!vaultItem) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const isOwner = vaultItem.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only owner or administrators can share this password' });
    }

    const alreadyShared = vaultItem.sharedWith.some(s => s.user.toString() === userId);
    if (alreadyShared) {
      return res.status(400).json({ message: 'Already shared with this user' });
    }

    vaultItem.sharedWith.push({ user: userId, permission });
    await vaultItem.save();

    await AuditLog.create({
      action: 'PASSWORD_SHARED',
      user: req.user.id,
      target: `Password: ${vaultItem.title}`,
      details: `Shared with user ID: ${userId}`,
      ip: req.ip
    });

    const decrypted = toDecryptedObject(vaultItem);
    getIO().emit('vault_update', { action: 'update', data: decrypted });

    // Create notification
    const notification = await Notification.create({
      recipient: userId,
      title: 'Secret Shared',
      message: `${req.user.name} shared "${vaultItem.title}" with you.`,
      type: 'info'
    });

    // Emit socket notification
    getIO().to(userId.toString()).emit('new_notification', notification);

    res.json({
      success: true,
      message: 'Password shared successfully',
      data: decrypted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unshare password
// @route   DELETE /api/passwords/:id/share/:userId
// @access  Private
export const unsharePassword = async (req, res, next) => {
  try {
    const vaultItem = await Password.findById(req.params.id);

    if (!vaultItem) {
      return res.status(404).json({ message: 'Password not found' });
    }

    const isOwner = vaultItem.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'Super Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only owner or administrators can revoke access' });
    }

    vaultItem.sharedWith = vaultItem.sharedWith.filter(
      s => s.user.toString() !== req.params.userId
    );

    await vaultItem.save();

    await AuditLog.create({
      action: 'PASSWORD_UNSHARED',
      user: req.user.id,
      target: `Password: ${vaultItem.title}`,
      details: `Revoked access for user ID: ${req.params.userId}`,
      ip: req.ip
    });

    const decrypted = toDecryptedObject(vaultItem);
    getIO().emit('vault_update', { action: 'update', data: decrypted });

    res.json({
      success: true,
      message: 'Access revoked successfully',
      data: decrypted
    });
  } catch (error) {
    next(error);
  }
};
