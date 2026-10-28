import AuditLog from '../models/AuditLog.js';
export async function recordAudit(payload) { try { await AuditLog.create(payload); } catch (error) { console.error('Audit logging failed', payload, error); } }
