// funciones/partidos.js
// Módulo de Partidos - La Polla Mundialista 2026
// VERSIÓN PARA GITHUB (solo TODOS y GRUPOS, sin texto simulador)
// Badges: 🟢 JUEGA HOY / 🔴 EN VIVO (con fondo suave)
// Borde más grueso (2px) para partidos del día

import { onSimuladorCambio, simGetFechaStr, simGetHoraStr } from './lab.js';
import { gruposSeleccion } from './especiales.js';
import { getBandera } from './banderas.js';
import { cargarPronosticosPartidosLocal, guardarPronosticosPartidosLocal } from './sync.js';

const BASE = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v1';
const BASE_V2 = 'https://server.sion.hysintegrar.com/fifa2026/vERP_2_dat_dat/v2';
const KEY = 'SuzvTp4qwXQtAVFJbdzP';

const FECHAS_FASES = { 2: '2026-06-28', 3: '2026-07-04', 4: '2026-07-09', 5: '2026-07-14', 7: '2026-07-18' };

let partidosCache = [], equiposCache = [], pronosticosCache = {}, resultadosRealesCache = {};
let tabActivo = 'todos', grupoActivo = 'A', simuladorSuscrito = false, currentJugador = null;

function mostrarToast(msg, tipo) {
    const toast = document.getElementById('app-toast');
    if (toast) { toast.textContent = msg; toast.className = 'toast ' + (tipo || ''); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }
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
        
        const responseReales = await fetch(`${BASE}/fifa_ptd?api_key=${KEY}&filter[est]=2`);
        const dataReales = await responseReales.json();
        (dataReales.fifa_ptd || []).forEach(p => { resultadosRealesCache[p.id] = { gol_loc: p.t90_gol_loc, gol_vis: p.t90_gol_vis, est: p.est }; });
        
        console.log(`[Partidos] Cargados ${partidosCache.length} partidos`);
        return partidosCache;
    } catch (error) { console.error('Error cargando partidos:', error); return []; }
}

async function cargarEquipos() {
    try { const response = await fetch(`${BASE}/fifa_equ?api_key=${KEY}`); equiposCache = (await response.json()).fifa_equ || []; return equiposCache; } 
    catch (error) { console.error('Error cargando equipos:', error); return []; }
}

async function cargarPronosticos(jugId) {
    if (!jugId) return;
    const locales = cargarPronosticosPartidosLocal();
    if (locales && Object.keys(locales).length > 0) { pronosticosCache = locales; console.log(`[Partidos] ${Object.keys(pronosticosCache).length} pronósticos desde localStorage`); return; }
    try {
        const response = await fetch(`${BASE_V2}/fifa_jug_pro?api_key=${KEY}&filter[id]=${jugId}&fields=jug,jug.name,id,ptd,pro_gol_loc,pro_gol_vis,pro_res`);
        const pronosticos = (await response.json()).fifa_jug_pro || [];
        pronosticosCache = {};
        pronosticos.forEach(p => { pronosticosCache[p.ptd] = { s1: p.pro_gol_loc || 0, s2: p.pro_gol_vis || 0 }; });
        guardarPronosticosPartidosLocal(pronosticosCache);
    } catch (error) { console.error('Error cargando pronósticos:', error); }
}

function actualizarLocalStorage() { guardarPronosticosPartidosLocal(pronosticosCache); }

function getEstadoPartido(partido, fechaSim, horaSim) {
    const fechaPartido = partido.fch ? partido.fch.split('T')[0] : '';
    const horaPartido = partido.hor ? partido.hor.substring(0, 5) : '00:00';
    const est = Number(partido.est);
    
    if (est === 2) return { estado: 'finalizado', clase: 'badge-closed', texto: '✓ Finalizado' };
    if (fechaPartido < fechaSim) return { estado: 'finalizado', clase: 'badge-closed', texto: '✓ Finalizado' };
    
    if (fechaPartido === fechaSim) {
        const [h, m] = horaPartido.split(':').map(Number);
        let horaFin = h + 2;
        let minFin = m;
        if (minFin >= 60) { minFin -= 60; horaFin++; }
        const horaFinStr = `${horaFin.toString().padStart(2, '0')}:${minFin.toString().padStart(2, '0')}`;
        
        if (horaSim >= horaFinStr) return { estado: 'finalizado', clase: 'badge-closed', texto: '✓ Finalizado' };
        if (horaSim >= horaPartido && horaSim < horaFinStr) return { estado: 'vivo', clase: 'badge-live', texto: 'EN VIVO' };
        if (horaSim < horaPartido) return { estado: 'futuroHoy', clase: 'badge-today', texto: 'JUEGA HOY' };
    }
    
    return { estado: 'futuro', clase: 'badge-open', texto: horaPartido };
}

// ========== NUEVA FUNCIÓN: ESTADO DEL PARTIDO CON PULSO ==========
function getEstadoPartidoConPulso(partido, fechaSim, horaSim, tienePronosticoPrevio) {
    const fechaPartido = partido.fch ? partido.fch.split('T')[0] : '';
    const horaPartido = partido.hor ? partido.hor.substring(0, 5) : '00:00';
    const est = Number(partido.est);
    
    // Partido finalizado
    if (est === 2 || fechaPartido < fechaSim) {
        return { 
            escenario: 'finalizado', 
            editable: false, 
            pulso: null, 
            puntos: 0,
            mensaje: 'Partido finalizado.'
        };
    }
    
    // Calcular minutos antes del inicio
    let minutosAntes = null;
    let puedeEditar = false;
    let pulso = 100;
    let puntos = getPtsBase(partido.fas);
    let mensaje = '';
    let advertencia = false;
    
    if (fechaPartido === fechaSim) {
        const [hPartido, mPartido] = horaPartido.split(':').map(Number);
        const [hSim, mSim] = horaSim.split(':').map(Number);
        const minutosPartido = hPartido * 60 + mPartido;
        const minutosSim = hSim * 60 + mSim;
        minutosAntes = minutosPartido - minutosSim;
        
        // Caso 1: Más de 5 minutos antes del inicio
        if (minutosAntes > 5) {
            puedeEditar = true;
            pulso = 100;
            puntos = getPtsBase(partido.fas);
            mensaje = `🟢 PULSO 100 · Si aciertas el marcador exacto tendrás ${puntos} puntos.`;
            advertencia = false;
        }
        // Caso 2: Últimos 5 minutos antes del inicio
        else if (minutosAntes >= 0 && minutosAntes <= 5) {
            puedeEditar = true;
            pulso = 100;
            puntos = getPtsBase(partido.fas);
            mensaje = `🟢 PULSO 100 · Si aciertas el marcador exacto tendrás ${puntos} puntos.`;
            advertencia = true;
        }
        // Caso 3: Partido en curso
        else if (minutosAntes < 0) {
            const minutosTranscurridos = Math.abs(minutosAntes);
            
            // Primer tiempo (0-45 minutos)
            if (minutosTranscurridos <= 45) {
                if (tienePronosticoPrevio) {
                    puedeEditar = false;
                    pulso = 100;
                    puntos = getPtsBase(partido.fas);
                    mensaje = `🔴 El partido está en vivo. No puedes cambiar tu pronóstico. Estás en 🟢 PULSO 100 con tu marcador.`;
                } else {
                    puedeEditar = true;
                    pulso = 50;
                    puntos = Math.round(getPtsBase(partido.fas) / 2);
                    mensaje = `🟡 PULSO 50 · Aún estás a tiempo. Si aciertas el marcador exacto tendrás ${puntos} puntos.`;
                }
                advertencia = false;
            }
            // Segundo tiempo (45-90 minutos) o más
            else {
                puedeEditar = false;
                pulso = null;
                puntos = 0;
                mensaje = `🔴 El primer tiempo del partido terminó. Ya no se pueden hacer ni modificar pronósticos.`;
                advertencia = false;
            }
        }
    } else if (fechaPartido > fechaSim) {
        puedeEditar = true;
        pulso = 100;
        puntos = getPtsBase(partido.fas);
        mensaje = `🟢 PULSO 100 · Si aciertas el marcador exacto tendrás ${puntos} puntos.`;
        advertencia = false;
    }
    
    return {
        escenario: puedeEditar ? (minutosAntes <= 5 && minutosAntes >= 0 ? 'prematch_adv' : 'prematch') : (minutosAntes < -45 ? 'segundo_tiempo' : 'primer_tiempo'),
        editable: puedeEditar,
        pulso: pulso,
        puntos: puntos,
        mensaje: mensaje,
        advertencia: advertencia,
        minutosAntes: minutosAntes
    };
}

