// funciones/sync.js
// Módulo de sincronización con localStorage y Velneo

const STORAGE_KEYS = {
  PARTIDOS: 'polla_pronosticos_partidos',
  ESPECIALES: 'polla_pronosticos_especiales',
  JUGADOR_ID: 'polla_jugador_id',
  ULTIMA_SINCRONIZACION: 'polla_ultima_sincronizacion',
  EQUIPOS: 'polla_equipos_cache',
  GRUPOS_EQUIPOS: 'polla_grupos_equipos'
};

// Guardar pronósticos de partidos en localStorage
export function guardarPronosticosPartidosLocal(pronosticos) {
  localStorage.setItem(STORAGE_KEYS.PARTIDOS, JSON.stringify(pronosticos));
}

// Cargar pronósticos de partidos desde localStorage
export function cargarPronosticosPartidosLocal() {
  const data = localStorage.getItem(STORAGE_KEYS.PARTIDOS);
  return data ? JSON.parse(data) : {};
}

// Guardar pronósticos de especiales en localStorage
export function guardarPronosticosEspecialesLocal(data) {
  localStorage.setItem(STORAGE_KEYS.ESPECIALES, JSON.stringify(data));
}

// Cargar pronósticos de especiales desde localStorage
export function cargarPronosticosEspecialesLocal() {
  const data = localStorage.getItem(STORAGE_KEYS.ESPECIALES);
  return data ? JSON.parse(data) : { grupos: {}, finalistas: {} };
}

// Guardar ID del jugador
export function guardarJugadorIdLocal(id) {
  localStorage.setItem(STORAGE_KEYS.JUGADOR_ID, id);
}

// Obtener ID del jugador
export function getJugadorIdLocal() {
  return localStorage.getItem(STORAGE_KEYS.JUGADOR_ID);
}

// Guardar equipos cache
export function guardarEquiposCacheLocal(equipos) {
  localStorage.setItem(STORAGE_KEYS.EQUIPOS, JSON.stringify(equipos));
}

// Cargar equipos cache
export function cargarEquiposCacheLocal() {
  const data = localStorage.getItem(STORAGE_KEYS.EQUIPOS);
  return data ? JSON.parse(data) : null;
}

// Guardar grupos equipos
export function guardarGruposEquiposLocal(grupos) {
  localStorage.setItem(STORAGE_KEYS.GRUPOS_EQUIPOS, JSON.stringify(grupos));
}

// Cargar grupos equipos
export function cargarGruposEquiposLocal() {
  const data = localStorage.getItem(STORAGE_KEYS.GRUPOS_EQUIPOS);
  return data ? JSON.parse(data) : null;
}

// Actualizar timestamp de última sincronización
export function actualizarTimestampSincronizacion() {
  localStorage.setItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION, new Date().toISOString());
}

// Obtener timestamp de última sincronización
export function getUltimaSincronizacion() {
  return localStorage.getItem(STORAGE_KEYS.ULTIMA_SINCRONIZACION);
}

// Limpiar todos los datos de localStorage (logout)
export function limpiarLocalStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Verificar si hay datos en localStorage
export function hayDatosLocales() {
  return localStorage.getItem(STORAGE_KEYS.PARTIDOS) !== null;
}