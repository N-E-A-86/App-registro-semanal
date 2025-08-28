// script.js
// Aplicación para registrar horas de trabajo remoto, plan de acción y progreso

// Variables globales
let horasTrabajadas = [];
let tareas = [];

// Elementos del DOM (se inicializan en DOMContentLoaded)
let formularioHoras;
let formularioPlan;
let listaTareas;
let totalHorasElement;
let porcentajeProgresoElement;
let tareasCompletadasElement;
let totalTareasElement;
let progresoFill;

// Función para calcular horas semanales
function calcularHorasSemanales() {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const inicioSemana = new Date(hoy);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1)); // Lunes

    let totalMinutos = 0;

    horasTrabajadas.forEach(registro => {
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
    console.log("✅ Total de horas actualizado:", totalHoras);
}

// Registrar hora
function agregarHora(evento) {
    evento.preventDefault();
    console.log("🔍 Formulario de horas enviado");

    const fecha = document.getElementById('fecha').value;
    const horaEntrada = document.getElementById('hora-entrada').value;
    const horaSalida = document.getElementById('hora-salida').value;

    console.log("Datos del formulario:", { fecha, horaEntrada, horaSalida });

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

    horasTrabajadas.push(nuevoRegistro);
    console.log("✅ Registro agregado:", nuevoRegistro);

    // Limpiar formulario
    formularioHoras.reset();

    // Actualizar interfaces
    calcularHorasSemanales();
    renderizarHistorialHoras();

    // Si el historial mensual está abierto, actualízalo
    const contenedor = document.getElementById('contenedor-historial-mensual');
    if (contenedor && !contenedor.classList.contains('oculto')) {
        renderizarHistorialMensual();
    }

    // Notificación corregida
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

    tareas.push({
        id: Date.now(),
        texto,
        prioridad: document.getElementById('prioridad').value,
        completada: false
    });

    formularioPlan.reset();
    renderizarTareas();
    actualizarProgreso();
    alert('Tarea agregada.');
}

// Renderizar tareas
function renderizarTareas() {
    if (!listaTareas) return;
    listaTareas.innerHTML = '';

    tareas.forEach(t => {
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
    const t = tareas.find(t => t.id === id);
    if (t) {
        t.completada = !t.completada;
        renderizarTareas();
        actualizarProgreso();
    }
}

// Eliminar tarea
function eliminarTarea(id) {
    tareas = tareas.filter(t => t.id !== id);
    renderizarTareas();
    actualizarProgreso();
}

// Actualizar progreso
function actualizarProgreso() {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.completada).length;
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
    if (!lista) {
        console.error("❌ #lista-horas no encontrado");
        return;
    }

    lista.innerHTML = '';

    if (horasTrabajadas.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>Sin registros aún.</em></li>';
        return;
    }

    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const inicioSemana = new Date(hoy);
    inicioSemana.setHours(0, 0, 0, 0);
    inicioSemana.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1)); // Lunes

    const registrosSemana = horasTrabajadas.filter(registro => {
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

// Función: renderizarHistorialMensual – Muestra todas las horas del mes actual
function renderizarHistorialMensual() {
    const lista = document.getElementById('lista-historial-mensual');
    if (!lista) {
        console.error("❌ #lista-historial-mensual no encontrado");
        return;
    }

    lista.innerHTML = '';

    if (horasTrabajadas.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>Sin registros aún.</em></li>';
        return;
    }

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    const registrosMes = horasTrabajadas.filter(registro => {
        if (!registro.fecha) return false;
        const fecha = new Date(registro.fecha);
        return !isNaN(fecha.getTime()) &&
               fecha.getMonth() === mesActual &&
               fecha.getFullYear() === añoActual;
    });

    if (registrosMes.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros este mes.</em></li>';
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
    const antes = horasTrabajadas.length;
    horasTrabajadas = horasTrabajadas.filter(h => h.id !== id);

    if (horasTrabajadas.length !== antes) {
        console.log("✅ Registro eliminado (ID:", id, ")");
        calcularHorasSemanales();
        renderizarHistorialHoras();

        const contenedor = document.getElementById('contenedor-historial-mensual');
        if (contenedor && !contenedor.classList.contains('oculto')) {
            renderizarHistorialMensual();
        }
    } else {
        console.warn("⚠️ No se encontró el registro con ID:", id);
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
        renderizarHistorialMensual(); // Siempre renderiza al abrir
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

    // Cargar datos de localStorage
    try {
        if (localStorage.getItem('horasTrabajadas')) {
            horasTrabajadas = JSON.parse(localStorage.getItem('horasTrabajadas'));
            console.log("✅ Horas cargadas:", horasTrabajadas);
        }
        if (localStorage.getItem('tareas')) {
            tareas = JSON.parse(localStorage.getItem('tareas'));
            console.log("✅ Tareas cargadas:", tareas);
        }
    } catch (e) {
        console.error("❌ Error al cargar localStorage:", e);
        horasTrabajadas = [];
        tareas = [];
    }

    // Renderizar todo
    calcularHorasSemanales();
    renderizarTareas();
    actualizarProgreso();
    renderizarHistorialHoras();

    // No renderizamos mensual aquí, solo si se abre

    // Event listeners
    formularioHoras?.addEventListener('submit', agregarHora);
    formularioPlan?.addEventListener('submit', agregarTarea);

    console.log("✅ App inicializada y lista");
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarApp);