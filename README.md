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


## Automatizacion CI/CD con Jenkins

Este repositorio incluye un `Jenkinsfile` para automatizar la descarga, validacion,
construccion de imagen Docker y despliegue del Dashboard.

### Arquitectura actual

Esta version es una aplicacion web estatica (HTML, CSS y JavaScript) servida por Nginx.
No contiene una API PHP ni una base de datos MySQL. Los archivos Excel se seleccionan
desde el navegador y el procesamiento descrito en esta version ocurre localmente.

### Requisitos para ejecutar el pipeline en Windows

- Jenkins instalado y ejecutandose en Windows.
- Git disponible para Jenkins.
- Docker Desktop iniciado.
- Docker CLI y `docker compose` disponibles en el PATH del servicio Jenkins.
- La cuenta del servicio Jenkins debe tener permisos para comunicarse con Docker.
- El repositorio debe contener este `Jenkinsfile` en su carpeta raiz.

### Configuracion en Jenkins

1. Crear un elemento de tipo **Pipeline**.
2. En **Pipeline > Definition**, seleccionar **Pipeline script from SCM**.
3. En **SCM**, seleccionar **Git**.
4. Pegar la URL del repositorio.
5. Seleccionar las credenciales si el repositorio es privado.
6. Seleccionar la rama principal (por ejemplo `main`).
7. En **Script Path**, escribir `Jenkinsfile`.
8. Guardar y ejecutar **Build Now**.

### Puertos

- Jenkins: `http://localhost:8080`
- Dashboard: `http://localhost:8081`

Se utiliza el puerto 8081 para el Dashboard porque Jenkins normalmente ocupa el 8080
en esta instalacion local. Si el puerto 8081 ya esta ocupado, cambiar la asignacion
en `docker-compose.yml` y el valor `APP_URL` del `Jenkinsfile` para que coincidan.

### Etapas del pipeline

1. Obtener el codigo desde SCM.
2. Validar la presencia de los archivos principales.
3. Verificar Docker y Docker Compose.
4. Construir y etiquetar la imagen Docker.
5. Desplegar/actualizar el servicio con Docker Compose.
6. Comprobar que el Dashboard responda HTTP 200.

### Nota sobre permisos de Docker

En Windows, Jenkins instalado como servicio puede ejecutarse con una cuenta distinta
a la sesion que inicia Docker Desktop. Si `docker info` falla desde Jenkins aunque
funcione en CMD, revisar la cuenta del servicio Jenkins y sus permisos de acceso al
motor Docker. No almacenar contrasenas ni tokens directamente en el Jenkinsfile.
Prueba de integración continua CI/CD con Jenkins.