function getResultadoReal(partidoId) { const real = resultadosRealesCache[partidoId]; return real && real.gol_loc !== null ? { gol_loc: real.gol_loc, gol_vis: real.gol_vis } : null; }
function getPtsBase(fase) { const f = Number(fase); if (f === 1) return 20; if (f === 2) return 40; if (f === 3) return 60; if (f === 4) return 80; if (f === 5) return 100; if (f === 7) return 200; return 20; }
function getFasesHabilitadas(fechaSim) { const fases = [1]; if (!fechaSim) return fases; for (const [fase, fechaInicio] of Object.entries(FECHAS_FASES)) if (fechaSim >= fechaInicio) fases.push(parseInt(fase)); return fases; }
function filtrarPartidosVisibles(partidos, fechaSim) { if (!fechaSim) return partidos; const fasesHabilitadas = getFasesHabilitadas(fechaSim); return partidos.filter(p => fasesHabilitadas.includes(Number(p.fas))); }

function getTipoFondo(fechaPartido, fechaSim) {
    if (!fechaPartido) return 'normal';
    if (fechaPartido < fechaSim) return 'finalizado';
    if (fechaPartido === fechaSim) return 'hoy';
    const hoy = new Date(fechaSim + 'T12:00:00');
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];
    if (fechaPartido === mananaStr) return 'proximo';
    return 'normal';
}

function getFondoStyle(tipoFondo) {
    switch(tipoFondo) {
        case 'finalizado': return { bg: 'rgba(142, 142, 147, 0.2)', border: '#6c6c70', borderWidth: '1.5px' };
        case 'hoy': return { bg: 'rgba(52, 199, 89, 0.25)', border: '#2ecc71', borderWidth: '2px' };
        case 'proximo': return { bg: 'rgba(255, 149, 0, 0.25)', border: '#e67e22', borderWidth: '1.5px' };
        default: return { bg: '#ffffff', border: '#007aff', borderWidth: '1.5px' };
    }
}

