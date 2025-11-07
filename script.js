// script.js
// Aplicación para registrar horas de trabajo remoto, plan de acción y progreso

// Variables globales (serán reemplazadas por los datos de Firestore)
window.horasTrabajadas = [];
window.tareas = [];

// Elementos del DOM (se inicializan en DOMContentLoaded)
let formularioHoras;
let formularioPlan;
let listaTareas;
let totalHorasElement;
let porcentajeProgresoElement;
let tareasCompletadasElement;
let totalTareasElement;
let progresoFill;

// Variable para el historial mensual
let historialMesSeleccionado = null; // null para mes actual

/**
 * Parsea una cadena de fecha YYYY-MM-DD como una fecha local a medianoche.
 * Esto evita problemas de zona horaria donde la fecha puede cambiar al día anterior.
 * @param {string} dateString - La fecha en formato YYYY-MM-DD.
 * @returns {Date}
 */
function parseDateAsLocal(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    // Usar new Date(year, monthIndex, day) para crear una fecha en la zona horaria local.
    return new Date(year, month - 1, day, 12); // Use noon to be safe
}


// --- Funciones para el selector de mes del historial ---
// mesOffset: 0 para mes actual, -1 para mes anterior, -2 para dos meses antes, etc.
function setHistorialMes(mesOffset) {
    const fechaRef = new Date();
    fechaRef.setMonth(fechaRef.getMonth() + mesOffset);
    historialMesSeleccionado = {
        mes: fechaRef.getMonth(),
        año: fechaRef.getFullYear()
    };
    renderizarHistorialMensual(); // Re-renderizar con el nuevo mes

    // Actualizar texto del botón/selector
    const opciones = { year: 'numeric', month: 'long' };
    const nombreMes = fechaRef.toLocaleDateString('es-ES', opciones);
    const botonHistorial = document.querySelector('.btn-link');
    if (botonHistorial) {
        botonHistorial.textContent = `▶ Historial (${nombreMes})`;
    }
}

// Función para calcular horas semanales
function calcularHorasSemanales() {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 (Domingo) - 6 (Sábado)
    
    // Ajustar para que la semana comience en Lunes (1)
    const inicioSemana = new Date(hoy);
    const diaOffset = (diaSemana === 0) ? 6 : diaSemana - 1; // Lunes es 0, Domingo es 6
    inicioSemana.setDate(hoy.getDate() - diaOffset);
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);


    let totalMinutos = 0;

    window.horasTrabajadas.forEach(registro => {
        const fechaRegistro = parseDateAsLocal(registro.fecha);
        if (!fechaRegistro) return;


        if (fechaRegistro >= inicioSemana && fechaRegistro <= finSemana) {
            const [hEntrada, mEntrada] = registro.horaEntrada.split(':').map(Number);
            const [hSalida, mSalida] = registro.horaSalida.split(':').map(Number);

            if (isNaN(hEntrada) || isNaN(mEntrada) || isNaN(hSalida) || isNaN(mSalida)) return;

            const minutos = (hSalida * 60 + mSalida) - (hEntrada * 60 + mEntrada);
            if (minutos > 0) {
                totalMinutos += minutos;
            }
        }
    });

    const totalHoras = (totalMinutos / 60).toFixed(2);
    if (totalHorasElement) {
        totalHorasElement.textContent = totalHoras;
    }
}

// Registrar hora
function agregarHora(evento) {
    evento.preventDefault();

    const fecha = document.getElementById('fecha').value;
    const horaEntrada = document.getElementById('hora-entrada').value;
    const horaSalida = document.getElementById('hora-salida').value;

    if (!fecha || !horaEntrada || !horaSalida) {
        alert('Completa todos los campos.');
        return;
    }

    const entrada = new Date(`2023-01-01T${horaEntrada}`);
    const salida = new Date(`2023-01-01T${horaSalida}`);

    if (salida <= entrada) {
        alert('La hora de salida debe ser mayor a la de entrada.');
        return;
    }

    const nuevoRegistro = {
        id: Date.now(),
        fecha,
        horaEntrada,
        horaSalida
    };

    window.horasTrabajadas.push(nuevoRegistro);
    formularioHoras.reset();

    // Actualizar interfaz
    calcularHorasSemanales();
    renderizarHistorialHoras();

    // Si el historial mensual está abierto, actualízalo
    const contenedor = document.getElementById('contenedor-historial-mensual');
    if (contenedor && !contenedor.classList.contains('oculto')) {
        renderizarHistorialMensual();
    }

    // Guardar en la nube
    if (typeof guardarDatos === 'function') {
        guardarDatos();
    }

    alert('Hora registrada con éxito.');
}

