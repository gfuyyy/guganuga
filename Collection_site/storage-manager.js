/* storage-manager.js - Monitor and limit storage usage */
const fs = require('fs');
const path = require('path');

class StorageManager {
  constructor(dbPath, maxGBs = 10) {
    this.dbPath = dbPath;
    this.maxBytes = maxGBs * 1024 * 1024 * 1024; // Convert GB to bytes
    this.maxGBs = maxGBs;
  }

  // Get total size in bytes
  getStorageSize() {
    try {
      if (!fs.existsSync(this.dbPath)) return 0;
      const stats = fs.statSync(this.dbPath);
      return stats.size;
    } catch (err) {
      console.error('Error reading storage size:', err);
      return 0;
    }
  }

  // Format bytes to human-readable (KB, MB, GB)
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get storage info
  getInfo() {
    const used = this.getStorageSize();
    const remaining = Math.max(0, this.maxBytes - used);
    const percentUsed = (used / this.maxBytes) * 100;

    return {
      usedBytes: used,
      usedFormatted: this.formatBytes(used),
      remainingBytes: remaining,
      remainingFormatted: this.formatBytes(remaining),
      maxBytes: this.maxBytes,
      maxFormatted: this.formatBytes(this.maxBytes),
      percentUsed: Math.min(100, parseFloat(percentUsed.toFixed(2))),
      isFull: used >= this.maxBytes,
      canStore: remaining > 0
    };
  }

  // Check if enough space for new data (estimate: 50KB per loadout image)
  canAddLoadout(estimatedSizeKB = 50) {
    const estimatedBytes = estimatedSizeKB * 1024;
    const used = this.getStorageSize();
    return (used + estimatedBytes) < this.maxBytes;
  }

  // Check if enough space for new data (general)
  canAddData(estimatedBytes) {
    const used = this.getStorageSize();
    return (used + estimatedBytes) < this.maxBytes;
  }
}

module.exports = StorageManager;
