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

    formularioHoras.reset();

    // Forzar actualización
    try {
        calcularHorasSemanales();
        renderizarHistorialHoras();
        console.log("✅ Interfaz actualizada");
    } catch (e) {
        console.error("❌ Error al actualizar interfaz:", e);
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

// Renderizar historial
// Función para renderizar el historial de horas (semana completa)
// Función: renderizarHistorialHoras – Muestra TODOS los registros, sin filtrar por semana
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

    // Ordenar de más reciente a más antiguo
    const registrosOrdenados = [...horasTrabajadas].sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    registrosOrdenados.forEach(registro => {
        // Validar que el registro tenga datos válidos
        if (!registro.horaEntrada || !registro.horaSalida) return;

        const entrada = new Date(`2023-01-01 ${registro.horaEntrada}`);
        const salida = new Date(`2023-01-01 ${registro.horaSalida}`);

        // Validar que las horas sean válidas
        if (isNaN(entrada.getTime()) || isNaN(salida.getTime())) return;

        const minutos = Math.floor((salida - entrada) / (1000 * 60));
        if (minutos <= 0) return; // Evitar horas negativas

        const horas = Math.floor(minutos / 60);
        const restoMinutos = minutos % 60;
        const duracion = `${horas}h ${restoMinutos}m`;

        // Formatear fecha legible: "22 abr 2025"
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

    console.log("✅ Historial completo renderizado:", registrosOrdenados);
}

// Función auxiliar para formatear fechas de forma legible
function formatearFechaLegible(fechaStr) {
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    const fecha = new Date(fechaStr);
    
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) return 'Fecha inválida';

    // Formato: "22 abr 2025"
    return new Intl.DateTimeFormat('es-ES', opciones)
        .format(fecha)
        .replace('.', '') // Quitar el punto de "abr."
        .replace('ene', 'ene')
        .replace('feb', 'feb')
        .replace('mar', 'mar')
        .replace('abr', 'abr')
        .replace('may', 'may')
        .replace('jun', 'jun')
        .replace('jul', 'jul')
        .replace('ago', 'ago')
        .replace('sep', 'sep')
        .replace('oct', 'oct')
        .replace('nov', 'nov')
        .replace('dic', 'dic');
}

// Eliminar hora
function eliminarRegistroHora(id) {
    if (confirm('¿Eliminar este registro?')) {
        horasTrabajadas = horasTrabajadas.filter(h => h.id !== id);
        calcularHorasSemanales();
        renderizarHistorialHoras();
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

    // 🔴 Depuración: verifica que todos los elementos existan
    console.log("Elementos del DOM:", {
        formularioHoras,
        listaTareas,
        totalHorasElement,
        progresoFill
    });

    if (!totalHorasElement) {
        console.error("❌ #total-horas no encontrado en el DOM");
    }
    if (!progresoFill) {
        console.error("❌ .progreso-circular-fill no encontrado");
    }
    if (!listaTareas) {
        console.error("❌ #lista-tareas no encontrado");
    }

    // Cargar datos
    try {
        if (localStorage.getItem('horasTrabajadas')) {
            horasTrabajadas = JSON.parse(localStorage.getItem('horasTrabajadas'));
            console.log("✅ Horas cargadas desde localStorage:", horasTrabajadas);
        }
        if (localStorage.getItem('tareas')) {
            tareas = JSON.parse(localStorage.getItem('tareas'));
            console.log("✅ Tareas cargadas desde localStorage:", tareas);
        }
    } catch (e) {
        console.error("❌ Error al cargar datos de localStorage:", e);
        horasTrabajadas = [];
        tareas = [];
    }

    // Renderizar
    calcularHorasSemanales(); // ← Aquí podría fallar
    renderizarTareas();
    actualizarProgreso();
    renderizarHistorialHoras();

    console.log("✅ App inicializada");

    // Event listeners
    if (formularioHoras) {
        formularioHoras.addEventListener('submit', agregarHora);
        console.log("✅ Evento 'submit' agregado a formulario de horas");
    } else {
        console.error("❌ formularioHoras es null");
    }

    if (formularioPlan) {
        formularioPlan.addEventListener('submit', agregarTarea);
    }
}
// Prueba: agrega un registro de prueba
horasTrabajadas = [
    {
        id: 123456,
        fecha: new Date().toISOString().split('T')[0],
        horaEntrada: '09:00',
        horaSalida: '17:00'
    }
];
// Iniciar
document.addEventListener('DOMContentLoaded', inicializarApp);