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
    const diaSemana = hoy.getDay();
    const inicioSemana = new Date(hoy);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1)); // Lunes

    let totalMinutos = 0;

    window.horasTrabajadas.forEach(registro => {
        const fechaRegistro = new Date(registro.fecha);
        fechaRegistro.setHours(0, 0, 0, 0);

        if (fechaRegistro >= inicioSemana && fechaRegistro <= hoy) {
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

    const entrada = new Date(`2023-01-01 ${horaEntrada}`);
    const salida = new Date(`2023-01-01 ${horaSalida}`);

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
    guardarDatos();

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
    guardarDatos();

    alert('Tarea agregada.');
}

// Renderizar tareas
function renderizarTareas() {
    if (!listaTareas) return;
    listaTareas.innerHTML = '';

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
        guardarDatos();
    }
}

// Eliminar tarea
function eliminarTarea(id) {
    window.tareas = window.tareas.filter(t => t.id !== id);
    renderizarTareas();
    actualizarProgreso();
    guardarDatos();
}

// Actualizar progreso
function actualizarProgreso() {
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
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));

    const registrosSemana = window.horasTrabajadas.filter(registro => {
        const fecha = new Date(registro.fecha);
        return fecha >= inicioSemana && fecha <= hoy;
    });

    if (registrosSemana.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros esta semana.</em></li>';
        return;
    }

    registrosSemana.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    registrosSemana.forEach(registro => {
        const entrada = new Date(`2023-01-01 ${registro.horaEntrada}`);
        const salida = new Date(`2023-01-01 ${registro.horaSalida}`);
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
            if (!registro.fecha) return false;
            const fecha = new Date(registro.fecha);
            return !isNaN(fecha.getTime()) &&
                   fecha.getMonth() === historialMesSeleccionado.mes &&
                   fecha.getFullYear() === historialMesSeleccionado.año;
        });
    } else {
        // Comportamiento original: mes actual
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();
        registrosMes = window.horasTrabajadas.filter(registro => {
            if (!registro.fecha) return false;
            const fecha = new Date(registro.fecha);
            return !isNaN(fecha.getTime()) &&
                   fecha.getMonth() === mesActual &&
                   fecha.getFullYear() === añoActual;
        });
    }

    if (registrosMes.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros para este periodo.</em></li>';
        return;
    }

    registrosMes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    registrosMes.forEach(registro => {
        const entrada = new Date(`2023-01-01 ${registro.horaEntrada}`);
        const salida = new Date(`2023-01-01 ${registro.horaSalida}`);
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
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return 'Fecha inválida';
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha).replace('.', '');
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

        guardarDatos();
    }
}

// Mostrar/ocultar historial mensual
function toggleHistorialMensual() {
    const contenedor = document.getElementById('contenedor-historial-mensual');
    const boton = document.querySelector('.btn-link');

    if (!contenedor) return;

    if (contenedor.classList.contains('oculto')) {
        contenedor.classList.remove('oculto');
        boton?.classList.add('expandido');
        // Si no se ha seleccionado un mes, mostrar el mes actual por defecto
        if (!historialMesSeleccionado) {
             // Opcional: puedes llamar a setHistorialMes(0) aquí para asegurar que se muestra el mes actual
             // setHistorialMes(0); 
        }
        renderizarHistorialMensual();
    } else {
        contenedor.classList.add('oculto');
        boton?.classList.remove('expandido');
    }
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
        calcularHorasSemanales();
        renderizarTareas();
        actualizarProgreso();
        renderizarHistorialHoras();
    });

    console.log("✅ App lista. Esperando datos de la nube...");
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarApp);

/*
Para que las nuevas funciones de selección de mes funcionen, 
debes actualizar tu index.html. Agrega los siguientes botones 
justo antes del div con id="contenedor-historial-mensual":

<!-- Selector de mes para el historial -->
<div class="selector-mes-historial" style="margin-bottom: 10px; display: none;" id="selector-mes-historial">
  <button onclick="setHistorialMes(0)">Este mes</button>
  <button onclick="setHistorialMes(-1)">Mes anterior</button>
  <button onclick="setHistorialMes(-2)">Hace 2 meses</button>
</div>

Y modifica el botón de "Historial Mensual" para que también muestre 
el mes seleccionado. Puedes hacerlo actualizando su texto desde JS 
como se hace en setHistorialMes, o simplemente usar un texto genérico 
y dejar que JS lo cambie.

Ejemplo de botón actualizado (en tu HTML actual):
<button type="button" class="btn-link" onclick="toggleSelectorMes()">
    ▶ Historial Mensual
</button>

Y agrega esta función en tu script o en un <script> en index.html:
function toggleSelectorMes() {
    const selector = document.getElementById('selector-mes-historial');
    if (selector) {
        selector.style.display = selector.style.display === 'none' ? 'block' : 'none';
    }
    // También puedes llamar a toggleHistorialMensual() aquí si quieres 
    // que se abra el historial al mismo tiempo.
    // toggleHistorialMensual();
}
*/