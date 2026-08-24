import ActionItemGraph from '../models/actionItemGraphModel.js'

/**
 * Service managing cross-meeting action item dependency graphs,
 * cycle validation, critical path analysis, and blocker resolutions.
 */
class ActionItemGraphService {
  /**
   * Validate if adding a directed edge (source -> target) causes a cyclic dependency
   */
  async willCreateCycle(organizationId, sourceId, targetId) {
    if (sourceId === targetId) return true

    const allDependencies = await ActionItemGraph.find({
      organizationId,
      status: 'ACTIVE',
    }).lean()

    const adjacencyList = new Map()

    for (const dep of allDependencies) {
      if (!adjacencyList.has(dep.sourceActionItemId)) {
        adjacencyList.set(dep.sourceActionItemId, [])
      }
      adjacencyList.get(dep.sourceActionItemId).push(dep.targetActionItemId)
    }

    if (!adjacencyList.has(sourceId)) {
      adjacencyList.set(sourceId, [])
    }
    adjacencyList.get(sourceId).push(targetId)

    // Run DFS to detect reachable cycle
    const visited = new Set()
    const recursionStack = new Set()

    const hasCycleDfs = (node) => {
      visited.add(node)
      recursionStack.add(node)

      const neighbors = adjacencyList.get(node) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDfs(neighbor)) return true
        } else if (recursionStack.has(neighbor)) {
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    for (const node of adjacencyList.keys()) {
      if (!visited.has(node)) {
        if (hasCycleDfs(node)) return true
      }
    }

    return false
  }

  /**
   * Create or update a dependency link between two action items
   */
  async addDependency({
    organizationId,
    sourceMeetingId,
    targetMeetingId,
    sourceActionItemId,
    targetActionItemId,
    dependencyType = 'BLOCKS',
    criticalPathWeight = 1,
  }) {
    const isCycle = await this.willCreateCycle(
      organizationId,
      sourceActionItemId,
      targetActionItemId,
    )
    if (isCycle) {
      const error = new Error(
        'Circular dependency detected. Action item dependency cannot form a cycle.',
      )
      error.statusCode = 400
      throw error
    }

    return await ActionItemGraph.findOneAndUpdate(
      {
        organizationId,
        sourceActionItemId,
        targetActionItemId,
      },
      {
        organizationId,
        sourceMeetingId,
        targetMeetingId,
        sourceActionItemId,
        targetActionItemId,
        dependencyType,
        criticalPathWeight,
        status: 'ACTIVE',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }

  /**
   * Fetch DAG graph topology for an organization / meeting set
   */
  async getGraphTopology(organizationId, filter = {}) {
    const query = { organizationId, ...filter }
    const dependencies = await ActionItemGraph.find(query)
      .populate('sourceMeetingId', 'title scheduledStartTime')
      .populate('targetMeetingId', 'title scheduledStartTime')
      .lean()

    const nodes = new Map()
    const edges = []

    for (const dep of dependencies) {
      if (!nodes.has(dep.sourceActionItemId)) {
        nodes.set(dep.sourceActionItemId, {
          id: dep.sourceActionItemId,
          meeting: dep.sourceMeetingId,
          type: 'actionItem',
        })
      }
      if (!nodes.has(dep.targetActionItemId)) {
        nodes.set(dep.targetActionItemId, {
          id: dep.targetActionItemId,
          meeting: dep.targetMeetingId,
          type: 'actionItem',
        })
      }

      edges.push({
        id: dep._id,
        source: dep.sourceActionItemId,
        target: dep.targetActionItemId,
        type: dep.dependencyType,
        weight: dep.criticalPathWeight,
        status: dep.status,
        escalationLevel: dep.escalationLevel,
      })
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
    }
  }

  /**
   * Resolve dependencies when an action item is completed
   */
  async resolveActionItemBlockers(organizationId, actionItemId) {
    return await ActionItemGraph.updateMany(
      {
        organizationId,
        sourceActionItemId: actionItemId,
        status: 'ACTIVE',
      },
      {
        status: 'RESOLVED',
      },
    )
  }
}

export default new ActionItemGraphService()
