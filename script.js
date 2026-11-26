const RUTA_DATOS_INICIALES = "data.json";
const CLAVE_ALMACENAMIENTO_LOCAL = "gestor_gastos_mensual_v1";
const MONTO_MAXIMO_PERMITIDO = 999999999;
const CATEGORIAS_VALIDAS = new Set([
  "Vivienda",
  "Alimentacion",
  "Transporte",
  "Servicios",
  "Ocio",
  "Salud",
  "Otros"
]);

const estadoApp = {
  presupuestoMensual: 0,
  gastos: [],
  filtros: {
    fechaDesde: "",
    fechaHasta: "",
    montoMin: null,
    montoMax: null,
    categoria: "todas"
  },
  orden: "fecha-desc"
};

const elementosDom = {
  avisoSistema: document.getElementById("aviso-sistema"),
  montoPresupuesto: document.getElementById("monto-presupuesto"),
  botonEditarPresupuesto: document.getElementById("boton-editar-presupuesto"),
  formularioPresupuesto: document.getElementById("formulario-presupuesto"),
  entradaPresupuesto: document.getElementById("entrada-presupuesto"),
  botonCancelarPresupuesto: document.getElementById("boton-cancelar-presupuesto"),
  totalGastado: document.getElementById("total-gastado"),
  cantidadGastos: document.getElementById("cantidad-gastos"),
  saldoDisponible: document.getElementById("saldo-disponible"),
  porcentajeUsado: document.getElementById("porcentaje-usado"),
  formularioGasto: document.getElementById("formulario-gasto"),
  entradaDescripcion: document.getElementById("entrada-descripcion"),
  selectorCategoria: document.getElementById("selector-categoria"),
  entradaFecha: document.getElementById("entrada-fecha"),
  entradaMonto: document.getElementById("entrada-monto"),
  filtroFechaDesde: document.getElementById("filtro-fecha-desde"),
  filtroFechaHasta: document.getElementById("filtro-fecha-hasta"),
  filtroMontoMin: document.getElementById("filtro-monto-min"),
  filtroMontoMax: document.getElementById("filtro-monto-max"),
  filtroCategoria: document.getElementById("filtro-categoria"),
  selectorOrden: document.getElementById("selector-orden"),
  botonLimpiarFiltros: document.getElementById("boton-limpiar-filtros"),
  cuerpoTablaGastos: document.getElementById("cuerpo-tabla-gastos"),
  lienzoGrafico: document.getElementById("grafico-gastos")
};

/* Formatea numeros finitos como moneda USD con dos decimales */
function formatearMoneda(valorNumero) {
  const numeroSeguro = Number.isFinite(Number(valorNumero)) ? Number(valorNumero) : 0;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeroSeguro);
}

/* Muestra un mensaje de aviso en el banner superior */
function mostrarAviso(mensajeTexto) {
  elementosDom.avisoSistema.textContent = String(mensajeTexto || "");
  elementosDom.avisoSistema.classList.remove("oculto");
}

/* Oculta el banner superior de avisos */
function ocultarAviso() {
  elementosDom.avisoSistema.textContent = "";
  elementosDom.avisoSistema.classList.add("oculto");
}

/* Sanitiza cadenas de texto eliminando etiquetas HTML y caracteres de control */
function sanitizarTextoPlano(textoCrudo, longitudMaxima = 120) {
  if (typeof textoCrudo !== "string") {
    return "";
  }
  const sinEtiquetas = textoCrudo.replace(/<[^>]*>/g, "");
  const sinCaracteresRaros = sinEtiquetas.replace(/[\u0000-\u001F\u007F]/g, " ");
  return sinCaracteresRaros.trim().slice(0, longitudMaxima);
}

/* Valida formato de fecha ISO YYYY-MM-DD */
function esFechaIsoValida(cadenaFecha) {
  if (typeof cadenaFecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cadenaFecha)) {
    return false;
  }
  const partes = cadenaFecha.split("-").map(Number);
  const fechaObj = new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
  return (
    fechaObj.getUTCFullYear() === partes[0] &&
    fechaObj.getUTCMonth() === partes[1] - 1 &&
    fechaObj.getUTCDate() === partes[2]
  );
}

