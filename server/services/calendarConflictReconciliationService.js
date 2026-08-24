import CalendarConflictResolution from '../models/calendarConflictResolutionModel.js'
import Meeting from '../models/meetingModel.js'

/**
 * Service managing two-way synchronization conflict reconciliation,
 * field diffing, and resolution strategy execution.
 */
class CalendarConflictReconciliationService {
  /**
   * Detect differences between local meeting record and incoming external calendar event
   */
  detectFieldConflicts(localMeeting, remoteEvent) {
    const conflictFields = []

    if (localMeeting.title !== remoteEvent.title) {
      conflictFields.push('title')
    }

    const localStart = new Date(localMeeting.scheduledStartTime).getTime()
    const remoteStart = new Date(remoteEvent.scheduledStartTime).getTime()
    if (Math.abs(localStart - remoteStart) > 60000) {
      conflictFields.push('scheduledStartTime')
    }

    if (remoteEvent.description && localMeeting.description !== remoteEvent.description) {
      conflictFields.push('description')
    }

    return conflictFields
  }

  /**
   * Register or update a detected sync conflict
   */
  async registerConflict({
    organizationId,
    userId,
    meetingId,
    provider,
    externalEventId,
    localSnapshot,
    remoteSnapshot,
  }) {
    const conflictFields = this.detectFieldConflicts(localSnapshot, remoteSnapshot)

    if (conflictFields.length === 0) {
      return null
    }

    return await CalendarConflictResolution.findOneAndUpdate(
      {
        organizationId,
        meetingId,
        externalEventId,
        status: 'DETECTED',
      },
      {
        organizationId,
        userId,
        meetingId,
        provider,
        externalEventId,
        localSnapshot,
        remoteSnapshot,
        conflictFields,
        status: 'DETECTED',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  /**
   * Resolve a calendar conflict with a specified strategy (LOCAL, REMOTE, MERGE)
   */
  async resolveConflict({ conflictId, organizationId, userId, strategy, customMergeData = {} }) {
    const conflict = await CalendarConflictResolution.findOne({
      _id: conflictId,
      organizationId,
    })

    if (!conflict) {
      const error = new Error('Calendar conflict record not found')
      error.statusCode = 404
      throw error
    }

    const updatePayload = {}

    if (strategy === 'LOCAL_CHOSEN') {
      conflict.status = 'LOCAL_CHOSEN'
    } else if (strategy === 'REMOTE_CHOSEN') {
      conflict.status = 'REMOTE_CHOSEN'
      if (conflict.remoteSnapshot.title) {
        updatePayload.title = conflict.remoteSnapshot.title
      }
      if (conflict.remoteSnapshot.scheduledStartTime) {
        updatePayload.scheduledStartTime = conflict.remoteSnapshot.scheduledStartTime
      }
      if (conflict.remoteSnapshot.description) {
        updatePayload.description = conflict.remoteSnapshot.description
      }
    } else if (strategy === 'MERGED') {
      conflict.status = 'MERGED'
      Object.assign(updatePayload, customMergeData)
    } else {
      conflict.status = 'DISMISSED'
    }

    if (Object.keys(updatePayload).length > 0 && conflict.meetingId) {
      await Meeting.findByIdAndUpdate(conflict.meetingId, updatePayload)
    }

    conflict.resolvedAt = new Date()
    conflict.resolvedBy = userId
    await conflict.save()

    return conflict
  }

  /**
   * Fetch active conflicts for a user / organization
   */
  async getActiveConflicts(organizationId, userId) {
    return await CalendarConflictResolution.find({
      organizationId,
      userId,
      status: 'DETECTED',
    })
      .populate('meetingId', 'title scheduledStartTime')
      .sort({ createdAt: -1 })
      .lean()
  }
}

export default new CalendarConflictReconciliationService()
