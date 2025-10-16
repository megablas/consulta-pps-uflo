# Mi Panel Académico

![Mi Panel Académico](./assets/app_screenshot.png) <!-- Opcional: Añadir una captura de pantalla -->

**Mi Panel Académico** es una aplicación web diseñada para que los estudiantes de la UFLO puedan consultar y gestionar de forma centralizada y segura el estado de sus Prácticas Profesionales Supervisadas (PPS).

---

## Características Principales (Key Features)

La plataforma ofrece funcionalidades tanto para estudiantes como para administradores.

### Portal Estudiantil
- **Acceso Seguro:** Autenticación de usuarios mediante número de Legajo y una contraseña personal.
- **Dashboard de Progreso:** Muestra el total de horas de prácticas completadas, el progreso por especialidad y el cumplimiento del criterio de rotación de orientaciones.
- **Seguimiento de PPS:** Permite consultar el estado de las solicitudes de PPS autogestionadas por el estudiante.
- **Historial de Prácticas:** Presenta una tabla con el detalle de todas las prácticas realizadas, incluyendo institución, fechas, horas y estado de aprobación.
- **Inscripción a Convocatorias:** Lista las oportunidades de PPS disponibles y permite al estudiante postularse a través de un formulario.
- **Gestión de Informes:** Proporciona los enlaces para la entrega de informes finales y permite confirmar dicha entrega para su posterior corrección.

### Panel de Administración (SuperUser)
- **Búsqueda de Estudiantes:** Permite buscar un estudiante por nombre o legajo para acceder a una vista de su panel personal.
- **Gestión de Convocatorias:** Permite modificar el estado de las convocatorias de PPS (Abierta, Cerrada, Oculta) para controlar su visibilidad para los estudiantes.
- **Generador de Seguros:** Herramienta que recopila los datos de los alumnos seleccionados en una convocatoria y genera una planilla Excel para la tramitación del seguro ART.
- **Panel de Corrección:** Interfaz para visualizar los informes de PPS entregados y registrar las calificaciones correspondientes.

---

## Pila Tecnológica (Tech Stack)

- **Frontend:** [React](https://react.dev/) con [Vite](https://vitejs.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Bases de Datos:** [Airtable](https://www.airtable.com/)

---

## 🛠️ Primeros Pasos y Desarrollo Local

Sigue estos pasos para configurar y ejecutar el proyecto en tu máquina local.

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone [URL_DEL_REPOSITORIO]
    cd [NOMBRE_DEL_DIRECTORIO]
    ```

2.  **Instala las dependencias:**
    Usa `npm` para instalar todos los paquetes necesarios.
    ```bash
    npm install
    ```

### Configuración del Entorno

La aplicación necesita credenciales para conectarse a Airtable.

1.  **Crea un archivo `.env`:**
    En la raíz del proyecto, crea un archivo llamado `.env`.

2.  **Añade tus credenciales:**
    Abre `.env` y añade las siguientes variables, reemplazando los valores con tus propias credenciales.

    ```bash
    # Archivo .env en la raíz del proyecto

    # Token de Acceso Personal (PAT) de Airtable
    VITE_AIRTABLE_PAT="pat..."

    # ID de tu Base de Airtable
    VITE_AIRTABLE_BASE_ID="app..."
    ```

    -   **Importante:** El prefijo `VITE_` es necesario para que Vite exponga estas variables a la aplicación en el navegador durante el desarrollo.
    -   Puedes encontrar el **Base ID** de Airtable en la [documentación de la API de Airtable](https://airtable.com/developers/web/api/introduction) al seleccionar tu base.
    -   Puedes generar un **Personal Access Token (PAT)** en la sección de [Cuenta de Desarrollador de Airtable](https://airtable.com/create/tokens). Asegúrate de que el token tenga los permisos (`scopes`) necesarios para leer y escribir en tu base (`data.records:read` y `data.records:write`).

### Iniciar la Aplicación

Una vez instaladas las dependencias y configuradas las credenciales, inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne).

**Nota sobre el Proxy:** El archivo `vite.config.ts` está configurado con un proxy que redirige las llamadas de `/airtable-api` a `https://api.airtable.com`. Esto evita problemas de CORS durante el desarrollo local y no requiere configuración adicional.