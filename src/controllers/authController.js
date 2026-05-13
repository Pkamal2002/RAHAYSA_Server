import User from '../models/User.js';
import { generateToken } from '../utils/jwtUtils.js';
import AuditLog from '../models/AuditLog.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      department,
      status: 'PENDING'
    });

    if (user) {
      await AuditLog.create({
        action: 'USER_REGISTERED',
        user: user._id,
        target: `User: ${user.name}`,
        details: 'Account created and pending approval',
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful. Waiting for Admin Approval.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ 
        message: `Your account is ${user.status}. Please contact an administrator.` 
      });
    }

    const isMatch = await user.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    user.lastLogin = Date.now();
    await user.save();

    await AuditLog.create({
      action: 'USER_LOGIN',
      user: user._id,
      target: `User: ${user.name}`,
      details: 'Login successful',
      ip: req.ip
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
