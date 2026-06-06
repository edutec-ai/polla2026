// funciones/especiales.js
// Módulo de Apuestas Especiales: Clasificados por Grupo + Finalistas del Torneo
// VERSIÓN CON SCROLL CONFINADO A ZONA 3

import { onSimuladorCambio, simGetFechaStr, simGetHoraStr } from './lab.js';
import { getBandera, getNombreVisual } from './banderas.js';
import { 
  cargarPronosticosEspecialesLocal, 
  guardarPronosticosEspecialesLocal,
  getJugadorIdLocal,
  guardarEquiposCacheLocal,
  cargarEquiposCacheLocal,
  guardarGruposEquiposLocal,
  cargarGruposEquiposLocal
} from './sync.js';

// Configuración de APIs
const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// FECHAS CLAVE DEL MUNDIAL 2026
const FECHA_INAUGURAL = '2026-06-11';
const HORA_INAUGURAL_LIMITE = '14:55';
const FECHA_INICIO_16AVOS = '2026-06-28';

// Lista de grupos
const GRUPOS_LISTA = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Estado interno
let GRUPOS_EQUIPOS = {};
let equiposCache = [];

// Estado de selecciones del usuario
export let gruposSeleccion = {};
export let finalistasSeleccion = {
  campeon: null,
  subcampeon: null,
  tercero: null,
  cuarto: null
};

let grupoActivo = 'A';
let tabActivo = 'ciclo1';
let datosGuardados = false;
let openDropdownId = null;
let simuladorSuscrito = false;
let currentJugadorId = null;

// Estado de ventanas
let estadoVentanas = {
  ciclo1Bloqueado: false,
  ciclo2Pulso: 100,
  ciclo2Bloqueado: false,
  fechaActual: null,
  horaActual: null
};

// ─────────────────────────────────────────────────────────────
// 1. FUNCIONES AUXILIARES
// ─────────────────────────────────────────────────────────────

function getEquipoIdPorNombre(nombre) {
  if (!nombre) return null;
  const equipo = equiposCache.find(e => e.name === nombre);
  return equipo ? equipo.id : null;
}

// Cargar equipos desde API o localStorage
async function cargarEquiposDesdeAPI() {
  const equiposLocal = cargarEquiposCacheLocal();
  const gruposLocal = cargarGruposEquiposLocal();
  
  if (equiposLocal && gruposLocal && equiposLocal.length > 0) {
    equiposCache = equiposLocal;
    GRUPOS_EQUIPOS = gruposLocal;
    console.log('[Especiales] Equipos cargados desde localStorage');
    return true;
  }
  
  try {
    const response = await fetch(`${BASE}/fifa_equ?api_key=${KEY}`);
    const data = await response.json();
    equiposCache = data.fifa_equ || [];
    
    const gruposTemp = {};
    GRUPOS_LISTA.forEach(grupo => { gruposTemp[grupo] = []; });
    
    equiposCache.forEach(equipo => {
      const grupo = equipo.grp;
      if (grupo && gruposTemp[grupo]) {
        gruposTemp[grupo].push(equipo.name);
      }
    });
    
    GRUPOS_LISTA.forEach(grupo => { gruposTemp[grupo].sort(); });
    GRUPOS_EQUIPOS = gruposTemp;
    
    guardarEquiposCacheLocal(equiposCache);
    guardarGruposEquiposLocal(GRUPOS_EQUIPOS);
    
    console.log('[Especiales] Equipos cargados desde API');
    return true;
  } catch (error) {
    console.error('[Especiales] Error cargando equipos:', error);
    return false;
  }
}

function actualizarLocalStorage() {
  const dataToSave = {
    grupos: gruposSeleccion,
    finalistas: finalistasSeleccion
  };
  guardarPronosticosEspecialesLocal(dataToSave);
}

async function cargarPronosticosDesdeAPI(jugadorId) {
  if (!jugadorId) return;
  
  const locales = cargarPronosticosEspecialesLocal();
  if (locales.grupos && Object.keys(locales.grupos).length > 0) {
    gruposSeleccion = locales.grupos;
    finalistasSeleccion = locales.finalistas;
    console.log('[Especiales] Pronósticos cargados desde localStorage');
    return;
  }
  
  try {
    if (equiposCache.length === 0) {
      await cargarEquiposDesdeAPI();
    }
    
    const response = await fetch(`${BASE}/fifa_jug?api_key=${KEY}&filter[id]=${jugadorId}`);
    const data = await response.json();
    const jugador = data.fifa_jug?.[0];
    if (jugador) {
      GRUPOS_LISTA.forEach(grupo => {
        const clf1Id = jugador[`grp_${grupo.toLowerCase()}_clf1`];
        const clf2Id = jugador[`grp_${grupo.toLowerCase()}_clf2`];
        
        if (clf1Id && clf1Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf1Id);
          if (equipo) {
            if (!gruposSeleccion[grupo]) gruposSeleccion[grupo] = {};
            gruposSeleccion[grupo][1] = equipo.name;
          }
        }
        if (clf2Id && clf2Id !== 0) {
          const equipo = equiposCache.find(e => e.id === clf2Id);
          if (equipo) {
            if (!gruposSeleccion[grupo]) gruposSeleccion[grupo] = {};
            gruposSeleccion[grupo][2] = equipo.name;
          }
        }
      });
      
      if (jugador.cam && jugador.cam !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cam);
        if (equipo) finalistasSeleccion.campeon = equipo.name;
      }
      if (jugador.sub && jugador.sub !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.sub);
        if (equipo) finalistasSeleccion.subcampeon = equipo.name;
      }
      if (jugador.ter && jugador.ter !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.ter);
        if (equipo) finalistasSeleccion.tercero = equipo.name;
      }
      if (jugador.cua && jugador.cua !== 0) {
        const equipo = equiposCache.find(e => e.id === jugador.cua);
        if (equipo) finalistasSeleccion.cuarto = equipo.name;
      }
      
      actualizarLocalStorage();
      console.log('[Especiales] Pronósticos cargados desde API');
    }
  } catch (error) {
    console.error('[Especiales] Error cargando pronósticos:', error);
  }
}

