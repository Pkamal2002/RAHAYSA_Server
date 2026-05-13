import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Admin', 'User', 'Manager', 'Team Member'],
    default: 'User'
  },
  department: {
    type: String,
    default: 'IT'
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'REJECTED'],
    default: 'PENDING'
  },
  permissions: [{
    type: String
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  avatar: String
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

export default mongoose.model('User', userSchema);
