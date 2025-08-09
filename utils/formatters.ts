export function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return 'Fecha inválida';
    }
}

export function getEspecialidadClasses(especialidad?: string): string {
    if (!especialidad) return 'bg-slate-100 text-slate-800 border-slate-200';
    
    const baseClasses = "inline-flex items-center font-semibold py-1 px-2.5 rounded-full text-xs border";
    const normalizedEspecialidad = normalizeStringForComparison(especialidad);

    switch (normalizedEspecialidad) {
        case 'clinica':
            return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
        case 'educacional':
            return `${baseClasses} bg-sky-100 text-sky-800 border-sky-200`;
        case 'laboral':
            return `${baseClasses} bg-rose-100 text-rose-800 border-rose-200`;
        case 'comunitaria':
            return `${baseClasses} bg-violet-100 text-violet-800 border-violet-200`;
        default:
            return `${baseClasses} bg-slate-100 text-slate-800 border-slate-200`;
    }
}

export function getStatusVisuals(status?: string): { icon: string; iconContainerClass: string; labelClass: string; } {
    const normalizedStatus = normalizeStringForComparison(status);
    const baseLabel = "inline-flex items-center font-semibold px-2.5 py-1 rounded-full text-xs capitalize";
    const baseIconContainer = "flex-shrink-0 size-11 rounded-lg flex items-center justify-center mr-4";

    // --- PRIORITY 1: TERMINAL STATES (Completed / Failed) ---
    // Handle these first as they are the final state of a request.

    if (normalizedStatus.includes('convenio realizado')) {
        return {
            icon: 'fact_check',
            iconContainerClass: `${baseIconContainer} bg-blue-100 text-blue-600`,
            labelClass: `${baseLabel} bg-blue-100 text-blue-800`,
        };
    }
    // Specific check for "PPS Realizada" and other completed states.
    if (normalizedStatus === 'pps realizada' || normalizedStatus.includes('finalizada')) {
        return {
            icon: 'check_circle',
            iconContainerClass: `${baseIconContainer} bg-blue-100 text-blue-600`,
            labelClass: `${baseLabel} bg-blue-100 text-blue-800`,
        };
    }
     // Broad check for 'realizada' after specific cases.
    if (normalizedStatus.includes('realizada')) {
        return {
            icon: 'check_circle',
            iconContainerClass: `${baseIconContainer} bg-blue-100 text-blue-600`,
            labelClass: `${baseLabel} bg-blue-100 text-blue-800`,
        };
    }
    if (normalizedStatus.includes('no se pudo concretar') || normalizedStatus.includes('no seleccionado')) {
        return {
            icon: 'cancel',
            iconContainerClass: `${baseIconContainer} bg-rose-100 text-rose-600`,
            labelClass: `${baseLabel} bg-rose-100 text-rose-800`,
        };
    }

    // --- PRIORITY 2: ACTIVE / IN-PROGRESS STATES ---

    if (normalizedStatus.includes('en curso')) {
        return {
            icon: 'sync',
            iconContainerClass: `${baseIconContainer} bg-yellow-100 text-yellow-600 animate-spin [animation-duration:3s]`,
            labelClass: `${baseLabel} bg-yellow-100 text-yellow-800`,
        };
    }
    if (normalizedStatus.includes('en conversaciones') || normalizedStatus.includes('realizando convenio')) {
        return {
            icon: 'hourglass_top',
            iconContainerClass: `${baseIconContainer} bg-amber-100 text-amber-600`,
            labelClass: `${baseLabel} bg-amber-100 text-amber-800`,
        };
    }
    
    // --- PRIORITY 3: INITIAL / ENROLLMENT STATES ---

    if (normalizedStatus.includes('puesta en contacto')) {
        return {
            icon: 'rocket_launch',
            iconContainerClass: `${baseIconContainer} bg-indigo-100 text-indigo-600`,
            labelClass: `${baseLabel} bg-indigo-100 text-indigo-800`,
        };
    }
    if (normalizedStatus.includes('abierta')) {
        return {
            icon: 'door_open',
            iconContainerClass: `${baseIconContainer} bg-green-100 text-green-600`,
            labelClass: `${baseLabel} bg-green-100 text-green-800`,
        };
    }
    if (normalizedStatus.includes('seleccionado')) {
        return {
            icon: 'verified',
            iconContainerClass: `${baseIconContainer} bg-indigo-100 text-indigo-600`,
            labelClass: `${baseLabel} bg-indigo-100 text-indigo-800`,
        };
    }
     if (normalizedStatus.includes('inscripto')) {
        return {
            icon: 'how_to_reg',
            iconContainerClass: `${baseIconContainer} bg-sky-100 text-sky-600`,
            labelClass: `${baseLabel} bg-sky-100 text-sky-800`,
        };
    }

    // --- DEFAULT FALLBACK ---
    return {
        icon: 'help_outline',
        iconContainerClass: `${baseIconContainer} bg-slate-100 text-slate-500`,
        labelClass: `${baseLabel} bg-slate-100 text-slate-800`,
    };
}


export function normalizeStringForComparison(str?: string): string {
  if (!str) return "";
  return str
    .normalize("NFD") // Decompose accented characters into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (e.g. accents)
    .toLowerCase()
    .trim();
}