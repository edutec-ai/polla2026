// funciones/partidos.js
// Módulo de Partidos - La Polla Mundialista 2026

import { onSimuladorCambio, simGetFechaStr, simGetHoraStr } from './lab.js';
import { gruposSeleccion } from './especiales.js';
import { getBandera } from './banderas.js';

// Configuración de APIs
const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

// FECHAS DE INICIO DE CADA FASE (formato YYYY-MM-DD)
// La fase de grupos (fas=1) está SIEMPRE visible, no tiene fecha de corte
const FECHAS_FASES = {
  2: '2026-06-28',  // 32vos de final
  3: '2026-07-04',  // 16vos de final
  4: '2026-07-09',  // Cuartos de final
  5: '2026-07-14',  // Semifinales
  7: '2026-07-18'   // Final + Tercer puesto
};

// Estado interno
let partidosCache = [];
let equiposCache = [];
let pronosticosCache = {};
let tabActivo = 'todos';
let grupoActivo = 'A';
let simuladorSuscrito = false;
let currentJugador = null;

function mostrarToast(msg, tipo) {
  const toast = document.getElementById('app-toast');
  if (toast) {
    toast.textContent = msg;
    toast.className = 'toast ' + (tipo || '');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

async function cargarPartidos() {
  try {
    const response = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}`);
    const data = await response.json();
    partidosCache = data.fifa_ptd || [];
    partidosCache.sort((a, b) => {
      if (a.fch !== b.fch) return a.fch.localeCompare(b.fch);
      return (a.hor || '00:00:00').localeCompare(b.hor || '00:00:00');
    });
    return partidosCache;
  } catch (error) {
    console.error('Error cargando partidos:', error);
    return [];
  }
}

async function cargarEquipos() {
  try {
    const response = await fetch(`${BASE}/fifa_equ?api_key=${KEY}`);
    const data = await response.json();
    equiposCache = data.fifa_equ || [];
    return equiposCache;
  } catch (error) {
    console.error('Error cargando equipos:', error);
    return [];
  }
}

async function cargarPronosticos(jugId) {
  if (!jugId) return;
  try {
    const response = await fetch(`${BASE}/fifa_jug_pro?api_key=${KEY}`);
    const data = await response.json();
    const todos = data.fifa_jug_pro || [];
    const misPronosticos = todos.filter(p => Number(p.jug) === Number(jugId));
    pronosticosCache = {};
    misPronosticos.forEach(p => {
      pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 };
    });
  } catch (error) {
    console.error('Error cargando pronósticos:', error);
  }
}

function getEstadoPartido(partido, fechaSim, horaSim) {
  const fechaPartido = partido.fch ? partido.fch.split('T')[0] : '';
  const horaPartido = partido.hor ? partido.hor.substring(0, 5) : '00:00';
  const est = Number(partido.est);
  if (est === 2) return { estado: 'finalizado', clase: 'badge-closed', texto: '✓ Finalizado' };
  if (est === 1) return { estado: 'vivo', clase: 'badge-live', texto: '● EN VIVO' };
  if (fechaPartido < fechaSim) return { estado: 'finalizado', clase: 'badge-closed', texto: '✓ Finalizado' };
  if (fechaPartido === fechaSim && horaPartido <= horaSim) return { estado: 'vivo', clase: 'badge-live', texto: '● EN VIVO' };
  return { estado: 'futuro', clase: 'badge-open', texto: horaPartido };
}

function getPtsBase(fase) {
  const faseNum = Number(fase);
  if (faseNum === 1) return 20;
  if (faseNum === 2) return 40;
  if (faseNum === 3) return 60;
  if (faseNum === 4) return 80;
  if (faseNum === 5) return 100;
  if (faseNum === 7) return 200;
  return 20;
}

// OBTENER LAS FASES HABILITADAS SEGÚN FECHA SIMULADA
// La fase de grupos (1) SIEMPRE está habilitada
function getFasesHabilitadas(fechaSim) {
  // Siempre incluir fase de grupos
  const fasesHabilitadas = [1];
  
  if (!fechaSim) return fasesHabilitadas;
  
  for (const [fase, fechaInicio] of Object.entries(FECHAS_FASES)) {
    if (fechaSim >= fechaInicio) {
      fasesHabilitadas.push(parseInt(fase));
    }
  }
  
  return fasesHabilitadas;
}

// VERIFICAR SI UN PARTIDO PUEDE SER PRONOSTICADO
function puedePronosticar(partido, fechaSim, horaSim) {
  const fase = Number(partido.fas);
  const fasesHabilitadas = getFasesHabilitadas(fechaSim);
  
  // Si la fase del partido no está habilitada aún, no se puede pronosticar
  if (!fasesHabilitadas.includes(fase)) {
    return false;
  }
  
  // Verificar si el partido ya pasó (finalizado o en vivo)
  const { estado } = getEstadoPartido(partido, fechaSim, horaSim);
  if (estado === 'finalizado' || estado === 'vivo') {
    return false;
  }
  
  return true;
}

// FILTRAR PARTIDOS VISIBLES SEGÚN FECHA SIMULADA
function filtrarPartidosVisibles(partidos, fechaSim) {
  if (!fechaSim) return partidos;
  
  const fasesHabilitadas = getFasesHabilitadas(fechaSim);
  
  return partidos.filter(partido => {
    const fase = Number(partido.fas);
    return fasesHabilitadas.includes(fase);
  });
}

function renderTablaPosiciones(grupo) {
  const equiposGrupo = equiposCache.filter(e => e.grp === grupo).sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.dif !== b.dif) return b.dif - a.dif;
    return b.gf - a.gf;
  });
  const clasificados = gruposSeleccion[grupo] || {};
  const primerClasificado = clasificados[1];
  const segundoClasificado = clasificados[2];
  
  if (!equiposGrupo.length) return '<div style="padding:20px;text-align:center;color:#8e8e93;">Sin datos del grupo</div>';
  
  return `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#f2f2f7;border-bottom:1px solid #e5e5ea;">
          <th style="padding:8px;text-align:center;">Pos</th><th style="padding:8px;text-align:left;">Equipo</th>
          <th style="padding:8px;text-align:center;">PJ</th><th style="padding:8px;text-align:center;">G</th>
          <th style="padding:8px;text-align:center;">E</th><th style="padding:8px;text-align:center;">P</th>
          <th style="padding:8px;text-align:center;">GF</th><th style="padding:8px;text-align:center;">GC</th>
          <th style="padding:8px;text-align:center;">DG</th><th style="padding:8px;text-align:center;">PTS</th>
        </tr>
        </thead>
        <tbody>
          ${equiposGrupo.map((eq, idx) => {
            const esPrimero = eq.name === primerClasificado;
            const esSegundo = eq.name === segundoClasificado;
            const badge = esPrimero ? '<span style="color:#34c759; margin-left:6px; font-weight:700;">[1]</span>' : 
                          esSegundo ? '<span style="color:#34c759; margin-left:6px; font-weight:700;">[2]</span>' : '';
            return `<tr style="border-bottom:0.5px solid #f0f0f0;">
              <td style="padding:8px;text-align:center;color:${idx < 2 ? '#34c759' : '#1c1c1e'};">${idx + 1}</td>
              <td style="padding:8px;text-align:left;"><span style="font-size:18px;margin-right:6px;">${getBandera(eq.name)}</span>${eq.name}${badge}</td>
              <td style="padding:8px;text-align:center;">${eq.pj || 0}</td><td style="padding:8px;text-align:center;">${eq.pg || 0}</td>
              <td style="padding:8px;text-align:center;">${eq.pe || 0}</td><td style="padding:8px;text-align:center;">${eq.pp || 0}</td>
              <td style="padding:8px;text-align:center;">${eq.gf || 0}</td><td style="padding:8px;text-align:center;">${eq.gc || 0}</td>
              <td style="padding:8px;text-align:center;">${(eq.dif || 0) > 0 ? '+' + eq.dif : eq.dif || 0}</td>
              <td style="padding:8px;text-align:center;font-weight:700;color:#007aff;">${eq.pts || 0}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPartidoCard(partido, fechaSim, horaSim) {
  const { estado, clase, texto } = getEstadoPartido(partido, fechaSim, horaSim);
  const esFuturo = estado === 'futuro';
  const puede = puedePronosticar(partido, fechaSim, horaSim);
  const ptsBase = getPtsBase(partido.fas);
  const pronostico = pronosticosCache[partido.id];
  const tienePronostico = pronostico && (pronostico.s1 !== undefined || pronostico.s2 !== undefined);
  const golLocReal = partido.t90_gol_loc !== undefined && partido.t90_gol_loc !== null ? partido.t90_gol_loc : null;
  const golVisReal = partido.t90_gol_vis !== undefined && partido.t90_gol_vis !== null ? partido.t90_gol_vis : null;
  const tieneResultado = golLocReal !== null && golVisReal !== null;
  const badgeStyle = clase === 'badge-open' ? 'background:#34c759;color:#fff;' : 
                     clase === 'badge-live' ? 'background:#ff3b30;color:#fff;' : 
                     'background:#f2f2f7;color:#8e8e93;';
  
  // Mostrar mensaje si no se puede pronosticar por fase no habilitada
  const mensajeBloqueo = !puede && esFuturo && partido.fas > 1 ? 
    '<div style="margin-top:8px;text-align:center;"><span style="font-size:11px;color:#ff9500;font-weight:600;">🔒 Esta fase estará disponible a partir del 28 de junio</span></div>' : '';
  
  return `
    <div class="partido-card" data-id="${partido.id}" data-fas="${partido.fas}" style="background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;border:0.5px solid rgba(0,0,0,0.08);${puede && esFuturo ? 'cursor:pointer;' : 'cursor:default;opacity:0.9;'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;color:#8e8e93;">${partido.grp_for || 'Fase ' + partido.fas}</span>
        <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;${badgeStyle}">${texto}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="text-align:center;flex:1;"><div style="font-size:28px;">${getBandera(partido.nom_loc)}</div><div style="font-size:13px;font-weight:600;color:#000;">${partido.nom_loc}</div></div>
        <div style="text-align:center;min-width:60px;">${tieneResultado ? `<div style="font-size:20px;font-weight:700;color:#000;">${golLocReal} - ${golVisReal}</div>` : esFuturo ? '<div style="font-size:14px;font-weight:700;color:#007aff;">VS</div>' : '<div style="font-size:14px;font-weight:700;color:#8e8e93;">- - -</div>'}</div>
        <div style="text-align:center;flex:1;"><div style="font-size:28px;">${getBandera(partido.nom_vis)}</div><div style="font-size:13px;font-weight:600;color:#000;">${partido.nom_vis}</div></div>
      </div>
      ${tienePronostico ? `<div style="background:#f2f2f7;border-radius:10px;padding:8px 12px;margin-top:8px;display:flex;justify-content:space-between;"><span style="font-size:11px;color:#8e8e93;">Tu pronóstico:</span><span style="font-size:13px;font-weight:600;color:#007aff;">${pronostico.s1} - ${pronostico.s2}</span><span style="font-size:11px;color:#ff9500;">${ptsBase} pts</span></div>` : (esFuturo && puede) ? '<div style="margin-top:8px;text-align:center;"><span style="font-size:11px;color:#007aff;font-weight:600;">⚽ HAZ TU PRONÓSTICO</span></div>' : (esFuturo && !puede && partido.fas > 1) ? mensajeBloqueo : ''}
      <div style="margin-top:8px;font-size:10px;color:#8e8e93;text-align:center;">${partido.fch ? partido.fch.split('T')[0] : ''} · ${partido.hor ? partido.hor.substring(0,5) : ''}</div>
    </div>
  `;
}

function abrirModal(partido, fechaSim, horaSim) {
  // Verificar si se puede pronosticar antes de abrir el modal
  if (!puedePronosticar(partido, fechaSim, horaSim)) {
    mostrarToast('🔒 No puedes pronosticar este partido en esta fase del torneo', 'err');
    return;
  }
  
  const ptsBase = getPtsBase(partido.fas);
  const pronostico = pronosticosCache[partido.id] || { s1: 0, s2: 0 };
  const { estado } = getEstadoPartido(partido, fechaSim, horaSim);
  const esFuturo = estado === 'futuro';
  
  if (!esFuturo) {
    mostrarToast('⚠️ Este partido ya no se puede pronosticar', 'err');
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;padding-bottom:env(safe-area-inset-bottom,0);';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-size:17px;font-weight:700;">${partido.grp_for || 'Fase ' + partido.fas}</div><button id="cerrar-modal-btn" style="background:none;border:none;font-size:22px;color:#8e8e93;cursor:pointer;">✕</button></div>
      <div style="font-size:12px;color:#8e8e93;margin-bottom:14px;">${partido.fch ? partido.fch.split('T')[0] : ''} · ${partido.hor ? partido.hor.substring(0,5) : ''}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;background:#f9f9fb;border-radius:14px;padding:14px 16px;margin-bottom:14px;">
        <div style="text-align:center;flex:1;"><div style="font-size:32px;">${getBandera(partido.nom_loc)}</div><div style="font-size:13px;font-weight:700;">${partido.nom_loc}</div></div>
        <div style="text-align:center;min-width:80px;"><div style="display:flex;align-items:center;gap:8px;"><button id="modal-dec-loc" style="width:36px;height:40px;border-radius:8px;border:1.5px solid #e5e5ea;background:#fff;font-size:20px;">−</button><input id="modal-s1" type="number" min="0" max="20" value="${pronostico.s1}" style="width:50px;height:40px;border:1.5px solid #e5e5ea;border-radius:8px;text-align:center;font-size:18px;font-weight:700;"><button id="modal-inc-loc" style="width:36px;height:40px;border-radius:8px;border:1.5px solid #e5e5ea;background:#fff;font-size:20px;">+</button></div></div>
        <div style="text-align:center;flex:1;"><div style="font-size:32px;">${getBandera(partido.nom_vis)}</div><div style="font-size:13px;font-weight:700;">${partido.nom_vis}</div></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px;"><button id="modal-dec-vis" style="width:36px;height:40px;border-radius:8px;border:1.5px solid #e5e5ea;background:#fff;font-size:20px;">−</button><input id="modal-s2" type="number" min="0" max="20" value="${pronostico.s2}" style="width:50px;height:40px;border:1.5px solid #e5e5ea;border-radius:8px;text-align:center;font-size:18px;font-weight:700;"><button id="modal-inc-vis" style="width:36px;height:40px;border-radius:8px;border:1.5px solid #e5e5ea;background:#fff;font-size:20px;">+</button></div>
      <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;"><div style="font-size:11px;font-weight:700;margin-bottom:8px;">Puntos potenciales</div>
        <div style="display:flex;justify-content:space-between;"><span>Ganador / Empate</span><span>${Math.round(ptsBase * 0.3)} pts</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Diferencia de goles</span><span>${Math.round(ptsBase * 0.3)} pts</span></div>
        <div style="display:flex;justify-content:space-between;"><span>Goles exactos</span><span>${Math.round(ptsBase * 0.2)} pts</span></div>
        <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
        <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">Marcador exacto ✅</span><span style="font-weight:800;color:#ff9500;">${ptsBase} pts</span></div>
      </div>
      <button id="modal-guardar-btn" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;">💾 Guardar pronóstico</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('cerrar-modal-btn')?.addEventListener('click', () => overlay.remove());
  
  document.getElementById('modal-inc-loc')?.addEventListener('click', () => { let i = document.getElementById('modal-s1'); i.value = Math.min(20, parseInt(i.value || 0) + 1); });
  document.getElementById('modal-dec-loc')?.addEventListener('click', () => { let i = document.getElementById('modal-s1'); i.value = Math.max(0, parseInt(i.value || 0) - 1); });
  document.getElementById('modal-inc-vis')?.addEventListener('click', () => { let i = document.getElementById('modal-s2'); i.value = Math.min(20, parseInt(i.value || 0) + 1); });
  document.getElementById('modal-dec-vis')?.addEventListener('click', () => { let i = document.getElementById('modal-s2'); i.value = Math.max(0, parseInt(i.value || 0) - 1); });
  
  document.getElementById('modal-guardar-btn')?.addEventListener('click', () => {
    const s1 = parseInt(document.getElementById('modal-s1').value) || 0;
    const s2 = parseInt(document.getElementById('modal-s2').value) || 0;
    guardarPronostico(partido.id, s1, s2);
    overlay.remove();
  });
  
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

async function guardarPronostico(ptdId, s1, s2) {
  if (!currentJugador) { mostrarToast('Inicia sesión primero', 'err'); return; }
  try {
    const response = await fetch(`${BASE_V2}/_process/API_PUT_PAR?api_key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ jug: currentJugador.id, id: ptdId, pro_gol_loc: s1, pro_gol_vis: s2, pro_res: s1 > s2 ? '1' : s2 > s1 ? '2' : 'X' })
    });
    if (response.ok) { pronosticosCache[ptdId] = { s1, s2 }; mostrarToast('✅ Pronóstico guardado', 'ok'); refrescarContenido(); }
    else mostrarToast('❌ Error al guardar', 'err');
  } catch (error) { mostrarToast('❌ Error de conexión', 'err'); }
}

