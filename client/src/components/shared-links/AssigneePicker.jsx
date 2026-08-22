// components/shared/AssigneePicker.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast } from "react-toastify";
import {
  User,
  Users,
  Search,
  X,
  Check,
  Loader2,
  UserPlus,
  UserMinus,
  UserCheck,
  Mail,
  Briefcase,
  Crown,
  Shield,
  Star,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Minus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  AtSign,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Award,
  Medal,
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Gem,
  Diamond,
} from "lucide-react";

// Utility function for debouncing
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Sub-components
const AssigneeAvatar = ({ user, size = "md" }) => {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-14 h-14 text-xl",
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getColor = (id) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-cyan-500",
      "bg-rose-500",
      "bg-amber-500",
    ];
    const index = id ? id.toString().length % colors.length : 0;
    return colors[index];
  };

  if (!user) return null;

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || "User"}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${getColor(user._id || user.id)} flex items-center justify-center text-white font-semibold shadow-sm`}
    >
      {getInitials(user.name || user.email)}
    </div>
  );
};

const AssigneeChip = ({ user, onRemove, className = "" }) => {
  if (!user) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-full pl-1 pr-2 py-0.5 border border-slate-200 dark:border-slate-700 ${className}`}
    >
      <AssigneeAvatar user={user} size="xs" />
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
        {user.name || user.email}
      </span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(user);
          }}
          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          aria-label={`Remove ${user.name || "assignee"}`}
        >
          <X className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
        </button>
      )}
    </div>
  );
};