/* Establece la fecha de hoy en formato YYYY-MM-DD en el formulario de registro */
function establecerFechaPorDefecto() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  elementosDom.entradaFecha.value = `${anio}-${mes}-${dia}`;
}

/* Normaliza una estructura de datos para garantizar tipos seguros */
function normalizarEstructuraDatos(datosCrudos) {
  const objetoBase = datosCrudos && typeof datosCrudos === "object" ? datosCrudos : {};
  const presupuestoCrudo = Number(objetoBase.presupuestoMensual);
  const presupuestoLimpio =
    Number.isFinite(presupuestoCrudo) && presupuestoCrudo >= 0 && presupuestoCrudo <= MONTO_MAXIMO_PERMITIDO
      ? Number(presupuestoCrudo.toFixed(2))
      : 0;

  const gastosCrudos = Array.isArray(objetoBase.gastos) ? objetoBase.gastos : [];
  const gastosNormalizados = gastosCrudos
    .map((item, indice) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const idNum = Number(item.id);
      const idSeguro = Number.isInteger(idNum) && idNum > 0 ? idNum : indice + 1;
      const descripcionSegura = sanitizarTextoPlano(item.descripcion, 120) || "Gasto sin descripcion";
      const categoriaSegura = CATEGORIAS_VALIDAS.has(item.categoria) ? item.categoria : "Otros";
      const fechaSegura = esFechaIsoValida(item.fecha) ? item.fecha : "";
      const montoNum = Number(item.monto);

      if (!fechaSegura || !Number.isFinite(montoNum) || montoNum <= 0 || montoNum > MONTO_MAXIMO_PERMITIDO) {
        return null;
      }

      return {
        id: idSeguro,
        descripcion: descripcionSegura,
        categoria: categoriaSegura,
        fecha: fechaSegura,
        monto: Number(montoNum.toFixed(2))
      };
    })
    .filter(Boolean);

  return {
    presupuestoMensual: presupuestoLimpio,
    gastos: gastosNormalizados
  };
}

/* Lee el estado guardado en localStorage si existe y es valido */
function leerEstadoLocalStorage() {
  try {
    const contenido = window.localStorage.getItem(CLAVE_ALMACENAMIENTO_LOCAL);
    if (!contenido) {
      return null;
    }
    const parseado = JSON.parse(contenido);
    return normalizarEstructuraDatos(parseado);
  } catch (errorStorage) {
    console.warn("No se pudo leer localStorage:", errorStorage);
    return null;
  }
}

/* Guarda el estado actual en localStorage para persistencia en Vercel y navegador */
function guardarEstadoLocalStorage() {
  const cargaUtil = {
    presupuestoMensual: estadoApp.presupuestoMensual,
    gastos: estadoApp.gastos
  };

  try {
    window.localStorage.setItem(CLAVE_ALMACENAMIENTO_LOCAL, JSON.stringify(cargaUtil));
    ocultarAviso();
  } catch (errorGuardado) {
    console.warn("No se pudo guardar en localStorage:", errorGuardado);
    mostrarAviso(
      "Los cambios se aplicaron en memoria, pero no pudieron guardarse en el almacenamiento local del navegador."
    );
  }
}

/* Carga datos desde localStorage o, en su defecto, desde data.json */
async function cargarDatosIniciales() {
  const datosLocales = leerEstadoLocalStorage();
  if (datosLocales) {
    estadoApp.presupuestoMensual = datosLocales.presupuestoMensual;
    estadoApp.gastos = datosLocales.gastos;
    ocultarAviso();
    actualizarVistaCompleta();
    return;
  }

  try {
    const respuesta = await fetch(RUTA_DATOS_INICIALES, { cache: "no-store" });
    if (!respuesta.ok) {
      throw new Error(`Error HTTP ${respuesta.status}`);
    }
    const datosJson = await respuesta.json();
    const datosNormalizados = normalizarEstructuraDatos(datosJson);

    estadoApp.presupuestoMensual = datosNormalizados.presupuestoMensual;
    estadoApp.gastos = datosNormalizados.gastos;
    guardarEstadoLocalStorage();
    ocultarAviso();
  } catch (errorCarga) {
    console.warn("No se pudo cargar data.json:", errorCarga);
    estadoApp.presupuestoMensual = 0;
    estadoApp.gastos = [];
    mostrarAviso(
      "No se pudo leer data.json automaticamente (por ejemplo, al abrir index.html como archivo local). Los registros que agregues se guardaran en el navegador."
    );
  }

  actualizarVistaCompleta();
}

