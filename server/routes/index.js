import { Router } from 'express'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'MessKhata API is running' })
})

// TODO: Mount feature routers here
// router.use('/auth', authRoutes)
// router.use('/mess', messRoutes)
// router.use('/residents', residentRoutes)
// router.use('/expenses', expenseRoutes)
// router.use('/billing', billingRoutes)
// router.use('/payments', paymentRoutes)
// router.use('/notices', noticeRoutes)
// router.use('/complaints', complaintRoutes)
// router.use('/duty', dutyRoutes)
// router.use('/assets', assetRoutes)
// router.use('/notifications', notificationRoutes)

export default router