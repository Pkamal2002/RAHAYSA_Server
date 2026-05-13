import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target: {
    type: String, // e.g. "Password: [Title]" or "User: [Name]"
    required: true
  },
  details: {
    type: String
  },
  ip: String,
  device: String,
  browser: String,
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE'],
    default: 'SUCCESS'
  }
}, {
  timestamps: true
});

export default mongoose.model('AuditLog', auditLogSchema);