function renderTablaPosiciones(grupo) {
    const equiposGrupo = equiposCache.filter(e => e.grp === grupo).sort((a,b) => (b.pts||0)-(a.pts||0) || (b.dif||0)-(a.dif||0) || (b.gf||0)-(a.gf||0));
    const clasificados = gruposSeleccion[grupo] || {};
    if (!equiposGrupo.length) return '<div style="padding:20px;text-align:center;color:#8e8e93;">Sin datos del grupo</div>';
    return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f2f2f7;"><th>Pos</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead><tbody>${
        equiposGrupo.map((eq, idx) => `<tr><td style="color:${idx<2?'#34c759':'#1c1c1e'}">${idx+1}</td><td style="text-align:left;"><span style="font-size:18px;margin-right:6px;">${getBandera(eq.name)}</span>${eq.name}${eq.name===clasificados[1]?'<span style="color:#34c759;">[1]</span>':eq.name===clasificados[2]?'<span style="color:#34c759;">[2]</span>':''}</td><td>${eq.pj||0}</td><td>${eq.pg||0}</td><td>${eq.pe||0}</td><td>${eq.pp||0}</td><td>${eq.gf||0}</td><td>${eq.gc||0}</td><td>${(eq.dif||0)>0?'+'+eq.dif:eq.dif||0}</td><td style="font-weight:700;color:#007aff;">${eq.pts||0}</td>`).join('')
    }</tbody></table></div>`;
}

function renderPartidoCard(partido, fechaSim, horaSim, tipoFondo) {
    const { estado, clase, texto } = getEstadoPartido(partido, fechaSim, horaSim);
    const esFuturo = (estado === 'futuro' || estado === 'futuroHoy');
    const ptsBase = getPtsBase(partido.fas);
    const pronostico = pronosticosCache[partido.id];
    const resultadoReal = getResultadoReal(partido.id);
    const estilo = getFondoStyle(tipoFondo);
    
    let badgeHTML = '';
    if (estado === 'futuroHoy') {
        badgeHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="background:rgba(52, 199, 89, 0.15); padding:4px 12px; border-radius:20px; color:#34c759; font-size:13px; font-weight:700;">🟢 ${texto}</span></div>`;
    } else if (estado === 'vivo') {
        badgeHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="background:rgba(255, 59, 48, 0.15); padding:4px 12px; border-radius:20px; color:#ff3b30; font-size:13px; font-weight:700;">🔴 ${texto}</span></div>`;
    }
    
    let infoHTML = '';
    if (estado !== 'futuroHoy' && estado !== 'vivo') {
        const badgeStyle = clase === 'badge-open' ? 'background:#34c759;color:#fff;' : 
                           clase === 'badge-live' ? 'background:#ff3b30;color:#fff;' : 
                           'background:#f2f2f7;color:#8e8e93;';
        infoHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span style="font-size:11px;color:#8e8e93;">${partido.grp_for || 'Fase ' + partido.fas}</span>
            <span style="font-size:11px;padding:3px 10px;border-radius:20px;${badgeStyle}">${texto}</span>
        </div>`;
    }
    
    const cardStyle = `${estilo.bg}; border-radius:14px; padding:14px; margin-bottom:10px; border: ${estilo.borderWidth} solid ${estilo.border}; cursor:pointer;`;
    
    return `<div class="partido-card" data-id="${partido.id}" data-fas="${partido.fas}" style="${cardStyle}" data-fechapartido="${partido.fch ? partido.fch.split('T')[0] : ''}">
        ${badgeHTML}
        ${infoHTML}
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="text-align:center; flex:1;"><div style="font-size:28px;">${getBandera(partido.nom_loc)}</div><div style="font-size:13px; font-weight:600; color:#000;">${partido.nom_loc}</div></div>
            <div style="text-align:center; min-width:60px;">${resultadoReal ? `<div style="font-size:20px; font-weight:700; color:#000;">${resultadoReal.gol_loc} - ${resultadoReal.gol_vis}</div>` : esFuturo ? '<div style="font-size:14px; font-weight:700; color:#007aff;">VS</div>' : '<div style="font-size:14px; font-weight:700; color:#8e8e93;">- - -</div>'}</div>
            <div style="text-align:center; flex:1;"><div style="font-size:28px;">${getBandera(partido.nom_vis)}</div><div style="font-size:13px; font-weight:600; color:#000;">${partido.nom_vis}</div></div>
        </div>
        ${pronostico ? `<div style="background:#f2f2f7; border-radius:10px; padding:8px 12px; margin-top:8px; display:flex; justify-content:space-between;"><span style="font-size:11px; color:#8e8e93;">Tu pronóstico:</span><span style="font-size:13px; font-weight:600; color:#007aff;">${pronostico.s1} - ${pronostico.s2}</span><span style="font-size:11px; color:#ff9500;">${ptsBase} pts</span></div>` : (esFuturo) ? '<div style="margin-top:8px; text-align:center;"><span style="font-size:11px; color:#007aff; font-weight:600;">⚽ HAZ TU PRONÓSTICO</span></div>' : ''}
        <div style="margin-top:8px; font-size:10px; color:#8e8e93; text-align:center;">${partido.fch ? partido.fch.split('T')[0] : ''} · ${partido.hor ? partido.hor.substring(0,5) : ''}</div>
    </div>`;
}

function scrollAPrimerDestacado() {
    const contenedorScroll = document.getElementById('partidos-contenido-scroll');
    if (!contenedorScroll) return;
    
    setTimeout(() => {
        const cards = document.querySelectorAll('.partido-card');
        if (cards.length === 0) return;
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const borderColor = window.getComputedStyle(card).borderColor;
            if (borderColor.includes('46, 204, 113') || borderColor.includes('46,204,113')) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('[Scroll] Card VERDE (hoy)');
                return;
            }
        }
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const borderColor = window.getComputedStyle(card).borderColor;
            if (borderColor.includes('230, 126, 34') || borderColor.includes('230,126,34')) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                console.log('[Scroll] Card NARANJA (mañana)');
                return;
            }
        }
        
        contenedorScroll.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('[Scroll] Sin destacados, inicio');
        
    }, 500);
}

