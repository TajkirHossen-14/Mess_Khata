import { getResidentDashboard, getManagerDashboard } from '../services/dashboardService.js';

// GET /api/dashboard/resident — the caller's own resident dashboard only.
export const residentDashboard = async (req, res, next) => {
  try {
    const data = await getResidentDashboard(req.messId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// GET /api/dashboard/manager — mess-wide status for a Manager.
export const managerDashboard = async (req, res, next) => {
  try {
    const data = await getManagerDashboard(req.messId, req.user.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export default { residentDashboard, managerDashboard };
