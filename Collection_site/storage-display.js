/* storage-display.js - Show storage usage on client side */
(function(){
  // Create storage widget HTML
  const widget = document.createElement('div');
  widget.id = 'vcStorageWidget';
  widget.style.cssText = `
    position: fixed;
    bottom: 12px;
    left: 12px;
    background: linear-gradient(135deg, rgba(0,0,0,0.8), rgba(33,33,33,0.8));
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 9998;
    max-width: 280px;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: monospace;
  `;
  widget.innerHTML = `
    <div style="font-weight:bold;margin-bottom:6px">Storage Status</div>
    <div id="vcStorageUsage" style="margin-bottom:4px">Loading...</div>
    <div id="vcStorageBar" style="background:rgba(255,255,255,0.1);height:6px;border-radius:3px;overflow:hidden;margin-bottom:6px">
      <div id="vcStorageProgress" style="background:linear-gradient(90deg,#4CAF50,#FFC107);height:100%;width:0%;transition:width 0.3s"></div>
    </div>
    <div id="vcStorageWarning" style="color:#FFB74D;display:none;font-size:11px">⚠ Nearing limit</div>
  `;
  document.body.appendChild(widget);

  // Fetch and update storage info
  async function updateStorage() {
    try {
      const res = await fetch(`${window.SERVER_URL || 'http://localhost:3000'}/api/storage`);
      if (!res.ok) throw new Error('Failed to fetch storage');
      
      const data = await res.json();
      const { usedFormatted, remainingFormatted, maxFormatted, percentUsed, isFull } = data;
      
      // Update display
      document.getElementById('vcStorageUsage').textContent = 
        `${usedFormatted} / ${maxFormatted} (${percentUsed.toFixed(1)}%)`;
      
      document.getElementById('vcStorageProgress').style.width = Math.min(100, percentUsed) + '%';
      
      // Change color based on usage
      const progress = document.getElementById('vcStorageProgress');
      if (percentUsed > 90) {
        progress.style.background = 'linear-gradient(90deg,#f44336,#ff6f00)';
        document.getElementById('vcStorageWarning').style.display = 'block';
      } else if (percentUsed > 70) {
        progress.style.background = 'linear-gradient(90deg,#FFC107,#FF9800)';
        document.getElementById('vcStorageWarning').style.display = 'block';
      } else {
        progress.style.background = 'linear-gradient(90deg,#4CAF50,#8BC34A)';
        document.getElementById('vcStorageWarning').style.display = 'none';
      }

      // Disable upload if full
      if (isFull) {
        widget.style.border = '1px solid #f44336';
        document.getElementById('vcStorageWarning').textContent = '🚫 Storage Full - No more uploads';
        document.getElementById('vcStorageWarning').style.display = 'block';
        document.getElementById('vcStorageWarning').style.color = '#f44336';
      }
    } catch(err) {
      console.error('Storage update error:', err);
      document.getElementById('vcStorageUsage').textContent = 'Error loading storage';
    }
  }

  // Update on page load
  document.addEventListener('DOMContentLoaded', updateStorage);

  // Update every 5 seconds
  setInterval(updateStorage, 5000);

  // Global function to check storage before upload
  window.VC_canUpload = async function() {
    try {
      const res = await fetch(`${window.SERVER_URL || 'http://localhost:3000'}/api/storage`);
      const data = await res.json();
      return data.canStore === true && !data.isFull;
    } catch(err) {
      console.error('Storage check error:', err);
      return false;
    }
  };

  window.VC_getStorageInfo = async function() {
    try {
      const res = await fetch(`${window.SERVER_URL || 'http://localhost:3000'}/api/storage`);
      return res.ok ? await res.json() : null;
    } catch(err) {
      console.error('Storage info error:', err);
      return null;
    }
  };
})();
