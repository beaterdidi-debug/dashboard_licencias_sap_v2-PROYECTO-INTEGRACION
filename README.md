# Dashboard de medición de licencias SAP — versión 2

## Funcionalidades
- Importa Excel (`.xlsx`, `.xls`) o CSV desde el navegador y lee la primera hoja.
- Reconoce las columnas del archivo de referencia: `Md.`, `Usuarios`, `Nombre`, `Apellido`, `ID`, `Tp.usuario contract.`, `Tipo`, `Grupo`, `Entr.sist.`, `Válido de`, `Fin valid.`, `Cl.clasif.`, `Texto clase` y `EMPRESA`.
- Usa `ID` como categoría de tipo de licencia.
- Muestra gráficos por ID, empresa, grupo y composición de ID por empresa, con porcentajes en las gráficas.
- Incluye pestañas de Dashboard principal, **Sin ingreso 90 días** y **Alertas**.
- La pestaña Sin ingreso 90 días compara la fecha actual del navegador al cargar el archivo contra `Entr.sist.`. Solo considera inactivos a quienes superen 90 días calendario; exactamente 90 días no entra en la lista.
- Las alertas identifican vigencias vencidas, vigencias que vencen en los próximos 30 días, fechas ausentes y fechas de entrada posteriores a la fecha de carga.
- Permite exportar la vista principal, candidatos inactivos y alertas a CSV.
- Incluye una apariencia alusiva al café y a empresas del ecosistema cafetero.

## Cómo ejecutar
1. Descomprime el ZIP.
2. Abre `index.html` con Chrome o Edge.
3. Conéctate a internet para cargar las bibliotecas SheetJS y Chart.js desde CDN.
4. Pulsa **Ver ejemplo** para comprobar los porcentajes, alertas e inactividad; después selecciona el Excel real.

No requiere Node.js ni instalación de paquetes. Los datos se procesan en el navegador y no se envían a un servidor.

## Regla de inactividad
- La fecha de referencia es la fecha local del equipo al momento de cargar/procesar el archivo.
- Se interpreta `Entr.sist.` como fecha de última entrada y se aceptan formatos `dd.mm.aaaa`, `dd/mm/aaaa`, `dd-mm-aaaa`, `aaaa-mm-dd` y fechas seriales de Excel.
- `días sin ingreso = fecha de referencia - Entr.sist.` en días calendario.
- Si el resultado es mayor que 90, el usuario aparece en la pestaña **Sin ingreso 90 días** con Usuario, Grupo, Empresa, ID, tipo contractual, fecha y días calculados.
- Si no existe fecha de entrada, el usuario no se clasifica automáticamente como inactivo; aparece en alertas para validación manual.
- Si la fecha de entrada está en el futuro respecto a la fecha de referencia, se genera alerta de calidad de datos.
- La sugerencia es revisar con el responsable y evaluar bloqueo/desactivación o eliminación según el proceso autorizado. El dashboard no ejecuta bajas ni elimina cuentas.

## Explicación del código
- `index.html`: estructura de interfaz, pestañas, filtros, KPI, gráficos y tablas.
- `css/styles.css`: diseño responsive, colores inspirados en café y follaje, estados de alerta y tablas.
- `js/app.js`: lectura del Excel, normalización de datos, cálculo de días, filtros, porcentajes de gráficos, alertas y exportación CSV.

Funciones clave:
- `parseDate()`: interpreta las fechas de SAP/Excel.
- `normalizeData()`: convierte cada fila en un objeto consistente.
- `refreshFilters()`: carga opciones de empresa, grupo e ID.
- `getFilteredRows()`: aplica los filtros seleccionados.
- `renderCharts()`: construye los gráficos y etiquetas porcentuales.
- `calculateInactive()`: identifica registros con más de 90 días desde `Entr.sist.`.
- `getAlerts()`: identifica vigencias vencidas/próximas a vencer y datos de fecha incompletos.
- `exportCsv()`: exporta datos filtrados o listas de revisión.

## Precauciones
- La categoría `ID` no garantiza por sí sola la clasificación contractual que SAP facture; se conserva `Tp.usuario contract.` para contrastarla.
- No se recomienda borrar usuarios automáticamente. Validar actividad, necesidades de negocio, auditoría, integraciones, cuentas técnicas y aprobaciones antes de cualquier baja.
- El prototipo no incorpora autenticación, permisos, trazabilidad central ni conexión a SAP.
- Para uso productivo debe revisarse con Seguridad SAP/licenciamiento y probarse con una copia autorizada del reporte.
