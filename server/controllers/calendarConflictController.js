import calendarConflictReconciliationService from '../services/calendarConflictReconciliationService.js'

/**
 * Controller handling calendar two-way synchronization conflicts
 */
export const getActiveCalendarConflicts = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id']
    const userId = req.user?._id || req.user?.id

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context is required' })
    }

    const conflicts = await calendarConflictReconciliationService.getActiveConflicts(
      organizationId,
      userId,
    )

    return res.status(200).json({ conflicts })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const resolveCalendarConflict = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id']
    const userId = req.user?._id || req.user?.id
    const { conflictId } = req.params
    const { strategy, customMergeData } = req.body

    if (!strategy) {
      return res.status(400).json({ error: 'Resolution strategy is required' })
    }

    const conflict = await calendarConflictReconciliationService.resolveConflict({
      conflictId,
      organizationId,
      userId,
      strategy,
      customMergeData,
    })

    return res.status(200).json({
      message: 'Calendar conflict resolved successfully',
      conflict,
    })
  } catch (error) {
    const status = error.statusCode || 500
    return res.status(status).json({ error: error.message })
  }
}
