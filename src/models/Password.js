import mongoose from 'mongoose';

const passwordSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username/Email is required']
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  url: String,
  notes: String,
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required']
  },
  tags: [String],
  isFavorite: {
    type: Boolean,
    default: false
  },
  isBreached: {
    type: Boolean,
    default: false
  },
  lastHealthCheck: {
    type: Date,
    default: Date.now
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  versionHistory: [{
    password: {
      type: String,
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Password', passwordSchema);
