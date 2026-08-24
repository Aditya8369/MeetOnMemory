import actionItemGraphService from '../services/actionItemGraphService.js'
import ActionItemGraph from '../models/actionItemGraphModel.js'

/**
 * Controller handling cross-meeting action item dependency graphs
 */
export const addActionItemDependency = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id']
    const {
      sourceMeetingId,
      targetMeetingId,
      sourceActionItemId,
      targetActionItemId,
      dependencyType,
      criticalPathWeight,
    } = req.body

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context is required' })
    }
    if (!sourceActionItemId || !targetActionItemId || !sourceMeetingId) {
      return res.status(400).json({
        error: 'sourceMeetingId, sourceActionItemId, and targetActionItemId are required',
      })
    }

    const dependency = await actionItemGraphService.addDependency({
      organizationId,
      sourceMeetingId,
      targetMeetingId: targetMeetingId || sourceMeetingId,
      sourceActionItemId,
      targetActionItemId,
      dependencyType,
      criticalPathWeight,
    })

    return res.status(201).json({
      message: 'Action item dependency established successfully',
      dependency,
    })
  } catch (error) {
    const status = error.statusCode || 500
    return res.status(status).json({ error: error.message })
  }
}

export const getActionItemGraph = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id']
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context is required' })
    }

    const { status, meetingId } = req.query
    const filter = {}
    if (status) filter.status = status
    if (meetingId) {
      filter.$or = [{ sourceMeetingId: meetingId }, { targetMeetingId: meetingId }]
    }

    const graph = await actionItemGraphService.getGraphTopology(organizationId, filter)
    return res.status(200).json({ graph })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const resolveActionItemBlocker = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id']
    const { actionItemId } = req.params

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization context is required' })
    }

    await actionItemGraphService.resolveActionItemBlockers(organizationId, actionItemId)
    return res.status(200).json({ message: 'Action item blocker dependencies resolved' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

export const removeActionItemDependency = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId || req.headers['x-organization-id']
    const { id } = req.params

    const result = await ActionItemGraph.findOneAndDelete({
      _id: id,
      organizationId,
    })

    if (!result) {
      return res.status(404).json({ error: 'Dependency not found' })
    }

    return res.status(200).json({ message: 'Dependency removed successfully' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
