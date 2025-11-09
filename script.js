// script.js
// Versión corregida y robusta para la aplicación de registro de trabajo.

// ---------------------------
// VARIABLES GLOBALES
// ---------------------------
window.horasTrabajadas = [];
window.tareas = [];
let historialMesSeleccionado = null; // Se inicializará en inicializarApp


// Referencias a elementos del DOM (se asignarán al cargar el documento)
let formularioHoras, formularioPlan, listaTareas, totalHorasElement, totalHorasMesElement,
    porcentajeProgresoElement, tareasCompletadasElement, totalTareasElement, progresoFill,
    listaHistorialMensual, listaHorasSemanal, botonToggleHistorial, selectorMesHistorial;

// ---------------------------
// FUNCIONES DE MANEJO DE FECHAS (UTC)
// ---------------------------

/**
 * Convierte una fecha 'YYYY-MM-DD' a un objeto Date en medianoche UTC.
 * Esencial para evitar errores de zona horaria.
 */
function parseDateAsUTC(dateString) {
    if (!dateString) return null;
    // Aseguramos que se interprete como UTC para evitar sesgos de zona horaria local
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Obtiene el inicio del día actual en UTC.
 */
function getHoyUTC() {
    const hoy = new Date();
    return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
}

// ---------------------------
// LÓGICA DE RENDERIZADO (DIBUJAR EN PANTALLA)
// ---------------------------

/**
 * Función maestra que actualiza toda la interfaz de usuario.
 * Se llama cuando los datos se cargan o se modifican.
 */
function actualizarTodaLaUI() {
    if (!totalHorasElement) {
        console.warn("DOM elements not yet available for UI update.");
        return;
    }
    
    console.log("Actualizando UI. Horas:", window.horasTrabajadas.length, "Tareas:", window.tareas.length); // <-- LOG
    
    calcularYRenderizarHoras();
    renderizarHistorialSemanal();
    renderizarTareas(); 
    
    if (historialMesSeleccionado && !document.getElementById('contenedor-historial-mensual')?.classList.contains('oculto')) {
        renderizarHistorialMensual();
    } else if (!historialMesSeleccionado) {
        setHistorialMes(0);
    }
}


/**
 * Calcula y muestra el total de horas semanales y mensuales.
 */
function calcularYRenderizarHoras() {
    const hoy = getHoyUTC();
    const mesActualUTC = hoy.getUTCMonth();
    const añoActualUTC = hoy.getUTCFullYear();
    const diaSemanaUTC = hoy.getUTCDay() === 0 ? 6 : hoy.getUTCDay() - 1; // Lunes = 0

    const inicioSemana = new Date(hoy);
    inicioSemana.setUTCDate(hoy.getUTCDate() - diaSemanaUTC);
    inicioSemana.setUTCHours(0, 0, 0, 0); // Aseguramos el inicio del día

    const finSemana = new Date(inicioSemana);
    finSemana.setUTCDate(inicioSemana.getUTCDate() + 6);
    finSemana.setUTCHours(23, 59, 59, 999); // Aseguramos el final del día

    let minutosSemanales = 0;
    let minutosMensuales = 0;

    window.horasTrabajadas.forEach(reg => {
        const fechaReg = parseDateAsUTC(reg.fecha);
        if (!fechaReg) return;

        const duracion = calcularDuracionEnMinutos(reg.horaEntrada, reg.horaSalida);
        if (duracion <= 0) return;

        // Sumar a total mensual
        if (fechaReg.getUTCFullYear() === añoActualUTC && fechaReg.getUTCMonth() === mesActualUTC) {
            minutosMensuales += duracion;
        }
        // Sumar a total semanal
        if (fechaReg >= inicioSemana && fechaReg <= finSemana) {
            minutosSemanales += duracion;
        }
    });

    totalHorasElement.textContent = (minutosSemanales / 60).toFixed(2);
    totalHorasMesElement.textContent = (minutosMensuales / 60).toFixed(2);
}

/**
 * Muestra la lista de registros de la semana actual.
 */
function renderizarHistorialSemanal() {
    if (!listaHorasSemanal) return;

    const hoy = getHoyUTC();
    const diaSemanaUTC = hoy.getUTCDay() === 0 ? 6 : hoy.getUTCDay() - 1; // Lunes = 0
    const inicioSemana = new Date(hoy);
    inicioSemana.setUTCDate(hoy.getUTCDate() - diaSemanaUTC);
    inicioSemana.setUTCHours(0,0,0,0);

    const finSemana = new Date(inicioSemana);
    finSemana.setUTCDate(inicioSemana.getUTCDate() + 6);
    finSemana.setUTCHours(23,59,59,999);

    const registrosSemana = window.horasTrabajadas.filter(reg => {
        const fechaReg = parseDateAsUTC(reg.fecha);
        return fechaReg && fechaReg >= inicioSemana && fechaReg <= finSemana;
    });

    listaHorasSemanal.innerHTML = '';
    if (registrosSemana.length === 0) {
        listaHorasSemanal.innerHTML = '<li class="registro-hora"><em>No hay registros esta semana.</em></li>';
        return;
    }

    registrosSemana.sort((a, b) => parseDateAsUTC(b.fecha) - parseDateAsUTC(a.fecha));
    registrosSemana.forEach(reg => listaHorasSemanal.appendChild(crearElementoRegistro(reg)));
}

/**
 * Muestra la lista de registros del mes seleccionado en el historial.
 */
function renderizarHistorialMensual() {
    if (!listaHistorialMensual || !historialMesSeleccionado) {
        console.warn("No se puede renderizar el historial mensual: listaHistorialMensual o historialMesSeleccionado no definidos.");
        return;
    }

    const { mes, año } = historialMesSeleccionado;
    const registrosMes = window.horasTrabajadas.filter(r => {
        const fecha = parseDateAsUTC(r.fecha);
        return fecha && fecha.getUTCMonth() === mes && fecha.getUTCFullYear() === año;
    });

    listaHistorialMensual.innerHTML = '';
    if (registrosMes.length === 0) {
        listaHistorialMensual.innerHTML = '<li class="registro-hora"><em>No hay registros para este periodo.</em></li>';
        return;
    }

    registrosMes.sort((a, b) => parseDateAsUTC(b.fecha) - parseDateAsUTC(a.fecha));
    registrosMes.forEach(reg => listaHistorialMensual.appendChild(crearElementoRegistro(reg)));
}

/**
 * Muestra la lista de tareas y actualiza el progreso.
 */
function renderizarTareas() {
    if (!listaTareas) {
        console.error("listaTareas no está definido. No se pueden renderizar tareas."); // <-- LOG
        return;
    }
    console.log("Renderizando tareas. Total de tareas en window.tareas:", window.tareas.length); // <-- LOG
    listaTareas.innerHTML = '';
    
    window.tareas.sort((a, b) => a.completada - b.completada);
    
    window.tareas.forEach(t => {
        const li = document.createElement('li');
        li.className = 'tarea-item';
        li.setAttribute('data-prioridad', t.prioridad);
        li.innerHTML = `<span class="tarea-texto ${t.completada ? 'tarea-completada' : ''}">${t.texto}</span>
                        <div class="botones-tarea">
                            <button class="btn btn-completar" onclick="toggleCompletada(${t.id})">${t.completada ? 'Desmarcar' : 'Completar'}</button>
                            <button class="btn btn-eliminar" onclick="eliminarTarea(${t.id})">Eliminar</button>
                        </div>`;
        listaTareas.appendChild(li);
    });

    actualizarProgreso();
}

/**
 * Actualiza el círculo y los contadores de progreso de tareas.
 */
// Dentro de la función actualizarProgreso()
function actualizarProgreso() {
    if (!porcentajeProgresoElement || !progresoFill) {
        console.error("Elementos de progreso (porcentajeProgresoElement o progresoFill) no definidos.");
        return;
    }

    const total = window.tareas.length;
    const completadas = window.tareas.filter(t => t.completada).length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
    
    console.log(`Actualizando progreso: Total=${total}, Completadas=${completadas}, Porcentaje=${porcentaje}%`);
    
    porcentajeProgresoElement.textContent = `${porcentaje}%`;
    tareasCompletadasElement.textContent = completadas;
    totalTareasElement.textContent = total;
    
    const circunferencia = 2 * Math.PI * 60;
    progresoFill.style.strokeDasharray = circunferencia;
    progresoFill.style.strokeDashoffset = circunferencia - (porcentaje / 100) * circunferencia;

    let colorDelProgreso; // Variable para almacenar el color

    if (porcentaje === 0) {
        colorDelProgreso = '#cf3636'; // Rojo
    } else if (porcentaje < 50) {
        colorDelProgreso = '#cf7336'; // Tu rojo/naranja (le quité el `ff` del final, que suele ser para opacidad en HEXA, no es estándar)
    } else if (porcentaje < 80) {
        colorDelProgreso = '#bbff00'; // Tu verde limón (le quité el `ff` del final)
    } else {
        colorDelProgreso = '#00bfa5'; // Verde
    }

    progresoFill.style.stroke = colorDelProgreso;
    console.log(`Color aplicado al progreso: ${colorDelProgreso}`); // <-- ¡NUEVO LOG AQUÍ!
    
    // Opcional: Si la sombra sigue activa y quieres que cambie de color
    // const progresoCircularSVG = document.querySelector('.progreso-circular');
    // if (progresoCircularSVG) {
    //     progresoCircularSVG.style.filter = `drop-shadow(0 0 8px ${colorDelProgreso}A0)`; // Ajustar sombra con el color del progreso (A0 es opacidad)
    // }
}

// ---------------------------
// MANEJADORES DE EVENTOS Y ACCIONES
// ---------------------------

async function agregarHora(evento) {
    evento.preventDefault();
    const [fecha, horaEntrada, horaSalida] = [
        document.getElementById('fecha').value,
        document.getElementById('hora-entrada').value,
        document.getElementById('hora-salida').value
    ];

    if (!fecha || !horaEntrada || !horaSalida) {
        return alert('Completa todos los campos.');
    }
    if (calcularDuracionEnMinutos(horaEntrada, horaSalida) <= 0) {
        return alert('La hora de salida debe ser mayor a la de entrada.');
    }

    window.horasTrabajadas.push({ id: Date.now(), fecha, horaEntrada, horaSalida });
    formularioHoras.reset();

    await window.guardarDatos();
    actualizarTodaLaUI();
    alert('Hora registrada con éxito.');
}

async function agregarTarea(evento) {
    evento.preventDefault();
    const texto = document.getElementById('tarea').value.trim();
    if (!texto) return alert('Escribe una tarea.');

    const nuevaTarea = { // <-- Guarda la tarea en una variable temporal
        id: Date.now(), 
        texto, 
        prioridad: document.getElementById('prioridad').value, 
        completada: false 
    };
    window.tareas.push(nuevaTarea);
    console.log("Tarea agregada a window.tareas:", nuevaTarea); // <-- LOG
    console.log("Estado actual de window.tareas después de agregar:", window.tareas); // <-- LOG

    formularioPlan.reset();

    await window.guardarDatos();
    console.log("Datos guardados en Firebase."); // <-- LOG
    actualizarTodaLaUI();
    alert('Tarea agregada.');
}


async function eliminarRegistroHora(id) {
    window.horasTrabajadas = window.horasTrabajadas.filter(h => h.id !== id);
    await window.guardarDatos();
    actualizarTodaLaUI();
}

async function toggleCompletada(id) {
    console.log("Intentando cambiar estado de completado para la tarea ID:", id); // <-- LOG

    const tarea = window.tareas.find(t => t.id === id);
    
    if (tarea) {
        tarea.completada = !tarea.completada; // Invierte el estado
        console.log(`Estado de tarea ID ${id} cambiado a completada: ${tarea.completada}`); // <-- LOG
        console.log("Estado de window.tareas después de toggle:", window.tareas); // <-- LOG

        await window.guardarDatos();
        console.log("Datos guardados en Firebase después de toggle."); // <-- LOG
        actualizarTodaLaUI();
    } else {
        console.warn("Tarea con ID", id, "no encontrada en window.tareas."); // <-- LOG
    }
}

async function eliminarTarea(id) {
    window.tareas = window.tareas.filter(t => t.id !== id);
    await window.guardarDatos();
    actualizarTodaLaUI();
}

/**
 * Establece el mes actual para el historial mensual y lo renderiza.
 * @param {number} offset El offset en meses respecto al mes actual (0 = actual, -1 = anterior, etc.).
 */
function setHistorialMes(offset) {
    const fechaRef = getHoyUTC();
    fechaRef.setUTCMonth(fechaRef.getUTCMonth() + offset);
    historialMesSeleccionado = { mes: fechaRef.getUTCMonth(), año: fechaRef.getUTCFullYear() };
    
    const opciones = { year: 'numeric', month: 'long', timeZone: 'UTC' };
    const nombreMes = fechaRef.toLocaleDateString('es-ES', opciones);
    if (botonToggleHistorial) {
        botonToggleHistorial.textContent = `▶ Historial (${nombreMes})`;
    }
    
    // Solo renderizar si la sección de historial mensual está visible
    if (!document.getElementById('contenedor-historial-mensual')?.classList.contains('oculto')) {
        renderizarHistorialMensual();
    }
}

// ---------------------------
// FUNCIONES AUXILIARES
// ---------------------------

function calcularDuracionEnMinutos(entradaStr, salidaStr) {
    // Usamos una fecha arbitraria (1970-01-01) y la marcamos como UTC para solo comparar tiempos.
    // Creamos la fecha de entrada
    const entrada = new Date(`1970-01-01T${entradaStr}:00Z`);
    // Creamos la fecha de salida, inicialmente en el mismo día
    let salida = new Date(`1970-01-01T${salidaStr}:00Z`);

    if (isNaN(entrada.getTime()) || isNaN(salida.getTime())) {
        console.error("Fechas/horas inválidas pasadas a calcularDuracionEnMinutos");
        return 0;
    }

    // Si la hora de salida es menor o igual que la hora de entrada,
    // significa que la salida es en el día siguiente.
    if (salida <= entrada) {
        // Le sumamos un día (24 horas * 60 minutos * 60 segundos * 1000 milisegundos)
        salida = new Date(salida.getTime() + (24 * 60 * 60 * 1000));
    }

    // Ahora que hemos ajustado la fecha de salida si es necesario,
    // calculamos la duración. La duración debe ser siempre positiva.
    const duracionEnMilisegundos = salida - entrada;
    return Math.floor(duracionEnMilisegundos / 60000); // Convertir milisegundos a minutos
}

function formatearDuracion(minutos) {
    if (minutos <= 0) return '0m';
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return `${horas}h ${resto}m`;
}

function formatearFechaLegible(fechaStr) {
    const fecha = parseDateAsUTC(fechaStr);
    if (!fecha) return 'Fecha inválida';
    const opciones = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' };
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha).replace(/\./g, '');
}

