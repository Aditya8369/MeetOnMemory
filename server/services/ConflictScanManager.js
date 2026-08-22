// services/ConflictScanManager.js
import cron from 'node-cron';
import ConflictResolution from '../components/ConflictResolution.jsx'; // Adjust import path

class ConflictScanManager {
  constructor() {
    this.scheduledJobs = new Map();
    this.scanHistory = [];
    this.defaultSchedule = '0 0 * * *'; // Daily at midnight
    this.isInitialized = false;
  }

  /**
   * Initialize the scan manager with saved settings
   */
  async initialize() {
    if (this.isInitialized) return;
    
    const settings = await this.getSettings();
    if (settings.schedulingEnabled) {
      this.startScheduledScan(settings.schedule || this.defaultSchedule);
    }
    
    // Load history from storage
    this.scanHistory = await this.loadHistory();
    this.isInitialized = true;
  }

  /**
   * Start a scheduled recurring scan
   */
  startScheduledScan(cronExpression) {
    // Stop any existing scheduled scan
    this.stopScheduledScan();

    const job = cron.schedule(cronExpression, async () => {
      console.log('Running scheduled conflict scan...');
      await this.performScan({ scheduled: true });
    });

    const jobId = `scheduled-scan-${Date.now()}`;
    this.scheduledJobs.set(jobId, {
      id: jobId,
      job,
      cronExpression,
      startDate: new Date(),
      status: 'active'
    });

    console.log(`Scheduled scan started with cron: ${cronExpression}`);
    return jobId;
  }

  /**
   * Stop the scheduled scan
   */
  stopScheduledScan() {
    for (const [id, jobData] of this.scheduledJobs) {
      jobData.job.stop();
      this.scheduledJobs.delete(id);
    }
    console.log('Scheduled scan stopped');
  }

  /**
   * Perform a conflict scan (manual or scheduled)
   */
  async performScan(options = {}) {
    const startTime = new Date();
    const scanId = `scan-${Date.now()}`;
    
    try {
      // Update status to in-progress
      const historyEntry = this.createHistoryEntry({
        id: scanId,
        timestamp: startTime,
        status: 'in_progress',
        triggeredBy: options.scheduled ? 'scheduled' : 'manual',
        scope: options.scope || 'all'
      });

      // Execute the actual conflict scan
      // Using your existing ConflictResolution.jsx logic
      const results = await this.executeConflictScan(options);
      
      // Calculate severity levels
      const severityCounts = this.calculateSeverityCounts(results);
      const hasHighSeverity = severityCounts.high > 0;

      // Update history entry with results
      const completedEntry = {
        ...historyEntry,
        status: 'completed',
        endTime: new Date(),
        duration: new Date() - startTime,
        totalFindings: results.length || 0,
        severityCounts,
        findings: results,
        hasHighSeverity
      };

      // Save to history
      await this.saveHistory(completedEntry);
      
      // Notify admins if high severity conflicts found
      if (hasHighSeverity && options.scheduled) {
        await this.notifyAdmins(completedEntry);
      }

      return completedEntry;
    } catch (error) {
      // Log failed scan in history
      const failedEntry = {
        id: scanId,
        timestamp: startTime,
        status: 'failed',
        triggeredBy: options.scheduled ? 'scheduled' : 'manual',
        error: error.message,
        endTime: new Date(),
        duration: new Date() - startTime
      };
      
      await this.saveHistory(failedEntry);
      throw error;
    }
  }

