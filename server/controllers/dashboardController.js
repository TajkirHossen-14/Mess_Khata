import { getResidentDashboard,getManagerDashboard } from '../services/dashboardService.js'; import HttpError from '../utils/HttpError.js';
export async function residentDashboard(req,res,next){try{const data=await getResidentDashboard(req.messId,req.user.id);if(!data)throw new HttpError(403,'No resident profile in this mess');res.json({success:true,data});}catch(e){next(e);}}
export async function managerDashboard(req,res,next){try{res.json({success:true,data:await getManagerDashboard(req.messId,req.user.id)});}catch(e){next(e);}}
