import mongoose from 'mongoose';
const schema = new mongoose.Schema({ messId: { type: mongoose.Schema.Types.ObjectId, required: true }, entityType: { type: String, enum: ['billing_period', 'bill', 'payment', 'adjustment'], required: true }, entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, action: { type: String, required: true }, oldValue: mongoose.Schema.Types.Mixed, newValue: mongoose.Schema.Types.Mixed, reason: String, actorUserId: { type: mongoose.Schema.Types.ObjectId }, meta: mongoose.Schema.Types.Mixed }, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ messId: 1, entityType: 1, entityId: 1, createdAt: 1 });
export default mongoose.model('AuditLog', schema);