/* Filtra y ordena los gastos sin mutar el arreglo original del estado */
function obtenerGastosFiltradosYOrdenados() {
  const listaFiltrada = estadoApp.gastos.filter((gastoItem) => {
    if (estadoApp.filtros.categoria !== "todas" && gastoItem.categoria !== estadoApp.filtros.categoria) {
      return false;
    }
    if (estadoApp.filtros.fechaDesde && gastoItem.fecha < estadoApp.filtros.fechaDesde) {
      return false;
    }
    if (estadoApp.filtros.fechaHasta && gastoItem.fecha > estadoApp.filtros.fechaHasta) {
      return false;
    }
    if (estadoApp.filtros.montoMin !== null && gastoItem.monto < estadoApp.filtros.montoMin) {
      return false;
    }
    if (estadoApp.filtros.montoMax !== null && gastoItem.monto > estadoApp.filtros.montoMax) {
      return false;
    }
    return true;
  });

  listaFiltrada.sort((itemA, itemB) => {
    switch (estadoApp.orden) {
      case "fecha-asc":
        return itemA.fecha.localeCompare(itemB.fecha);
      case "fecha-desc":
        return itemB.fecha.localeCompare(itemA.fecha);
      case "monto-asc":
        return itemA.monto - itemB.monto;
      case "monto-desc":
        return itemB.monto - itemA.monto;
      default:
        return itemB.fecha.localeCompare(itemA.fecha);
    }
  });

  return listaFiltrada;
}

/* Calcula total gastado, saldo disponible y porcentaje usado */
function calcularTotales(gastosVisibles) {
  const sumaTotal = gastosVisibles.reduce(
    (acumulador, item) => acumulador + (Number(item.monto) || 0),
    0
  );
  const sumaRedondeada = Number(sumaTotal.toFixed(2));
  const diferenciaSaldo = Number((estadoApp.presupuestoMensual - sumaRedondeada).toFixed(2));
  const porcentaje =
    estadoApp.presupuestoMensual > 0
      ? Math.round((sumaRedondeada / estadoApp.presupuestoMensual) * 100)
      : 0;

  return {
    sumaTotal: sumaRedondeada,
    diferenciaSaldo,
    porcentaje
  };
}

/* Renderiza las tarjetas superiores de resumen financiero */
function renderizarResumen(gastosVisibles) {
  const totales = calcularTotales(gastosVisibles);

  elementosDom.montoPresupuesto.textContent = formatearMoneda(estadoApp.presupuestoMensual);
  elementosDom.totalGastado.textContent = formatearMoneda(totales.sumaTotal);
  elementosDom.cantidadGastos.textContent =
    gastosVisibles.length === 1
      ? "1 gasto mostrado"
      : `${gastosVisibles.length} gastos mostrados`;

  elementosDom.saldoDisponible.textContent = formatearMoneda(totales.diferenciaSaldo);
  elementosDom.saldoDisponible.classList.remove("saldo-positivo", "saldo-negativo");
  if (totales.diferenciaSaldo >= 0) {
    elementosDom.saldoDisponible.classList.add("saldo-positivo");
  } else {
    elementosDom.saldoDisponible.classList.add("saldo-negativo");
  }

  elementosDom.porcentajeUsado.textContent = `${totales.porcentaje}% del presupuesto mensual`;
}

