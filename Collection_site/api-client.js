/* api-client.js - connects to local server instead of localStorage */
(function(){
  // Detect server URL (will be set by server-config.js on page load)
  const SERVER_URL = window.SERVER_URL || 'http://localhost:3000';

  function getCurrentUser(){ 
    return sessionStorage.getItem('vc_currentUser') || null; 
  }

  function setCurrentUser(name){ 
    if(name) sessionStorage.setItem('vc_currentUser', name); 
    else sessionStorage.removeItem('vc_currentUser'); 
  }

  async function getUsers(){ 
    try {
      const res = await fetch(`${SERVER_URL}/api/users`);
      return res.ok ? await res.json() : [];
    } catch(e) { 
      console.error('Failed to fetch users:', e); 
      return []; 
    }
  }

  async function getUserByName(playerName){
    try {
      const res = await fetch(`${SERVER_URL}/api/users/${playerName}`);
      return res.ok ? await res.json() : null;
    } catch(e) { 
      console.error('Failed to fetch user:', e); 
      return null; 
    }
  }

  async function createUser(playerName, email, password, fullName, birthDate, location, profilePic){
    try {
      const res = await fetch(`${SERVER_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, email, password, fullName, birthDate, location, profilePic })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Signup failed');
      return data;
    } catch(e) {
      console.error('Signup error:', e);
      throw e;
    }
  }

  async function login(email, password){
    try {
      const res = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Login failed');
      setCurrentUser(data.playerName);
      hideSignupIfNeeded();
      return true;
    } catch(e) {
      console.error('Login error:', e);
      return false;
    }
  }

  function logout(){ 
    setCurrentUser(null); 
    hideSignupIfNeeded(); 
  }

  async function setProfilePic(playerName, dataUrl){
    try {
      const res = await fetch(`${SERVER_URL}/api/users/${playerName}/profilePic`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePic: dataUrl })
      });
      if(res.ok) hideSignupIfNeeded();
      return res.ok;
    } catch(e) {
      console.error('Profile pic update error:', e);
      return false;
    }
  }

  async function getLoadouts(){
    try {
      const res = await fetch(`${SERVER_URL}/api/loadouts`);
      return res.ok ? await res.json() : [];
    } catch(e) {
      console.error('Failed to fetch loadouts:', e);
      return [];
    }
  }

  async function createLoadout(owner, title, file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const img = reader.result;
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          const res = await fetch(`${SERVER_URL}/api/loadouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, owner, title, image: img })
          });
          const data = await res.json();
          
          if(!res.ok) {
            // Check for storage full error
            if(res.status === 507 || (data.error && data.error.includes('full'))) {
              const err = new Error('Storage full (10GB limit reached)');
              err.code = 507;
              err.storage = data.storage;
              reject(err);
            } else {
              throw new Error(data.error || 'Upload failed');
            }
          } else {
            resolve({ id, owner, title, image: img, createdAt: new Date().toISOString() });
          }
        } catch(e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function getRequests(){
    try {
      const res = await fetch(`${SERVER_URL}/api/requests`);
      return res.ok ? await res.json() : [];
    } catch(e) {
      console.error('Failed to fetch requests:', e);
      return [];
    }
  }

  async function createRequest(from, to, loadoutId){
    try {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const res = await fetch(`${SERVER_URL}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, from, to, loadoutId })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Request failed');
      return { id, from, to, loadoutId, status: 'pending', createdAt: new Date().toISOString() };
    } catch(e) {
      console.error('Request creation error:', e);
      throw e;
    }
  }

  async function updateRequestStatus(requestId, status){
    try {
      const res = await fetch(`${SERVER_URL}/api/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return res.ok;
    } catch(e) {
      console.error('Request update error:', e);
      return false;
    }
  }

  function hideSignupIfNeeded(){
    const u = getCurrentUser();
    const navSignup = document.getElementById('nav-signup');
    const navLogin = document.getElementById('nav-login');
    if(navSignup) navSignup.style.display = u ? 'none' : '';
    if(navLogin) navLogin.style.display = u ? 'none' : '';
    const navCreate = document.getElementById('nav-create');
    if(navCreate) navCreate.style.display = u ? '' : 'none';
    const navProfile = document.getElementById('nav-profile');
    if(navProfile){
      if(u){
        getUserByName(u).then(me => {
          if(me && me.profilePic){
            navProfile.innerHTML = `<img src="${me.profilePic}" alt="avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.08)">`;
            navProfile.href = 'profile.html';
          } else {
            navProfile.textContent = u; navProfile.href = 'profile.html';
          }
        });
      } else {
        navProfile.textContent = 'Profile'; navProfile.href = 'profile.html';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', hideSignupIfNeeded);

  window.VC = {
    getCurrentUser, setCurrentUser, getUsers, getUserByName, createUser,
    getLoadouts, createLoadout,
    getRequests, createRequest, updateRequestStatus,
    login, logout, setProfilePic,
    SERVER_URL
  };
})();
