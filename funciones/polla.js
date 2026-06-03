// funciones/polla.js
// Módulo de La Polla - Simulador interactivo de puntos

export async function renderizarPolla(contenedor, datosCuenta) {
    if (!contenedor) return;
    
    contenedor.innerHTML = `
        <div style="width:100%; background: #ffffff; border-radius: 20px; padding: 20px;">
            <style>
                /* ========== ESTILOS PROPIOS DE LA POLLA ========== */
                .polla-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #e5e5ea;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .polla-titulo {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1c1c1e;
                }
                .polla-subtitulo {
                    font-size: 13px;
                    color: #8e8e93;
                    margin-top: 4px;
                }
                .polla-badge {
                    background: #ff9500;
                    color: white;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                }
                .polla-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .polla-card {
                    background: #f9f9fb;
                    border: 1px solid #e5e5ea;
                    border-radius: 20px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }
                .polla-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: rgba(0, 0, 0, 0.02);
                    border-bottom: 1px solid #e5e5ea;
                    cursor: pointer;
                }
                .polla-card-icono {
                    font-size: 28px;
                }
                .polla-card-titulo {
                    flex: 1;
                    font-size: 16px;
                    font-weight: 700;
                    color: #1c1c1e;
                }
                .polla-card-estado {
                    font-size: 12px;
                    color: #8e8e93;
                }
                .polla-card-estado.activo {
                    color: #34c759;
                }
                .polla-card-flecha {
                    font-size: 16px;
                    color: #8e8e93;
                    transition: transform 0.2s;
                }
                .polla-card-contenido {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease-out;
                }
                .polla-card-contenido.abierto {
                    max-height: 800px;
                    overflow-y: auto;
                    transition: max-height 0.3s ease-in;
                }
                .polla-card-contenido-inner {
                    padding: 16px;
                }
                
                /* ========== ESTILOS DEL SIMULADOR ========== */
                .simulador-puntos {
                    width: 100%;
                }
                .fase-selector-sim {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 12px;
                    background: #f0f0f5;
                    padding: 12px 16px;
                    border-radius: 16px;
                }
                .fase-label-sim {
                    font-size: 13px;
                    font-weight: 600;
                    color: #1c1c1e;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .fase-select-sim {
                    background: white;
                    border: 1px solid #d1d1d6;
                    border-radius: 28px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #1c1c1e;
                    cursor: pointer;
                    font-family: inherit;
                    min-width: 200px;
                }
                .cancha-wrapper-sim {
                    background: #4c9e2f;
                    border-radius: 16px;
                    padding: 4px;
                    margin-bottom: 20px;
                }
                .cancha-sim {
                    position: relative;
                    background: #4c9e2f;
                    background-image: repeating-linear-gradient(
                        90deg,
                        #4c9e2f 0px, #4c9e2f 8.33%,
                        #3d8b24 8.33%, #3d8b24 16.66%,
                        #4c9e2f 16.66%, #4c9e2f 25%,
                        #3d8b24 25%, #3d8b24 33.33%,
                        #4c9e2f 33.33%, #4c9e2f 41.66%,
                        #3d8b24 41.66%, #3d8b24 50%
                    );
                    border-radius: 12px;
                    border: 2px solid rgba(255, 255, 255, 0.85);
                    min-height: 280px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                }
                .equipo-local-sim, .equipo-visita-sim {
                    text-align: center;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(8px);
                    border-radius: 20px;
                    padding: 12px 16px;
                    min-width: 120px;
                }
                .bandera-sim {
                    font-size: 36px;
                    margin-bottom: 6px;
                }
                .equipo-nombre-sim {
                    font-size: 10px;
                    font-weight: 700;
                    color: #fff;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .pronostico-input-sim {
                    background: transparent;
                    border: none;
                    font-size: 28px;
                    font-weight: 800;
                    color: #ffd700;
                    text-align: center;
                    width: 70px;
                    font-family: monospace;
                }
                .pronostico-input-sim:focus {
                    outline: none;
                }
                .btn-simular-sim {
                    background: linear-gradient(135deg, #ff3b30, #c72a1f);
                    border: none;
                    border-radius: 40px;
                    padding: 10px 20px;
                    font-size: 12px;
                    font-weight: 800;
                    color: white;
                    cursor: pointer;
                    font-family: monospace;
                    margin-top: 12px;
                    width: 100%;
                }
                .resultado-real-sim {
                    background: #f0f0f5;
                    border-radius: 16px;
                    padding: 16px;
                    margin: 16px 0;
                    text-align: center;
                }
                .resultado-real-titulo {
                    font-size: 13px;
                    font-weight: 700;
                    color: #ff9500;
                    margin-bottom: 12px;
                }
                .resultado-selector-sim {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                }
                .resultado-equipo-sim {
                    text-align: center;
                }
                .resultado-controls-sim {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .resultado-controls-sim button {
                    background: white;
                    border: 1px solid #d1d1d6;
                    border-radius: 12px;
                    width: 32px;
                    height: 32px;
                    font-size: 18px;
                    font-weight: 700;
                    cursor: pointer;
                }
                .resultado-goles-sim {
                    font-size: 20px;
                    font-weight: 800;
                    min-width: 45px;
                    text-align: center;
                }
                .botones-pred-sim {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    justify-content: center;
                    margin: 16px 0;
                }
                .btn-pred-sim {
                    background: #f0f0f5;
                    border: 1px solid #d1d1d6;
                    border-radius: 12px;
                    padding: 8px 12px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .btn-pred-sim.activo {
                    background: #007aff;
                    color: white;
                    border-color: #007aff;
                }
                .tabla-puntos-sim {
                    background: #f0f0f5;
                    border-radius: 16px;
                    padding: 16px;
                    margin-top: 16px;
                }
                .tabla-header-sim {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #d1d1d6;
                }
                .badge-base-sim {
                    background: #ff3b30;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                }
                .fila-categoria-sim {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 0.5px solid #e5e5ea;
                }
                .categoria-puntos-sim.acierto {
                    color: #ff9500;
                    font-weight: 700;
                }
                .total-sim {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #d1d1d6;
                }
                .total-puntos-sim {
                    font-size: 24px;
                    font-weight: 800;
                }
                .total-puntos-sim.acierto {
                    color: #ff9500;
                }
                .placeholder-construccion {
                    text-align: center;
                    padding: 40px;
                    color: #8e8e93;
                }
                .placeholder-icono {
                    font-size: 48px;
                    margin-bottom: 12px;
                    opacity: 0.5;
                }
            </style>
            
            <div class="polla-header">
                <div>
                    <div class="polla-titulo">🏆 La Polla</div>
                    <div class="polla-subtitulo">Simulador interactivo de puntos</div>
                </div>
                <div class="polla-badge">${datosCuenta.ptr || datosCuenta.pun || 0} pts totales</div>
            </div>
            
            <div class="polla-cards" id="polla-cards">
                <!-- CARD 1: PUNTOS PARTIDOS (SIMULADOR) -->
                <div class="polla-card" data-card="simulador">
                    <div class="polla-card-header">
                        <div class="polla-card-icono">🏆</div>
                        <div class="polla-card-titulo">Puntos partidos</div>
                        <div class="polla-card-estado activo">🎮 Simulador</div>
                        <div class="polla-card-flecha">▼</div>
                    </div>
                    <div class="polla-card-contenido" id="card-simulador-contenido">
                        <div class="polla-card-contenido-inner">
                            <div id="simulador-root"></div>
                        </div>
                    </div>
                </div>
                
                <!-- CARD 2: PUNTOS ESPECIALES (EN CONSTRUCCIÓN) -->
                <div class="polla-card" data-card="especiales">
                    <div class="polla-card-header">
                        <div class="polla-card-icono">⭐</div>
                        <div class="polla-card-titulo">Puntos Especiales</div>
                        <div class="polla-card-estado">🚧 En construcción</div>
                        <div class="polla-card-flecha">▼</div>
                    </div>
                    <div class="polla-card-contenido" id="card-especiales-contenido">
                        <div class="polla-card-contenido-inner">
                            <div class="placeholder-construccion">
                                <div class="placeholder-icono">🔨</div>
                                <div>Próximamente disponible</div>
                                <div style="font-size:12px; margin-top:8px;">Categorías especiales y pronósticos adicionales</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- CARD 3: REGLAS DE LA POLLA (EN CONSTRUCCIÓN) -->
                <div class="polla-card" data-card="reglas">
                    <div class="polla-card-header">
                        <div class="polla-card-icono">📋</div>
                        <div class="polla-card-titulo">Reglas de la Polla</div>
                        <div class="polla-card-estado">🚧 En construcción</div>
                        <div class="polla-card-flecha">▼</div>
                    </div>
                    <div class="polla-card-contenido" id="card-reglas-contenido">
                        <div class="polla-card-contenido-inner">
                            <div class="placeholder-construccion">
                                <div class="placeholder-icono">📖</div>
                                <div>Próximamente disponible</div>
                                <div style="font-size:12px; margin-top:8px;">Sistema de puntuación y reglas oficiales</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Configurar eventos de colapso/expansión
    const cards = document.querySelectorAll('.polla-card');
    cards.forEach(card => {
        const header = card.querySelector('.polla-card-header');
        const contenido = card.querySelector('.polla-card-contenido');
        const flecha = card.querySelector('.polla-card-flecha');
        
        header.addEventListener('click', () => {
            const estaAbierto = contenido.classList.contains('abierto');
            
            // Cerrar todos
            document.querySelectorAll('.polla-card-contenido').forEach(c => {
                c.classList.remove('abierto');
            });
            document.querySelectorAll('.polla-card-flecha').forEach(f => {
                f.style.transform = 'rotate(0deg)';
            });
            
            // Abrir el seleccionado si no estaba abierto
            if (!estaAbierto) {
                contenido.classList.add('abierto');
                flecha.style.transform = 'rotate(180deg)';
            }
        });
    });
    
    // INYECTAR EL SIMULADOR COMPLETO
    inyectarSimulador();
}

// ========== SIMULADOR COMPLETO ==========
function inyectarSimulador() {
    const root = document.getElementById('simulador-root');
    if (!root) return;
    
    // Banderas aleatorias
    const BANDERAS = ['🇦🇷', '🇧🇷', '🇫🇷', '🇩🇪', '🇪🇸', '🇮🇹', '🇳🇱', '🇵🇹', '🇬🇧', '🇺🇸', '🇲🇽', '🇨🇴', '🇯🇵', '🇦🇺'];
    const banderaLocal = BANDERAS[Math.floor(Math.random() * BANDERAS.length)];
    const banderaVisita = BANDERAS[Math.floor(Math.random() * BANDERAS.length)];
    
    // PUNTOS POR FASE
    const PUNTOS_POR_FASE = {
        'grupos':   { BASE: 20, GANADOR: 8,  GOL: 4, DIFERENCIA: 4, INVERSO: 4 },
        '16avos':   { BASE: 40, GANADOR: 16, GOL: 8, DIFERENCIA: 8, INVERSO: 8 },
        '8avos':    { BASE: 60, GANADOR: 24, GOL: 12, DIFERENCIA: 12, INVERSO: 12 },
        'cuartos':  { BASE: 80, GANADOR: 32, GOL: 16, DIFERENCIA: 16, INVERSO: 16 },
        'semis':    { BASE: 100, GANADOR: 40, GOL: 20, DIFERENCIA: 20, INVERSO: 20 },
        'tercero':  { BASE: 100, GANADOR: 40, GOL: 20, DIFERENCIA: 20, INVERSO: 20 },
        'final':    { BASE: 200, GANADOR: 80, GOL: 40, DIFERENCIA: 40, INVERSO: 40 }
    };
    
    let pronosticoLocal = 3;
    let pronosticoVisita = 2;
    let resultadoRealLocal = 0;
    let resultadoRealVisita = 0;
    let puntosActuales = PUNTOS_POR_FASE['grupos'];
    
    // Renderizar HTML del simulador
    root.innerHTML = `
        <div class="simulador-puntos">
            <div class="fase-selector-sim">
                <span class="fase-label-sim">📅 SELECCIONE LA FASE</span>
                <select id="faseSelectSim" class="fase-select-sim">
                    <option value="grupos">🏆 GRUPOS - Base 20 pts</option>
                    <option value="16avos">⚡ 16 AVOS - Base 40 pts</option>
                    <option value="8avos">⚡ 8 AVOS - Base 60 pts</option>
                    <option value="cuartos">🏅 CUARTOS - Base 80 pts</option>
                    <option value="semis">🔥 SEMIFINALES - Base 100 pts</option>
                    <option value="tercero">🥉 3º y 4º PUESTO - Base 100 pts</option>
                    <option value="final">🏆 FINAL - Base 200 pts</option>
                </select>
            </div>
            
            <div class="cancha-wrapper-sim">
                <div class="cancha-sim">
                    <div class="equipo-local-sim">
                        <div class="bandera-sim">${banderaLocal}</div>
                        <div class="equipo-nombre-sim">PRONÓSTICO A</div>
                        <input type="number" id="pronosticoLocalSim" class="pronostico-input-sim" value="3" readonly>
                    </div>
                    <div class="equipo-visita-sim">
                        <div class="bandera-sim">${banderaVisita}</div>
                        <div class="equipo-nombre-sim">PRONÓSTICO B</div>
                        <input type="number" id="pronosticoVisitaSim" class="pronostico-input-sim" value="2" readonly>
                    </div>
                </div>
                <button id="btnSimularSim" class="btn-simular-sim">🎲 SIMULAR PRONÓSTICO</button>
            </div>
            
            <div class="resultado-real-sim">
                <div class="resultado-real-titulo">🎯 RESULTADO REAL</div>
                <div class="resultado-selector-sim">
                    <div class="resultado-equipo-sim">
                        <div>⚽ EQUIPO A</div>
                        <div class="resultado-controls-sim">
                            <button id="btnRealDecLocalSim">−</button>
                            <span id="realGolLocalSim" class="resultado-goles-sim">0</span>
                            <button id="btnRealIncLocalSim">+</button>
                        </div>
                    </div>
                    <div style="font-weight:700;">VS</div>
                    <div class="resultado-equipo-sim">
                        <div>⚽ EQUIPO B</div>
                        <div class="resultado-controls-sim">
                            <button id="btnRealDecVisitaSim">−</button>
                            <span id="realGolVisitaSim" class="resultado-goles-sim">0</span>
                            <button id="btnRealIncVisitaSim">+</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="botones-pred-sim">
                <button class="btn-pred-sim" data-local="3" data-visita="0">3 - 0</button>
                <button class="btn-pred-sim" data-local="3" data-visita="1">3 - 1</button>
                <button class="btn-pred-sim" data-local="3" data-visita="2">3 - 2</button>
                <button class="btn-pred-sim" data-local="3" data-visita="3">3 - 3</button>
                <button class="btn-pred-sim" data-local="2" data-visita="0">2 - 0</button>
                <button class="btn-pred-sim" data-local="2" data-visita="1">2 - 1</button>
                <button class="btn-pred-sim" data-local="2" data-visita="2">2 - 2</button>
                <button class="btn-pred-sim" data-local="2" data-visita="3">2 - 3</button>
                <button class="btn-pred-sim" data-local="0" data-visita="0">0 - 0</button>
                <button class="btn-pred-sim" data-local="1" data-visita="0">1 - 0</button>
                <button class="btn-pred-sim" data-local="1" data-visita="1">1 - 1</button>
                <button class="btn-pred-sim" data-local="1" data-visita="2">1 - 2</button>
            </div>
            
            <div class="tabla-puntos-sim">
                <div class="tabla-header-sim">
                    <span>📋 Detalle de puntos</span>
                    <span class="badge-base-sim" id="basePtsBadgeSim">BASE: 20 PTS</span>
                </div>
                <div class="fila-categoria-sim">
                    <span>🏆 Ganador / Empate</span>
                    <span id="ptsGanadorSim" class="categoria-puntos-sim">0 pts</span>
                </div>
                <div class="fila-categoria-sim">
                    <span>⚽ Gol local exacto</span>
                    <span id="ptsGolLocalSim" class="categoria-puntos-sim">0 pts</span>
                </div>
                <div class="fila-categoria-sim">
                    <span>⚽ Gol visita exacto</span>
                    <span id="ptsGolVisitaSim" class="categoria-puntos-sim">0 pts</span>
                </div>
                <div class="fila-categoria-sim">
                    <span>📊 Diferencia de goles</span>
                    <span id="ptsDiferenciaSim" class="categoria-puntos-sim">0 pts</span>
                </div>
                <div class="fila-categoria-sim">
                    <span>🔄 Marcador inverso</span>
                    <span id="ptsInversoSim" class="categoria-puntos-sim">0 pts</span>
                </div>
                <div class="total-sim">
                    <span>⭐ PUNTAJE TOTAL</span>
                    <span id="totalPuntosSim" class="total-puntos-sim">0 pts</span>
                </div>
            </div>
        </div>
    `;
    
    // ========== LÓGICA DEL SIMULADOR ==========
    function getGanador(local, visita) {
        if (local > visita) return 'local';
        if (visita > local) return 'visita';
        return 'empate';
    }
    
    function getDiferencia(local, visita) {
        return Math.abs(local - visita);
    }
    
    function calcularPuntos() {
        const p = puntosActuales;
        let ganador = 0, golLocal = 0, golVisita = 0, diferencia = 0, inverso = 0;
        
        const pronosticoGanador = getGanador(pronosticoLocal, pronosticoVisita);
        const realGanador = getGanador(resultadoRealLocal, resultadoRealVisita);
        
        if (pronosticoGanador === realGanador) ganador = p.GANADOR;
        if (resultadoRealLocal === pronosticoLocal) golLocal = p.GOL;
        if (resultadoRealVisita === pronosticoVisita) golVisita = p.GOL;
        
        const pronosticoDiferencia = getDiferencia(pronosticoLocal, pronosticoVisita);
        const realDiferencia = getDiferencia(resultadoRealLocal, resultadoRealVisita);
        if (pronosticoDiferencia === realDiferencia) diferencia = p.DIFERENCIA;
        
        if (pronosticoGanador !== realGanador) {
            if (resultadoRealLocal === pronosticoVisita && resultadoRealVisita === pronosticoLocal) {
                inverso = p.INVERSO;
            }
        }
        
        const total = ganador + golLocal + golVisita + diferencia + inverso;
        return { ganador, golLocal, golVisita, diferencia, inverso, total };
    }
    
    function actualizarUI() {
        const pts = calcularPuntos();
        const p = puntosActuales;
        
        document.getElementById('ptsGanadorSim').innerHTML = `${pts.ganador} pts`;
        document.getElementById('ptsGolLocalSim').innerHTML = `${pts.golLocal} pts`;
        document.getElementById('ptsGolVisitaSim').innerHTML = `${pts.golVisita} pts`;
        document.getElementById('ptsDiferenciaSim').innerHTML = `${pts.diferencia} pts`;
        document.getElementById('ptsInversoSim').innerHTML = `${pts.inverso} pts`;
        document.getElementById('totalPuntosSim').innerHTML = `${pts.total} pts`;
        document.getElementById('basePtsBadgeSim').innerHTML = `BASE: ${p.BASE} PTS`;
        
        const elementos = [
            { id: 'ptsGanadorSim', valor: pts.ganador },
            { id: 'ptsGolLocalSim', valor: pts.golLocal },
            { id: 'ptsGolVisitaSim', valor: pts.golVisita },
            { id: 'ptsDiferenciaSim', valor: pts.diferencia },
            { id: 'ptsInversoSim', valor: pts.inverso }
        ];
        
        elementos.forEach(el => {
            const element = document.getElementById(el.id);
            if (el.valor > 0) element.classList.add('acierto');
            else element.classList.remove('acierto');
        });
        
        const totalEl = document.getElementById('totalPuntosSim');
        if (pts.total > 0) totalEl.classList.add('acierto');
        else totalEl.classList.remove('acierto');
    }
    
    function actualizarPronosticoUI() {
        document.getElementById('pronosticoLocalSim').value = pronosticoLocal;
        document.getElementById('pronosticoVisitaSim').value = pronosticoVisita;
        actualizarUI();
    }
    
    function actualizarResultadoUI() {
        document.getElementById('realGolLocalSim').textContent = resultadoRealLocal;
        document.getElementById('realGolVisitaSim').textContent = resultadoRealVisita;
        actualizarUI();
    }
    
    function cambiarFase(fase) {
        puntosActuales = PUNTOS_POR_FASE[fase];
        actualizarUI();
    }
    
    function simularPronostico() {
        const nuevoLocal = Math.floor(Math.random() * 6);
        const nuevoVisita = Math.floor(Math.random() * 6);
        pronosticoLocal = nuevoLocal;
        pronosticoVisita = nuevoVisita;
        actualizarPronosticoUI();
        document.querySelectorAll('.btn-pred-sim').forEach(b => b.classList.remove('activo'));
    }
    
    // Eventos
    document.getElementById('btnSimularSim').addEventListener('click', simularPronostico);
    
    document.querySelectorAll('.btn-pred-sim').forEach(btn => {
        btn.addEventListener('click', function() {
            pronosticoLocal = parseInt(this.dataset.local);
            pronosticoVisita = parseInt(this.dataset.visita);
            actualizarPronosticoUI();
            document.querySelectorAll('.btn-pred-sim').forEach(b => b.classList.remove('activo'));
            this.classList.add('activo');
        });
    });
    
    document.getElementById('btnRealIncLocalSim').addEventListener('click', () => {
        if (resultadoRealLocal < 20) { resultadoRealLocal++; actualizarResultadoUI(); }
        document.querySelectorAll('.btn-pred-sim').forEach(b => b.classList.remove('activo'));
    });
    document.getElementById('btnRealDecLocalSim').addEventListener('click', () => {
        if (resultadoRealLocal > 0) { resultadoRealLocal--; actualizarResultadoUI(); }
        document.querySelectorAll('.btn-pred-sim').forEach(b => b.classList.remove('activo'));
    });
    document.getElementById('btnRealIncVisitaSim').addEventListener('click', () => {
        if (resultadoRealVisita < 20) { resultadoRealVisita++; actualizarResultadoUI(); }
        document.querySelectorAll('.btn-pred-sim').forEach(b => b.classList.remove('activo'));
    });
    document.getElementById('btnRealDecVisitaSim').addEventListener('click', () => {
        if (resultadoRealVisita > 0) { resultadoRealVisita--; actualizarResultadoUI(); }
        document.querySelectorAll('.btn-pred-sim').forEach(b => b.classList.remove('activo'));
    });
    
    document.getElementById('faseSelectSim').addEventListener('change', function() {
        cambiarFase(this.value);
    });
    
    // Inicializar
    cambiarFase('grupos');
    actualizarPronosticoUI();
    actualizarResultadoUI();
}