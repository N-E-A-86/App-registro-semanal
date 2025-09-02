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

// --- Funciones auxiliares para fechas ---
// Función para normalizar una fecha a las 00:00:00.000
function normalizarFecha(fecha) {
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    return f;
}

// Función para obtener el inicio de la semana (lunes) de una fecha dada
function getInicioSemana(fecha) {
    const f = normalizarFecha(fecha);
    const dia = f.getDay();
    const diff = f.getDate() - dia + (dia === 0 ? -6 : 1); // Ajustar para que la semana empiece el lunes
    return new Date(f.setDate(diff));
}

// Función para obtener el fin de la semana (domingo) de una fecha dada
function getFinSemana(fecha) {
    const inicio = getInicioSemana(fecha);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    return fin;
}

// --- Funciones para el selector de mes del historial ---
function setHistorialMes(mesOffset) {
    const fechaRef = new Date();
    fechaRef.setMonth(fechaRef.getMonth() + mesOffset);
    historialMesSeleccionado = {
        mes: fechaRef.getMonth(),
        año: fechaRef.getFullYear()
    };
    renderizarHistorialMensual();

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
    const inicioSemana = getInicioSemana(hoy);
    const finSemana = getFinSemana(hoy);

    console.log("Calculando horas semanales:");
    console.log("Hoy:", hoy.toISOString().split('T')[0]);
    console.log("Inicio de semana (Lunes):", inicioSemana.toISOString().split('T')[0]);
    console.log("Fin de semana (Domingo):", finSemana.toISOString().split('T')[0]);

    let totalMinutos = 0;

    window.horasTrabajadas.forEach(registro => {
        const fechaRegistroStr = registro.fecha; // Formato YYYY-MM-DD
        if (!fechaRegistroStr) {
            console.warn("Registro sin fecha:", registro);
            return;
        }

        // Crear objeto Date desde la cadena YYYY-MM-DD
        // Esto evita problemas de zona horaria al usar la fecha local
        const partes = fechaRegistroStr.split('-');
        const fechaRegistro = new Date(partes[0], partes[1] - 1, partes[2]); // Año, Mes (0-11), Día
        fechaRegistro.setHours(0, 0, 0, 0); // Normalizar

        console.log(`Revisando registro ${fechaRegistroStr} (${fechaRegistro.toISOString().split('T')[0]})`);
        console.log(`¿Está entre ${inicioSemana.toISOString().split('T')[0]} y ${finSemana.toISOString().split('T')[0]}?`, fechaRegistro >= inicioSemana && fechaRegistro <= finSemana);

        if (fechaRegistro >= inicioSemana && fechaRegistro <= finSemana) {
            const [hEntrada, mEntrada] = (registro.horaEntrada || '').split(':').map(Number);
            const [hSalida, mSalida] = (registro.horaSalida || '').split(':').map(Number);

            if (isNaN(hEntrada) || isNaN(mEntrada) || isNaN(hSalida) || isNaN(mSalida)) {
                console.warn("Hora inválida en registro:", registro);
                return;
            }

            const minutos = (hSalida * 60 + mSalida) - (hEntrada * 60 + mEntrada);
            if (minutos > 0) {
                totalMinutos += minutos;
                console.log(`  -> Sumado: ${minutos} minutos`);
            }
        }
    });

    const totalHoras = (totalMinutos / 60).toFixed(2);
    console.log("Total horas calculado:", totalHoras);
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
    console.log("Registro agregado:", nuevoRegistro);
    formularioHoras.reset();

    // Actualizar interfaz
    calcularHorasSemanales();
    renderizarHistorialHoras();

    const contenedor = document.getElementById('contenedor-historial-mensual');
    if (contenedor && !contenedor.classList.contains('oculto')) {
        renderizarHistorialMensual();
    }

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
    const inicioSemana = getInicioSemana(hoy);
    const finSemana = getFinSemana(hoy);

    console.log("Renderizando historial semanal:");
    console.log("Inicio de semana (Lunes):", inicioSemana.toISOString().split('T')[0]);
    console.log("Fin de semana (Domingo):", finSemana.toISOString().split('T')[0]);

    const registrosSemana = window.horasTrabajadas.filter(registro => {
        const fechaRegistroStr = registro.fecha;
        if (!fechaRegistroStr) return false;

        const partes = fechaRegistroStr.split('-');
        const fechaRegistro = new Date(partes[0], partes[1] - 1, partes[2]);
        fechaRegistro.setHours(0, 0, 0, 0); // Normalizar

        const pertenece = fechaRegistro >= inicioSemana && fechaRegistro <= finSemana;
        console.log(`Registro ${fechaRegistroStr} pertenece a la semana: ${pertenece}`);
        return pertenece;
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

// Función: renderizarHistorialMensual
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
        registrosMes = window.horasTrabajadas.filter(registro => {
            if (!registro.fecha) return false;
            const partes = registro.fecha.split('-');
            const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
            return fecha.getMonth() === historialMesSeleccionado.mes &&
                   fecha.getFullYear() === historialMesSeleccionado.año;
        });
    } else {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();
        registrosMes = window.horasTrabajadas.filter(registro => {
            if (!registro.fecha) return false;
            const partes = registro.fecha.split('-');
            const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
            return fecha.getMonth() === mesActual &&
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

function formatearFechaLegible(fechaStr) {
    if (!fechaStr) return 'Fecha inválida';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return 'Fecha inválida';
    
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    // Crear fecha usando constructor seguro para evitar zona horaria
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    if (isNaN(fecha.getTime())) return 'Fecha inválida';
    
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha).replace('.', '');
}

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

function toggleHistorialMensual() {
    const contenedor = document.getElementById('contenedor-historial-mensual');
    const boton = document.querySelector('.btn-link');

    if (!contenedor) return;

    if (contenedor.classList.contains('oculto')) {
        contenedor.classList.remove('oculto');
        boton?.classList.add('expandido');
        if (!historialMesSeleccionado) {
             setHistorialMes(0); // Mostrar mes actual por defecto y renderizar
        } else {
            renderizarHistorialMensual();
        }
    } else {
        contenedor.classList.add('oculto');
        boton?.classList.remove('expandido');
    }
}

function inicializarApp() {
    console.log("✅ DOM cargado. Inicializando app...");

    formularioHoras = document.getElementById('formulario-horas');
    formularioPlan = document.getElementById('formulario-plan');
    listaTareas = document.getElementById('lista-tareas');
    totalHorasElement = document.getElementById('total-horas');
    porcentajeProgresoElement = document.getElementById('porcentaje-progreso');
    tareasCompletadasElement = document.getElementById('tareas-completadas');
    totalTareasElement = document.getElementById('total-tareas');
    progresoFill = document.querySelector('.progreso-circular-fill');

    formularioHoras?.addEventListener('submit', agregarHora);
    formularioPlan?.addEventListener('submit', agregarTarea);

    document.addEventListener('datosCargados', () => {
        console.log("Datos cargados, renderizando...");
        calcularHorasSemanales();
        renderizarTareas();
        actualizarProgreso();
        renderizarHistorialHoras();
    });

    console.log("✅ App lista. Esperando datos de la nube...");
}

document.addEventListener('DOMContentLoaded', inicializarApp);