function getPtsGrupo(grupo) {
  const sel = gruposSeleccion[grupo] || {};
  if (!sel[1] || !sel[2]) return 0;
  
  const equiposGrupo = GRUPOS_EQUIPOS[grupo] || [];
  if (equiposGrupo.length < 2) return 0;
  
  if (sel[1] === equiposGrupo[0] && sel[2] === equiposGrupo[1]) return 60;
  if (sel[1] === equiposGrupo[1] && sel[2] === equiposGrupo[0]) return 30;
  return 0;
}

function getTotalPtsGrupos() {
  let total = 0;
  GRUPOS_LISTA.forEach(g => { total += getPtsGrupo(g); });
  return total;
}

function getPtsFinalistas() {
  let total = 0;
  const multiplicador = estadoVentanas.ciclo2Pulso === 100 ? 1 : 0.5;
  
  if (finalistasSeleccion.campeon) total += 720 * multiplicador;
  if (finalistasSeleccion.subcampeon) total += 360 * multiplicador;
  if (finalistasSeleccion.tercero) total += 180 * multiplicador;
  if (finalistasSeleccion.cuarto) total += 90 * multiplicador;
  return total;
}

function getTotalPts() {
  return getTotalPtsGrupos() + getPtsFinalistas();
}

function cerrarTodosDropdowns() {
  document.querySelectorAll('.esp-dropdown-menu').forEach(menu => {
    menu.classList.remove('open');
  });
  openDropdownId = null;
}

