// funciones/cuentas.js

export function cargarModuloCuentas(datosUsuario, onRegresarPulsado) {
    const cuentasCard = document.getElementById("cuentasForm");
    const nombreMostrado = datosUsuario.usrNom || datosUsuario.usr || "Participante";

    cuentasCard.innerHTML = `
        <h1 class="bienvenida-usuario">Hola, ${nombreMostrado}</h1>
        <button id="btnRegresarCuentas" class="btn-regresar">Regresar</button>
    `;

    cuentasCard.classList.remove("cuentas-hidden");
    cuentasCard.classList.add("cuentas-visible");

    document.getElementById("btnRegresarCuentas").addEventListener("click", () => {
        cuentasCard.classList.remove("cuentas-visible");
        cuentasCard.classList.add("cuentas-hidden");

        setTimeout(() => {
            cuentasCard.innerHTML = "";
            if (typeof onRegresarPulsado === "function") {
                onRegresarPulsado();
            }
        }, 400);
    });
}

// Función maestra para renderizar la lista aplicando el color basado en el nombre de la cuenta
export function mostrarCuentasAsignadas(listaCuentas, alSeleccionarCuenta) {
    const tablaDatos = document.getElementById("fp-tabla-datos");
    if (!tablaDatos) return;

    tablaDatos.innerHTML = "";

    if (!listaCuentas || listaCuentas.length === 0) {
        tablaDatos.innerHTML = `<tr><td colspan="2" style="text-align:center; color:rgba(255,255,255,0.5);">No hay cuentas asignadas</td></tr>`;
        return;
    }

    // PALETA DE COLORES FIJA DE LA APLICACIÓN
    const paletaColoresFijos = ["#ff9500", "#34c759", "#ff3b30", "#af52de", "#007aff"];

    listaCuentas.forEach((cuenta) => {
        const fila = document.createElement("tr");
        fila.style.cursor = "pointer";
        
        // OBTENER UN ÍNDICE FIJO BASADO EN EL TEXTO DEL NOMBRE
        const nombreTexto = cuenta.name || cuenta.nombre || "Cuenta";
        let hashSuma = 0;
        for (let i = 0; i < nombreTexto.length; i++) {
            hashSuma += nombreTexto.charCodeAt(i);
        }
        
        // El color depende estrictamente de los caracteres del nombre
        const colorAsignado = paletaColoresFijos[hashSuma % paletaColoresFijos.length];
        const inicial = nombreTexto.charAt(0).toUpperCase();

        fila.innerHTML = `
            <td style="display: flex; align-items: center; gap: 12px; border: none; background: transparent;">
                <div class="avatar-cuenta-lista" style="
                    width: 32px; 
                    height: 32px; 
                    border-radius: 50% !important; 
                    background-color: ${colorAsignado} !important; 
                    background-image: none !important;
                    display: flex !important; 
                    align-items: center !important; 
                    justify-content: center !important; 
                    color: white !important; 
                    font-weight: 700 !important; 
                    font-size: 0.9rem !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                    flex-shrink: 0;
                ">${inicial}</div>
                <div style="display: flex; flex-direction: column; background: transparent;">
                    <span style="color: #ffffff; font-weight: 600; text-align: left;">${nombreTexto}</span>
                    <span style="color: rgba(255,255,255,0.5); font-size: 0.75rem; text-align: left;">#${cuenta.id || "—"}</span>
                </div>
            </td>
            <td style="text-align: right; color: #34c759; font-weight: 700; border: none; background: transparent;">
                ${cuenta.ptr || cuenta.pun || 0} pts
            </td>
        `;

        fila.onclick = () => {
            if (typeof alSeleccionarCuenta === "function") {
                alSeleccionarCuenta(cuenta);
            }
        };

        tablaDatos.appendChild(fila);
    });
}