// Agregar tarea
function agregarTarea(evento) {
    evento.preventDefault();

    const texto = document.getElementById('tarea').value.trim();
    if (!texto) {
        alert('Escribe una tarea.');
        return;
    }

    window.tareas.push({
        id: Date.now(),
        texto,
        prioridad: document.getElementById('prioridad').value,
        completada: false
    });

    formularioPlan.reset();
    renderizarTareas();
    actualizarProgreso();

    // Guardar en la nube
    if (typeof guardarDatos === 'function') {
        guardarDatos();
    }

    alert('Tarea agregada.');
}

// Renderizar tareas
function renderizarTareas() {
    if (!listaTareas) return;
    listaTareas.innerHTML = '';

    if (!window.tareas || window.tareas.length === 0) {
        return;
    }

    window.tareas.forEach(t => {
        const li = document.createElement('li');
        li.className = 'tarea-item';
        li.setAttribute('data-prioridad', t.prioridad);
        li.innerHTML = `
            <span class="tarea-texto ${t.completada ? 'tarea-completada' : ''}">${t.texto}</span>
            <div class="botones-tarea">
                <button class="btn btn-completar" onclick="toggleCompletada(${t.id})">${t.completada ? 'Desmarcar' : 'Completar'}</button>
                <button class="btn btn-eliminar" onclick="eliminarTarea(${t.id})">Eliminar</button>
            </div>
        `;
        listaTareas.appendChild(li);
    });
}

// Toggle tarea
function toggleCompletada(id) {
    const t = window.tareas.find(t => t.id === id);
    if (t) {
        t.completada = !t.completada;
        renderizarTareas();
        actualizarProgreso();
        if (typeof guardarDatos === 'function') {
            guardarDatos();
        }
    }
}

// Eliminar tarea
function eliminarTarea(id) {
    window.tareas = window.tareas.filter(t => t.id !== id);
    renderizarTareas();
    actualizarProgreso();
    if (typeof guardarDatos === 'function') {
        guardarDatos();
    }
}

// Actualizar progreso
function actualizarProgreso() {
    if (!porcentajeProgresoElement || !tareasCompletadasElement || !totalTareasElement || !progresoFill) return;

    const total = window.tareas.length;
    const completadas = window.tareas.filter(t => t.completada).length;
    const porcentaje = total ? Math.round((completadas / total) * 100) : 0;

    porcentajeProgresoElement.textContent = `${porcentaje}%`;
    tareasCompletadasElement.textContent = completadas;
    totalTareasElement.textContent = total;

    const circunferencia = 2 * Math.PI * 60;
    const offset = circunferencia - (porcentaje / 100) * circunferencia;
    progresoFill.style.strokeDashoffset = offset;

    progresoFill.style.stroke = porcentaje < 50 ? '#cf3636' : porcentaje < 80 ? '#ff9800' : '#00bfa5';
}

// Renderizar historial semanal
function renderizarHistorialHoras() {
    const lista = document.getElementById('lista-horas');
    if (!lista) return;

    lista.innerHTML = '';

    if (window.horasTrabajadas.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>Sin registros aún.</em></li>';
        return;
    }

    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const inicioSemana = new Date(hoy);
    const diaOffset = (diaSemana === 0) ? 6 : diaSemana - 1;
    inicioSemana.setDate(hoy.getDate() - diaOffset);
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const registrosSemana = window.horasTrabajadas.filter(registro => {
        const fecha = parseDateAsLocal(registro.fecha);
        return fecha && fecha >= inicioSemana && fecha <= finSemana;
    });

    if (registrosSemana.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros esta semana.</em></li>';
        return;
    }

    registrosSemana.sort((a, b) => parseDateAsLocal(b.fecha) - parseDateAsLocal(a.fecha));

    registrosSemana.forEach(registro => {
        const entrada = new Date(`2023-01-01T${registro.horaEntrada}`);
        const salida = new Date(`2023-01-01T${registro.horaSalida}`);
        const minutos = Math.floor((salida - entrada) / (1000 * 60));
        if (minutos <= 0) return;

        const horas = Math.floor(minutos / 60);
        const restoMinutos = minutos % 60;
        const duracion = `${horas}h ${restoMinutos}m`;
        const fechaLegible = formatearFechaLegible(registro.fecha);

        const li = document.createElement('li');
        li.className = 'registro-hora';
        li.innerHTML = `
            <div class="detalle">
                <strong>${registro.horaEntrada}</strong> - <strong>${registro.horaSalida}</strong>
                <br>
                <small>${duracion} | ${fechaLegible}</small>
            </div>
            <button class="accion" onclick="eliminarRegistroHora(${registro.id})">Eliminar</button>
        `;
        lista.appendChild(li);
    });
}