function refrescarContenido() {
  const contenedorScroll = document.getElementById('partidos-contenido-scroll');
  if (!contenedorScroll) return;
  const fechaSim = simGetFechaStr ? simGetFechaStr() : new Date().toISOString().split('T')[0];
  const horaSim = simGetHoraStr ? simGetHoraStr() : new Date().toTimeString().split(' ')[0].substring(0, 5);
  
  // Filtrar partidos visibles según fecha simulada
  const partidosVisibles = filtrarPartidosVisibles(partidosCache, fechaSim);
  const totalPartidos = partidosVisibles.length;
  
  // Obtener fases habilitadas para mostrar información
  const fasesHabilitadas = getFasesHabilitadas(fechaSim);
  const nombreFases = {
    1: 'Fase de Grupos (siempre visible)',
    2: '32vos de Final',
    3: '16vos de Final',
    4: 'Cuartos de Final',
    5: 'Semifinales',
    7: 'Finales'
  };
  const fasesTexto = fasesHabilitadas.map(f => nombreFases[f] || `Fase ${f}`).join(', ');
  
  if (tabActivo === 'todos') {
    if (totalPartidos === 0) {
      contenedorScroll.innerHTML = `<div style="padding:40px;text-align:center;color:#8e8e93;">📅 No hay partidos disponibles para la fecha simulada (${fechaSim})<br><span style="font-size:12px;">Fase de grupos siempre visible</span></div>`;
    } else {
      contenedorScroll.innerHTML = `<div style="padding:16px;"><div style="font-size:14px;font-weight:600;color:#8e8e93;margin-bottom:12px;">📅 Partidos disponibles (${totalPartidos}) · Simulando: ${fechaSim}<br><span style="font-size:11px;color:#007aff;">✅ Fases habilitadas: ${fasesTexto}</span></div><div id="partidos-lista">${partidosVisibles.map(p => renderPartidoCard(p, fechaSim, horaSim)).join('')}</div></div>`;
    }
  } else if (tabActivo === 'grupos') {
    const partidosGrupo = partidosVisibles.filter(p => p.grp_for === grupoActivo);
    contenedorScroll.innerHTML = `<div style="padding:16px;"><div class="grupos-tabs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">${['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => `<button class="grupo-tab ${grupoActivo === g ? 'active' : ''}" data-grupo="${g}" style="width:48px;height:48px;border-radius:24px;background:${grupoActivo === g ? '#007aff' : '#f2f2f7'};border:1px solid ${grupoActivo === g ? '#007aff' : '#e5e5ea'};color:${grupoActivo === g ? '#fff' : '#3c3c43'};font-size:16px;font-weight:700;cursor:pointer;">${g}</button>`).join('')}</div><div style="background:#f9f9fb;border-radius:14px;border:1px solid #e5e5ea;overflow-x:auto;margin-bottom:20px;">${renderTablaPosiciones(grupoActivo)}</div><div style="font-size:14px;font-weight:600;color:#8e8e93;margin-bottom:12px;">⚽ Partidos del Grupo ${grupoActivo} (${partidosGrupo.length})</div><div id="partidos-lista">${partidosGrupo.map(p => renderPartidoCard(p, fechaSim, horaSim)).join('')}</div></div>`;
  } else if (tabActivo === 'finales') {
    const partidosFinales = partidosVisibles.filter(p => p.fas >= 2);
    contenedorScroll.innerHTML = `<div style="padding:16px;"><div style="font-size:14px;font-weight:600;color:#8e8e93;margin-bottom:12px;">🏆 Fase Final (${partidosFinales.length} partidos) · Simulando: ${fechaSim}<br><span style="font-size:11px;color:#007aff;">✅ Fases habilitadas: ${fasesTexto}</span></div><div id="partidos-lista">${partidosFinales.map(p => renderPartidoCard(p, fechaSim, horaSim)).join('')}</div></div>`;
  }
  
  // Solo agregar evento de clic a las cards que permiten pronóstico
  document.querySelectorAll('.partido-card').forEach(card => {
    const id = parseInt(card.dataset.id);
    const partido = partidosCache.find(p => p.id === id);
    if (partido && puedePronosticar(partido, fechaSim, horaSim)) {
      card.onclick = () => abrirModal(partido, fechaSim, horaSim);
    }
  });
  
  document.querySelectorAll('.grupo-tab').forEach(btn => { 
    btn.onclick = () => { 
      grupoActivo = btn.dataset.grupo; 
      refrescarContenido(); 
    }; 
  });
}