function crearElementoRegistro(reg) {
    const li = document.createElement('li');
    li.className = 'registro-hora';
    const duracion = formatearDuracion(calcularDuracionEnMinutos(reg.horaEntrada, reg.horaSalida));
    li.innerHTML = `<div class="detalle">
                        <strong>${reg.horaEntrada}</strong> - <strong>${reg.horaSalida}</strong><br>
                        <small>${duracion} | ${formatearFechaLegible(reg.fecha)}</small>
                    </div>
                    <button class="accion" onclick="eliminarRegistroHora(${reg.id})">Eliminar</button>`;
    return li;
}

// ---------------------------
// INICIALIZACIÓN DE LA APLICACIÓN
// ---------------------------

/**
 * Se ejecuta cuando el DOM está completamente cargado.
 */
function inicializarApp() {
    // Asignar elementos del DOM a variables
    formularioHoras = document.getElementById('formulario-horas');
    formularioPlan = document.getElementById('formulario-plan');
    listaTareas = document.getElementById('lista-tareas');
    totalHorasElement = document.getElementById('total-horas');
    totalHorasMesElement = document.getElementById('total-horas-mes');
    porcentajeProgresoElement = document.getElementById('porcentaje-progreso');
    tareasCompletadasElement = document.getElementById('tareas-completadas');
    totalTareasElement = document.getElementById('total-tareas');
    progresoFill = document.querySelector('.progreso-circular-fill');
    listaHistorialMensual = document.getElementById('lista-historial-mensual');
    listaHorasSemanal = document.getElementById('lista-horas');
    botonToggleHistorial = document.getElementById('boton-toggle-historial');
    selectorMesHistorial = document.getElementById('selector-mes-historial');

    // Asignar manejadores de eventos a los formularios
    formularioHoras?.addEventListener('submit', agregarHora);
    formularioPlan?.addEventListener('submit', agregarTarea);

    // Inicializar el historial mensual con el mes actual
    setHistorialMes(0);

    // Escuchar el evento personalizado 'datosCargados' que se dispara desde index.html
    document.addEventListener('datosCargados', () => {
        console.log("Evento 'datosCargados' recibido. Renderizando UI...");
        actualizarTodaLaUI();
    });

    // Se recomienda no llamar a actualizarTodaLaUI aquí,
    // ya que los datos aún no se han cargado desde Firebase.
    // La actualización inicial se hará con el evento 'datosCargados'.
    console.log("App inicializada. Esperando datos de Firebase...");
}