// Función: renderizarHistorialMensual – Muestra horas del mes actual o del mes seleccionado
function renderizarHistorialMensual() {
    const lista = document.getElementById('lista-historial-mensual');
    if (!lista) return;

    lista.innerHTML = '';

    if (window.horasTrabajadas.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>Sin registros aún.</em></li>';
        return;
    }

    let registrosMes;
    if (historialMesSeleccionado) {
        // Filtrar por el mes seleccionado
        registrosMes = window.horasTrabajadas.filter(registro => {
            const fecha = parseDateAsLocal(registro.fecha);
            return fecha &&
                   fecha.getMonth() === historialMesSeleccionado.mes &&
                   fecha.getFullYear() === historialMesSeleccionado.año;
        });
    } else {
        // Comportamiento por defecto: mes actual
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();
        registrosMes = window.horasTrabajadas.filter(registro => {
            const fecha = parseDateAsLocal(registro.fecha);
            return fecha &&
                   fecha.getMonth() === mesActual &&
                   fecha.getFullYear() === añoActual;
        });
    }

    if (registrosMes.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros para este periodo.</em></li>';
        return;
    }

    registrosMes.sort((a, b) => parseDateAsLocal(b.fecha) - parseDateAsLocal(a.fecha));

    registrosMes.forEach(registro => {
        const entrada = new Date(`2023-01-01T${registro.horaEntrada}`);
        const salida = new Date(`2023-01-01T${registro.horaSalida}`);
        if (isNaN(entrada.getTime()) || isNaN(salida.getTime())) return;

        const minutos = Math.floor((salida - entrada) / (1000 * 60));
        if (minutos <= 0) return;

        const horas = Math.floor(minutos / 60);
        const restoMinutos = minutos % 60;
        const duracion = `${horas}h ${restoMinutos}m`;
        const fechaLegible = formatearFechaLegible(registro.fecha);

        const li = document.createElement('li');
        li.className = 'registro-hora';
        li.innerHTML = `
            <div class="detalle">
                <strong>${registro.horaEntrada}</strong> - <strong>${registro.horaSalida}</strong>
                <br>
                <small>${duracion} | ${fechaLegible}</small>
            </div>
            <button class="accion" onclick="eliminarRegistroHora(${registro.id})">Eliminar</button>
        `;
        lista.appendChild(li);
    });
}


// Formatear fecha legible: "22 abr 2025"
function formatearFechaLegible(fechaStr) {
    if (!fechaStr) return 'Fecha inválida';
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    const fecha = parseDateAsLocal(fechaStr);
    if (isNaN(fecha.getTime())) return 'Fecha inválida';
    
    // El 'replace' es para un formato específico sin puntos, como "22 abr 2025" en lugar de "22 abr. 2025"
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha).replace(/\./g, '');
}

// Eliminar registro de horas
function eliminarRegistroHora(id) {
    const antes = window.horasTrabajadas.length;
    window.horasTrabajadas = window.horasTrabajadas.filter(h => h.id !== id);

    if (window.horasTrabajadas.length !== antes) {
        calcularHorasSemanales();
        renderizarHistorialHoras();

        const contenedor = document.getElementById('contenedor-historial-mensual');
        if (contenedor && !contenedor.classList.contains('oculto')) {
            renderizarHistorialMensual();
        }

        if (typeof guardarDatos === 'function') {
            guardarDatos();
        }
    }
}

// Esta función ya existe en index.html, pero la duplicamos aquí como referencia
// de su existencia global para el linter.
if (typeof window.toggleHistorialMensualConSelector === 'undefined') {
    window.toggleHistorialMensualConSelector = function() {
        console.warn("toggleHistorialMensualConSelector no está definido globalmente todavía.");
    };
}


// Inicializar app
function inicializarApp() {
    console.log("✅ DOM cargado. Inicializando app...");

    // Seleccionar elementos
    formularioHoras = document.getElementById('formulario-horas');
    formularioPlan = document.getElementById('formulario-plan');
    listaTareas = document.getElementById('lista-tareas');
    totalHorasElement = document.getElementById('total-horas');
    porcentajeProgresoElement = document.getElementById('porcentaje-progreso');
    tareasCompletadasElement = document.getElementById('tareas-completadas');
    totalTareasElement = document.getElementById('total-tareas');
    progresoFill = document.querySelector('.progreso-circular-fill');

    // Event listeners
    formularioHoras?.addEventListener('submit', agregarHora);
    formularioPlan?.addEventListener('submit', agregarTarea);

    // Escuchar cuando los datos de Firestore estén listos
    document.addEventListener('datosCargados', () => {
        console.log("🔄 Datos recibidos de la nube, renderizando...");
        calcularHorasSemanales();
        renderizarTareas();
        actualizarProgreso();
        renderizarHistorialHoras();
    });

    console.log("✅ App lista. Esperando datos de la nube...");
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarApp);

// Exportar funciones para que estén disponibles globalmente
window.setHistorialMes = setHistorialMes;
window.toggleCompletada = toggleCompletada;
window.eliminarTarea = eliminarTarea;
window.eliminarRegistroHora = eliminarRegistroHora;