async function guardarPronostico(ptdId, s1, s2) {
    if (!currentJugador) { mostrarToast('Inicia sesión primero', 'err'); return; }
    try {
        const response = await fetch(`${BASE_V2}/_process/API_PUT_PAR?api_key=${KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ jug: currentJugador.id, id: ptdId, pro_gol_loc: s1, pro_gol_vis: s2, pro_res: s1 > s2 ? '1' : s2 > s1 ? '2' : 'X' })
        });
        if (response.ok) { 
            pronosticosCache[ptdId] = { s1, s2 };
            actualizarLocalStorage();
            mostrarToast('✅ Pronóstico guardado', 'ok'); 
            refrescarContenido(); 
        }
        else mostrarToast('❌ Error al guardar', 'err');
    } catch (error) { mostrarToast('❌ Error de conexión', 'err'); }
}

// ========== MODAL MEJORADO: EQUIPOS ARRIBA, CONTROLES ABAJO ==========
function abrirModal(partido, fechaSim, horaSim) {
    const tienePronosticoPrevio = pronosticosCache[partido.id] !== undefined;
    const estadoPulso = getEstadoPartidoConPulso(partido, fechaSim, horaSim, tienePronosticoPrevio);
    const pronostico = pronosticosCache[partido.id] || { s1: 0, s2: 0 };
    const ptsBase = estadoPulso.puntos || getPtsBase(partido.fas);
    
    // Caso 1: No editable (partido en curso con pronóstico previo o segundo tiempo)
    if (!estadoPulso.editable && estadoPulso.escenario !== 'finalizado') {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
        overlay.innerHTML = `<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;"><div style="font-size:17px;font-weight:700;">${partido.grp_for||'Fase '+partido.fas}</div><button id="cerrar-modal-btn" style="background:none;border:none;font-size:22px;">✕</button></div>
            <div style="font-size:12px;color:#8e8e93;margin-bottom:14px;">${partido.fch?.split('T')[0]||''} · ${partido.hor?.substring(0,5)||''}</div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div style="text-align:center; flex:1;">
                    <div style="font-size:48px; margin-bottom:8px;">${getBandera(partido.nom_loc)}</div>
                    <div style="font-size:14px; font-weight:700; color:#1c1c1e;">${partido.nom_loc}</div>
                </div>
                <div style="font-size:18px; font-weight:700; color:#8e8e93; padding:0 16px;">VS</div>
                <div style="text-align:center; flex:1;">
                    <div style="font-size:48px; margin-bottom:8px;">${getBandera(partido.nom_vis)}</div>
                    <div style="font-size:14px; font-weight:700; color:#1c1c1e;">${partido.nom_vis}</div>
                </div>
            </div>
            
            ${tienePronosticoPrevio ? `<div style="background:#eafaf1;border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;">
                <div style="font-size:13px;font-weight:600;color:#1e8449;">Tu pronóstico: ${pronostico.s1} - ${pronostico.s2}</div>
                <div style="font-size:11px;color:#1e8449;margin-top:4px;">${estadoPulso.mensaje}</div>
            </div>` : `<div style="background:#fff2f2;border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;">
                <div style="font-size:13px;font-weight:600;color:#c0392b;">${estadoPulso.mensaje}</div>
            </div>`}
            <button id="cerrar-modal-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;cursor:pointer;">Cerrar</button>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('cerrar-modal-btn')?.addEventListener('click', () => overlay.remove());
        document.getElementById('cerrar-modal-accion')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        return;
    }
    
    // Caso 2: Partido finalizado - mostrar resultados
    if (estadoPulso.escenario === 'finalizado') {
        const resultadoReal = getResultadoReal(partido.id);
        if (!resultadoReal) {
            mostrarToast('Partido finalizado sin resultados disponibles', 'err');
            return;
        }
        
        const pronosticoLocal = pronostico.s1;
        const pronosticoVisita = pronostico.s2;
        const realLocal = resultadoReal.gol_loc;
        const realVisita = resultadoReal.gol_vis;
        
        let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
        const ptsBaseOriginal = getPtsBase(partido.fas);
        const p = { GANADOR: Math.round(ptsBaseOriginal * 0.4), GOL: Math.round(ptsBaseOriginal * 0.2), DIFERENCIA: Math.round(ptsBaseOriginal * 0.2), INVERSO: Math.round(ptsBaseOriginal * 0.2) };
        
        const pronosticoGanador = pronosticoLocal > pronosticoVisita ? 'local' : (pronosticoVisita > pronosticoLocal ? 'visita' : 'empate');
        const realGanador = realLocal > realVisita ? 'local' : (realVisita > realLocal ? 'visita' : 'empate');
        
        if (pronosticoGanador === realGanador) ganador = p.GANADOR;
        if (realLocal === pronosticoLocal) golLocal = p.GOL;
        if (realVisita === pronosticoVisita) golVisita = p.GOL;
        
        const pronosticoDiferencia = Math.abs(pronosticoLocal - pronosticoVisita);
        const realDiferencia = Math.abs(realLocal - realVisita);
        if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
        
        if (pronosticoGanador !== realGanador) {
            if (realLocal === pronosticoVisita && realVisita === pronosticoLocal) inverso = p.INVERSO;
        }
        
        const total = ganador + golLocal + golVisita + diferencia + inverso;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
        overlay.innerHTML = `<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;"><div style="font-size:17px;font-weight:700;">${partido.grp_for||'Fase '+partido.fas}</div><button id="cerrar-modal-btn" style="background:none;border:none;font-size:22px;">✕</button></div>
            <div style="font-size:12px;color:#8e8e93;margin-bottom:14px;">${partido.fch?.split('T')[0]||''}</div>
            
            <div style="background:#f2f2f7;border-radius:14px;padding:16px;margin-bottom:16px;">
                <div style="font-size:12px;color:#8e8e93;margin-bottom:12px;text-align:center;">TU PRONÓSTICO</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_loc)}</div>
                        <div style="font-size:12px;font-weight:600;">${partido.nom_loc}</div>
                        <div style="font-size:24px;font-weight:800;color:#007aff;margin-top:8px;">${pronosticoLocal}</div>
                    </div>
                    <div style="font-size:20px; font-weight:700; color:#8e8e93;">VS</div>
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_vis)}</div>
                        <div style="font-size:12px;font-weight:600;">${partido.nom_vis}</div>
                        <div style="font-size:24px;font-weight:800;color:#007aff;margin-top:8px;">${pronosticoVisita}</div>
                    </div>
                </div>
            </div>
            
            <div style="background:#f9f9fb;border-radius:14px;padding:16px;margin-bottom:16px;">
                <div style="font-size:12px;color:#8e8e93;margin-bottom:12px;text-align:center;">RESULTADO REAL</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_loc)}</div>
                        <div style="font-size:12px;font-weight:600;">${partido.nom_loc}</div>
                        <div style="font-size:24px;font-weight:800;color:#34c759;margin-top:8px;">${realLocal}</div>
                    </div>
                    <div style="font-size:20px; font-weight:700; color:#8e8e93;">VS</div>
                    <div style="text-align:center; flex:1;">
                        <div style="font-size:40px; margin-bottom:4px;">${getBandera(partido.nom_vis)}</div>
                        <div style="font-size:12px;font-weight:600;">${partido.nom_vis}</div>
                        <div style="font-size:24px;font-weight:800;color:#34c759;margin-top:8px;">${realVisita}</div>
                    </div>
                </div>
            </div>
            
            <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:700;margin-bottom:8px;">📊 TU PUNTUACIÓN</div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🏆 Ganador / Empate</span><span style="color:${ganador>0?'#34c759':'#ff3b30'}">${ganador} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>⚽ Gol local exacto</span><span style="color:${golLocal>0?'#34c759':'#ff3b30'}">${golLocal} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>⚽ Gol visita exacto</span><span style="color:${golVisita>0?'#34c759':'#ff3b30'}">${golVisita} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>📊 Diferencia de goles</span><span style="color:${diferencia>0?'#34c759':'#ff3b30'}">${diferencia} pts</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>🔄 Marcador inverso</span><span style="color:${inverso>0?'#34c759':'#ff3b30'}">${inverso} pts</span></div>
                <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
                <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">⭐ TOTAL</span><span style="color:#ff9500;font-weight:800;">${total} pts</span></div>
            </div>
            <button id="cerrar-modal-accion" style="width:100%;background:#007aff;color:#fff;border:none;border-radius:14px;padding:14px;cursor:pointer;">Cerrar</button>
        </div>`;
        document.body.appendChild(overlay);
        document.getElementById('cerrar-modal-btn')?.addEventListener('click', () => overlay.remove());
        document.getElementById('cerrar-modal-accion')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        return;
    }
    
    // Caso 3: Modal editable (antes del partido o primer tiempo sin pronóstico)
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:3000;display:flex;align-items:flex-end;justify-content:center;';
    
    let advertenciaHTML = '';
    if (estadoPulso.advertencia) {
        advertenciaHTML = `<div style="background:#fff9ec;border:1px solid #ffd080;border-radius:12px;padding:10px;margin-bottom:16px;text-align:center;">
            <span style="color:#c05a00;font-size:12px;">⚠️ Quedan menos de 5 minutos para que el partido comience. ¡Asegura tu pronóstico!</span>
        </div>`;
    }
    
    overlay.innerHTML = `<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;">
            <div style="font-size:17px;font-weight:700;">${partido.grp_for||'Fase '+partido.fas}</div>
            <button id="cerrar-modal-btn" style="background:none;border:none;font-size:22px;">✕</button>
        </div>
        <div style="font-size:12px;color:#8e8e93;margin-bottom:20px;text-align:center;">${partido.fch?.split('T')[0]||''} · ${partido.hor?.substring(0,5)||''}</div>
        ${advertenciaHTML}
        
        <!-- FILA 1: Banderas y nombres -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <div style="text-align:center; flex:1;">
                <div style="font-size:56px; margin-bottom:8px;">${getBandera(partido.nom_loc)}</div>
                <div style="font-size:15px; font-weight:700; color:#1c1c1e;">${partido.nom_loc}</div>
            </div>
            <div style="font-size:18px; font-weight:700; color:#8e8e93; padding:0 20px;">VS</div>
            <div style="text-align:center; flex:1;">
                <div style="font-size:56px; margin-bottom:8px;">${getBandera(partido.nom_vis)}</div>
                <div style="font-size:15px; font-weight:700; color:#1c1c1e;">${partido.nom_vis}</div>
            </div>
        </div>
        
        <!-- FILA 2: Controles -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:24px;">
            <div style="flex:1; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:12px; background:#f9f9fb; border-radius:30px; padding:8px 12px;">
                    <button id="modal-dec-loc" style="width:44px;height:44px;border-radius:22px;background:#fff;border:1px solid #e5e5ea;font-size:20px;font-weight:700;cursor:pointer;">−</button>
                    <input id="modal-s1" type="number" min="0" max="20" value="${pronostico.s1}" style="width:60px;height:44px;text-align:center;font-size:20px;font-weight:700;border:1px solid #e5e5ea;border-radius:12px;">
                    <button id="modal-inc-loc" style="width:44px;height:44px;border-radius:22px;background:#fff;border:1px solid #e5e5ea;font-size:20px;font-weight:700;cursor:pointer;">+</button>
                </div>
            </div>
            <div style="flex:1; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:12px; background:#f9f9fb; border-radius:30px; padding:8px 12px;">
                    <button id="modal-dec-vis" style="width:44px;height:44px;border-radius:22px;background:#fff;border:1px solid #e5e5ea;font-size:20px;font-weight:700;cursor:pointer;">−</button>
                    <input id="modal-s2" type="number" min="0" max="20" value="${pronostico.s2}" style="width:60px;height:44px;text-align:center;font-size:20px;font-weight:700;border:1px solid #e5e5ea;border-radius:12px;">
                    <button id="modal-inc-vis" style="width:44px;height:44px;border-radius:22px;background:#fff;border:1px solid #e5e5ea;font-size:20px;font-weight:700;cursor:pointer;">+</button>
                </div>
            </div>
        </div>
        
        <div style="background:#f2f2f7;border-radius:12px;padding:12px;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;margin-bottom:8px;">💰 PUNTOS POTENCIALES</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>🏆 Ganador / Empate</span><span>${Math.round(ptsBase*0.4)} pts</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>⚽ Goles exactos (local + visita)</span><span>${Math.round(ptsBase*0.4)} pts</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>📊 Diferencia de goles</span><span>${Math.round(ptsBase*0.2)} pts</span></div>
            <div style="height:1px;background:#e5e5ea;margin:8px 0;"></div>
            <div style="display:flex;justify-content:space-between;"><span style="font-weight:700;">⭐ Marcador exacto</span><span style="color:#ff9500;font-weight:800;">${ptsBase} pts</span></div>
        </div>
        
        <div style="background:#eafaf1;border-radius:12px;padding:12px;margin-bottom:16px;text-align:center;">
            <span style="color:#1e8449;font-size:13px;font-weight:600;">${estadoPulso.mensaje}</span>
        </div>
        
        <button id="modal-guardar-btn" style="width:100%;background:#34c759;color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;cursor:pointer;">💾 Guardar pronóstico</button>
    </div>`;
    
    document.body.appendChild(overlay);
    document.getElementById('cerrar-modal-btn')?.addEventListener('click', () => overlay.remove());
    
    const s1Input = document.getElementById('modal-s1');
    const s2Input = document.getElementById('modal-s2');
    
    document.getElementById('modal-inc-loc')?.addEventListener('click', () => { if (s1Input) s1Input.value = Math.min(20, parseInt(s1Input.value||0)+1); });
    document.getElementById('modal-dec-loc')?.addEventListener('click', () => { if (s1Input) s1Input.value = Math.max(0, parseInt(s1Input.value||0)-1); });
    document.getElementById('modal-inc-vis')?.addEventListener('click', () => { if (s2Input) s2Input.value = Math.min(20, parseInt(s2Input.value||0)+1); });
    document.getElementById('modal-dec-vis')?.addEventListener('click', () => { if (s2Input) s2Input.value = Math.max(0, parseInt(s2Input.value||0)-1); });
    
    document.getElementById('modal-guardar-btn')?.addEventListener('click', () => { 
        const s1 = parseInt(s1Input?.value)||0; 
        const s2 = parseInt(s2Input?.value)||0; 
        guardarPronostico(partido.id, s1, s2); 
        overlay.remove(); 
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function refrescarContenido() {
    const contenedorScroll = document.getElementById('partidos-contenido-scroll');
    if (!contenedorScroll) return;
    const fechaSim = simGetFechaStr ? simGetFechaStr() : new Date().toISOString().split('T')[0];
    const horaSim = simGetHoraStr ? simGetHoraStr() : new Date().toTimeString().split(' ')[0].substring(0,5);
    const partidosVisibles = filtrarPartidosVisibles(partidosCache, fechaSim);
    
    if (tabActivo === 'todos') {
        contenedorScroll.innerHTML = `<div style="padding:16px;"><div id="partidos-lista">${partidosVisibles.map(p => {
            const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
            const tipo = getTipoFondo(fechaPartido, fechaSim);
            return renderPartidoCard(p, fechaSim, horaSim, tipo);
        }).join('')}</div></div>`;
    } else if (tabActivo === 'grupos') {
        const partidosGrupo = partidosVisibles.filter(p => p.grp_for === grupoActivo);
        contenedorScroll.innerHTML = `<div style="padding:16px;"><div class="grupos-tabs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">${['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => `<button class="grupo-tab ${grupoActivo===g?'active':''}" data-grupo="${g}" style="width:48px;height:48px;border-radius:24px;background:${grupoActivo===g?'#007aff':'#f2f2f7'};border:1px solid ${grupoActivo===g?'#007aff':'#e5e5ea'};color:${grupoActivo===g?'#fff':'#3c3c43'};cursor:pointer;">${g}</button>`).join('')}</div><div style="background:#f9f9fb;border-radius:14px;border:1px solid #e5e5ea;margin-bottom:20px;">${renderTablaPosiciones(grupoActivo)}</div><div id="partidos-lista">${partidosGrupo.map(p => {
            const fechaPartido = p.fch ? p.fch.split('T')[0] : '';
            const tipo = getTipoFondo(fechaPartido, fechaSim);
            return renderPartidoCard(p, fechaSim, horaSim, tipo);
        }).join('')}</div></div>`;
    }
    
    document.querySelectorAll('.partido-card').forEach(card => {
        const id = parseInt(card.dataset.id);
        const partido = partidosCache.find(p => p.id === id);
        if (partido) {
            card.onclick = () => abrirModal(partido, fechaSim, horaSim);
        }
    });
    document.querySelectorAll('.grupo-tab').forEach(btn => { btn.onclick = () => { grupoActivo = btn.dataset.grupo; refrescarContenido(); }; });
    
    scrollAPrimerDestacado();
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
    contenedor.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;background:#fff;border-radius:16px;overflow:hidden;">
        <div style="flex-shrink:0;display:flex;gap:8px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e5ea;">
            <button class="partidos-tab active" data-tab="todos" style="flex:1;padding:10px;border:none;border-radius:12px;background:#007aff;color:#fff;cursor:pointer;">📋 TODOS</button>
            <button class="partidos-tab" data-tab="grupos" style="flex:1;padding:10px;border:none;border-radius:12px;background:#f2f2f7;color:#3c3c43;cursor:pointer;">📊 GRUPOS</button>
        </div>
        <div id="partidos-contenido-scroll" style="flex:1;overflow-y:auto;"></div>
    </div>`;
    document.querySelectorAll('.partidos-tab').forEach(tab => { tab.onclick = () => cambiarTab(tab.dataset.tab); });
    refrescarContenido();
}