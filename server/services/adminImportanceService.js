import Organization from '../models/organizationModel.js'
import Decision from '../models/decisionModel.js'
import ActionItem from '../models/actionItemModel.js'
import AuditLog from '../models/auditLogModel.js'
import { recalculateImportanceQueue, getQueueInstance } from './queueService.js'
import { recalculateAllImportanceScores } from './importanceScoringService.js'

const QUEUE_NAME = 'recalculate-importance-queue'

const assertOrg = (organizationId) => {
  if (!organizationId) {
    const err = new Error('Organization is required')
    err.statusCode = 400
    throw err
  }
}

/**
 * Enqueues or performs importance score recalculation for an organization.
 */
export const enqueueImportanceRecalculation = async ({ organizationId, actorId } = {}) => {
  assertOrg(organizationId)

  const orgDoc = await Organization.findById(organizationId).select('_id name metadata')
  if (!orgDoc) {
    const err = new Error('Organization not found')
    err.statusCode = 404
    throw err
  }

  const startTime = new Date()

  // If BullMQ / Redis is active, queue the job in background
  if (recalculateImportanceQueue.isActive) {
    let job
    try {
      job = await recalculateImportanceQueue.add(
        'recalculate-importance',
        { organization: String(organizationId) },
        {
          jobId: `recalculate-importance-${organizationId}`,
          removeOnComplete: { count: 20, age: 24 * 60 * 60 },
        },
      )
    } catch (err) {
      const conflict = new Error(
        err?.message?.includes('Job')
          ? 'Importance score recalculation is already running or queued for this organization'
          : err?.message || 'Failed to enqueue importance recalculation job',
      )
      conflict.statusCode = 409
      throw conflict
    }

    if (!job) {
      const err = new Error('Failed to enqueue importance recalculation job')
      err.statusCode = 503
      throw err
    }

    // Update organization metadata tracking
    await Organization.updateOne(
      { _id: organizationId },
      {
        $set: {
          'metadata.lastImportanceRecalculationStatus': 'running',
          'metadata.lastImportanceRecalculationJobId': String(job.id),
          'metadata.lastImportanceRecalculationTriggeredAt': startTime,
          'metadata.lastImportanceRecalculationError': null,
        },
      },
    )

    if (actorId) {
      await AuditLog.create({
        organization: organizationId,
        actor: actorId,
        action: 'importance_score_recalculation_queued',
        entity: 'KnowledgeGraph',
        entityId: actorId,
        details: { jobId: String(job.id), mode: 'queued' },
      })
    }

    return {
      queue: QUEUE_NAME,
      jobId: String(job.id),
      jobName: 'recalculate-importance',
      status: 'running',
      mode: 'async',
      startedAt: startTime,
    }
  }

  // Fallback to synchronous execution when Redis is disabled
  try {
    const results = await recalculateAllImportanceScores({
      organization: organizationId,
    })
    const completedTime = new Date()

    await Organization.updateOne(
      { _id: organizationId },
      {
        $set: {
          'metadata.lastImportanceRecalculationStatus': 'completed',
          'metadata.lastImportanceRecalculationAt': completedTime,
          'metadata.lastImportanceRecalculationResults': results,
          'metadata.lastImportanceRecalculationError': null,
        },
      },
    )

    if (actorId) {
      await AuditLog.create({
        organization: organizationId,
        actor: actorId,
        action: 'importance_score_recalculation_completed',
        entity: 'KnowledgeGraph',
        entityId: actorId,
        details: { results, mode: 'sync' },
      })
    }

    return {
      queue: QUEUE_NAME,
      jobId: null,
      status: 'completed',
      mode: 'sync',
      results,
      completedAt: completedTime,
    }
  } catch (error) {
    await Organization.updateOne(
      { _id: organizationId },
      {
        $set: {
          'metadata.lastImportanceRecalculationStatus': 'failed',
          'metadata.lastImportanceRecalculationError': error.message,
        },
      },
    )
    throw error
  }
}

/**
 * Gets organization-level importance recalculation status, counts, and active queue job details.
 */
export const getOrgImportanceRecalculationStatus = async ({ organizationId } = {}) => {
  assertOrg(organizationId)

  const orgDoc = await Organization.findById(organizationId).select('name metadata')
  if (!orgDoc) {
    const err = new Error('Organization not found')
    err.statusCode = 404
    throw err
  }

  const [decisionCount, actionItemCount] = await Promise.all([
    Decision.countDocuments({ organization: organizationId }),
    ActionItem.countDocuments({ organization: organizationId }),
  ])

  const meta = orgDoc.metadata || {}
  let currentJobStatus = null
  const jobId = meta.lastImportanceRecalculationJobId

  if (jobId && recalculateImportanceQueue.isActive) {
    const queue = getQueueInstance(QUEUE_NAME)
    if (queue) {
      const job = await queue.getJob(String(jobId))
      if (job) {
        const state = await job.getState()
        currentJobStatus = {
          jobId: String(job.id),
          state,
          progress: job.progress || null,
          failedReason: job.failedReason || null,
          finishedOn: job.finishedOn || null,
          processedOn: job.processedOn || null,
        }
      }
    }
  }

  return {
    queue: QUEUE_NAME,
    redisActive: recalculateImportanceQueue.isActive,
    stats: {
      decisions: decisionCount,
      actionItems: actionItemCount,
      totalMemories: decisionCount + actionItemCount,
    },
    lastRun: {
      status: meta.lastImportanceRecalculationStatus || 'idle',
      lastJobId: jobId || null,
      triggeredAt: meta.lastImportanceRecalculationTriggeredAt || null,
      completedAt: meta.lastImportanceRecalculationAt || null,
      results: meta.lastImportanceRecalculationResults || null,
      error: meta.lastImportanceRecalculationError || null,
    },
    activeJob: currentJobStatus,
  }
}
