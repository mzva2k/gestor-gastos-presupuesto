# Gestor de Gastos y Presupuesto Mensual

## Descripcion General

Aplicacion web minimalista para gestionar gastos personales y organizar un presupuesto mensual. Permite establecer un presupuesto limite, registrar gastos por categoria, fecha y monto, filtrar y ordenar registros en tiempo real, consultar indicadores financieros y visualizar la distribucion del gasto mediante un grafico de barras en `<canvas>`[cite: 1, 2, 7].

## Arquitectura y Persistencia (Despliegue en Vercel)

El proyecto esta disenado como una aplicacion web estatica lista para desplegarse en **Vercel** sin necesidad de un servidor local en Python (`servidor.py` fue eliminado)[cite: 8]:

- **Presentacion (`index.html`, `styles.css`):** Estructura semantica HTML5, diseno adaptativo con CSS Grid/Flexbox y renderizado visual en `<canvas>`[cite: 1, 4, 6, 8].
- **Logica de negocio (`script.js`):** Manipulacion del DOM, validacion de entradas, sanitizacion de texto, filtrado/ordenamiento y calculo de totales y porcentajes[cite: 2, 8].
- **Datos iniciales y persistencia (`data.json` + `localStorage`):** Al iniciar, la aplicacion intenta cargar los valores base desde `data.json` mediante `fetch()` y guarda las modificaciones del usuario en `localStorage` para asegurar persistencia en el navegador dentro de entornos estaticos como Vercel[cite: 2, 5, 8].

## Estructura del Repositorio

- `index.html`: Interfaz principal, formularios, filtros, tabla de gastos y lienzo del grafico[cite: 1, 6].
- `styles.css`: Estilos visuales, paleta neutra, estados de saldo y reglas responsivas[cite: 4, 6].
- `script.js`: Logica modular de estado, validacion, filtros, calculos, grafico y persistencia[cite: 2, 6, 8].
- `data.json`: Estructura JSON inicial con `presupuestoMensual` y `gastos`[cite: 5, 6].
- `README.md`: Documentacion tecnica y guia de ejecucion[cite: 6, 8].

## Ejecucion y Despliegue

### 1. Despliegue en Vercel
1. Sube el repositorio a GitHub.
2. Importa el proyecto en **Vercel** como sitio estatico (sin comando de compilacion obligatorio ni servidor backend).
3. Abre la URL publica asignada por Vercel en tu navegador[cite: 8].

### 2. Ejecucion Local
1. Clona el repositorio en tu equipo:
   ```bash
   git clone <URL_DEL_REPOSITORIO>