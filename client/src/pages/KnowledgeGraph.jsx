import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import AppContent from "../context/AppContent";
import Navbar from "../components/Navbar.jsx";
import apiClient from "../services/apiClient.js";
import * as d3 from "d3";
import {
  Network,
  Search,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  X,
  Users,
  Calendar,
  Target,
  CheckSquare,
  MessageSquare,
  GitFork,
  BarChart3,
  Layers,
  ArrowRight,
  RefreshCw,
  Sliders,
  Menu,
} from "lucide-react";
import { toast } from "react-toastify";

// Node styling utilities
const getNodeColor = (type) => {
  const colors = {
    meeting: "#3b82f6",
    person: "#10b981",
    decision: "#f59e0b",
    "action-item": "#ef4444",
    topic: "#8b5cf6",
  };
  return colors[type] || "#6b7280";
};

const getNodeIcon = (type) => {
  const icons = {
    meeting: Calendar,
    person: Users,
    decision: Target,
    "action-item": CheckSquare,
    topic: MessageSquare,
  };
  return icons[type] || Info;
};

const getEdgeColor = (type) => {
  const colors = {
    created: "#3b82f6",
    participated: "#10b981",
    produced: "#f59e0b",
    assigned: "#ef4444",
    discussed: "#8b5cf6",
    "relates-to": "#6b7280",
    attended: "#10b981",
  };
  return colors[type] || "#9ca3af";
};