function cambiarTab(tab) {
  tabActivo = tab;
  document.querySelectorAll('.partidos-tab').forEach(t => {
    if (t.dataset.tab === tab) { t.classList.add('active'); t.style.background = '#007aff'; t.style.color = '#fff'; }
    else { t.classList.remove('active'); t.style.background = '#f2f2f7'; t.style.color = '#3c3c43'; }
  });
  refrescarContenido();
}

export async function renderizarPartidos(contenedor, datosCuenta) {
  if (!contenedor) return;
  currentJugador = datosCuenta;
  await cargarEquipos();
  await cargarPartidos();
  await cargarPronosticos(datosCuenta.id);
  if (!simuladorSuscrito && typeof onSimuladorCambio === 'function') {
    simuladorSuscrito = true;
    onSimuladorCambio(() => refrescarContenido());
  }
  contenedor.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;background:#fff;border-radius:16px;overflow:hidden;"><div style="flex-shrink:0;display:flex;gap:8px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e5ea;"><button class="partidos-tab active" data-tab="todos" style="flex:1;padding:10px;border:none;border-radius:12px;background:#007aff;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">📋 TODOS</button><button class="partidos-tab" data-tab="grupos" style="flex:1;padding:10px;border:none;border-radius:12px;background:#f2f2f7;color:#3c3c43;font-size:14px;font-weight:600;cursor:pointer;">📊 GRUPOS</button><button class="partidos-tab" data-tab="finales" style="flex:1;padding:10px;border:none;border-radius:12px;background:#f2f2f7;color:#3c3c43;font-size:14px;font-weight:600;cursor:pointer;">🏆 FINALES</button></div><div id="partidos-contenido-scroll" style="flex:1;overflow-y:auto;"></div></div>`;
  document.querySelectorAll('.partidos-tab').forEach(tab => { tab.onclick = () => cambiarTab(tab.dataset.tab); });
  refrescarContenido();
}