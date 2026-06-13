/* site.js - small helpers for nav state, loadouts and requests - LOCAL STORAGE ONLY */
(function(){
  function getCurrentUser(){ return localStorage.getItem('vc_currentUser') || null; }
  function setCurrentUser(name){ if(name) localStorage.setItem('vc_currentUser', name); else localStorage.removeItem('vc_currentUser'); }
  function getUsers(){ try{ return JSON.parse(localStorage.getItem('vc_users')||'[]'); }catch(e){return []} }
  function saveUsers(u){ localStorage.setItem('vc_users', JSON.stringify(u)); }
  function getLoadouts(){ try{ return JSON.parse(localStorage.getItem('vc_loadouts')||'[]'); }catch(e){return []} }
  function saveLoadouts(l){ localStorage.setItem('vc_loadouts', JSON.stringify(l)); }
  function getRequests(){ try{ return JSON.parse(localStorage.getItem('vc_requests')||'[]'); }catch(e){return []} }
  function saveRequests(r){ localStorage.setItem('vc_requests', JSON.stringify(r)); }

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
        const users = getUsers();
        const me = users.find(x=>x.playerName===u);
        if(me && me.profilePic){
          navProfile.innerHTML = `<img src="${me.profilePic}" alt="avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.08)">`;
          navProfile.href = 'profile.html';
        } else {
          navProfile.textContent = u; navProfile.href = 'profile.html';
        }
      } else {
        navProfile.textContent = 'Profile'; navProfile.href = 'profile.html';
      }
    }
  }

  // login by email and password
  function login(email, password){
    const users = getUsers();
    const u = users.find(x=>(x.email && x.email.toLowerCase()===email.toLowerCase()) && x.password===password);
    if(u){ setCurrentUser(u.playerName); hideSignupIfNeeded(); return true; }
    return false;
  }

  function logout(){ setCurrentUser(null); hideSignupIfNeeded(); }

  function setProfilePic(playerName, dataUrl){
    const users = getUsers();
    const u = users.find(x=>x.playerName===playerName);
    if(!u) return false;
    u.profilePic = dataUrl;
    saveUsers(users);
    hideSignupIfNeeded();
    return true;
  }

  // create loadout: convert image to data URL and store locally
  async function createLoadout(owner, title, file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = ()=>{
        const img = reader.result;
        const loadouts = getLoadouts();
        const id = Date.now().toString(36)+Math.random().toString(36).slice(2,8);
        const doc = { id, owner, title, image: img, ts: Date.now() };
        loadouts.push(doc); 
        saveLoadouts(loadouts);
        resolve(doc);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener('DOMContentLoaded', hideSignupIfNeeded);

  window.VC = {
    getCurrentUser, setCurrentUser, getUsers, saveUsers,
    getLoadouts, saveLoadouts,
    getRequests, saveRequests,
    login, logout, setProfilePic, createLoadout
  };
})();