/* Construye de forma segura las filas de la tabla usando textContent */
function renderizarTablaGastos(gastosVisibles) {
  elementosDom.cuerpoTablaGastos.innerHTML = "";

  if (gastosVisibles.length === 0) {
    const filaVacia = document.createElement("tr");
    const celdaVacia = document.createElement("td");
    celdaVacia.colSpan = 5;
    celdaVacia.className = "fila-vacia";
    celdaVacia.textContent = "No hay gastos que coincidan con los filtros actuales.";
    filaVacia.appendChild(celdaVacia);
    elementosDom.cuerpoTablaGastos.appendChild(filaVacia);
    return;
  }

  gastosVisibles.forEach((gastoItem) => {
    const fila = document.createElement("tr");

    const celdaFecha = document.createElement("td");
    celdaFecha.textContent = gastoItem.fecha;

    const celdaCategoria = document.createElement("td");
    const insignia = document.createElement("span");
    insignia.className = "insignia-categoria";
    insignia.textContent = gastoItem.categoria;
    celdaCategoria.appendChild(insignia);

    const celdaDescripcion = document.createElement("td");
    celdaDescripcion.textContent = gastoItem.descripcion;

    const celdaMonto = document.createElement("td");
    celdaMonto.className = "alinear-derecha";
    celdaMonto.textContent = formatearMoneda(gastoItem.monto);

    const celdaAccion = document.createElement("td");
    celdaAccion.className = "alinear-centro";
    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.className = "boton-peligro";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.addEventListener("click", () => {
      eliminarGastoPorId(gastoItem.id);
    });
    celdaAccion.appendChild(botonEliminar);

    fila.appendChild(celdaFecha);
    fila.appendChild(celdaCategoria);
    fila.appendChild(celdaDescripcion);
    fila.appendChild(celdaMonto);
    fila.appendChild(celdaAccion);

    elementosDom.cuerpoTablaGastos.appendChild(fila);
  });
}

/* Agrupa los montos visibles por categoria */
function agruparPorCategoria(gastosVisibles) {
  const mapaCategorias = new Map();
  gastosVisibles.forEach((gastoItem) => {
    const actual = mapaCategorias.get(gastoItem.categoria) || 0;
    mapaCategorias.set(gastoItem.categoria, Number((actual + gastoItem.monto).toFixed(2)));
  });
  return Array.from(mapaCategorias.entries()).map(([nombreCategoria, totalCategoria]) => ({
    nombreCategoria,
    totalCategoria
  }));
}

/* Dibuja el grafico de barras en el lienzo canvas */
function renderizarGraficoBarras(gastosVisibles) {
  const lienzo = elementosDom.lienzoGrafico;
  const contexto = lienzo.getContext("2d");
  const ancho = lienzo.width;
  const alto = lienzo.height;

  contexto.clearRect(0, 0, ancho, alto);

  const datosAgrupados = agruparPorCategoria(gastosVisibles);
  if (datosAgrupados.length === 0) {
    contexto.fillStyle = "#607d8b";
    contexto.font = "13px sans-serif";
    contexto.textAlign = "center";
    contexto.fillText("Sin datos para graficar", ancho / 2, alto / 2);
    return;
  }

  const margenSuperior = 18;
  const margenInferior = 44;
  const margenIzquierdo = 12;
  const margenDerecho = 12;
  const areaGraficoAlto = alto - margenSuperior - margenInferior;
  const areaGraficoAncho = ancho - margenIzquierdo - margenDerecho;

  const valorMaximo = Math.max(...datosAgrupados.map((d) => d.totalCategoria), 1);
  const numeroBarras = datosAgrupados.length;
  const espacioPorBarra = areaGraficoAncho / numeroBarras;
  const anchoBarra = Math.min(44, Math.max(18, espacioPorBarra * 0.58));

  contexto.strokeStyle = "#cfd8dc";
  contexto.lineWidth = 1;
  contexto.beginPath();
  contexto.moveTo(margenIzquierdo, margenSuperior + areaGraficoAlto);
  contexto.lineTo(ancho - margenDerecho, margenSuperior + areaGraficoAlto);
  contexto.stroke();

  datosAgrupados.forEach((entrada, indice) => {
    const proporcion = entrada.totalCategoria / valorMaximo;
    const altoBarra = Math.max(4, proporcion * (areaGraficoAlto - 16));
    const posicionX = margenIzquierdo + indice * espacioPorBarra + (espacioPorBarra - anchoBarra) / 2;
    const posicionY = margenSuperior + areaGraficoAlto - altoBarra;

    contexto.fillStyle = "#1976d2";
    contexto.fillRect(posicionX, posicionY, anchoBarra, altoBarra);

    contexto.fillStyle = "#263238";
    contexto.font = "10px sans-serif";
    contexto.textAlign = "center";
    contexto.fillText(
      Math.round(entrada.totalCategoria).toString(),
      posicionX + anchoBarra / 2,
      posicionY - 4
    );

    contexto.fillStyle = "#607d8b";
    contexto.font = "10px sans-serif";
    const etiquetaCorta =
      entrada.nombreCategoria.length > 9
        ? `${entrada.nombreCategoria.slice(0, 8)}.`
        : entrada.nombreCategoria;
    contexto.fillText(
      etiquetaCorta,
      posicionX + anchoBarra / 2,
      margenSuperior + areaGraficoAlto + 16
    );
  });
}

