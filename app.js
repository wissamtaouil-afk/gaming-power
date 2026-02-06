// public/app.js
function show(msg){ const el = document.getElementById('messages'); el.textContent = msg; setTimeout(()=>el.textContent='',4000); }

document.getElementById('btnRegister').addEventListener('click', async () => {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!username || !email || !password) { show('Fill all fields'); return; }

  const res = await fetch('/api/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, email, password })
  });
  const j = await res.json();
  if (!res.ok) show(j.error || 'Error');
  else { show('Registered!'); }
});

document.getElementById('btnLogin').addEventListener('click', async () => {
  const emailOrUsername = document.getElementById('loginEmailOrUser').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!emailOrUsername || !password) { show('Fill all fields'); return; }
  const res = await fetch('/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ emailOrUsername, password })
  });
  const j = await res.json();
  if (!res.ok) show(j.error || 'Login failed');
  else { show('Logged in!'); }
});

document.getElementById('btnProfile').addEventListener('click', () => {
  window.location = '/profile.html';
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  const res = await fetch('/api/logout', { method:'POST' });
  if (res.ok) show('Logged out'); else show('Error logging out');
});
