// funciones/frontpage.js
import { inicializarMenu } from './menu.js';
import { renderizarLab, onSimuladorCambio } from './lab.js';
import { renderizarEspeciales } from './especiales.js';
import { renderizarPartidos } from './partidos.js';
import { renderizarAdmin, getAdminConfig } from './admin.js';
import { renderizarPolla } from './polla.js';

export function cargarFrontpage(datosCuenta) {
  const frontpageCard = document.getElementById('frontpageForm');
  if (!frontpageCard) return;
  
  // Detectar si es administrador
  const esAdmin = datosCuenta.usr === 'super' || datosCuenta.name === 'super' || datosCuenta.nombre === 'super';
  
  // Leer configuración de admin
  const adminConfig = getAdminConfig();
  
  onSimuladorCambio((fecha, hora) => console.log('📅 Simulador actualizado:', fecha, hora));
  
  const manejarSeleccionMenu = (opcion, cuenta) => {
    const contenidoContainer = document.getElementById('fp-body-contenido');
    if (!contenidoContainer) return;
    contenidoContainer.style.animation = 'fadeOutContent 0.2s ease-out forwards';
    setTimeout(() => {
      switch(opcion) {
        case 'partidos': if (adminConfig.habilitarPartidos || esAdmin) renderizarPartidos(contenidoContainer, datosCuenta); break;
        case 'especiales': if (adminConfig.habilitarEspeciales || esAdmin) renderizarEspeciales(contenidoContainer, datosCuenta); break;
        case 'tabla': if (adminConfig.habilitarTabla || esAdmin) contenidoContainer.innerHTML = `<div style="text-align:center;color:white;padding:40px;"><h3>📊 Tabla de Posiciones</h3><p>Próximamente...</p></div>`; break;
        case 'la-polla': if (adminConfig.habilitarLaPolla || esAdmin) renderizarPolla(contenidoContainer, datosCuenta); break;
        case 'lab': if (adminConfig.habilitarLab || esAdmin) renderizarLab(contenidoContainer, datosCuenta); break;
        case 'admin': if (esAdmin) renderizarAdmin(contenidoContainer, datosCuenta); break;
        default: contenidoContainer.innerHTML = `<div style="text-align:center;color:rgba(255,255,255,0.5);padding:40px;"><p>Selecciona una opción del menú</p></div>`;
      }
      contenidoContainer.style.animation = 'fadeInContent 0.3s ease-out forwards';
    }, 200);
  };
  
  const idCuenta = datosCuenta.id || '—';
  const nombreCuenta = datosCuenta.name || datosCuenta.nombre || 'Cuenta';
  const puntosCuenta = datosCuenta.ptr || datosCuenta.pun || 0;
  const usrAsociado = datosCuenta.usr || '—';
  const estadoCuenta = datosCuenta.off ? 'Inactiva' : 'Activa';
  
  const paletaColoresFijos = ["#ff9500", "#34c759", "#ff3b30", "#af52de", "#007aff"];
  let hashSuma = 0;
  for (let i = 0; i < nombreCuenta.length; i++) hashSuma += nombreCuenta.charCodeAt(i);
  const colorFinal = paletaColoresFijos[hashSuma % paletaColoresFijos.length];
  const inicial = nombreCuenta.charAt(0).toUpperCase();

  frontpageCard.style.cssText = 'max-width:100%;width:calc(100vw - 32px);height:calc(100dvh - 32px);border-radius:20px;background:rgba(255,255,255,0.12);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.18);display:flex;flex-direction:column;padding:0;overflow:hidden;';
  
  frontpageCard.innerHTML = `
    <style>
      .fp-header-premium { 
        display:flex; 
        align-items:center; 
        justify-content:space-between; 
        padding:14px 24px; 
        background:rgba(0,0,0,0.25); 
        border-bottom:2px solid ${colorFinal}; 
        flex-wrap:wrap; 
        gap:12px; 
      }
      .fp-header-left { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .fp-avatar-emblema { 
        width:40px; 
        height:40px; 
        border-radius:50%; 
        background:${colorFinal}; 
        display:flex; 
        align-items:center; 
        justify-content:center; 
        color:white; 
        font-weight:700; 
        font-size:1.1rem; 
      }
      .fp-nombre-cuenta { font-size:1.1rem; font-weight:700; color:#fff; }
      .fp-id-cuenta { font-size:0.75rem; color:rgba(255,255,255,0.4); margin-left:6px; }
      .fp-linea-dos { font-size:0.85rem; color:${colorFinal}; font-weight:700; }
      .fp-linea-tres { font-size:0.8rem; color:rgba(255,255,255,0.5); }
      .fp-status-badge { color:#34c759; }
      
      .fp-header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .fp-btn-header { 
        padding:8px 16px; 
        background:rgba(255,255,255,0.08); 
        border:1px solid rgba(255,255,255,0.12); 
        border-radius:10px; 
        color:#fff; 
        cursor:pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        font-weight: 500;
      }
      .fp-btn-header:hover { 
        background:rgba(255,255,255,0.15); 
        transform:scale(1.02); 
      }
      .fp-btn-header:active {
        transform: scale(0.98);
      }
      
      .fp-content-body { 
        flex: 1; 
        display: flex; 
        gap: 12px; 
        padding: 12px; 
        overflow: hidden;
        min-height: 0;
      }
      
      @media (min-width: 769px) {
        .fp-body-zone-menu { 
          width: 280px;
          flex-shrink: 0;
          background: rgba(0,0,0,0.15); 
          padding: 20px 14px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: auto; 
        }
        .fp-body-zone-contenido { 
          flex: 1;
          min-width: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: auto;
          overflow-x: hidden;
        }
        .mobile-tab-bar {
          display: none !important;
        }
      }
      
      @media (max-width: 768px) {
        .fp-content-body { 
          flex-direction: column; 
          gap: 8px; 
          padding: 8px; 
        }
        .fp-body-zone-menu { 
          display: none !important;
        }
        .fp-body-zone-contenido { 
          flex: 1;
          min-width: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: auto;
          overflow-x: hidden;
        }
        .mobile-tab-bar {
          display: flex !important;
          justify-content: space-around;
          align-items: center;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(10px);
          padding: 6px 12px;
          margin: 0 12px 8px 12px;
          border-radius: 30px;
          gap: 4px;
          overflow-x: auto;
        }
        .mobile-tab-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 55px;
          gap: 3px;
        }
        .mobile-tab-item.active {
          background: rgba(255, 255, 255, 0.2);
        }
        .mobile-tab-icono { font-size: 20px; }
        .mobile-tab-label { font-size: 9px; font-weight: 600; color: #fff; text-transform: uppercase; letter-spacing: 0.3px; }
      }
      
      .fp-body-zone-contenido > div { 
        width: 100%; 
        height: 100%;
      }
      
      @keyframes fadeOutContent { 
        from { opacity: 1; } 
        to { opacity: 0; transform: scale(0.98); } 
      }
      @keyframes fadeInContent { 
        from { opacity: 0; transform: scale(0.98); } 
        to { opacity: 1; transform: scale(1); } 
      }
    </style>
    
    <header class="fp-header-premium">
      <div class="fp-header-left">
        <div class="fp-avatar-emblema">${inicial}</div>
        <div>
          <div class="fp-nombre-wrapper">
            <span class="fp-nombre-cuenta">${nombreCuenta}</span>
            ${adminConfig.mostrarIdCuenta ? `<span class="fp-id-cuenta">#${idCuenta}</span>` : ''}
          </div>
          <div class="fp-linea-dos">${puntosCuenta} pts</div>
          <div class="fp-linea-tres">
            ${adminConfig.mostrarIdVelneo ? `Usuario: ${usrAsociado} · ` : ''}
            ${adminConfig.mostrarEstado ? `<span class="fp-status-badge">${estadoCuenta}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="fp-header-actions">
        ${esAdmin ? `<button class="fp-btn-header" id="btnAdminFrontpage">🔧 Admin</button>` : ''}
        <button class="fp-btn-header" id="btnRegresarFrontpage">Regresar</button>
      </div>
    </header>
    
    <div class="mobile-tab-bar" id="mobile-tab-bar"></div>
    
    <div class="fp-content-body">
      <nav class="fp-body-zone-menu" id="fp-body-menu"></nav>
      <main class="fp-body-zone-contenido" id="fp-body-contenido">
        <div style="text-align:center;color:rgba(255,255,255,0.5);padding:40px;">
          <p>🏆 Bienvenido a La Polla Mundialista 2026</p>
          <p>Selecciona una opción del menú para comenzar</p>
        </div>
      </main>
    </div>
  `;

  // Construir lista de opciones del menú según configuración (SIN ADMIN)
  const opcionesMenu = [];
  if (adminConfig.habilitarPartidos) opcionesMenu.push({ id: 'partidos', nombre: 'PARTIDOS', color: '#007aff', icono: '⚽' });
  if (adminConfig.habilitarEspeciales) opcionesMenu.push({ id: 'especiales', nombre: 'ESPECIALES', color: '#af52de', icono: '⭐' });
  if (adminConfig.habilitarTabla) opcionesMenu.push({ id: 'tabla', nombre: 'TABLA', color: '#34c759', icono: '📊' });
  if (adminConfig.habilitarLaPolla) opcionesMenu.push({ id: 'la-polla', nombre: 'LA POLLA', color: '#ff9500', icono: '🏆' });
  if (adminConfig.habilitarLab) opcionesMenu.push({ id: 'lab', nombre: 'LAB', color: '#ff3b30', icono: '🔬' });
  
  // Inicializar menú desktop con opciones filtradas (sin ADMIN)
  inicializarMenu(datosCuenta, manejarSeleccionMenu, opcionesMenu);
  
  // Botón Admin (solo en header)
  if (esAdmin) {
    const btnAdmin = document.getElementById('btnAdminFrontpage');
    if (btnAdmin) {
      btnAdmin.onclick = () => {
        manejarSeleccionMenu('admin', datosCuenta);
      };
    }
  }
  
  // Botón Regresar
  document.getElementById('btnRegresarFrontpage').onclick = () => {
    const cuentasCard = document.getElementById('cuentasForm');
    frontpageCard.classList.add('login-retirado');
    setTimeout(() => {
      frontpageCard.classList.remove('login-activo', 'login-retirado');
      frontpageCard.style = '';
      frontpageCard.innerHTML = `<img src="./img/logoMundial.png" class="logo-login-card"><h2 id="fp-titulo-cuenta">Cuenta</h2><div class="title-sub">Detalles de Sincronización</div><table class="tabla-apple"><tbody id="fp-tabla-datos"></tbody>表<button class="btn-regresar" id="btnRegresarFrontpage">Regresar</button>`;
      if (cuentasCard) cuentasCard.classList.add('login-activo');
    }, 400);
  };
  
  // Construir tab bar para móvil con opciones filtradas (SIN ADMIN)
  const mobileTabBar = document.getElementById('mobile-tab-bar');
  if (mobileTabBar) {
    const opcionesMovil = [];
    if (adminConfig.habilitarPartidos) opcionesMovil.push({ id: 'partidos', icono: '⚽', label: 'PART' });
    if (adminConfig.habilitarEspeciales) opcionesMovil.push({ id: 'especiales', icono: '⭐', label: 'ESP' });
    if (adminConfig.habilitarTabla) opcionesMovil.push({ id: 'tabla', icono: '📊', label: 'TAB' });
    if (adminConfig.habilitarLaPolla) opcionesMovil.push({ id: 'la-polla', icono: '🏆', label: 'POL' });
    if (adminConfig.habilitarLab) opcionesMovil.push({ id: 'lab', icono: '🔬', label: 'LAB' });
    
    mobileTabBar.innerHTML = opcionesMovil.map(op => `
      <div class="mobile-tab-item" data-opcion="${op.id}">
        <div class="mobile-tab-icono">${op.icono}</div>
        <div class="mobile-tab-label">${op.label}</div>
      </div>
    `).join('');
    
    document.querySelectorAll('.mobile-tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        const opcion = tab.dataset.opcion;
        document.querySelectorAll('.mobile-tab-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        manejarSeleccionMenu(opcion, datosCuenta);
      });
    });
    
    // Activar especiales por defecto si está habilitado
    if (adminConfig.habilitarEspeciales) {
      const especialesTab = document.querySelector('.mobile-tab-item[data-opcion="especiales"]');
      if (especialesTab) especialesTab.classList.add('active');
    } else if (opcionesMovil.length > 0) {
      const primerTab = document.querySelector('.mobile-tab-item');
      if (primerTab) primerTab.classList.add('active');
    }
  }
  
  // Cargar contenido por defecto
  setTimeout(() => {
    let opcionDefault = 'especiales';
    if (!adminConfig.habilitarEspeciales) {
      if (adminConfig.habilitarPartidos) opcionDefault = 'partidos';
      else if (adminConfig.habilitarTabla) opcionDefault = 'tabla';
      else if (adminConfig.habilitarLaPolla) opcionDefault = 'la-polla';
      else if (adminConfig.habilitarLab) opcionDefault = 'lab';
      else opcionDefault = null;
    }
    if (opcionDefault) {
      manejarSeleccionMenu(opcionDefault, datosCuenta);
    }
  }, 100);
  
  // Escuchar cambios en la configuración
  window.addEventListener('admin-config-changed', (e) => {
    window.location.reload();
  });
}