/* Sincroniza resumen, tabla y grafico en una sola llamada */
function actualizarVistaCompleta() {
  const gastosVisibles = obtenerGastosFiltradosYOrdenados();
  renderizarResumen(gastosVisibles);
  renderizarTablaGastos(gastosVisibles);
  renderizarGraficoBarras(gastosVisibles);
}

/* Valida y registra un nuevo gasto */
function agregarNuevoGasto(eventoEnvio) {
  eventoEnvio.preventDefault();

  const descripcionLimpia = sanitizarTextoPlano(elementosDom.entradaDescripcion.value, 120);
  const categoriaSeleccionada = CATEGORIAS_VALIDAS.has(elementosDom.selectorCategoria.value)
    ? elementosDom.selectorCategoria.value
    : "Otros";
  const fechaSeleccionada = elementosDom.entradaFecha.value;
  const montoNumero = Number.parseFloat(elementosDom.entradaMonto.value);

  if (!descripcionLimpia) {
    mostrarAviso("Ingresa una descripcion valida sin caracteres de control.");
    return;
  }

  if (!esFechaIsoValida(fechaSeleccionada)) {
    mostrarAviso("Selecciona una fecha valida en formato AAAA-MM-DD.");
    return;
  }

  if (!Number.isFinite(montoNumero) || montoNumero <= 0 || montoNumero > MONTO_MAXIMO_PERMITIDO) {
    mostrarAviso(`Ingresa un monto mayor a 0.00 y menor o igual a ${MONTO_MAXIMO_PERMITIDO}.`);
    return;
  }

  const siguienteId =
    estadoApp.gastos.length > 0
      ? Math.max(...estadoApp.gastos.map((g) => Number(g.id) || 0)) + 1
      : 1;

  const nuevoGasto = {
    id: siguienteId,
    descripcion: descripcionLimpia,
    categoria: categoriaSeleccionada,
    fecha: fechaSeleccionada,
    monto: Number(montoNumero.toFixed(2))
  };

  estadoApp.gastos.push(nuevoGasto);
  elementosDom.entradaDescripcion.value = "";
  elementosDom.entradaMonto.value = "";
  establecerFechaPorDefecto();

  actualizarVistaCompleta();
  guardarEstadoLocalStorage();
}

/* Elimina un gasto por su identificador */
function eliminarGastoPorId(idObjetivo) {
  estadoApp.gastos = estadoApp.gastos.filter((gastoItem) => gastoItem.id !== idObjetivo);
  actualizarVistaCompleta();
  guardarEstadoLocalStorage();
}

