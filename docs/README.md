# Mi Panel Académico

![Mi Panel Académico](./assets/app_screenshot.png) <!-- Opcional: Añadir una captura de pantalla -->

**Mi Panel Académico** es una aplicación web diseñada para que los estudiantes de la UFLO puedan consultar y gestionar de forma centralizada y segura el estado de sus Prácticas Profesionales Supervisadas (PPS).

---

## ✨ Características Principales (Key Features)

La plataforma ofrece una experiencia completa tanto para estudiantes como para administradores.

### Portal Estudiantil
- **🔐 Acceso Seguro:** Inicio de sesión único por número de Legajo y contraseña.
- **📊 Dashboard de Progreso:** Visualización clara del avance de horas totales, horas por especialidad y rotación de orientaciones.
- **📝 Seguimiento de PPS:** Consulta el estado actualizado de las solicitudes de PPS enviadas.
- **🗂️ Historial de Prácticas:** Tabla detallada con todas las prácticas realizadas, horas, fechas y estado.
- **🚀 Inscripción a Convocatorias:** Postulación a nuevas oportunidades de PPS directamente desde la plataforma.
- **✅ Gestión de Informes:** Subida y confirmación de la entrega de informes finales.

### Panel de Administración (SuperUser)
- **🔍 Búsqueda Centralizada:** Localiza estudiantes por nombre o legajo para ver su panel individual.
- **⚙️ Gestión de Convocatorias:** Controla el estado de las convocatorias (Abierta, Cerrada, Oculta).
- **🛡️ Generador de Seguros:** Herramienta para generar reportes de seguro para los alumnos seleccionados.
- **✍️ Corrección Rápida:** Panel optimizado para la corrección masiva de informes de PPS.

---

## 🚀 Pila Tecnológica (Tech Stack)

- **Frontend:** [React](https://react.dev/) con [Vite](https://vitejs.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Base de Datos / Backend:** [Airtable](https://www.airtable.com/)

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

### Configuración del Entorno (Airtable)

La aplicación necesita credenciales para conectarse a la base de datos de Airtable.

1.  **Crea el archivo de constantes:**
    Si no existe, crea un archivo `src/constants.ts`.

2.  **Añade tus credenciales de Airtable:**
    Abre `src/constants.ts` y reemplaza los valores de `AIRTABLE_PAT` y `AIRTABLE_BASE_ID` con tus propias credenciales.

    ```typescript
    // src/constants.ts

    // Token de Acceso Personal (PAT) de Airtable
    export const AIRTABLE_PAT = 'pat...'; // Reemplazar con tu token

    // ID de tu Base de Airtable
    export const AIRTABLE_BASE_ID = 'app...'; // Reemplazar con el ID de tu base
    ```

    -   Puedes encontrar el **Base ID** en la [documentación de la API de Airtable](https://airtable.com/developers/web/api/introduction) al seleccionar tu base.
    -   Puedes generar un **Personal Access Token (PAT)** en la sección de [Cuenta de Desarrollador de Airtable](https://airtable.com/create/tokens). Asegúrate de que el token tenga los permisos (`scopes`) necesarios para leer y escribir en tu base (`data.records:read` y `data.records:write`).

### Iniciar la Aplicación

Una vez instaladas las dependencias y configuradas las credenciales, inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173` (o el puerto que Vite asigne).

**Nota sobre el Proxy:** El archivo `vite.config.ts` está configurado con un proxy que redirige las llamadas de `/airtable-api` a `https://api.airtable.com`. Esto evita problemas de CORS durante el desarrollo local y no requiere configuración adicional.