document.addEventListener('DOMContentLoaded', inicializarApp);

// Hacer funciones clave accesibles globalmente para los `onclick` del HTML
window.setHistorialMes = setHistorialMes;
window.toggleCompletada = toggleCompletada;
window.eliminarTarea = eliminarTarea;
window.eliminarRegistroHora = eliminarRegistroHora;

// Modificación para el control de autenticación de Firebase en el script.js si no está en index.html
// Si ya lo tienes en index.html, puedes eliminar o adaptar esto.
if (typeof firebase !== 'undefined' && typeof firebase.auth !== 'undefined') {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            // Aseguramos que `cargarDatos` esté accesible
            if (typeof window.cargarDatos === 'function') {
                await window.cargarDatos(currentUserId);
            }
        } else {
            currentUserId = null;
            window.horasTrabajadas = [];
            window.tareas = [];
            document.dispatchEvent(new Event('datosCargados'));
        }
    });
}

// Asegurar que la función guardarDatos sea global si no lo es ya
window.guardarDatos = window.guardarDatos || async function() {
    if (!currentUserId || !window.horasTrabajadas || !window.tareas) return;
    try {
        await db.collection('usuarios').doc(currentUserId).set({
            horasTrabajadas: window.horasTrabajadas,
            tareas: window.tareas,
            updatedAt: new Date()
        });
    } catch (e) {
        console.error("Error al guardar en Firestore desde script.js:", e);
    }
};

// Función para el botón de toggle del historial mensual
window.toggleHistorialMensualConSelector = function() {
    const contenedor = document.getElementById('contenedor-historial-mensual');
    const selector = document.getElementById('selector-mes-historial');
    const boton = document.getElementById('boton-toggle-historial');

    if (!contenedor || !selector || !boton) return;

    if (contenedor.classList.contains('oculto')) {
        contenedor.classList.remove('oculto');
        selector.style.display = 'block';
        boton.classList.add('expandido');
        
        // Asegurarse de que el historial se renderice cuando se muestra
        if (!historialMesSeleccionado) {
             setHistorialMes(0); // Establecer el mes actual si no hay uno seleccionado
        } else {
             renderizarHistorialMensual();
        }
    } else {
        contenedor.classList.add('oculto');
        selector.style.display = 'none';
        boton.classList.remove('expandido');
    }
};