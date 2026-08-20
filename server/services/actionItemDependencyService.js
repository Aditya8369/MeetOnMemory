import ActionItemDependency from "../models/actionItemDependencyModel.js";
import ActionItem from "../models/actionItemModel.js";

class ActionItemDependencyService {
  /**
   * Check if adding a dependency from dependentId -> blockerId creates a cycle.
   * If A is blocked by B, B is blocked by C. Then adding C blocked by A creates a cycle.
   * So we do a BFS from `blockerId` following "blockedByItem" links.
   * If we ever reach `dependentId`, it's a cycle.
   */
  async checkCycle(dependentId, blockerId, orgId) {
    if (dependentId.toString() === blockerId.toString()) {
      return true; // Self-reference is a cycle
    }

    const queue = [blockerId.toString()];
    const visited = new Set(queue);

    while (queue.length > 0) {
      const currentId = queue.shift();

      // Find all items that are blocking the current item
      const blockers = await ActionItemDependency.find({
        dependentItem: currentId,
        organization: orgId,
      }).lean();

      for (const dep of blockers) {
        const nextBlockerId = dep.blockedByItem.toString();
        if (nextBlockerId === dependentId.toString()) {
          return true; // Cycle found
        }
        if (!visited.has(nextBlockerId)) {
          visited.add(nextBlockerId);
          queue.push(nextBlockerId);
        }
      }
    }

    return false; // No cycle
  }

  async addDependency(dependentId, blockerId, orgId) {
    // 1. Verify both items exist and belong to the organization
    const [dependent, blocker] = await Promise.all([
      ActionItem.findOne({ _id: dependentId, organization: orgId }).lean(),
      ActionItem.findOne({ _id: blockerId, organization: orgId }).lean(),
    ]);

    if (!dependent) throw new Error("Dependent action item not found");
    if (!blocker) throw new Error("Blocking action item not found");

    // 2. Check for cycles
    const hasCycle = await this.checkCycle(dependentId, blockerId, orgId);
    if (hasCycle) {
      throw new Error(
        "Cannot add dependency: It would create a circular dependency loop.",
      );
    }

    // 3. Create dependency
    try {
      const dependency = await ActionItemDependency.create({
        dependentItem: dependentId,
        blockedByItem: blockerId,
        organization: orgId,
      });
      return dependency;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("This dependency already exists");
      }
      throw error;
    }
  }

  async removeDependency(dependentId, blockerId, orgId) {
    const result = await ActionItemDependency.findOneAndDelete({
      dependentItem: dependentId,
      blockedByItem: blockerId,
      organization: orgId,
    });

    if (!result) {
      throw new Error("Dependency not found");
    }
    return result;
  }

  async getDependencies(itemId, orgId) {
    // 1. Items that are blocking the given item
    const blockers = await ActionItemDependency.find({
      dependentItem: itemId,
      organization: orgId,
    })
      .populate("blockedByItem", "text status owner dueDate")
      .lean();

    // 2. Items that the given item is blocking (dependents)
    const blocking = await ActionItemDependency.find({
      blockedByItem: itemId,
      organization: orgId,
    })
      .populate("dependentItem", "text status owner dueDate")
      .lean();

    return {
      blockers: blockers.map((d) => ({
        ...d.blockedByItem,
        dependencyId: d._id,
      })),
      blocking: blocking.map((d) => ({
        ...d.dependentItem,
        dependencyId: d._id,
      })),
    };
  }
}

export default new ActionItemDependencyService();