// Main AssigneePicker Component
const AssigneePicker = ({
  // Core props
  value = null,
  onChange,
  multiple = false,
  maxAssignees = 10,

  // Data props
  users = [],
  organizationId = null,
  excludedUsers = [],
  required = false,

  // UI props
  placeholder = "Search for assignees...",
  label = "Assignees",
  description = "Select team members to assign",
  className = "",
  disabled = false,
  loading = false,
  readOnly = false,

  // Validation props
  validateOnSelect = true,
  validateOutsideOrg = true,
  validateRole = null,
  validatePermission = null,

  // Feature flags
  showAvatar = true,
  showEmail = false,
  showRole = false,
  showDepartment = false,
  showAvailability = false,
  showSearch = true,
  showClear = true,
  showCreateOption = false,
  showPresence = false,

  // Event handlers
  onSelect,
  onRemove,
  onClear,
  onError,
  onSearch,
  onCreateNew,

  // Custom renderers
  renderAssignee,
  renderOption,
  renderEmpty,
  renderLoading,

  // Accessibility
  ariaLabel = "Assignee picker",
  ariaDescribedBy = null,

  // Styles
  inputClassName = "",
  dropdownClassName = "",
  optionClassName = "",
  chipClassName = "",

  // Advanced
  debounceDelay = 300,
  minSearchLength = 2,
  maxDropdownHeight = 300,
  autoFocus = false,
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [recentlySelected, setRecentlySelected] = useState([]);

  // Refs
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);

  // Initialize selected users from value prop
  useEffect(() => {
    if (value) {
      const values = Array.isArray(value) ? value : [value];
      setSelectedUsers(values.filter(Boolean));
    } else {
      setSelectedUsers([]);
    }
  }, [value]);

  // Filter users based on search query
  const performSearch = useCallback(
    async (query) => {
      setIsSearching(true);
      setError(null);

      try {
        let results = [];

        // If onSearch prop provided, use it
        if (onSearch) {
          results = await onSearch(query, {
            exclude: selectedUsers.map((u) => u._id || u.id),
            organizationId,
            validateRole,
            validatePermission,
          });
        } else {
          // Local filtering
          results = users.filter((user) => {
            // Exclude already selected users
            if (
              selectedUsers.some(
                (s) => (s._id || s.id) === (user._id || user.id),
              )
            ) {
              return false;
            }

            // Exclude explicitly excluded users
            if (
              excludedUsers.some(
                (e) => (e._id || e.id) === (user._id || user.id),
              )
            ) {
              return false;
            }

            // Search filter
            const searchLower = query.toLowerCase();
            const nameMatch =
              user.name?.toLowerCase().includes(searchLower) || false;
            const emailMatch =
              user.email?.toLowerCase().includes(searchLower) || false;
            const deptMatch =
              user.department?.toLowerCase().includes(searchLower) || false;
            const roleMatch =
              user.role?.toLowerCase().includes(searchLower) || false;

            return nameMatch || emailMatch || deptMatch || roleMatch;
          });

          // Sort by relevance
          results.sort((a, b) => {
            const aName = a.name?.toLowerCase() || "";
            const bName = b.name?.toLowerCase() || "";
            const aEmail = a.email?.toLowerCase() || "";
            const bEmail = b.email?.toLowerCase() || "";

            // Exact match priority
            if (aName === searchQuery.toLowerCase()) return -1;
            if (bName === searchQuery.toLowerCase()) return 1;
            if (aEmail === searchQuery.toLowerCase()) return -1;
            if (bEmail === searchQuery.toLowerCase()) return 1;

            // Starts with priority
            if (aName.startsWith(searchQuery.toLowerCase())) return -1;
            if (bName.startsWith(searchQuery.toLowerCase())) return 1;

            return 0;
          });
        }

        setFilteredUsers(results);
        setFocusedIndex(-1);
      } catch (err) {
        setError(err.message || "Failed to search users");
        if (onError) onError(err);
      } finally {
        setIsSearching(false);
      }
    },
    [
      users,
      selectedUsers,
      excludedUsers,
      organizationId,
      validateRole,
      validatePermission,
      onSearch,
      onError,
      searchQuery,
    ],
  );

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((query) => {
        if (query.length >= minSearchLength || query.length === 0) {
          performSearch(query);
        }
      }, debounceDelay),
    [performSearch, minSearchLength, debounceDelay],
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);

    // Show dropdown on typing
    if (!isOpen && query.length >= minSearchLength) {
      setIsOpen(true);
    }
  };

  // Validate user
  const validateUser = useCallback(
    (user) => {
      // Check if user exists
      if (!user) {
        return { valid: false, error: "User not found" };
      }

      // Check if already selected
      if (
        selectedUsers.some((s) => (s._id || s.id) === (user._id || user.id))
      ) {
        return { valid: false, error: "User already assigned" };
      }

      // Check max assignees
      if (multiple && selectedUsers.length >= maxAssignees) {
        return {
          valid: false,
          error: `Maximum ${maxAssignees} assignees allowed`,
        };
      }

      // Check outside organization
      if (
        validateOutsideOrg &&
        organizationId &&
        user.organizationId !== organizationId
      ) {
        return {
          valid: false,
          error: "User is not a member of this organization",
        };
      }

      // Check role validation
      if (validateRole && user.role !== validateRole) {
        return { valid: false, error: `User must have role: ${validateRole}` };
      }

      // Check permission validation
      if (
        validatePermission &&
        !user.permissions?.includes(validatePermission)
      ) {
        return {
          valid: false,
          error: `User lacks required permission: ${validatePermission}`,
        };
      }

      // Check if excluded
      if (
        excludedUsers.some((e) => (e._id || e.id) === (user._id || user.id))
      ) {
        return { valid: false, error: "User is excluded from selection" };
      }

      return { valid: true };
    },
    [
      selectedUsers,
      multiple,
      maxAssignees,
      validateOutsideOrg,
      organizationId,
      validateRole,
      validatePermission,
      excludedUsers,
    ],
  );

  // Handle user selection
  const handleSelectUser = useCallback(
    (user) => {
      if (disabled || readOnly) return;

      // Validate
      if (validateOnSelect) {
        const validation = validateUser(user);
        if (!validation.valid) {
          toast.error(validation.error);
          if (onError) onError({ user, error: validation.error });
          return;
        }
      }

      let newSelected;
      if (multiple) {
        newSelected = [...selectedUsers, user];
      } else {
        newSelected = [user];
        setIsOpen(false);
      }

      setSelectedUsers(newSelected);
      setSearchQuery("");
      setFilteredUsers([]);

      // Call onChange
      if (onChange) {
        onChange(multiple ? newSelected : user);
      }

      // Call onSelect
      if (onSelect) {
        onSelect(user);
      }

      // Track recently selected
      setRecentlySelected((prev) => {
        const filtered = prev.filter(
          (u) => (u._id || u.id) !== (user._id || user.id),
        );
        return [user, ...filtered].slice(0, 5);
      });

      toast.success(`Assigned to ${user.name || user.email}`);
    },
    [
      selectedUsers,
      multiple,
      validateOnSelect,
      validateUser,
      onChange,
      onSelect,
      onError,
      disabled,
      readOnly,
    ],
  );

  // Handle user removal
  const handleRemoveUser = useCallback(
    (user) => {
      if (disabled || readOnly) return;

      const newSelected = selectedUsers.filter(
        (u) => (u._id || u.id) !== (user._id || user.id),
      );
      setSelectedUsers(newSelected);

      if (onChange) {
        onChange(multiple ? newSelected : null);
      }

      if (onRemove) {
        onRemove(user);
      }

      toast.info(`Removed ${user.name || user.email}`);
    },
    [selectedUsers, multiple, onChange, onRemove, disabled, readOnly],
  );

  // Handle clear all
  const handleClear = useCallback(() => {
    if (disabled || readOnly) return;

    setSelectedUsers([]);
    setSearchQuery("");
    setFilteredUsers([]);

    if (onChange) {
      onChange(multiple ? [] : null);
    }

    if (onClear) {
      onClear();
    }

    toast.info("Cleared all assignees");
  }, [multiple, onChange, onClear, disabled, readOnly]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          setIsOpen(true);
          if (searchQuery.length < minSearchLength) {
            performSearch("");
          }
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredUsers.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredUsers.length) {
            handleSelectUser(filteredUsers[focusedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;
        case "Tab":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        default:
          break;
      }
    },
    [
      isOpen,
      filteredUsers,
      focusedIndex,
      handleSelectUser,
      performSearch,
      minSearchLength,
      searchQuery,
    ],
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [focusedIndex]);

  // Default render for assignee
  const defaultRenderAssignee = useCallback(
    (user) => {
      return (
        <AssigneeChip
          user={user}
          onRemove={readOnly ? null : handleRemoveUser}
          className={chipClassName}
        />
      );
    },
    [handleRemoveUser, readOnly, chipClassName],
  );

  // Default render for option
  const defaultRenderOption = useCallback(
    (user, isFocused, isSelected) => {
      const getRoleIcon = (role) => {
        switch (role?.toLowerCase()) {
          case "owner":
            return <Crown className="w-3.5 h-3.5 text-amber-500" />;
          case "admin":
            return <Shield className="w-3.5 h-3.5 text-purple-500" />;
          case "manager":
            return <Star className="w-3.5 h-3.5 text-blue-500" />;
          default:
            return <User className="w-3.5 h-3.5 text-slate-400" />;
        }
      };

      const getStatusColor = (status) => {
        switch (status) {
          case "online":
            return "bg-green-500";
          case "away":
            return "bg-yellow-500";
          case "busy":
            return "bg-red-500";
          default:
            return "bg-slate-400";
        }
      };

      return (
        <div
          ref={(el) => (optionRefs.current[filteredUsers.indexOf(user)] = el)}
          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
            isFocused
              ? "bg-blue-50 dark:bg-blue-900/30"
              : "hover:bg-slate-50 dark:hover:bg-slate-800"
          } ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""} ${optionClassName}`}
          onClick={() => handleSelectUser(user)}
          onMouseEnter={() => setFocusedIndex(filteredUsers.indexOf(user))}
          role="option"
          aria-selected={isFocused}
        >
          {showAvatar && (
            <div className="relative flex-shrink-0">
              <AssigneeAvatar user={user} size="md" />
              {showPresence && user.status && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor(user.status)}`}
                />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user.name || "Unnamed User"}
              </span>
              {showRole && user.role && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  {getRoleIcon(user.role)}
                  <span className="capitalize">{user.role}</span>
                </span>
              )}
              {isSelected && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {showEmail && user.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </span>
              )}
              {showDepartment && user.department && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {user.department}
                </span>
              )}
              {showAvailability && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {user.available ? "Available" : "Unavailable"}
                </span>
              )}
            </div>
          </div>

          {validateOnSelect && (
            <button
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSelectUser(user);
              }}
            >
              <UserPlus className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      );
    },
    [
      showAvatar,
      showRole,
      showEmail,
      showDepartment,
      showAvailability,
      showPresence,
      validateOnSelect,
      handleSelectUser,
      filteredUsers,
      optionClassName,
    ],
  );

  // Render loading state
  const renderLoadingState = () => {
    if (renderLoading) return renderLoading();
    return (
      <div className="p-4 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400 mx-auto" />
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Loading users...
        </p>
      </div>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (renderEmpty) return renderEmpty(searchQuery);

    if (searchQuery.length < minSearchLength) {
      return (
        <div className="p-4 text-center text-slate-500 dark:text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            Type at least {minSearchLength} characters to search
          </p>
        </div>
      );
    }

    return (
      <div className="p-4 text-center text-slate-500 dark:text-slate-400">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No users found</p>
        {showCreateOption && (
          <button
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mx-auto"
            onClick={() => onCreateNew?.(searchQuery)}
          >
            <UserPlus className="w-4 h-4" />
            Create new user
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    >
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Assignees */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedUsers.map((user, index) => (
            <React.Fragment key={user._id || user.id || index}>
              {renderAssignee
                ? renderAssignee(user, handleRemoveUser)
                : defaultRenderAssignee(user)}
            </React.Fragment>
          ))}
          {multiple && !readOnly && selectedUsers.length < maxAssignees && (
            <button
              onClick={() => inputRef.current?.focus()}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full border border-dashed border-blue-300 dark:border-blue-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add more
            </button>
          )}
          {showClear && selectedUsers.length > 1 && !readOnly && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full border border-dashed border-red-300 dark:border-red-700 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search Input */}
      {!readOnly && showSearch && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (!isOpen && searchQuery.length >= minSearchLength) {
                  setIsOpen(true);
                }
              }}
              onClick={() => {
                if (!isOpen && searchQuery.length >= minSearchLength) {
                  setIsOpen(true);
                }
              }}
              placeholder={placeholder}
              disabled={disabled || loading}
              className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border ${
                error
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-300 dark:border-slate-600 focus:ring-blue-500"
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              } ${inputClassName}`}
              aria-invalid={!!error}
              aria-describedby={error ? "assignee-error" : undefined}
              autoFocus={autoFocus}
              autoComplete="off"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilteredUsers([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {error && (
            <p
              id="assignee-error"
              className="mt-1.5 text-xs text-red-500 flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>
      )}

      {/* Read-only display */}
      {readOnly && selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user, index) => (
            <div
              key={user._id || user.id || index}
              className="flex items-center gap-2"
            >
              <AssigneeAvatar user={user} size="sm" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {user.name || user.email}
              </span>
            </div>
          ))}
        </div>
      )}

      {readOnly && selectedUsers.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No assignees
        </p>
      )}

      {/* Description */}
      {description && !readOnly && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && !readOnly && !disabled && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden ${dropdownClassName}`}
          style={{ maxHeight: maxDropdownHeight }}
          role="listbox"
        >
          <div
            className="overflow-y-auto"
            style={{ maxHeight: maxDropdownHeight }}
          >
            {loading || isSearching ? (
              renderLoadingState()
            ) : filteredUsers.length > 0 ? (
              <>
                {/* Recently selected section */}
                {recentlySelected.length > 0 && searchQuery.length === 0 && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      Recently Selected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recentlySelected.map((user) => (
                        <AssigneeChip
                          key={user._id || user.id}
                          user={user}
                          size="xs"
                          className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Users list */}
                {filteredUsers.map((user, index) => {
                  const isFocused = index === focusedIndex;
                  const isSelected = selectedUsers.some(
                    (u) => (u._id || u.id) === (user._id || user.id),
                  );

                  return renderOption
                    ? renderOption(user, isFocused, isSelected)
                    : defaultRenderOption(user, isFocused, isSelected);
                })}
              </>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Footer */}
          {filteredUsers.length > 0 && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {filteredUsers.length} user{filteredUsers.length > 1 ? "s" : ""}{" "}
                found
              </span>
              <span className="flex items-center gap-1">
                <span className="hidden sm:inline">Use</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-[10px] font-mono">
                  ↑↓
                </kbd>
                <span className="hidden sm:inline">to navigate</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-[10px] font-mono">
                  Enter
                </kbd>
                <span className="hidden sm:inline">to select</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-[10px] font-mono">
                  Esc
                </kbd>
                <span className="hidden sm:inline">to close</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && !isOpen && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
};

// Export sub-components for flexibility
export { AssigneeAvatar, AssigneeChip };

export default AssigneePicker;
