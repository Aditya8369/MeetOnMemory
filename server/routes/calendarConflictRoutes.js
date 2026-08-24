import express from 'express'
import userAuth from '../middleware/userAuth.js'
import {
  getActiveCalendarConflicts,
  resolveCalendarConflict,
} from '../controllers/calendarConflictController.js'

const router = express.Router()

router.use(userAuth)

router.get('/conflicts', getActiveCalendarConflicts)
router.post('/conflicts/:conflictId/resolve', resolveCalendarConflict)

export default router
