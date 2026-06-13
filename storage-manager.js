/* storage-manager.js - Monitor and limit storage usage */
const fs = require('fs');
const path = require('path');

// StorageManager supports two modes:
// - file-based: provide a filepath (e.g., sqlite file) to measure size
// - db-based: provide a `pg` Pool instance in options.pool and it will sum image sizes
class StorageManager {
  constructor(dbPathOrOptions, maxGBs = 10) {
    this.maxBytes = maxGBs * 1024 * 1024 * 1024; // Convert GB to bytes
    this.maxGBs = maxGBs;
    // dbPathOrOptions can be a string (file path) or an object { pool }
    if (typeof dbPathOrOptions === 'string') {
      this.dbPath = dbPathOrOptions;
      this.pool = null;
    } else if (dbPathOrOptions && typeof dbPathOrOptions === 'object') {
      this.pool = dbPathOrOptions.pool || null;
      this.dbPath = null;
    } else {
      this.dbPath = null;
      this.pool = null;
    }
  }

  // Get total size in bytes. If pool is available, sum the byte length of stored images.
  async getStorageSize() {
    try {
      if (this.pool) {
        // Sum byte length of `image` column in `loadouts` (works when image is stored as text/base64)
        const res = await this.pool.query("SELECT COALESCE(SUM(octet_length(image::text)),0) AS total FROM loadouts");
        return parseInt(res.rows[0].total, 10) || 0;
      }
      if (this.dbPath && fs.existsSync(this.dbPath)) {
        const stats = fs.statSync(this.dbPath);
        return stats.size;
      }
      return 0;
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
  async getInfo() {
    const used = await this.getStorageSize();
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
  async canAddLoadout(estimatedSizeKB = 50) {
    const estimatedBytes = estimatedSizeKB * 1024;
    const used = await this.getStorageSize();
    return (used + estimatedBytes) < this.maxBytes;
  }

  // Check if enough space for new data (general)
  async canAddData(estimatedBytes) {
    const used = await this.getStorageSize();
    return (used + estimatedBytes) < this.maxBytes;
  }
}

module.exports = StorageManager;
