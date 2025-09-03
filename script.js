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
// Función segura para crear un objeto Date a partir de una cadena YYYY-MM-DD en hora local
function parseFecha(fechaStr) {
    if (!fechaStr) return null;
    const partes = fechaStr.split('-').map(Number);
    if (partes.length !== 3) return null;
    // Importante: Usar el constructor con año, mes, día para evitar zona horaria
    // y establecer la hora a medianoche local.
    const date = new Date(partes[0], partes[1] - 1, partes[2]);
    date.setHours(0, 0, 0, 0);
    return date;
}

// Función para formatear una fecha a YYYY-MM-DD (para depuración)
function formatearFechaISO(fecha) {
    if (!fecha) return 'Fecha inválida';
    const pad = (num) => String(num).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

// Función para obtener el inicio de la semana (lunes) de una fecha dada
function getInicioSemana(fecha) {
    const f = new Date(fecha);
    f.setHours(0, 0, 0, 0);
    const dia = f.getDay();
    // dia 0 es Domingo, 1 es Lunes, ..., 6 es Sábado
    // Queremos que dia 1 (Lunes) sea el inicio.
    // Si es Domingo (0), restamos 6 días. Si es Lunes (1), restamos 0 días.
    const diff = f.getDate() - dia + (dia === 0 ? -6 : 1);
    const inicio = new Date(f.setDate(diff));
    inicio.setHours(0, 0, 0, 0);
    return inicio;
}

// Función para obtener el fin de la semana (domingo) de una fecha dada
function getFinSemana(fecha) {
    const inicio = getInicioSemana(fecha);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    fin.setHours(23, 59, 59, 999); // Fin del día
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
    hoy.setHours(0, 0, 0, 0);
    const inicioSemana = getInicioSemana(hoy);
    const finSemana = getFinSemana(hoy);

    console.log("--- CALCULANDO HORAS SEMANALES ---");
    console.log("Hoy (normalizado):", formatearFechaISO(hoy));
    console.log("Inicio de semana (Lunes):", formatearFechaISO(inicioSemana));
    console.log("Fin de semana (Domingo):", formatearFechaISO(finSemana));

    let totalMinutos = 0;

    window.horasTrabajadas.forEach(registro => {
        const fechaRegistro = parseFecha(registro.fecha);
        if (!fechaRegistro) {
            console.warn("Fecha inválida en registro:", registro);
            return;
        }
        // fechaRegistro ya está normalizada por parseFecha

        console.log(`Revisando registro: ${registro.fecha}`);
        console.log(`  Fecha registro (normalizada): ${formatearFechaISO(fechaRegistro)}`);
        console.log(`  ¿${formatearFechaISO(fechaRegistro)} >= ${formatearFechaISO(inicioSemana)}?`, fechaRegistro >= inicioSemana);
        console.log(`  ¿${formatearFechaISO(fechaRegistro)} <= ${formatearFechaISO(finSemana)}?`, fechaRegistro <= finSemana);

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
        } else {
            console.log(`  -> Fuera de rango, no se suma.`);
        }
    });

    const totalHoras = (totalMinutos / 60).toFixed(2);
    console.log("Total minutos:", totalMinutos);
    console.log("Total horas calculado:", totalHoras);
    console.log("--- FIN CALCULO ---");

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
        fecha, // Esta es una cadena YYYY-MM-DD
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

    if (typeof window.guardarDatos === 'function') {
        window.guardarDatos();
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
    
    if (typeof window.guardarDatos === 'function') {
        window.guardarDatos();
    }
    
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
        if (typeof window.guardarDatos === 'function') {
            window.guardarDatos();
        }
    }
}

