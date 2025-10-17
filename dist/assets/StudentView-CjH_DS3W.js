import{A as i,a as r,b as l,j as e,u as c,r as d}from"./index-BYxuNGcp.js";import{C as u}from"./Checkbox-DrbDCS7R.js";import{S as m}from"./StudentDashboard-CzMA6_g1.js";import{A as b}from"./AppModals-CZXXymwh.js";const f={convocatorias:{title:"Sobre las Convocatorias",text:"Las convocatorias se abren y cierran según las necesidades de las instituciones. Si no ves una PPS de tu interés, ¡vuelve a consultar pronto! Las fechas y horarios son definidos por cada institución y no pueden modificarse.",icon:"campaign",mailToSubject:"Consulta sobre Convocatorias de PPS - Mi Panel Académico",mailToBody:`Hola,

Tengo una consulta sobre las convocatorias de PPS.

- Nombre Completo: [Escribe tu nombre]
- Legajo: [Escribe tu legajo]
- Mi consulta es: [Describe tu duda]

Gracias.`,buttonText:"Consultar sobre convocatorias"},informes:{title:l,text:'El proceso de entrega tiene dos pasos: primero, haz clic en la tarjeta del informe para ir al campus y subir tu archivo. Luego, regresa a este panel y presiona "Confirmar Entrega" para notificarnos. Las fechas límite pueden variar levemente; siempre se respetarán los 30 días reglamentarios desde tu finalización real para la entrega.',icon:"rule_folder",mailToSubject:"Consulta sobre Fecha de Entrega de Informe - Mi Panel Académico",mailToBody:`Hola,

Quisiera solicitar una corrección o consultar sobre la fecha de entrega de un informe.

- Nombre Completo: [Escribe tu nombre]
- Legajo: [Escribe tu legajo]
- PPS Involucrada: [Escribe el nombre de la PPS]

Gracias.`,buttonText:"Consultar sobre fecha de entrega"},solicitudes:{title:"Acerca de tus Solicitudes",text:"El estado de tus solicitudes de PPS se actualiza a medida que avanzan las gestiones con las instituciones, lo cual puede tomar tiempo. Te mantendremos informado de cada avance a través de notificaciones por correo electrónico. Si tienes dudas sobre un estado en particular, puedes contactarnos.",icon:"list_alt",mailToSubject:"Consulta sobre Estado de Solicitud de PPS - Mi Panel Académico",mailToBody:`Hola,

Tengo una consulta sobre el estado de mi solicitud de PPS.

- Nombre Completo: [Escribe tu nombre]
- Legajo: [Escribe tu legajo]
- Institución Solicitada: [Escribe el nombre de la institución]

Gracias.`,buttonText:"Consultar sobre una solicitud"},practicas:{title:r,text:i,icon:"gavel",mailToSubject:"Solicitud de Corrección de Datos - Mi Panel Académico",mailToBody:`Hola,

Solicito una corrección en mis datos. Adjunto la documentación respaldatoria (ej. planilla de asistencia).

- Nombre Completo: [Escribe tu nombre]
- Legajo: [Escribe tu legajo]

Gracias.`,buttonText:"Enviar correo para corrección"},profile:{title:"Sobre tus Datos Personales",text:"Mantener tus datos de contacto actualizados es fundamental para que podamos comunicarnos contigo sobre el estado de tus PPS, nuevas convocatorias y fechas importantes. Si detectas algún error, no dudes en solicitar una corrección.",icon:"contact_mail",mailToSubject:"Solicitud de Actualización de Datos - Mi Panel Académico",mailToBody:`Hola,

Tengo una consulta o solicitud sobre mis datos personales.

- Nombre Completo: [Escribe tu nombre]
- Legajo: [Escribe tu legajo]
- Mi consulta es: [Describe tu duda]

Gracias.`,buttonText:"Consultar sobre mis datos"}},x=({activeTab:t})=>{const a=f[t];if(!a)return null;const s=`mailto:blas.rivera@uflouniversidad.edu.ar?subject=${encodeURIComponent(a.mailToSubject)}&body=${encodeURIComponent(a.mailToBody)}`;return e.jsx("footer",{className:"mt-16 mb-8 animate-fade-in-up",children:e.jsx(u,{children:e.jsxs("div",{className:"flex items-start gap-5",children:[e.jsx("div",{className:"flex-shrink-0",children:e.jsx("div",{className:"bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full size-11 flex items-center justify-center",children:e.jsx("span",{className:"material-icons","aria-hidden":"true",children:a.icon})})}),e.jsxs("div",{className:"flex-grow",children:[e.jsx("h3",{className:"font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight",children:a.title}),e.jsx("p",{className:"mt-2 text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-prose",children:a.text}),e.jsxs("a",{href:s,target:"_blank",rel:"noopener noreferrer",className:"mt-5 inline-flex items-center gap-2.5 bg-blue-600 text-white font-bold text-sm py-2.5 px-6 rounded-lg border border-transparent hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-800",children:[e.jsx("span",{className:"material-icons !text-base",children:"email"}),e.jsx("span",{children:a.buttonText})]})]})]})})})},p=({tabs:t,activeTabId:a,onTabChange:s})=>e.jsx("nav",{className:"md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-700/80 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-40",children:e.jsx("div",{className:"flex justify-around items-start h-16 pt-2",children:t.map(o=>{const n=a===o.id;return e.jsxs("button",{onClick:()=>s(o.id),className:`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 focus-visible:ring-blue-500 rounded-md ${n?"text-blue-600 dark:text-blue-400":"text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`,"aria-current":n?"page":void 0,children:[e.jsx("div",{className:`transform transition-all duration-300 ease-out ${n?"-translate-y-1 scale-110":""}`,children:e.jsx("span",{className:"material-icons !text-2xl",children:o.icon})}),e.jsx("span",{className:`text-xs mt-1 transition-all duration-200 ${n?"font-bold":"font-medium"}`,children:o.label})]},o.id)})})}),T=()=>{const{authenticatedUser:t}=c(),[a,s]=d.useState("convocatorias");if(!t)return null;const o=[{id:"convocatorias",label:"Convocatorias",icon:"campaign"},{id:"calendario",label:"Calendario",icon:"calendar_month"},{id:"informes",label:"Informes",icon:"assignment_turned_in"},{id:"solicitudes",label:"Solicitudes",icon:"list_alt"},{id:"practicas",label:"Prácticas",icon:"work_history"}];return e.jsxs(e.Fragment,{children:[e.jsx(m,{user:t,activeTab:a,onTabChange:s}),e.jsx(x,{activeTab:a}),e.jsx(b,{}),e.jsx(p,{tabs:o,activeTabId:a,onTabChange:s})]})};export{T as default};