/* Lee y valida los controles de filtrado y ordenamiento desde el DOM */
function sincronizarFiltrosDesdeDom() {
  estadoApp.filtros.fechaDesde = esFechaIsoValida(elementosDom.filtroFechaDesde.value)
    ? elementosDom.filtroFechaDesde.value
    : "";
  estadoApp.filtros.fechaHasta = esFechaIsoValida(elementosDom.filtroFechaHasta.value)
    ? elementosDom.filtroFechaHasta.value
    : "";

  const valorMin = Number.parseFloat(elementosDom.filtroMontoMin.value);
  estadoApp.filtros.montoMin =
    Number.isFinite(valorMin) && valorMin >= 0 && valorMin <= MONTO_MAXIMO_PERMITIDO
      ? valorMin
      : null;

  const valorMax = Number.parseFloat(elementosDom.filtroMontoMax.value);
  estadoApp.filtros.montoMax =
    Number.isFinite(valorMax) && valorMax >= 0 && valorMax <= MONTO_MAXIMO_PERMITIDO
      ? valorMax
      : null;

  estadoApp.filtros.categoria = elementosDom.filtroCategoria.value;
  estadoApp.orden = elementosDom.selectorOrden.value;

  actualizarVistaCompleta();
}

/* Restablece filtros y criterio de ordenamiento a sus valores por defecto */
function limpiarFiltros() {
  elementosDom.filtroFechaDesde.value = "";
  elementosDom.filtroFechaHasta.value = "";
  elementosDom.filtroMontoMin.value = "";
  elementosDom.filtroMontoMax.value = "";
  elementosDom.filtroCategoria.value = "todas";
  elementosDom.selectorOrden.value = "fecha-desc";

  sincronizarFiltrosDesdeDom();
}

/* Muestra el formulario en linea para editar el presupuesto mensual */
function abrirEditorPresupuesto() {
  elementosDom.entradaPresupuesto.value = estadoApp.presupuestoMensual.toFixed(2);
  elementosDom.formularioPresupuesto.classList.remove("oculto");
  elementosDom.entradaPresupuesto.focus();
}

/* Oculta el formulario en linea para editar el presupuesto mensual */
function cerrarEditorPresupuesto() {
  elementosDom.formularioPresupuesto.classList.add("oculto");
}

/* Guarda un nuevo presupuesto mensual valido */
function guardarPresupuesto(eventoEnvio) {
  eventoEnvio.preventDefault();
  const nuevoMonto = Number.parseFloat(elementosDom.entradaPresupuesto.value);

  if (!Number.isFinite(nuevoMonto) || nuevoMonto < 0 || nuevoMonto > MONTO_MAXIMO_PERMITIDO) {
    mostrarAviso(`El presupuesto mensual debe ser un numero entre 0 y ${MONTO_MAXIMO_PERMITIDO}.`);
    return;
  }

  estadoApp.presupuestoMensual = Number(nuevoMonto.toFixed(2));
  cerrarEditorPresupuesto();
  actualizarVistaCompleta();
  guardarEstadoLocalStorage();
}

/* Registra los escuchadores de eventos de la interfaz */
function registrarEventos() {
  elementosDom.formularioGasto.addEventListener("submit", agregarNuevoGasto);

  elementosDom.filtroFechaDesde.addEventListener("change", sincronizarFiltrosDesdeDom);
  elementosDom.filtroFechaHasta.addEventListener("change", sincronizarFiltrosDesdeDom);
  elementosDom.filtroMontoMin.addEventListener("input", sincronizarFiltrosDesdeDom);
  elementosDom.filtroMontoMax.addEventListener("input", sincronizarFiltrosDesdeDom);
  elementosDom.filtroCategoria.addEventListener("change", sincronizarFiltrosDesdeDom);
  elementosDom.selectorOrden.addEventListener("change", sincronizarFiltrosDesdeDom);
  elementosDom.botonLimpiarFiltros.addEventListener("click", limpiarFiltros);

  elementosDom.botonEditarPresupuesto.addEventListener("click", abrirEditorPresupuesto);
  elementosDom.botonCancelarPresupuesto.addEventListener("click", cerrarEditorPresupuesto);
  elementosDom.formularioPresupuesto.addEventListener("submit", guardarPresupuesto);
}

document.addEventListener("DOMContentLoaded", () => {
  establecerFechaPorDefecto();
  registrarEventos();
  cargarDatosIniciales();
});