// Eliminar tarea
function eliminarTarea(id) {
    window.tareas = window.tareas.filter(t => t.id !== id);
    renderizarTareas();
    actualizarProgreso();
    if (typeof window.guardarDatos === 'function') {
        window.guardarDatos();
    }
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
    if (!lista) {
        console.error("❌ #lista-horas no encontrado");
        return;
    }

    lista.innerHTML = '';

    if (window.horasTrabajadas.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>Sin registros aún.</em></li>';
        console.log("No hay registros para mostrar en historial semanal.");
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioSemana = getInicioSemana(hoy);
    const finSemana = getFinSemana(hoy);

    console.log("--- RENDERIZANDO HISTORIAL SEMANAL ---");
    console.log("Hoy (normalizado):", formatearFechaISO(hoy));
    console.log("Inicio de semana (Lunes):", formatearFechaISO(inicioSemana));
    console.log("Fin de semana (Domingo):", formatearFechaISO(finSemana));

    const registrosSemana = window.horasTrabajadas.filter(registro => {
        const fechaRegistro = parseFecha(registro.fecha);
        if (!fechaRegistro) {
            console.warn("Fecha inválida en registro (filtro):", registro);
            return false;
        }
        // fechaRegistro ya está normalizada por parseFecha

        const pertenece = fechaRegistro >= inicioSemana && fechaRegistro <= finSemana;
        console.log(`Registro ${registro.fecha} pertenece a la semana: ${pertenece}`);
        return pertenece;
    });

    if (registrosSemana.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros esta semana.</em></li>';
        console.log("No hay registros dentro del rango semanal.");
        console.log("--- FIN RENDERIZADO HISTORIAL SEMANAL ---");
        return;
    }

    // Ordenar por fecha (más reciente primero)
    registrosSemana.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha));

    console.log("Registros a mostrar en historial semanal:", registrosSemana);

    registrosSemana.forEach(registro => {
        const entrada = new Date(`2023-01-01 ${registro.horaEntrada}`);
        const salida = new Date(`2023-01-01 ${registro.horaSalida}`);
        const minutos = Math.floor((salida - entrada) / (1000 * 60));
        if (minutos <= 0) return;

        const horas = Math.floor(minutos / 60);
        const restoMinutos = minutos % 60;
        const duracion = `${horas}h ${restoMinutos}m`;

        const li = document.createElement('li');
        li.className = 'registro-hora';
        li.innerHTML = `
            <div class="detalle">
                <strong>${registro.horaEntrada}</strong> - <strong>${registro.horaSalida}</strong>
                <br>
                <small>${duracion} | ${registro.fecha}</small>
            </div>
            <button class="accion" onclick="eliminarRegistroHora(${registro.id})">Eliminar</button>
        `;
        lista.appendChild(li);
    });

    console.log("--- FIN RENDERIZADO HISTORIAL SEMANAL ---");
}

// Función: renderizarHistorialMensual
function renderizarHistorialMensual() {
    const lista = document.getElementById('lista-historial-mensual');
    if (!lista) {
        console.error("❌ #lista-historial-mensual no encontrado");
        return;
    }

    lista.innerHTML = '';

    if (window.horasTrabajadas.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>Sin registros aún.</em></li>';
        return;
    }

    let registrosMes;
    if (historialMesSeleccionado) {
        registrosMes = window.horasTrabajadas.filter(registro => {
            const fechaRegistro = parseFecha(registro.fecha);
            if (!fechaRegistro) return false;
            return fechaRegistro.getMonth() === historialMesSeleccionado.mes &&
                   fechaRegistro.getFullYear() === historialMesSeleccionado.año;
        });
    } else {
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();
        registrosMes = window.horasTrabajadas.filter(registro => {
            const fechaRegistro = parseFecha(registro.fecha);
            if (!fechaRegistro) return false;
            return fechaRegistro.getMonth() === mesActual &&
                   fechaRegistro.getFullYear() === añoActual;
        });
    }

    if (registrosMes.length === 0) {
        lista.innerHTML = '<li class="registro-hora"><em>No hay registros para este periodo.</em></li>';
        return;
    }

    registrosMes.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha));

    registrosMes.forEach(registro => {
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

// Función auxiliar para formatear fechas legibles
function formatearFechaLegible(fechaStr) {
    const fecha = parseFecha(fechaStr);
    if (!fecha || isNaN(fecha.getTime())) return 'Fecha inválida';
    
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Intl.DateTimeFormat('es-ES', opciones).format(fecha).replace('.', '');
}

// Eliminar hora
function eliminarRegistroHora(id) {
    if (confirm('¿Eliminar este registro?')) {
        const longitudAntes = window.horasTrabajadas.length;
        window.horasTrabajadas = window.horasTrabajadas.filter(h => h.id !== id);
        const longitudDespues = window.horasTrabajadas.length;

        if (longitudAntes !== longitudDespues) {
            console.log("Registro eliminado, actualizando vistas...");
            calcularHorasSemanales();
            renderizarHistorialHoras();
            
            const contenedor = document.getElementById('contenedor-historial-mensual');
            if (contenedor && !contenedor.classList.contains('oculto')) {
                renderizarHistorialMensual();
            }
            
            if (typeof window.guardarDatos === 'function') {
                window.guardarDatos();
            }
        } else {
            console.warn("No se encontró el registro para eliminar con ID:", id);
        }
    }
}

// Función para mostrar/ocultar el historial mensual
function toggleHistorialMensual() {
    const contenedor = document.getElementById('contenedor-historial-mensual');
    const boton = document.querySelector('.btn-link');

    if (!contenedor) return;

    if (contenedor.classList.contains('oculto')) {
        contenedor.classList.remove('oculto');
        boton.classList.add('expandido');
        if (!historialMesSeleccionado) {
            setHistorialMes(0);
        } else {
            renderizarHistorialMensual();
        }
    } else {
        contenedor.classList.add('oculto');
        boton.classList.remove('expandido');
    }
}

// Inicializar app
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
        console.log("Datos cargados desde Firestore, renderizando...");
        console.log("Datos cargados:", window.horasTrabajadas);
        calcularHorasSemanales();
        renderizarTareas();
        actualizarProgreso();
        renderizarHistorialHoras();
    });

    console.log("✅ App lista. Esperando datos de la nube...");
}

document.addEventListener('DOMContentLoaded', inicializarApp);