/* server-config.js - Auto-detect server URL */
(function(){
  // Try to detect server URL from current hostname
  // If on localhost:3000, use that
  // Otherwise, try to connect to origin:3000
  const protocol = window.location.protocol; // http: or https:
  const hostname = window.location.hostname; // localhost, 192.168.x.x, etc
  
  let serverUrl = `${protocol}//${hostname}:3000`;
  
  // If already on port 3000, use it
  if(window.location.port === '3000') {
    serverUrl = window.location.origin;
  }
  
  window.SERVER_URL = serverUrl;
  console.log('Server URL detected:', serverUrl);
})();