function mostrarToast(msg, tipo) {
  const toast = document.getElementById('app-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast ' + (tipo || '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────────────────────
// 2. LÓGICA DE VENTANAS
// ─────────────────────────────────────────────────────────────

function actualizarEstadoVentanas() {
  const fechaSim = simGetFechaStr();
  const horaSim = simGetHoraStr();
  
  estadoVentanas.fechaActual = fechaSim;
  estadoVentanas.horaActual = horaSim;
  
  let ciclo1Bloqueado = false;
  if (fechaSim > FECHA_INAUGURAL) {
    ciclo1Bloqueado = true;
  } else if (fechaSim === FECHA_INAUGURAL) {
    if (horaSim >= '14:55') ciclo1Bloqueado = true;
  }
  estadoVentanas.ciclo1Bloqueado = ciclo1Bloqueado;
  
  let ciclo2Pulso = 100;
  let ciclo2Bloqueado = false;
  
  if (fechaSim > FECHA_INICIO_16AVOS) {
    ciclo2Bloqueado = true;
  } else if (fechaSim === FECHA_INICIO_16AVOS) {
    if (horaSim >= '14:00') {
      ciclo2Bloqueado = true;
    } else {
      ciclo2Pulso = 50;
    }
  } else if (fechaSim > FECHA_INAUGURAL) {
    ciclo2Pulso = 50;
  } else if (fechaSim === FECHA_INAUGURAL) {
    if (horaSim >= '15:00') ciclo2Pulso = 50;
  }
  
  estadoVentanas.ciclo2Pulso = ciclo2Pulso;
  estadoVentanas.ciclo2Bloqueado = ciclo2Bloqueado;
  
  console.log('[Especiales] Ventanas actualizadas');
}

function getBadgePulsoHTML() {
  const pulso = estadoVentanas.ciclo2Pulso;
  const bloqueado = estadoVentanas.ciclo2Bloqueado;
  
  if (bloqueado) {
    return '<div class="esp-bloqueo-aviso" style="background:#fff2f2; border-color:#ffd0d0; color:#c0392b;">🔒 PRONÓSTICOS CERRADOS · Ya no se puede modificar</div>';
  } else if (pulso === 50) {
    return '<div class="esp-pulso-badge pulso-50" style="background:#fff9ec; border:1px solid #ffd080; color:#c05a00;">🟡 PULSO 50 · Los puntos se reducen a la mitad</div>';
  } else {
    return '<div class="esp-pulso-badge pulso-100" style="background:#eafaf1; border:1px solid #a9dfbf; color:#1e8449;">🟢 PULSO 100 · Puntos completos</div>';
  }
}

// ─────────────────────────────────────────────────────────────
// 3. MODAL DE CONFIRMACION
// ─────────────────────────────────────────────────────────────

function mostrarModalConfirmacion(callback) {
  let gruposHTML = '';
  GRUPOS_LISTA.forEach(grupo => {
    const sel = gruposSeleccion[grupo] || {};
    const primero = sel[1] ? `${getBandera(sel[1])} ${sel[1]}` : '<span style="color:#ff3b30;">❌ Pendiente</span>';
    const segundo = sel[2] ? `${getBandera(sel[2])} ${sel[2]}` : '<span style="color:#ff3b30;">❌ Pendiente</span>';
    gruposHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:0.5px solid #e5e5ea;">
        <span style="font-weight:700; width:40px;">Grupo ${grupo}</span>
        <span style="flex:1;">1°: ${primero}</span>
        <span style="flex:1;">2°: ${segundo}</span>
      </div>
    `;
  });
  
  const finalistasHTML = `
    <div style="display:flex; justify-content:space-between; padding:6px 0;">
      <span style="font-weight:700;">🏆 Campeón:</span>
      <span>${finalistasSeleccion.campeon ? getBandera(finalistasSeleccion.campeon) + ' ' + finalistasSeleccion.campeon : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
    </div>
    <div style="display:flex; justify-content:space-between; padding:6px 0;">
      <span style="font-weight:700;">🥈 Subcampeón:</span>
      <span>${finalistasSeleccion.subcampeon ? getBandera(finalistasSeleccion.subcampeon) + ' ' + finalistasSeleccion.subcampeon : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
    </div>
    <div style="display:flex; justify-content:space-between; padding:6px 0;">
      <span style="font-weight:700;">🥉 Tercero:</span>
      <span>${finalistasSeleccion.tercero ? getBandera(finalistasSeleccion.tercero) + ' ' + finalistasSeleccion.tercero : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
    </div>
    <div style="display:flex; justify-content:space-between; padding:6px 0;">
      <span style="font-weight:700;">4° Cuarto:</span>
      <span>${finalistasSeleccion.cuarto ? getBandera(finalistasSeleccion.cuarto) + ' ' + finalistasSeleccion.cuarto : '<span style="color:#ff3b30;">❌ Pendiente</span>'}</span>
    </div>
  `;
  
  const pulsoTexto = estadoVentanas.ciclo2Pulso === 100 ? '🟢 PULSO 100% (puntos completos)' : '🟡 PULSO 50% (puntos reducidos a la mitad)';
  
  const modal = document.createElement('div');
  modal.id = 'esp-modal-confirmacion';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 24px; max-width: 550px; width: 90%; max-height: 85%; overflow: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #007aff; padding-bottom: 12px;">
          <h3 style="margin: 0; color: #1c1c1e;">📋 Confirmar Guardado</h3>
          <button id="esp-modal-cerrar" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #8e8e93;">✕</button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #007aff;">🏆 Clasificados por Grupo</h4>
          <div style="background: #f9f9fb; border-radius: 12px; padding: 10px; max-height: 300px; overflow-y: auto;">
            ${gruposHTML}
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #007aff;">⭐ Finalistas</h4>
          <div style="background: #f9f9fb; border-radius: 12px; padding: 10px;">
            ${finalistasHTML}
          </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 12px; background: #f0f0f5; border-radius: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 700;">📊 Puntos estimados:</span>
            <span style="color: #ff9500; font-weight: 800;">${getTotalPts()} pts</span>
          </div>
          <div style="font-size: 11px; color: #8e8e93; margin-top: 5px;">
            ${pulsoTexto}
          </div>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <button id="esp-modal-confirmar" style="flex:1; background: #34c759; color: white; border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer;">✅ Confirmar y Guardar</button>
          <button id="esp-modal-cancelar" style="flex:1; background: #f2f2f7; color: #8e8e93; border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 600; cursor: pointer;">✕ Cancelar</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const cerrar = () => modal.remove();
  
  document.getElementById('esp-modal-cerrar')?.addEventListener('click', cerrar);
  document.getElementById('esp-modal-cancelar')?.addEventListener('click', cerrar);
  document.getElementById('esp-modal-confirmar')?.addEventListener('click', () => {
    cerrar();
    if (callback) callback();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
}

// ─────────────────────────────────────────────────────────────
// 4. VALIDACIONES
// ─────────────────────────────────────────────────────────────

function validarSeleccionGrupo(grupo, pos, valor) {
  if (estadoVentanas.ciclo1Bloqueado) {
    mostrarToast('🔒 Ciclo 1 bloqueado. Los pronósticos de grupos están congelados.', 'err');
    return false;
  }
  
  const sel = gruposSeleccion[grupo] || {};
  const otraPos = pos === 1 ? 2 : 1;
  if (sel[otraPos] === valor) {
    mostrarToast(`⚠️ No puedes seleccionar el mismo equipo como 1° y 2° clasificado en el Grupo ${grupo}`, 'err');
    return false;
  }
  return true;
}

function validarSeleccionFinalista(key, valor) {
  if (estadoVentanas.ciclo2Bloqueado) {
    mostrarToast('🔒 Ciclo 2 bloqueado. Los pronósticos de finalistas están congelados.', 'err');
    return false;
  }
  
  for (const [k, v] of Object.entries(finalistasSeleccion)) {
    if (k !== key && v === valor) {
      const nombres = { campeon: 'Campeón', subcampeon: 'Subcampeón', tercero: 'Tercer puesto', cuarto: 'Cuarto puesto' };
      mostrarToast(`⚠️ ${valor} ya fue seleccionado como ${nombres[k]}`, 'err');
      return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// 5. RENDERIZADO DE SELECCIONADORES
// ─────────────────────────────────────────────────────────────

function renderGrupoSelector(grupo) {
  const sel = gruposSeleccion[grupo] || {};
  const equipos = GRUPOS_EQUIPOS[grupo] || [];
  const bloqueado = estadoVentanas.ciclo1Bloqueado;
  
  if (equipos.length === 0) {
    return `<div class="esp-grupo-panel">Cargando equipos del grupo ${grupo}...</div>`;
  }
  
  return `
    <div class="esp-grupo-panel" data-grupo="${grupo}">
      <div class="esp-grupo-header">
        <span class="esp-grupo-titulo">📋 Grupo ${grupo}</span>
      </div>
      
      ${bloqueado ? `<div class="esp-bloqueo-aviso">🔒 PRONÓSTICOS CONGELADOS · Ya no se puede modificar</div>` : ''}
      
      <div class="esp-equipos-lista">
        ${equipos.map(eq => `
          <div class="esp-equipo-item">
            <div class="esp-bandera">${getBandera(eq)}</div>
            <div class="esp-nombre">${getNombreVisual(eq)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="esp-posicion-row">
        <div class="esp-posicion-label">1°</div>
        <div class="esp-selector" data-grupo="${grupo}" data-pos="1">
          <button class="esp-selector-btn ${sel[1] ? 'has-value' : ''}" id="esp-btn-${grupo}-1" ${bloqueado ? 'disabled' : ''}>
            <span class="esp-selector-value" id="esp-val-${grupo}-1">${sel[1] ? getBandera(sel[1]) + ' ' + getNombreVisual(sel[1]) : '<span style="color:#8e8e93;">Seleccionar 1° clasificado...</span>'}</span>
            ${!bloqueado ? '<span class="esp-selector-arrow">▼</span>' : ''}
          </button>
          ${!bloqueado ? `<div class="esp-dropdown-menu" id="esp-drop-${grupo}-1">
            ${equipos.map(eq => `<div class="esp-dropdown-item ${sel[1] === eq ? 'selected' : ''}" data-value="${eq}" data-grupo="${grupo}" data-pos="1">${getBandera(eq)} ${getNombreVisual(eq)}</div>`).join('')}
          </div>` : ''}
        </div>
      </div>
      
      <div class="esp-posicion-row">
        <div class="esp-posicion-label">2°</div>
        <div class="esp-selector" data-grupo="${grupo}" data-pos="2">
          <button class="esp-selector-btn ${sel[2] ? 'has-value' : ''}" id="esp-btn-${grupo}-2" ${bloqueado ? 'disabled' : ''}>
            <span class="esp-selector-value" id="esp-val-${grupo}-2">${sel[2] ? getBandera(sel[2]) + ' ' + getNombreVisual(sel[2]) : '<span style="color:#8e8e93;">Seleccionar 2° clasificado...</span>'}</span>
            ${!bloqueado ? '<span class="esp-selector-arrow">▼</span>' : ''}
          </button>
          ${!bloqueado ? `<div class="esp-dropdown-menu" id="esp-drop-${grupo}-2">
            ${equipos.map(eq => `<div class="esp-dropdown-item ${sel[2] === eq ? 'selected' : ''}" data-value="${eq}" data-grupo="${grupo}" data-pos="2">${getBandera(eq)} ${getNombreVisual(eq)}</div>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderFinalistaSelector(titulo, key, pts, icon) {
  const valor = finalistasSeleccion[key];
  const equipos = equiposCache.filter(e => e.name !== 'Playoff UEFA').map(e => e.name);
  const bloqueado = estadoVentanas.ciclo2Bloqueado;
  
  return `
    <div class="esp-finalista-card">
      <div class="esp-finalista-header">
        <span class="esp-finalista-titulo">${icon} ${titulo}</span>
        <span class="esp-finalista-pts">${pts} pts</span>
      </div>
      
      <div class="esp-selector" data-finalista="${key}">
        <button class="esp-selector-btn ${valor ? 'has-value' : ''}" id="esp-btn-final-${key}" ${bloqueado ? 'disabled' : ''}>
          <span class="esp-selector-value" id="esp-val-final-${key}">
            ${valor ? getBandera(valor) + ' ' + getNombreVisual(valor) : '<span style="color:#8e8e93;">Seleccionar equipo...</span>'}
          </span>
          ${!bloqueado ? '<span class="esp-selector-arrow">▼</span>' : ''}
        </button>
        ${!bloqueado ? `<div class="esp-dropdown-menu" id="esp-drop-final-${key}">
          ${equipos.map(eq => {
            const isUsed = Object.entries(finalistasSeleccion).some(([k, v]) => k !== key && v === eq);
            const isCurrent = valor === eq;
            return `<div class="esp-dropdown-item ${isCurrent ? 'selected' : ''} ${isUsed ? 'used' : ''}" data-value="${eq}" data-finalista="${key}" style="${isUsed && !isCurrent ? 'opacity:0.5;cursor:not-allowed;' : ''}">${getBandera(eq)} ${getNombreVisual(eq)} ${isUsed && !isCurrent ? '⚠️ ya seleccionado' : ''}</div>`;
          }).join('')}
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderResumenGuardado() {
  const gruposCompletados = Object.keys(gruposSeleccion).filter(g => {
    const sel = gruposSeleccion[g];
    return sel && sel[1] && sel[2];
  }).length;
  
  const finalistasCompletados = Object.values(finalistasSeleccion).filter(v => v !== null).length;
  const pulsoFinalistas = estadoVentanas.ciclo2Pulso === 100 ? '100%' : '50%';
  const badgePulso = estadoVentanas.ciclo2Pulso === 100 ? '🟢' : '🟡';
  
  return `
    <div style="text-align: center; padding: 20px;">
      <h3 style="color: #1c1c1e; margin-bottom: 8px; font-size: 16px; font-weight: 700;">Guardar Especiales</h3>
      <p style="color: #8e8e93; margin-bottom: 24px; font-size: 13px;">Revisa tus selecciones antes de guardar</p>
      
      <div style="background: #f2f2f7; border-radius: 16px; padding: 16px; margin-bottom: 20px; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 600; color: #1c1c1e;">📋 Grupos clasificados:</span>
          <span id="esp-resumen-grupos" style="color: #007aff; font-weight: 700;">${gruposCompletados} / 12</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 600; color: #1c1c1e;">🏆 Finalistas seleccionados:</span>
          <span id="esp-resumen-finalistas" style="color: #007aff; font-weight: 700;">${finalistasCompletados} / 4</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-weight: 600; color: #1c1c1e;">⚡ PULSO Finalistas:</span>
          <span style="color: ${estadoVentanas.ciclo2Pulso === 100 ? '#34c759' : '#ff9500'}; font-weight: 700;">${badgePulso} ${pulsoFinalistas}</span>
        </div>
      </div>
      
      <button id="esp-btn-guardar-final" class="esp-btn-guardar" ${estadoVentanas.ciclo1Bloqueado && estadoVentanas.ciclo2Bloqueado ? 'disabled' : ''}>
        Confirmar y Guardar Especiales
      </button>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// 6. MANEJADORES DE EVENTOS
// ─────────────────────────────────────────────────────────────

function cambiarTab(tabId) {
  tabActivo = tabId;
  
  document.querySelectorAll('.esp-tab').forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Actualizar el contenido de Zona 3 según el tab activo
  const zona3Content = document.getElementById('esp-zona3-contenido');
  if (!zona3Content) return;
  
  if (tabId === 'ciclo1') {
    zona3Content.innerHTML = `
      <div>
        <div class="esp-seccion-titulo"><span>📋</span> Selecciona un grupo</div>
        <div class="esp-grupos-tabs" id="esp-grupos-tabs">
          ${GRUPOS_LISTA.map(g => `<button class="esp-grupo-tab ${grupoActivo === g ? 'active' : ''}" data-grupo="${g}">${g}</button>`).join('')}
        </div>
        <div id="esp-grupo-panel">${GRUPOS_EQUIPOS[grupoActivo] ? renderGrupoSelector(grupoActivo) : '<div class="esp-grupo-panel">Cargando...</div>'}</div>
      </div>
    `;
    // Re-asignar eventos de grupos
    document.querySelectorAll('.esp-grupo-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.esp-grupo-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        grupoActivo = tab.dataset.grupo;
        const panel = document.getElementById('esp-grupo-panel');
        if (panel && GRUPOS_EQUIPOS[grupoActivo]) {
          panel.innerHTML = renderGrupoSelector(grupoActivo);
          setupEventListeners();
        }
      };
    });
  } else if (tabId === 'ciclo2') {
    zona3Content.innerHTML = `
      <div id="esp-finalistas-container">
        ${renderFinalistaSelector('🥇 Campeón', 'campeon', '720', '🏆')}
        ${renderFinalistaSelector('🥈 Subcampeón', 'subcampeon', '360', '🥈')}
        ${renderFinalistaSelector('🥉 Tercer puesto', 'tercero', '180', '🥉')}
        ${renderFinalistaSelector('4° Cuarto puesto', 'cuarto', '90', '4️⃣')}
      </div>
    `;
  } else if (tabId === 'guardar') {
    zona3Content.innerHTML = renderResumenGuardado();
  }
  
  const badgeExplicativo = document.getElementById('esp-badge-explicativo');
  const badgePulso = document.getElementById('esp-badge-pulso');
  
  if (badgeExplicativo) {
    if (tabId === 'ciclo1') {
      badgeExplicativo.innerHTML = '<strong style="display:block; margin-bottom:8px; font-size:16px; color:#8B0000;">LOS DOS MEJORES DE CADA GRUPO</strong>💡 Pronostique cuáles serán los mejores equipos de cada grupo. Si acierta en el orden: <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">60 pts</span> · En desorden: <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">30 pts</span>';
      badgeExplicativo.style.display = 'block';
      if (badgePulso) badgePulso.style.display = 'none';
    } else if (tabId === 'ciclo2') {
      badgeExplicativo.innerHTML = '<strong style="display:block; margin-bottom:8px; font-size:16px; color:#8B0000;">LOS CUATRO FINALISTAS</strong>💡 Pronostique los finalistas del torneo. Puntos según posición: Campeón <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">720 pts</span> · Subcampeón <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">360 pts</span> · Tercero <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">180 pts</span> · Cuarto <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">90 pts</span>';
      badgeExplicativo.style.display = 'block';
      if (badgePulso) {
        badgePulso.innerHTML = getBadgePulsoHTML();
        badgePulso.style.display = 'block';
      }
    } else if (tabId === 'guardar') {
      badgeExplicativo.style.display = 'none';
      if (badgePulso) badgePulso.style.display = 'none';
    }
  }
  
  setupEventListeners();
  actualizarPuntuacion();
}

function actualizarPuntuacion() {
  const gruposCompletados = Object.keys(gruposSeleccion).filter(g => {
    const sel = gruposSeleccion[g];
    return sel && sel[1] && sel[2];
  }).length;
  
  const finalistasCompletados = Object.values(finalistasSeleccion).filter(v => v !== null).length;
  
  const gruposSpan = document.getElementById('esp-resumen-grupos');
  const finalistasSpan = document.getElementById('esp-resumen-finalistas');
  
  if (gruposSpan) gruposSpan.textContent = gruposCompletados + ' / 12';
  if (finalistasSpan) finalistasSpan.textContent = finalistasCompletados + ' / 4';
}

function seleccionarEquipoGrupo(grupo, pos, valor) {
  if (estadoVentanas.ciclo1Bloqueado) {
    mostrarToast('🔒 Ciclo 1 bloqueado. Los pronósticos de grupos están congelados.', 'err');
    return;
  }
  
  if (!validarSeleccionGrupo(grupo, pos, valor)) return;
  
  if (!gruposSeleccion[grupo]) gruposSeleccion[grupo] = {};
  gruposSeleccion[grupo][pos] = valor;
  
  const valSpan = document.getElementById(`esp-val-${grupo}-${pos}`);
  const btnEl = document.getElementById(`esp-btn-${grupo}-${pos}`);
  if (valSpan) valSpan.innerHTML = getBandera(valor) + ' ' + getNombreVisual(valor);
  if (btnEl) btnEl.classList.add('has-value');
  
  actualizarPuntuacion();
  actualizarLocalStorage();
}

function seleccionarFinalista(key, valor) {
  if (estadoVentanas.ciclo2Bloqueado) {
    mostrarToast('🔒 Ciclo 2 bloqueado. Los pronósticos de finalistas están congelados.', 'err');
    return;
  }
  
  if (!validarSeleccionFinalista(key, valor)) return;
  
  finalistasSeleccion[key] = valor;
  
  const valSpan = document.getElementById(`esp-val-final-${key}`);
  const btnEl = document.getElementById(`esp-btn-final-${key}`);
  if (valSpan) valSpan.innerHTML = getBandera(valor) + ' ' + getNombreVisual(valor);
  if (btnEl) btnEl.classList.add('has-value');
  
  actualizarPuntuacion();
  actualizarLocalStorage();
  
  // Recargar solo la Zona 3 si estamos en ciclo2
  if (tabActivo === 'ciclo2') {
    const zona3Content = document.getElementById('esp-zona3-contenido');
    if (zona3Content) {
      zona3Content.innerHTML = `
        <div id="esp-finalistas-container">
          ${renderFinalistaSelector('🥇 Campeón', 'campeon', '720', '🏆')}
          ${renderFinalistaSelector('🥈 Subcampeón', 'subcampeon', '360', '🥈')}
          ${renderFinalistaSelector('🥉 Tercer puesto', 'tercero', '180', '🥉')}
          ${renderFinalistaSelector('4° Cuarto puesto', 'cuarto', '90', '4️⃣')}
        </div>
      `;
      setupEventListeners();
    }
  }
}

function refrescarEspecialesPorFecha() {
  console.log('[Especiales] Refrescando por fecha...');
  actualizarEstadoVentanas();
  
  if (tabActivo === 'ciclo1') {
    const panel = document.getElementById('esp-grupo-panel');
    if (panel && GRUPOS_EQUIPOS[grupoActivo]) {
      panel.innerHTML = renderGrupoSelector(grupoActivo);
    }
  } else if (tabActivo === 'ciclo2') {
    const zona3Content = document.getElementById('esp-zona3-contenido');
    if (zona3Content) {
      zona3Content.innerHTML = `
        <div id="esp-finalistas-container">
          ${renderFinalistaSelector('🥇 Campeón', 'campeon', '720', '🏆')}
          ${renderFinalistaSelector('🥈 Subcampeón', 'subcampeon', '360', '🥈')}
          ${renderFinalistaSelector('🥉 Tercer puesto', 'tercero', '180', '🥉')}
          ${renderFinalistaSelector('4° Cuarto puesto', 'cuarto', '90', '4️⃣')}
        </div>
      `;
    }
  } else if (tabActivo === 'guardar') {
    const zona3Content = document.getElementById('esp-zona3-contenido');
    if (zona3Content) {
      zona3Content.innerHTML = renderResumenGuardado();
    }
  }
  
  const badgePulso = document.getElementById('esp-badge-pulso');
  if (badgePulso && tabActivo === 'ciclo2') {
    badgePulso.innerHTML = getBadgePulsoHTML();
  }
  
  setupEventListeners();
  actualizarPuntuacion();
}

function setupEventListeners() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.esp-selector')) {
      cerrarTodosDropdowns();
    }
  });
  
  document.querySelectorAll('.esp-selector[data-grupo]').forEach(selector => {
    const btn = selector.querySelector('.esp-selector-btn');
    const dropdown = selector.querySelector('.esp-dropdown-menu');
    const grupo = selector.dataset.grupo;
    const pos = parseInt(selector.dataset.pos);
    
    if (btn && dropdown && !estadoVentanas.ciclo1Bloqueado) {
      btn.onclick = (e) => {
        e.stopPropagation();
        cerrarTodosDropdowns();
        dropdown.classList.add('open');
      };
      
      dropdown.querySelectorAll('.esp-dropdown-item').forEach(item => {
        item.onclick = (e) => {
          e.stopPropagation();
          const valor = item.dataset.value;
          seleccionarEquipoGrupo(grupo, pos, valor);
          cerrarTodosDropdowns();
        };
      });
    }
  });
  
  document.querySelectorAll('.esp-selector[data-finalista]').forEach(selector => {
    const btn = selector.querySelector('.esp-selector-btn');
    const dropdown = selector.querySelector('.esp-dropdown-menu');
    const finalistaKey = selector.dataset.finalista;
    
    if (btn && dropdown && !estadoVentanas.ciclo2Bloqueado) {
      btn.onclick = (e) => {
        e.stopPropagation();
        cerrarTodosDropdowns();
        dropdown.classList.add('open');
      };
      
      dropdown.querySelectorAll('.esp-dropdown-item').forEach(item => {
        if (item.dataset.used === 'true' && !item.classList.contains('selected')) return;
        
        item.onclick = (e) => {
          e.stopPropagation();
          const valor = item.dataset.value;
          seleccionarFinalista(finalistaKey, valor);
          cerrarTodosDropdowns();
        };
      });
    }
  });
  
  const guardarBtn = document.getElementById('esp-btn-guardar-final');
  if (guardarBtn && !(estadoVentanas.ciclo1Bloqueado && estadoVentanas.ciclo2Bloqueado)) {
    guardarBtn.onclick = () => {
      mostrarModalConfirmacion(() => guardarEspeciales());
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 7. GUARDAR EN API
// ─────────────────────────────────────────────────────────────

async function guardarEspeciales() {
  const guardarBtn = document.getElementById('esp-btn-guardar-final');
  const originalText = guardarBtn?.textContent || 'Guardar';
  
  if (!currentJugadorId) {
    mostrarToast('❌ Error: No se ha identificado el jugador', 'err');
    return;
  }
  
  if (guardarBtn) {
    guardarBtn.textContent = '⟳ Enviando a Velneo...';
    guardarBtn.disabled = true;
  }
  
  const payload = {
    id: currentJugadorId
  };
  
  const gruposOrden = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  gruposOrden.forEach(grupo => {
    const sel = gruposSeleccion[grupo] || {};
    const clf1 = sel[1] ? getEquipoIdPorNombre(sel[1]) : 0;
    const clf2 = sel[2] ? getEquipoIdPorNombre(sel[2]) : 0;
    payload[`grp_${grupo.toLowerCase()}_clf1`] = clf1;
    payload[`grp_${grupo.toLowerCase()}_clf2`] = clf2;
  });
  
  payload.cam = finalistasSeleccion.campeon ? getEquipoIdPorNombre(finalistasSeleccion.campeon) : 0;
  payload.sub = finalistasSeleccion.subcampeon ? getEquipoIdPorNombre(finalistasSeleccion.subcampeon) : 0;
  payload.ter = finalistasSeleccion.tercero ? getEquipoIdPorNombre(finalistasSeleccion.tercero) : 0;
  payload.cua = finalistasSeleccion.cuarto ? getEquipoIdPorNombre(finalistasSeleccion.cuarto) : 0;
  
  console.log('[Especiales] Enviando payload a API_PUT_JUG:', payload);
  
  try {
    const response = await fetch(`${BASE_V2}/_process/API_PUT_JUG?api_key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const respuesta = await response.json();
    console.log('[Especiales] Respuesta del servidor:', respuesta);
    
    datosGuardados = true;
    actualizarLocalStorage();
    
    if (guardarBtn) {
      guardarBtn.textContent = '✓ Guardado en Velneo!';
      setTimeout(() => {
        guardarBtn.textContent = originalText;
        guardarBtn.disabled = false;
      }, 2000);
    }
    
    mostrarToast(`✅ Especiales guardados correctamente (PULSO ${estadoVentanas.ciclo2Pulso}%)`, 'ok');
    
  } catch (error) {
    console.error('[Especiales] Error al guardar:', error);
    
    if (guardarBtn) {
      guardarBtn.textContent = '❌ Error al guardar';
      setTimeout(() => {
        guardarBtn.textContent = originalText;
        guardarBtn.disabled = false;
      }, 2000);
    }
    
    mostrarToast(`❌ Error al guardar: ${error.message}`, 'err');
  }
}

// ─────────────────────────────────────────────────────────────
// 8. RENDERIZADO PRINCIPAL CON SCROLL CONFINADO A ZONA 3
// ─────────────────────────────────────────────────────────────

export async function renderizarEspeciales(contenedor, datosCuenta) {
  if (!contenedor) return;
  
  console.log('[Especiales] Renderizando con scroll confinado a Zona 3...');
  
  currentJugadorId = datosCuenta?.id || datosCuenta?.ID || null;
  
  if (equiposCache.length === 0) {
    const cargado = await cargarEquiposDesdeAPI();
    if (!cargado) {
      contenedor.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">Error cargando equipos. Intente nuevamente.</div>`;
      return;
    }
  }
  
  await cargarPronosticosDesdeAPI(currentJugadorId);
  actualizarEstadoVentanas();
  
  if (!simuladorSuscrito && typeof onSimuladorCambio === 'function') {
    simuladorSuscrito = true;
    onSimuladorCambio(() => {
      console.log('[Especiales] Recibido cambio del simulador');
      refrescarEspecialesPorFecha();
    });
  }
  
  // ESTRUCTURA NUEVA: Zona 1 (tabs), Zona 2 (badges), Zona 3 (contenido con scroll)
  contenedor.innerHTML = `
    <div style="width:100%; height:100%; background: #ffffff; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;">
      <style>
        .esp-tabs-container { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #e5e5ea; padding-bottom: 8px; flex-shrink: 0; }
        .esp-tab { flex: 1; padding: 12px 8px; background: none; border: 1px solid #d1d1d6; border-radius: 12px; font-size: 13px; font-weight: 600; color: #8e8e93; cursor: pointer; transition: all 0.2s; text-align: center; white-space: normal; }
        .esp-tab.active { background: #007aff; border-color: #007aff; color: #fff; font-size: 15px; font-weight: 700; }
        .esp-tab[data-tab="guardar"] { background: #34c759; border-color: #34c759; color: #fff; font-size: 13px; }
        .esp-tab[data-tab="guardar"].active { font-size: 15px; }
        @media (max-width: 600px) { .esp-tab { padding: 8px 4px; font-size: 11px; } .esp-tab.active { font-size: 13px; } }
        
        .esp-badge-explicativo { background: #f2f2f7; border-radius: 16px; padding: 12px 16px; margin-bottom: 12px; font-size: 13px; font-weight: 500; color: #3c3c43; text-align: center; line-height: 1.4; flex-shrink: 0; }
        .esp-pulso-badge { border-radius: 20px; padding: 6px 12px; margin-bottom: 20px; font-size: 11px; font-weight: 600; text-align: center; }
        .esp-pulso-badge.pulso-100 { background: #eafaf1; border: 1px solid #a9dfbf; color: #1e8449; }
        .esp-pulso-badge.pulso-50 { background: #fff9ec; border: 1px solid #ffd080; color: #c05a00; }
        .esp-bloqueo-aviso { background: #fff2f2; border: 1px solid #ffd0d0; border-radius: 12px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; font-weight: 600; color: #c0392b; text-align: center; }
        
        .esp-seccion-titulo { font-size: 16px; font-weight: 700; color: #1c1c1e; margin: 20px 0 12px; display: flex; align-items: center; gap: 10px; }
        .esp-grupos-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; max-width: 300px; justify-content: center; margin-left: auto; margin-right: auto; }
        .esp-grupo-tab { width: 38px; height: 38px; border-radius: 19px; background: #f2f2f7; border: 1px solid #e5e5ea; color: #3c3c43; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .esp-grupo-tab.active { background: #007aff; border-color: #007aff; color: #fff; }
        .esp-grupo-panel { background: #f9f9fb; border: 1px solid #e5e5ea; border-radius: 16px; padding: 16px; margin-bottom: 20px; }
        .esp-grupo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5ea; }
        .esp-grupo-titulo { font-size: 16px; font-weight: 700; color: #1c1c1e; }
        .esp-equipos-lista { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; margin-bottom: 20px; }
        .esp-equipo-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .esp-equipo-item .esp-bandera { font-size: 40px; }
        .esp-equipo-item .esp-nombre { font-size: 12px; font-weight: 500; color: #1c1c1e; text-align: center; max-width: 70px; word-break: break-word; white-space: normal; line-height: 1.3; }
        .esp-posicion-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; width: 100%; overflow: hidden; }
        .esp-posicion-label { width: 32px; font-size: 14px; font-weight: 700; color: #8e8e93; }
        .esp-selector { flex: 1; position: relative; min-width: 0; max-width: 100%; }
        .esp-selector-btn { width: 100%; max-width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #ffffff; border: 1.5px solid #e5e5ea; border-radius: 12px; font-size: 14px; font-weight: 500; color: #1c1c1e; cursor: pointer; transition: all 0.2s; box-sizing: border-box; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .esp-selector-btn:disabled { background: #f2f2f7; cursor: not-allowed; opacity: 0.7; }
        .esp-selector-btn.has-value { border-color: #34c759; background: #eafaf1; }
        .esp-selector-value { text-align: left; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
        .esp-selector-arrow { font-size: 10px; color: #8e8e93; transition: transform 0.2s; flex-shrink: 0; }
        .esp-dropdown-menu { position: absolute; top: 100%; left: 0; right: 0; background: #ffffff; border: 1px solid #e5e5ea; border-radius: 12px; margin-top: 4px; z-index: 100; display: none; max-height: 200px; overflow-y: auto; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .esp-dropdown-menu.open { display: block; }
        .esp-dropdown-item { padding: 10px 14px; font-size: 13px; color: #1c1c1e; cursor: pointer; transition: background 0.2s; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .esp-dropdown-item:hover { background: #f2f2f7; }
        .esp-dropdown-item.selected { background: #e8f3ff; color: #007aff; font-weight: 600; }
        .esp-dropdown-item.used { opacity: 0.5; cursor: not-allowed; background: #f2f2f7; }
        .esp-finalista-card { background: #f9f9fb; border: 1px solid #e5e5ea; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .esp-finalista-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .esp-finalista-titulo { font-size: 15px; font-weight: 700; color: #1c1c1e; }
        .esp-finalista-pts { font-size: 12px; font-weight: 700; color: #ff9500; background: #fff9ec; padding: 3px 10px; border-radius: 20px; }
        .esp-btn-guardar { width: 100%; background: #34c759; color: #fff; border: none; border-radius: 14px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .esp-btn-guardar:active { transform: scale(0.98); }
        .esp-btn-guardar:disabled { opacity: 0.6; cursor: not-allowed; }
        
        /* Zona 3 - scroll independiente */
        .esp-zona3 {
          flex: 1;
          overflow-y: auto;
          padding: 0 20px 20px 20px;
          min-height: 0;
        }
      </style>
      
      <!-- Zona 1: Tabs (fijos) -->
      <div style="padding: 20px 20px 0 20px; flex-shrink: 0;">
        <div class="esp-tabs-container">
          <button class="esp-tab active" data-tab="ciclo1">CICLO 1</button>
          <button class="esp-tab" data-tab="ciclo2">CICLO 2</button>
          <button class="esp-tab" data-tab="guardar" style="background:#34c759; color:#fff;">💾 GUARDAR</button>
        </div>
      </div>
      
      <!-- Zona 2: Badges explicativos (fijos) -->
      <div style="padding: 0 20px; flex-shrink: 0;">
        <div id="esp-badge-explicativo" class="esp-badge-explicativo">
          <strong style="display:block; margin-bottom:8px; font-size:16px; color:#8B0000;">LOS DOS MEJORES DE CADA GRUPO</strong>💡 Pronostique cuáles serán los mejores equipos de cada grupo. Si acierta en el orden: <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">60 pts</span> · En desorden: <span style="background:#ffd966; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid #333;">30 pts</span>
        </div>
        <div id="esp-badge-pulso" class="esp-pulso-badge pulso-100" style="display: none;"></div>
      </div>
      
      <!-- Zona 3: Contenido con scroll independiente -->
      <div id="esp-zona3" class="esp-zona3">
        <div id="esp-zona3-contenido">
          <div>
            <div class="esp-seccion-titulo"><span>📋</span> Selecciona un grupo</div>
            <div class="esp-grupos-tabs" id="esp-grupos-tabs">
              ${GRUPOS_LISTA.map(g => `<button class="esp-grupo-tab ${grupoActivo === g ? 'active' : ''}" data-grupo="${g}">${g}</button>`).join('')}
            </div>
            <div id="esp-grupo-panel">${GRUPOS_EQUIPOS[grupoActivo] ? renderGrupoSelector(grupoActivo) : '<div class="esp-grupo-panel">Cargando...</div>'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Asignar eventos de tabs
  document.querySelectorAll('.esp-tab').forEach(tab => {
    tab.onclick = () => cambiarTab(tab.dataset.tab);
  });
  
  // Asignar eventos de grupos
  document.querySelectorAll('.esp-grupo-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.esp-grupo-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      grupoActivo = tab.dataset.grupo;
      const panel = document.getElementById('esp-grupo-panel');
      if (panel && GRUPOS_EQUIPOS[grupoActivo]) {
        panel.innerHTML = renderGrupoSelector(grupoActivo);
        setupEventListeners();
      }
    };
  });
  
  setupEventListeners();
  actualizarPuntuacion();
}

window.mostrarModalConfirmacion = mostrarModalConfirmacion;
window.guardarEspeciales = guardarEspeciales;