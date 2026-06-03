// funciones/login.js
// Módulo de autenticación - Versión compatible con GitHub

var BASE    = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
var BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
var KEY     = 'SuzvTp4qwXQtAVFJbdzP';
var NOMBRES_USUARIOS = { '1': 'Henry', '3': 'Héctor' };

let callbackFrontpage = null;

// Función hash simple si sha3_256 no está disponible
function generarHashSimple(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

export function configurarLogin(fnCargarFrontpage) {
  const form = document.getElementById('formLogin');
  const btnRegresar = document.getElementById('btnRegresar');
  const chkRecordar = document.getElementById('chkRecordar');
  const inputUsuario = document.getElementById('inputUsuario');

  callbackFrontpage = fnCargarFrontpage;

  const estiloLocalLogin = document.createElement('style');
  estiloLocalLogin.textContent = `
    .logo-login-card { 
      width: 128px !important; 
      height: auto !important; 
      margin-bottom: 20px !important; 
    }
    #loginForm h2 {
      color: #ffffff !important;
      font-weight: 700 !important;
      letter-spacing: -0.5px !important;
    }
  `;
  document.head.appendChild(estiloLocalLogin);

  const tituloLogin = document.querySelector('#loginForm h2');
  if (tituloLogin) {
    tituloLogin.textContent = 'Polla Mundialista 2026';
  }

  if (localStorage.getItem('polla_recordar') === '1') {
    if (inputUsuario) inputUsuario.value = localStorage.getItem('polla_usuario') || '';
    if (chkRecordar) chkRecordar.checked = true;
  }

  if (chkRecordar) {
    chkRecordar.addEventListener('change', () => {
      if (!chkRecordar.checked && inputUsuario) {
        localStorage.removeItem('polla_recordar');
        localStorage.removeItem('polla_usuario');
        inputUsuario.value = '';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      ejecutarAutenticacion();
    });
  }

  if (btnRegresar) {
    btnRegresar.addEventListener('click', () => {
      const loginCard = document.getElementById('loginForm');
      const cuentascCard = document.getElementById('cuentasForm');
      
      const inputPass = document.getElementById('inputPassword');
      if (inputPass) inputPass.value = '';
      const cuentaList = document.getElementById('cuenta-list');
      if (cuentaList) cuentaList.innerHTML = '<div class="loader">⟳ Consultando Velneo...</div>';
      
      if (chkRecordar && !chkRecordar.checked && inputUsuario) {
        inputUsuario.value = '';
      }
      
      if (cuentascCard && loginCard) {
        cuentascCard.classList.add('login-retirado');
        setTimeout(() => {
          cuentascCard.classList.remove('login-activo', 'login-retirado');
          loginCard.classList.add('login-activo');
        }, 400);
      }
    });
  }
}

function ejecutarAutenticacion() {
  const usuario = document.getElementById('inputUsuario').value.trim().toLowerCase();
  const pass = document.getElementById('inputPassword').value.trim();
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('btnIngresar');
  const chkRecordar = document.getElementById('chkRecordar');
  
  if (errEl) errEl.style.display = 'none';
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
  
  // Usar sha3_256 si está disponible, sino usar hash simple
  let hash50;
  if (typeof sha3_256 !== 'undefined') {
    hash50 = sha3_256(pass).substring(0, 50);
  } else {
    // Fallback para cuando no hay sha3_256
    hash50 = generarHashSimple(pass + KEY).substring(0, 50);
    console.warn('⚠️ Usando hash simple (sha3_256 no disponible)');
  }
  
  fetch(BASE_V2 + '/_process/API_VLD_USR?api_key=' + KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ USR_NOM: usuario, HASH: hash50 })
  })
  .then(r => {
    if (!r.ok) throw new Error('Error HTTP: ' + r.status);
    return r.json();
  })
  .then(data => {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
    
    const usrId = data.ID || data.usr || data.USR || data.id || null;
    if (!usrId) {
      if (errEl) {
        errEl.textContent = '⚠️ Usuario o contraseña incorrectos';
        errEl.style.display = 'block';
      }
      return;
    }
    
    if (chkRecordar && chkRecordar.checked) {
      localStorage.setItem('polla_recordar', '1');
      localStorage.setItem('polla_usuario', usuario);
    }
    
    const nombre = NOMBRES_USUARIOS[String(usrId)] || usuario;
    const saludoEl = document.getElementById('cuenta-saludo');
    if (saludoEl) saludoEl.textContent = '¡Hola, ' + nombre + '!';
    
    const loginCard = document.getElementById('loginForm');
    const cuentascCard = document.getElementById('cuentasForm');
    
    if (loginCard && cuentascCard) {
      loginCard.classList.add('login-retirado');
      setTimeout(() => {
        loginCard.classList.remove('login-activo', 'login-retirado');
        cuentascCard.classList.add('login-activo');
        renderizarCardsCuentas(Number(usrId));
      }, 400);
    }
  })
  .catch((error) => {
    console.error('Error de conexión:', error);
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
    if (errEl) {
      errEl.textContent = '⚠️ Error de conexión con Velneo';
      errEl.style.display = 'block';
    }
  });
}

