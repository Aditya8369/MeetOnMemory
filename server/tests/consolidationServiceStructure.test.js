/**
 * Issue #1771 — Memory Consolidation lives under
 * `server/services/consolidation/`. This suite is an import/export contract:
 * if a canonical module is removed or its public surface disappears, the
 * consolidation engine and conflict-detection services break.
 */

import {
  DEFAULT_EMBEDDING_THRESHOLD,
  DEFAULT_TEXT_THRESHOLD,
  areMemoriesSimilar,
  selectCanonical,
  resolveConflicts,
} from "../services/consolidation/ConsolidationAIProcessor.js";
import {
  MODEL_REGISTRY,
  assertSupportedModel,
} from "../services/consolidation/consolidationRegistry.js";
import {
  mergeCluster,
  getConsolidatedMemories,
  repointGraphEdges,
} from "../services/consolidation/ConsolidationStorage.js";
import {
  buildDuplicateClusters,
  fetchMemoriesForConsolidation,
} from "../services/consolidation/MemoryAggregator.js";
import * as memoryConsolidationService from "../services/memoryConsolidationService.js";

describe("canonical consolidation service structure (Issue #1771)", () => {
  describe("ConsolidationAIProcessor", () => {
    it("exports similarity thresholds and clustering helpers", () => {
      expect(typeof DEFAULT_EMBEDDING_THRESHOLD).toBe("number");
      expect(typeof DEFAULT_TEXT_THRESHOLD).toBe("number");
      expect(typeof areMemoriesSimilar).toBe("function");
      expect(typeof selectCanonical).toBe("function");
      expect(typeof resolveConflicts).toBe("function");
    });
  });

  describe("consolidationRegistry", () => {
    it("registers decision and actionItem memory types", () => {
      expect(MODEL_REGISTRY.decision).toBeDefined();
      expect(MODEL_REGISTRY.actionItem).toBeDefined();
      expect(MODEL_REGISTRY.decision.label).toBe("Decision");
      expect(MODEL_REGISTRY.actionItem.label).toBe("ActionItem");
      expect(Array.isArray(MODEL_REGISTRY.decision.conflictFields)).toBe(true);
      expect(Array.isArray(MODEL_REGISTRY.actionItem.conflictFields)).toBe(
        true,
      );
    });

    it("assertSupportedModel returns the registry entry for known types", () => {
      expect(assertSupportedModel("decision")).toBe(MODEL_REGISTRY.decision);
      expect(assertSupportedModel("actionItem")).toBe(
        MODEL_REGISTRY.actionItem,
      );
    });

    it("assertSupportedModel rejects unknown types", () => {
      expect(() => assertSupportedModel("not-a-memory")).toThrow(
        /Unsupported memory type/,
      );
    });
  });

  describe("ConsolidationStorage", () => {
    it("exports merge and retrieval helpers", () => {
      expect(typeof mergeCluster).toBe("function");
      expect(typeof getConsolidatedMemories).toBe("function");
      expect(typeof repointGraphEdges).toBe("function");
    });
  });

  describe("MemoryAggregator", () => {
    it("exports clustering and fetch helpers", () => {
      expect(typeof buildDuplicateClusters).toBe("function");
      expect(typeof fetchMemoriesForConsolidation).toBe("function");
    });
  });

  describe("memoryConsolidationService wiring", () => {
    it("re-exports the canonical consolidation module surface", () => {
      expect(memoryConsolidationService.MODEL_REGISTRY).toBe(MODEL_REGISTRY);
      expect(memoryConsolidationService.DEFAULT_EMBEDDING_THRESHOLD).toBe(
        DEFAULT_EMBEDDING_THRESHOLD,
      );
      expect(memoryConsolidationService.DEFAULT_TEXT_THRESHOLD).toBe(
        DEFAULT_TEXT_THRESHOLD,
      );
      expect(memoryConsolidationService.areMemoriesSimilar).toBe(
        areMemoriesSimilar,
      );
      expect(memoryConsolidationService.selectCanonical).toBe(selectCanonical);
      expect(memoryConsolidationService.buildDuplicateClusters).toBe(
        buildDuplicateClusters,
      );
      expect(memoryConsolidationService.mergeCluster).toBe(mergeCluster);
      expect(memoryConsolidationService.repointGraphEdges).toBe(
        repointGraphEdges,
      );
      expect(memoryConsolidationService.getConsolidatedMemories).toBe(
        getConsolidatedMemories,
      );
    });
  });
});