  /**
   * Get scan history with pagination
   */
  async getHistory(filters = {}) {
    const { 
      limit = 50, 
      offset = 0, 
      status, 
      triggeredBy,
      startDate,
      endDate 
    } = filters;

    let history = this.scanHistory;

    // Apply filters
    if (status) {
      history = history.filter(entry => entry.status === status);
    }
    if (triggeredBy) {
      history = history.filter(entry => entry.triggeredBy === triggeredBy);
    }
    if (startDate) {
      history = history.filter(entry => entry.timestamp >= new Date(startDate));
    }
    if (endDate) {
      history = history.filter(entry => entry.timestamp <= new Date(endDate));
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    return {
      total: history.length,
      entries: history.slice(offset, offset + limit),
      offset,
      limit
    };
  }

  /**
   * Get a specific scan by ID
   */
  async getScanById(scanId) {
    return this.scanHistory.find(entry => entry.id === scanId) || null;
  }

  /**
   * Update scan settings
   */
  async updateSettings(settings) {
    const { schedulingEnabled, schedule, notificationEnabled } = settings;
    
    // Stop current schedule
    this.stopScheduledScan();
    
    // Start new schedule if enabled
    if (schedulingEnabled) {
      this.startScheduledScan(schedule || this.defaultSchedule);
    }
    
    // Save settings
    await this.saveSettings({
      schedulingEnabled,
      schedule: schedule || this.defaultSchedule,
      notificationEnabled: notificationEnabled !== false
    });
  }

  /**
   * Get current scan settings
   */
  async getSettings() {
    // Load from database/localStorage
    const settings = await this.loadSettings();
    return {
      schedulingEnabled: settings.schedulingEnabled || false,
      schedule: settings.schedule || this.defaultSchedule,
      notificationEnabled: settings.notificationEnabled !== false
    };
  }

  /**
   * Get status of scheduled scans
   */
  getScheduledStatus() {
    const jobs = [];
    for (const [id, jobData] of this.scheduledJobs) {
      jobs.push({
        id,
        cronExpression: jobData.cronExpression,
        startDate: jobData.startDate,
        status: jobData.status,
        nextRun: jobData.job.nextInvocation ? jobData.job.nextInvocation() : 'unknown'
      });
    }
    
    return {
      hasActiveJobs: jobs.length > 0,
      jobs
    };
  }

  // ============ Helper Methods ============

  createHistoryEntry(data) {
    return {
      id: data.id || `scan-${Date.now()}`,
      timestamp: data.timestamp || new Date(),
      status: data.status || 'pending',
      triggeredBy: data.triggeredBy || 'manual',
      scope: data.scope || 'all',
      ...data
    };
  }

  calculateSeverityCounts(results) {
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    if (Array.isArray(results)) {
      results.forEach(result => {
        if (result.severity && counts[result.severity] !== undefined) {
          counts[result.severity]++;
        }
      });
    }
    return counts;
  }

  async executeConflictScan(options) {
    // Integrate with your existing ConflictResolution.jsx logic
    // This should call your actual conflict detection logic
    
    // Example implementation - replace with your actual scan logic
    return new Promise((resolve) => {
      // Simulate scan
      setTimeout(() => {
        const mockResults = [
          { id: 1, severity: 'high', description: 'Conflict in file A', path: '/src/fileA.js' },
          { id: 2, severity: 'medium', description: 'Conflict in file B', path: '/src/fileB.js' },
        ];
        resolve(mockResults);
      }, 1000);
    });
  }

  async notifyAdmins(scanResult) {
    // Implement notification logic
    console.log('High severity conflicts found:', scanResult);
    // Send email, Slack, etc.
  }

  // ============ Storage Methods ============
  
  async loadSettings() {
    // Load from localStorage or database
    try {
      const saved = localStorage.getItem('conflictScanSettings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  async saveSettings(settings) {
    localStorage.setItem('conflictScanSettings', JSON.stringify(settings));
  }

  async loadHistory() {
    try {
      const saved = localStorage.getItem('conflictScanHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  async saveHistory(entry) {
    // Update or add entry
    const index = this.scanHistory.findIndex(e => e.id === entry.id);
    if (index >= 0) {
      this.scanHistory[index] = entry;
    } else {
      this.scanHistory.unshift(entry);
    }
    
    // Keep only last 100 entries
    if (this.scanHistory.length > 100) {
      this.scanHistory = this.scanHistory.slice(0, 100);
    }
    
    localStorage.setItem('conflictScanHistory', JSON.stringify(this.scanHistory));
  }
}

// Export singleton instance
export default new ConflictScanManager();
