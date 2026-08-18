import React, { useState, useEffect, useContext } from "react";
import { X, Lightbulb } from "lucide-react";
import { parkingLotApi } from "../../services";
import AppContent from "../../context/AppContent";
import { toast } from "react-toastify";

const ParkingLotImportModal = ({ isOpen, onClose, onImport }) => {
  const { userData } = useContext(AppContent);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const organizationId =
    userData?.currentOrganization?._id || userData?.organizations?.[0];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const { data } = await parkingLotApi.getOrganizationParkingLot(
          organizationId,
          { status: "pending" },
        );
        if (data.success) {
          setItems(data.data.items || []);
          setSelectedIds(new Set()); // Reset selections
        }
      } catch (error) {
        console.error("Failed to fetch parking lot items", error);
        toast.error("Failed to load parking lot backlog");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && organizationId) {
      fetchItems();
    }
  }, [isOpen, organizationId]);

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleImport = () => {
    const selectedItems = items.filter((item) => selectedIds.has(item._id));
    if (selectedItems.length > 0) {
      onImport(selectedItems);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-yellow-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Import from Parking Lot
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Loading backlog...
            </p>
          ) : items.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No pending items found.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <label
                  key={item._id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={selectedIds.has(item._id)}
                    onChange={() => toggleSelection(item._id)}
                  />
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {item.topic}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      From: {item.sourceMeetingId?.title || "Unknown Meeting"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            Import Selected ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParkingLotImportModal;
