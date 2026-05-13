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
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { status, role, department } = req.body;

    if (status) user.status = status;
    
    // Only Super Admin can change roles
    if (role) {
      const requesterRole = req.user.role?.trim();
      if (requesterRole !== 'Super Admin') {
        return res.status(403).json({ message: 'Only Super Admin can change user roles' });
      }
      user.role = role;
    }

    if (department) user.department = department;

    await user.save();

    const changeDetails = [];
    if (status) changeDetails.push(`status: ${status}`);
    if (role) changeDetails.push(`role: ${role}`);
    if (department) changeDetails.push(`department: ${department}`);

    await AuditLog.create({
      action: 'USER_UPDATED_BY_ADMIN',
      user: req.user.id,
      target: `User: ${user.name}`,
      details: `Updated ${user.email} -> ${changeDetails.join(', ')}`,
      ip: req.ip
    });

    if (status) {
      getIO().emit('user_status_update', { userId: user._id, status: user.status });
    }
    
    if (role) {
      getIO().emit('user_role_update', { userId: user._id, role: user.role });
    }

    // Create notification for the user
    const notification = await Notification.create({
      recipient: user._id,
      title: status === 'ACTIVE' ? 'Account Approved' : 'Account Update',
      message: status === 'ACTIVE' 
        ? 'Your access to RAHASYA has been approved.' 
        : `Your account details have been updated by ${req.user.role}.`,
      type: status === 'ACTIVE' ? 'success' : 'info'
    });

    // Emit socket notification
    getIO().to(user._id.toString()).emit('new_notification', notification);

    res.json({
      success: true,
      data: user
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