function renderizarCardsCuentas(usrId) {
  const listEl = document.getElementById('cuenta-list');
  const subEl = document.getElementById('cuenta-sub');
  
  fetch(BASE + '/fifa_jug?api_key=' + KEY)
    .then(r => {
      if (!r.ok) throw new Error('Error HTTP: ' + r.status);
      return r.json();
    })
    .then(data => {
      const todos = data.fifa_jug || [];
      const cuentas = todos.filter(j => Number(j.usr) === usrId && j.off !== true);
      const colores = ['#f0a500', '#34c759', '#af52de', '#007aff', '#ff3b30'];
      
      if (!cuentas.length) {
        if (subEl) subEl.textContent = 'No tienes cuentas configuradas.';
        if (listEl) listEl.innerHTML = '<div class="loader">Sin registros</div>';
        return;
      }
      
      if (subEl) subEl.textContent = 'Tienes ' + cuentas.length + ' cuenta' + (cuentas.length > 1 ? 's' : '') + ' asignada(s).';
      if (listEl) {
        listEl.innerHTML = '';
        cuentas.forEach((c, i) => {
          const iniciales = (c.name || 'X').split(' ').map(w => w[0]).join('').toUpperCase().substring(0,2);
          const card = document.createElement('div');
          
          card.className = 'cuenta-item-static';
          card.style.cursor = 'pointer';
          card.style.transition = 'background 0.2s, transform 0.1s';
          
          card.innerHTML = `
            <div class="cuenta-avatar" style="background:${colores[i % colores.length]};color:#fff;">${iniciales}</div>
            <div class="cuenta-info">
              <div class="cuenta-nombre">${escapeHtml(c.name || '—')}</div>
              <div class="cuenta-tag">Cuenta ${i+1} · ID: ${c.id}</div>
            </div>
            <div class="cuenta-pts">${c.ptr || c.pun || 0} pts</div>
          `;
          
          card.onmousedown = () => card.style.transform = 'scale(0.97)';
          card.onmouseup = () => card.style.transform = 'scale(1)';
          
          card.onclick = () => {
            const cuentascCard = document.getElementById('cuentasForm');
            const frontpageCard = document.getElementById('frontpageForm');
            
            if (cuentascCard && frontpageCard) {
              cuentascCard.classList.add('login-retirado');
              setTimeout(() => {
                cuentascCard.classList.remove('login-activo', 'login-retirado');
                frontpageCard.classList.add('login-activo');
                if (typeof callbackFrontpage === 'function') {
                  callbackFrontpage(c);
                }
              }, 400);
            }
          };
          listEl.appendChild(card);
        });
      }
    })
    .catch((error) => {
      console.error('Error cargando cuentas:', error);
      if (subEl) subEl.textContent = 'Error de sincronización.';
      if (listEl) listEl.innerHTML = '<div class="loader" style="color:#ff453a;">⚠️ Error de datos</div>';
    });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}