const KnowledgeGraph = () => {
  const { userData } = useContext(AppContent);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const organizationId =
    userData?.organization?._id || userData?.organization || null;

  // Active view tab: "graph" | "pathfinder" | "analytics"
  const [activeTab, setActiveTab] = useState("graph");

  // Main graph state
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [filters, setFilters] = useState({
    meetings: true,
    persons: true,
    decisions: true,
    actions: true,
    topics: true,
  });
  const [zoom, setZoom] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Entity neighborhood state (Issue #1892 & #1678)
  const [entityDrawerOpen, setEntityDrawerOpen] = useState(false);
  const [entityDetails, setEntityDetails] = useState(null);
  const [loadingEntity, setLoadingEntity] = useState(false);

  // Pathfinder state
  const [startEntityId, setStartEntityId] = useState("");
  const [endEntityId, setEndEntityId] = useState("");
  const [pathResult, setPathResult] = useState(null);
  const [findingPath, setFindingPath] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Fetch full organization graph
  const fetchGraph = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await apiClient.get(
        `/api/graph/organization/${organizationId}`,
      );
      setGraph(data);
    } catch (error) {
      console.error("Error fetching graph:", error);
      toast.error("Failed to load knowledge graph");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Fetch organization analytics
  const fetchAnalytics = useCallback(async () => {
    if (!organizationId) return;
    try {
      setLoadingAnalytics(true);
      const { data } = await apiClient.get(
        `/api/graph/analytics/${organizationId}`,
      );
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load graph analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [organizationId]);

  // Fetch specific entity neighborhood
  const fetchEntityNeighborhood = useCallback(async (type, id) => {
    try {
      setLoadingEntity(true);
      setEntityDrawerOpen(true);
      const cleanType = type === "action-item" ? "action-item" : type;
      const { data } = await apiClient.get(
        `/api/graph/entity/${cleanType}/${id}`,
      );
      setEntityDetails(data);
    } catch (error) {
      console.error("Error fetching entity neighborhood:", error);
      toast.error("Failed to load entity neighborhood");
    } finally {
      setLoadingEntity(false);
    }
  }, []);

  // Find shortest path between two entities
  const handleFindPath = async (e) => {
    e?.preventDefault();
    if (!startEntityId.trim() || !endEntityId.trim()) {
      toast.warning("Please provide both Start and Target node IDs");
      return;
    }

    try {
      setFindingPath(true);
      const { data } = await apiClient.get("/api/graph/path", {
        params: { startId: startEntityId.trim(), endId: endEntityId.trim() },
      });
      setPathResult(data);
      if (data.length === -1) {
        toast.info("No connected path found between these nodes");
      }
    } catch (error) {
      console.error("Error finding path:", error);
      toast.error("Path calculation failed");
    } finally {
      setFindingPath(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // Render D3 Graph
  const renderGraph = useCallback(() => {
    if (!graph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current?.clientWidth || 1200;
    const height = 750;

    // Filter nodes and edges based on filters
    const filteredNodes = graph.nodes.filter((node) => {
      if (node.type === "meeting" && !filters.meetings) return false;
      if (node.type === "person" && !filters.persons) return false;
      if (node.type === "decision" && !filters.decisions) return false;
      if (node.type === "action-item" && !filters.actions) return false;
      if (node.type === "topic" && !filters.topics) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graph.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    // Create force simulation
    const simulation = d3
      .forceSimulation(filteredNodes)
      .force(
        "link",
        d3
          .forceLink(filteredEdges)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create container for zoom
    const container = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `scale(${zoom})`);

    // Add zoom behavior
    const zoomBehavior = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    // Add edges
    container
      .append("g")
      .selectAll("line")
      .data(filteredEdges)
      .enter()
      .append("line")
      .attr("stroke", (d) => getEdgeColor(d.type))
      .attr("stroke-width", (d) => Math.sqrt(d.weight || 1) * 2)
      .attr("stroke-opacity", 0.6);

    // Add nodes
    const node = container
      .append("g")
      .selectAll("g")
      .data(filteredNodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Add circles for nodes
    node
      .append("circle")
      .attr("r", (d) => {
        if (d.type === "meeting") return 20;
        if (d.type === "person") return 15;
        return 12;
      })
      .attr("fill", (d) => getNodeColor(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d);
        const rawId = d.properties?.id || d.id.replace(/^[a-z]+-/, "");
        fetchEntityNeighborhood(d.type, rawId);
      });

    // Add labels
    node
      .append("text")
      .text((d) => (d.label || "").substring(0, 20))
      .attr("x", 0)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .style("pointer-events", "none");

    // Update positions on tick
    simulation.on("tick", () => {
      container
        .selectAll("line")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }, [graph, filters, zoom, fetchEntityNeighborhood]);

  useEffect(() => {
    if (graph && svgRef.current && activeTab === "graph") {
      renderGraph();
    }
  }, [graph, filters, zoom, activeTab, renderGraph]);

  const searchEntities = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await apiClient.get("/api/graph/search", {
        params: { query },
      });
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching:", error);
    }
  }, []);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      searchEntities(query);
    } else {
      setSearchResults([]);
    }
  };

  const exportGraph = useCallback(async (format) => {
    try {
      const { data } = await apiClient.post("/api/graph/export", { format });

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "knowledge-graph.json";
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const blob = new Blob([data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "knowledge-graph.csv";
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Graph exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export graph");
    }
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.1));
  const handleResetZoom = () => setZoom(1);

  const toggleFilter = (type) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <Navbar />
        <div className="pt-32 flex items-center justify-center">
          <div className="text-center">
            <Network className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Loading knowledge graph...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col font-sans">
      <Navbar />

      <div className="pt-24 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col">
        {/* Header & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Network className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Knowledge Graph
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore interconnected relationships, paths, decisions, and
              analytics across meetings
            </p>
          </div>

          {/* Navigation Sidebar / Header Tabs (#1892) */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeTab === "graph"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" /> Graph View
            </button>
            <button
              onClick={() => setActiveTab("pathfinder")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeTab === "pathfinder"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <GitFork className="w-4 h-4" /> Pathfinder
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeTab === "analytics"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </button>
          </div>
        </div>

        {/* TAB 1: GRAPH VIEW */}
        {activeTab === "graph" && (
          <div className="flex flex-col lg:flex-row gap-6 flex-1">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
              {/* Mobile controls toggle */}
              <div className="lg:hidden flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-sm font-semibold">
                  Graph Controls & Filters
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              <div
                className={`${isMobileMenuOpen ? "block" : "hidden"} lg:block space-y-4`}
              >
                {/* Search */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-blue-500" />
                    Search Entities
                  </h3>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search meetings, people, decisions..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            setSelectedNode(result);
                            const rawId =
                              result.properties?.id ||
                              result.id.replace(/^[a-z]+-/, "");
                            fetchEntityNeighborhood(result.type, rawId);
                          }}
                          className="w-full text-left px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: getNodeColor(result.type),
                              }}
                            />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {result.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {result.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-blue-500" />
                    Entity Types
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(filters).map(([type, enabled]) => (
                      <label
                        key={type}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => toggleFilter(type)}
                            className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium capitalize">
                            {type === "actions" ? "Action Items" : type}
                          </span>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getNodeColor(
                              type === "actions"
                                ? "action-item"
                                : type === "persons"
                                  ? "person"
                                  : type === "meetings"
                                    ? "meeting"
                                    : type === "decisions"
                                      ? "decision"
                                      : "topic",
                            ),
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Zoom & Canvas Controls */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Viewport Controls
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleZoomIn}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> +
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" /> -
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title="Reset Viewport"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> 1:1
                    </button>
                  </div>
                </div>

                {/* Export */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    Export Subgraph
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportGraph("json")}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      JSON Format
                    </button>
                    <button
                      onClick={() => exportGraph("csv")}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      CSV Format
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Interactive Graph Area */}
            <div className="flex-1 flex flex-col">
              <div
                ref={containerRef}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden relative"
                style={{ minHeight: "680px", height: "100%" }}
              >
                <svg
                  ref={svgRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                />

                {/* Legend Overlay */}
                <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-3 text-xs">
                  {[
                    { type: "meeting", label: "Meeting" },
                    { type: "person", label: "Person" },
                    { type: "decision", label: "Decision" },
                    { type: "action-item", label: "Action Item" },
                    { type: "topic", label: "Topic" },
                  ].map(({ type, label }) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getNodeColor(type) }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATHFINDER VIEW (#1892) */}
        {activeTab === "pathfinder" && (
          <div className="space-y-6 flex-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Interactive Node Pathfinder
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find the shortest path and relational chains between
                    meetings, decision nodes, or team members
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleFindPath}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
              >
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Origin Node (ID or Label)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. meeting-60c72b2f9b1d8b2bad000001"
                    value={startEntityId}
                    onChange={(e) => setStartEntityId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Target Destination Node (ID or Label)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. decision-60c72b2f9b1d8b2bad000002"
                    value={endEntityId}
                    onChange={(e) => setEndEntityId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={findingPath}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
                  >
                    {findingPath ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" /> Find Path
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Path Results */}
            {pathResult && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                  Path Finding Result (
                  {pathResult.length >= 0
                    ? `${pathResult.length} hops`
                    : "Unreachable"}
                  )
                </h3>

                {pathResult.length >= 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                      {pathResult.nodes.map((node, index) => (
                        <React.Fragment key={node.id}>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: getNodeColor(node.type),
                              }}
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {node.label}
                              </p>
                              <p className="text-[10px] text-slate-400 uppercase">
                                {node.type} ({node.id})
                              </p>
                            </div>
                          </div>
                          {index < pathResult.nodes.length - 1 && (
                            <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                    <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      No direct or indirect connections found between these two
                      entities.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GRAPH ANALYTICS (#1892) */}
        {activeTab === "analytics" && (
          <div className="space-y-6 flex-1">
            {loadingAnalytics ? (
              <div className="p-16 text-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  Calculating organization-wide graph analytics...
                </p>
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metric Card 1 */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Nodes
                  </p>
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {analytics.totalNodes || 0}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Across {Object.keys(analytics.nodeCounts || {}).length}{" "}
                    entity categories
                  </p>
                </div>

                {/* Metric Card 2 */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Relationships
                  </p>
                  <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                    {analytics.totalEdges || 0}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Average degree: {analytics.averageDegree?.toFixed(2) || 0}
                  </p>
                </div>

                {/* Metric Card 3 */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Graph Density
                  </p>
                  <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {analytics.density
                      ? `${(analytics.density * 100).toFixed(2)}%`
                      : "0%"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Connectivity coefficient
                  </p>
                </div>

                {/* Metric Card 4 */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Connected Clusters
                  </p>
                  <h3 className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                    {analytics.connectedComponents || 1}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Independent subgraphs
                  </p>
                </div>

                {/* Node breakdown chart */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                    Entity Distribution
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(analytics.nodeCounts || {}).map(
                      ([type, count]) => {
                        const total = analytics.totalNodes || 1;
                        const percentage = Math.round((count / total) * 100);
                        return (
                          <div key={type}>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="capitalize">{type}</span>
                              <span>
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: getNodeColor(type),
                                }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Top Influencers */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                    Top Influential Nodes
                  </h4>
                  <div className="space-y-2">
                    {(analytics.topInfluencers || [])
                      .slice(0, 5)
                      .map((inf, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {inf.label || inf.id}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">
                            Degree: {inf.degree}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-500">
                No analytics recorded yet.
              </p>
            )}
          </div>
        )}

        {/* ENTITY NEIGHBORHOOD EXPLORATION DRAWER (#1892 & #1678) */}
        {entityDrawerOpen && (
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 z-50 p-6 overflow-y-auto flex flex-col justify-between animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  {selectedNode && (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{
                        backgroundColor: getNodeColor(selectedNode.type),
                      }}
                    >
                      {React.createElement(getNodeIcon(selectedNode.type), {
                        className: "w-5 h-5",
                      })}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                      {selectedNode?.label || "Entity Neighborhood"}
                    </h3>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider">
                      {selectedNode?.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEntityDrawerOpen(false);
                    setSelectedNode(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {loadingEntity ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">
                    Loading neighborhood...
                  </p>
                </div>
              ) : entityDetails ? (
                <div className="mt-6 space-y-6">
                  {/* Entity properties */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Node Properties
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 space-y-2 border border-slate-100 dark:border-slate-800 text-xs">
                      {Object.entries(
                        entityDetails.entity?.properties || {},
                      ).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex justify-between items-start gap-2"
                        >
                          <span className="text-slate-500 capitalize">
                            {key}:
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                            {typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 1-Hop Connected Relationships */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      1-Hop Neighborhood (
                      {entityDetails.relatedEntities?.length || 0})
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(entityDetails.relatedEntities || []).map((rel) => (
                        <div
                          key={rel.id}
                          onClick={() => {
                            setSelectedNode(rel);
                            const rawId =
                              rel.properties?.id ||
                              rel.id.replace(/^[a-z]+-/, "");
                            fetchEntityNeighborhood(rel.type, rawId);
                          }}
                          className="p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer transition flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: getNodeColor(rel.type),
                              }}
                            />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {rel.label}
                              </p>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {rel.type}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setStartEntityId(selectedNode?.id || "");
                  setActiveTab("pathfinder");
                  setEntityDrawerOpen(false);
                }}
                className="w-full py-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <GitFork className="w-3.5 h-3.5" /> Use as Pathfinder Origin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
