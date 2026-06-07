// funciones/frontpage.js
// VERSIÓN CON MENÚ SIMPLIFICADO (solo cards visibles: PARTIDOS, ESPECIALES, SIMULADOR)
// MÓVIL: 3 cards rectangulares en FILA HORIZONTAL (una al lado de la otra)
// Las funcionalidades de TABLA, LA POLLA y LAB siguen activas (pueden llamarse por código)

import { inicializarMenu } from './menu.js';
import { renderizarLab, onSimuladorCambio } from './lab.js';
import { renderizarEspeciales } from './especiales.js';
import { renderizarPartidos } from './partidos.js';
import { renderizarAdmin, getAdminConfig } from './admin.js';
import { renderizarPolla } from './polla.js';
import { renderizarSimulador } from './simulador.js';
import { 
  guardarPronosticosPartidosLocal, 
  guardarPronosticosEspecialesLocal,
  guardarJugadorIdLocal,
  limpiarLocalStorage,
  actualizarTimestampSincronizacion
} from './sync.js';

// Configuración de APIs para carga inicial
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// Función para cargar datos iniciales desde API y guardar en localStorage
async function cargarDatosIniciales(jugadorId) {
  console.log('[Sync] Cargando datos iniciales desde API para jugador:', jugadorId);
  
  try {
    // Cargar pronósticos de partidos
    const responsePartidos = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugadorId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res`);
    const dataPartidos = await responsePartidos.json();
    const pronosticosPartidos = {};
    (dataPartidos.fifa_jug_pro || []).forEach(p => {
      pronosticosPartidos[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 };
    });
    guardarPronosticosPartidosLocal(pronosticosPartidos);
    console.log(`[Sync] Guardados ${Object.keys(pronosticosPartidos).length} pronósticos de partidos`);
    
    // Cargar equipos para conversión de IDs a nombres
    const responseEquipos = await fetch(`${BASE}/fifa_equ?api_key=${KEY}`);
    const dataEquipos = await responseEquipos.json();
    const equiposCache = dataEquipos.fifa_equ || [];
    
    // Cargar pronósticos de especiales
    const responseEspeciales = await fetch(`${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugadorId}`);
    const dataEspeciales = await responseEspeciales.json();
    const jugador = dataEspeciales.fifa_jug?.[0];
    if (jugador) {
      const gruposData = {};
      const finalistasData = {
        campeon: null,
        subcampeon: null,
        tercero: null,
        cuarto: null
      };
      
      const gruposLista = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      
      gruposLista.forEach(grupo => {
        const clf1Id = jugador[`grp_${grupo.toLowerCase()}_clf1`];
        const clf2Id = jugador[`grp_${grupo.toLowerCase()}_clf2`];
        
        if (clf1Id && clf1Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf1Id);
          if (equipo) {
            if (!gruposData[grupo]) gruposData[grupo] = {};
            gruposData[grupo][1] = equipo.name;
          }
        }
        if (clf2Id && clf2Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf2Id);
          if (equipo) {
            if (!gruposData[grupo]) gruposData[grupo] = {};
            gruposData[grupo][2] = equipo.name;
          }
        }
      });
      
      if (jugador.cam && jugador.cam !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cam);
        if (equipo) finalistasData.campeon = equipo.name;
      }
      if (jugador.sub && jugador.sub !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.sub);
        if (equipo) finalistasData.subcampeon = equipo.name;
      }
      if (jugador.ter && jugador.ter !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.ter);
        if (equipo) finalistasData.tercero = equipo.name;
      }
      if (jugador.cua && jugador.cua !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cua);
        if (equipo) finalistasData.cuarto = equipo.name;
      }
      
      guardarPronosticosEspecialesLocal({ grupos: gruposData, finalistas: finalistasData });
      console.log('[Sync] Guardados pronósticos de especiales');
    }
    
    guardarJugadorIdLocal(jugadorId);
    actualizarTimestampSincronizacion();
    console.log('[Sync] Sincronización inicial completada');
    
  } catch (error) {
    console.error('[Sync] Error cargando datos iniciales:', error);
  }
}

export function cargarFrontpage(datosCuenta) {
  const frontpageCard = document.getElementById('frontpageForm');
  if (!frontpageCard) return;
  
  const esAdmin = datosCuenta.usr === 'super' || datosCuenta.name === 'super' || datosCuenta.nombre === 'super';
  const jugadorId = datosCuenta.id || datosCuenta.ID;
  if (jugadorId) {
    cargarDatosIniciales(jugadorId);
  }
  
  const adminConfig = getAdminConfig();
  
  onSimuladorCambio((fecha, hora) => console.log('📅 Simulador actualizado:', fecha, hora));
  
  const manejarSeleccionMenu = (opcion, cuenta) => {
    const contenidoContainer = document.getElementById('fp-body-contenido');
    if (!contenidoContainer) return;
    contenidoContainer.style.animation = 'fadeOutContent 0.2s ease-out forwards';
    setTimeout(() => {
      switch(opcion) {
        case 'partidos': renderizarPartidos(contenidoContainer, datosCuenta); break;
        case 'especiales': renderizarEspeciales(contenidoContainer, datosCuenta); break;
        case 'tabla': contenidoContainer.innerHTML = `<div style="text-align:center;color:white;padding:40px;"><h3>📊 Tabla de Posiciones</h3><p>Próximamente...</p></div>`; break;
        case 'la-polla': renderizarPolla(contenidoContainer, datosCuenta); break;
        case 'simulador': renderizarSimulador(contenidoContainer, datosCuenta); break;
        case 'lab': renderizarLab(contenidoContainer, datosCuenta); break;
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

  frontpageCard.style.cssText = 'max-width:100%;width:calc(100vw - 32px);height:calc(100dvh - 32px);border-radius:20px;background:rgba(255,255,255,0.12);backdrop-filter:blur(30px);border:1px solid rgba(255,255,255,0.18);display:flex;flex-direction:column;padding:0;overflow:visible;';
  
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
      
      /* DESKTOP: min-width 769px */
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
          min-height: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: hidden;
          overflow-x: hidden;
        }
        .mobile-tab-bar {
          display: none !important;
        }
      }
      
      /* MÓVIL: max-width 768px - 3 CARDS EN FILA HORIZONTAL */
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
          min-height: 0;
          background: rgba(0,0,0,0.1); 
          padding: 0px; 
          border: 2px solid #fff; 
          border-radius: 20px; 
          overflow-y: hidden;
          overflow-x: hidden;
        }
        
        /* 3 CARDS EN FILA HORIZONTAL */
        .mobile-tab-bar {
          display: flex !important;
          flex-direction: row !important;
          justify-content: center;
          gap: 8px;
          background: transparent;
          padding: 0;
          margin: 0 0 16px 0;
        }
        
        .mobile-tab-item {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 10px 8px;
          flex: 1;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .mobile-tab-item.active {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .mobile-tab-icono {
          font-size: 22px;
        }
        
        .mobile-tab-label {
          font-size: 10px;
          font-weight: 600;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
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

      .esp-dropdown-menu {
        position: absolute;
        z-index: 9999 !important;
        background: white;
        border: 1px solid #e5e5ea;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        min-width: 200px;
      }
      body, html {
        overflow: visible !important;
        height: auto !important;
        min-height: 100% !important;
      }
    </style>
    
    <header class="fp-header-premium">
      <div class="fp-header-left">
        <div class="fp-avatar-emblema">${inicial}</div>
        <div>
          <div class="fp-nombre-wrapper">
            <span class="fp-nombre-cuenta">${nombreCuenta}</span>
            ${adminConfig.mostrarIdCuenta && esAdmin ? `<span class="fp-id-cuenta">#${idCuenta}</span>` : ''}
          </div>
          <div class="fp-linea-dos">${puntosCuenta} pts</div>
          <div class="fp-linea-tres">
            ${adminConfig.mostrarIdVelneo && esAdmin ? `Usuario: ${usrAsociado} · ` : ''}
            ${adminConfig.mostrarEstado && esAdmin ? `<span class="fp-status-badge">${estadoCuenta}</span>` : ''}
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

  // ========== MENÚ DESKTOP - SOLO 3 CARD VISIBLES ==========
  const opcionesMenu = [
    { id: 'partidos', nombre: 'PARTIDOS', color: '#007aff', icono: '⚽' },
    { id: 'especiales', nombre: 'ESPECIALES', color: '#af52de', icono: '⭐' },
    { id: 'simulador', nombre: 'SIMULADOR', color: '#ff3b30', icono: '💻' }
  ];
  
  inicializarMenu(datosCuenta, manejarSeleccionMenu, opcionesMenu);
  
  if (esAdmin) {
    const btnAdmin = document.getElementById('btnAdminFrontpage');
    if (btnAdmin) {
      btnAdmin.onclick = () => {
        manejarSeleccionMenu('admin', datosCuenta);
      };
    }
  }
  
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
  
  // ========== TAB BAR MÓVIL - 3 CARDS EN FILA HORIZONTAL ==========
  const mobileTabBar = document.getElementById('mobile-tab-bar');
  if (mobileTabBar) {
    const opcionesMovil = [
      { id: 'partidos', icono: '⚽', label: 'PARTIDOS' },
      { id: 'especiales', icono: '⭐', label: 'ESPECIALES' },
      { id: 'simulador', icono: '💻', label: 'SIMULADOR' }
    ];
    
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
    
    const primerTab = document.querySelector('.mobile-tab-item');
    if (primerTab) primerTab.classList.add('active');
  }
  
  setTimeout(() => {
    manejarSeleccionMenu('partidos', datosCuenta);
  }, 100);
  
  window.addEventListener('admin-config-changed', (e) => {
    if (esAdmin) {
      window.location.reload();
    }
  });
}