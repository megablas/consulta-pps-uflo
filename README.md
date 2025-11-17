# Mi Panel Académico

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
- **Backend (para Vercel):** [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos:** [Airtable](https://www.airtable.com/)

---

## 🛠️ Desarrollo Local y Entornos de Vista Previa

Sigue estos pasos para configurar y ejecutar el proyecto en tu máquina local. La aplicación tiene dos modos de ejecución para simular diferentes entornos.

### Instalación

1.  **Clona el repositorio e instala dependencias:**
    ```bash
    git clone [URL_DEL_REPOSITORIO]
    cd [NOMBRE_DEL_DIRECTORIO]
    npm install
    ```

2.  **Configura las Credenciales de Airtable:**
    Crea un archivo llamado `.env` en la raíz del proyecto. Este archivo manejará las credenciales para los diferentes modos de desarrollo.

    ```
    # Archivo .env

    # --- Para el modo de producción (Vercel Proxy) ---
    # Usado por `vercel dev`. Estas no llevan el prefijo VITE_.
    AIRTABLE_PAT="pat..."
    AIRTABLE_BASE_ID="app..."
    JWT_SECRET="tu-secreto-muy-largo-y-seguro"

    # --- Para el modo de vista previa (Client-Side) ---
    # Usado por `npm run dev`. Estas SÍ llevan el prefijo VITE_.
    VITE_APP_MODE="preview"
    VITE_AIRTABLE_PAT="pat..."
    VITE_AIRTABLE_BASE_ID="app..."
    ```

### Modos de Ejecución

#### Modo 1: Simulación de Producción (Vercel)

Este modo utiliza las funciones serverless como un proxy seguro para comunicarse con Airtable. Es ideal para probar el comportamiento que tendrá la aplicación en Vercel.

1.  Asegúrate de que las variables `AIRTABLE_PAT`, `AIRTABLE_BASE_ID` y `JWT_SECRET` estén en tu archivo `.env`.
2.  Inicia la aplicación con la CLI de Vercel:
    ```bash
    npm install -g vercel # Si no la tienes instalada
    vercel dev
    ```
    La aplicación se ejecutará en un puerto local (ej. `http://localhost:3000`) y las llamadas a `/api/*` serán manejadas por el proxy serverless.

#### Modo 2: Simulación de Vista Previa (AI Studio / Client-Side)

Este modo hace que la aplicación se conecte a Airtable directamente desde el navegador. Es útil para entornos que no soportan un backend, como la vista previa de AI Studio.

1.  Asegúrate de que las variables `VITE_APP_MODE="preview"`, `VITE_AIRTABLE_PAT` y `VITE_AIRTABLE_BASE_ID` estén en tu archivo `.env`.
2.  Inicia el servidor de desarrollo de Vite:
    ```bash
    npm run dev
    ```
    La aplicación se ejecutará en `http://localhost:5173` (o similar) y hará llamadas directas a la API de Airtable.

---

### 🧪 Usuarios de Demostración

Para facilitar las pruebas, se han habilitado usuarios de demostración. Estos inicios de sesión no consultan la tabla de usuarios de Airtable, pero una vez dentro, **cargarán datos reales** de la base de datos para simular una experiencia completa.

-   **Usuario Administrador de Pruebas:**
    -   **Legajo:** `testing`
    -   **Contraseña:** `testing`
    -   Acceso a un panel de administrador que consume datos reales de Airtable.

-   **Usuario Estudiante de Demostración:**
    -   **Legajo:** `12345`
    -   **Contraseña:** `12345`
    -   Inicia sesión como un usuario de prueba, pero carga el panel del estudiante real con legajo `12345`.

-   **Usuario Reportero de Demostración:**
    -   **Legajo:** `reportero`
    -   **Contraseña:** `reportero`
    -   Acceso de solo lectura al panel de métricas y reportes con datos reales.

El inicio de sesión de cualquier otro usuario real solo funcionará en el **Modo 1 (Simulación de Producción)**, ya que requiere el proxy para verificar la contraseña.