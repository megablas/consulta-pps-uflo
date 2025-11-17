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
- **Backend:** [Vercel Serverless Functions](https://vercel.com/docs/functions) (Node.js)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Bases de Datos:** [Airtable](https://www.airtable.com/)

---

## 🚀 Despliegue en Vercel

Esta aplicación está diseñada para ser desplegada en Vercel, que maneja tanto el frontend estático como las funciones de backend.

1.  **Conecta tu Repositorio:** Importa tu repositorio de Git en Vercel.
2.  **Configura el Proyecto:** Vercel detectará automáticamente que es un proyecto Vite y aplicará la configuración correcta.
3.  **Variables de Entorno:** Ve a la configuración de tu proyecto en Vercel y añade las siguientes variables de entorno:
    -   `AIRTABLE_PAT`: Tu Personal Access Token de Airtable.
    -   `AIRTABLE_BASE_ID`: El ID de tu base de Airtable.
    -   `JWT_SECRET`: Una cadena de texto larga, aleatoria y secreta para firmar los tokens de sesión.

4.  **Despliega:** Al hacer push a la rama principal, Vercel desplegará automáticamente la aplicación.

## 🛠️ Desarrollo Local

1.  **Clona el repositorio e instala dependencias:**
    ```bash
    git clone [URL_DEL_REPOSITORIO]
    cd [NOMBRE_DEL_DIRECTORIO]
    npm install
    ```

2.  **Configura el Entorno Local:**
    -   Crea un archivo `.env` en la raíz del proyecto.
    -   Añade las mismas variables de entorno que configurarías en Vercel:
        ```
        AIRTABLE_PAT="pat..."
        AIRTABLE_BASE_ID="app..."
        JWT_SECRET="tu-secreto-muy-largo-y-seguro"
        ```

3.  **Inicia la Aplicación:**
    Usa la CLI de Vercel para emular el entorno de producción localmente.
    ```bash
    npm install -g vercel # Si no la tienes instalada
    vercel dev
    ```
    La aplicación estará disponible en un puerto local (ej. `http://localhost:3000`).

---

### 🧪 Usuarios de Demostración

Para facilitar las pruebas, se han habilitado usuarios de demostración que no requieren una base de datos de Airtable:

-   **Usuario Administrador de Pruebas:**
    -   **Legajo:** `testing`
    -   **Contraseña:** `testing`
    -   Acceso a un panel de administrador con datos simulados.

-   **Usuario Estudiante de Demostración:**
    -   **Legajo:** `12345`
    -   **Contraseña:** `12345`
    -   Acceso a un panel de estudiante con datos simulados.

-   **Usuario Reportero de Demostración:**
    -   **Legajo:** `reportero`
    -   **Contraseña:** `reportero`
    -   Acceso de solo lectura al panel de métricas y reportes.

Estos inicios de sesión no realizan llamadas a la API y funcionan de manera local en el navegador.