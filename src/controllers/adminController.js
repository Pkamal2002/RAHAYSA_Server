import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { getIO } from '../socket.js';
import Notification from '../models/Notification.js';

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status/role (Admin only)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, role, department } = req.body;
    
    // Check if user exists
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    const changeDetails = [];

    if (status) {
      updates.status = status;
      changeDetails.push(`status: ${status}`);
    }

    if (role) {
      const requesterRole = req.user.role?.trim().toLowerCase();
      
      if (requesterRole !== 'super admin') {
        return res.status(403).json({ 
          message: `Authorization Failed: Only Super Admins can change user roles.` 
        });
      }
      updates.role = role;
      changeDetails.push(`role: ${role}`);
    }

    if (department) {
      updates.department = department;
      changeDetails.push(`department: ${department}`);
    }

    // Perform the update (Validators turned off to avoid conflict with hidden password field)
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: false }
    );

    // Side Effects
    try {
      await AuditLog.create({
        action: 'USER_UPDATED_BY_ADMIN',
        user: req.user.id,
        target: `User: ${updatedUser.name}`,
        details: `Updated ${updatedUser.email} -> ${changeDetails.join(', ')}`,
        ip: req.ip
      });

      if (status) {
        getIO().emit('user_status_update', { userId: updatedUser._id, status: updatedUser.status });
      }
      
      if (role) {
        getIO().emit('user_role_update', { userId: updatedUser._id, role: updatedUser.role });
      }

      const notification = await Notification.create({
        recipient: updatedUser._id,
        title: status === 'ACTIVE' ? 'Account Approved' : 'Account Update',
        message: status === 'ACTIVE' 
          ? 'Your access to RAHASYA has been approved.' 
          : `Your account details have been updated by ${req.user.role}.`,
        type: status === 'ACTIVE' ? 'success' : 'info'
      });

      getIO().to(updatedUser._id.toString()).emit('new_notification', notification);
    } catch (sideEffectError) {
      console.error('Side-effect error:', sideEffectError.message);
    }

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requesterRole = req.user.role?.trim().toLowerCase();

    if (requesterRole !== 'super admin') {
      return res.status(403).json({ message: 'Only Super Admins can delete users' });
    }

    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'USER_DELETED_BY_ADMIN',
      user: req.user.id,
      target: `User: ${userToDelete.name}`,
      details: `Deleted user ${userToDelete.email}`,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const clearAuditLogs = async (req, res, next) => {
  try {
    const requesterRole = req.user.role?.trim().toLowerCase();
    if (requesterRole !== 'super admin') {
      return res.status(403).json({ message: 'Only Super Admins can clear logs' });
    }

    await AuditLog.deleteMany({});

    await AuditLog.create({
      action: 'AUDIT_LOGS_CLEARED',
      user: req.user.id,
      target: 'System Logs',
      details: 'All audit logs were cleared by Super Admin',
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Audit logs cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs (Admin only)
// @route   GET /api/admin/logs
// @access  Private/Admin
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
