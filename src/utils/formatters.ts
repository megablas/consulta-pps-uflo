export function addBusinessDays(startDate: Date, days: number): Date {
    let date = new Date(startDate.getTime()); // Creates a copy
    let added = 0;
    while (added < days) {
        // Use UTC date methods to avoid timezone issues
        date.setUTCDate(date.getUTCDate() + 1);
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            added++;
        }
    }
    return date;
}

export function formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    let date: Date;

    // First, try to parse it as is. This works for ISO 8601 formats (YYYY-MM-DD) which Airtable's Date fields provide.
    const initialDate = new Date(dateString);

    // Check if the initial parsing resulted in a valid date.
    if (!isNaN(initialDate.getTime())) {
        date = initialDate;
    } else {
        // If not, try parsing a DD/MM/YYYY format.
        const parts = dateString.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (parts) {
            // parts[1] = day, parts[2] = month, parts[3] = year
            // Note: Month is 0-indexed in JavaScript Date constructor (0 for Jan, 11 for Dec).
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1;
            const year = parseInt(parts[3], 10);
            // Check for valid date components before creating the date object.
            if (year > 1000 && month >= 0 && month < 12 && day > 0 && day <= 31) {
                date = new Date(Date.UTC(year, month, day));
            } else {
                date = new Date('invalid');
            }
        } else {
            date = new Date('invalid');
        }
    }
    
    // Final check if the resulting date is valid.
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }
    
    // If valid, format and return it.
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC' // Use UTC to avoid off-by-one day errors due to timezone conversion
    });
}

export function getEspecialidadClasses(especialidad?: string): { 
    tag: string; 
    gradient: string; 
    textOnDark: string;
    headerBg: string;
    headerText: string;
    dot: string;
} {
    const baseClasses = "inline-flex items-center font-semibold py-1 px-2.5 rounded-full text-xs border";
    const normalizedEspecialidad = normalizeStringForComparison(especialidad);

    const styles = {
        clinica: {
            tag: `${baseClasses} bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/50`,
            gradient: 'from-green-500 to-teal-500',
            textOnDark: 'text-green-100',
            headerBg: 'bg-green-50 dark:bg-green-900/20',
            headerText: 'text-green-900 dark:text-green-200',
            dot: 'bg-green-500',
        },
        educacional: {
            tag: `${baseClasses} bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700/50`,
            gradient: 'from-sky-500 to-blue-600',
            textOnDark: 'text-sky-100',
            headerBg: 'bg-sky-50 dark:bg-sky-900/20',
            headerText: 'text-sky-900 dark:text-sky-200',
            dot: 'bg-sky-500',
        },
        laboral: {
            tag: `${baseClasses} bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700/50`,
            gradient: 'from-rose-500 to-red-600',
            textOnDark: 'text-rose-100',
            headerBg: 'bg-rose-50 dark:bg-rose-900/20',
            headerText: 'text-rose-900 dark:text-rose-200',
            dot: 'bg-rose-500',
        },
        comunitaria: {
            tag: `${baseClasses} bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-700/50`,
            gradient: 'from-violet-500 to-purple-600',
            textOnDark: 'text-violet-100',
            headerBg: 'bg-violet-50 dark:bg-violet-900/20',
            headerText: 'text-violet-900 dark:text-violet-200',
            dot: 'bg-violet-500',
        },
        default: {
            tag: `${baseClasses} bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600`,
            gradient: 'from-slate-500 to-slate-600',
            textOnDark: 'text-slate-100',
            headerBg: 'bg-slate-50 dark:bg-slate-800/50',
            headerText: 'text-slate-900 dark:text-slate-200',
            dot: 'bg-slate-500',
        },
    };

    return (styles as any)[normalizedEspecialidad] || styles.default;
}

export function getStatusVisuals(status?: string): { icon: string; iconContainerClass: string; labelClass: string; accentBg: string; } {
    const normalizedStatus = normalizeStringForComparison(status);
    const baseLabel = "inline-flex items-center font-semibold px-2.5 py-1 rounded-full text-xs capitalize";
    const baseIconContainer = "flex-shrink-0 size-11 rounded-lg flex items-center justify-center mr-4";

    const states = {
        'convenio realizado': { icon: 'fact_check', color: 'blue' },
        'pps realizada': { icon: 'check_circle', color: 'blue' },
        'finalizada': { icon: 'check_circle', color: 'blue' },
        'realizada': { icon: 'check_circle', color: 'blue' },
        'no se pudo concretar': { icon: 'cancel', color: 'rose' },
        'no seleccionado': { icon: 'cancel', color: 'rose' },
        'en curso': { icon: 'sync', color: 'yellow', animation: 'animate-spin [animation-duration:3s]' },
        'en conversaciones': { icon: 'hourglass_top', color: 'amber' },
        'realizando convenio': { icon: 'hourglass_top', color: 'amber' },
        'puesta en contacto': { icon: 'rocket_launch', color: 'indigo' },
        'abierta': { icon: 'door_open', color: 'green' },
        'abierto': { icon: 'door_open', color: 'green' },
        'seleccionado': { icon: 'verified', color: 'indigo' },
        'inscripto': { icon: 'how_to_reg', color: 'sky' },
        'cerrado': { icon: 'lock', color: 'slate' },
        'oculto': { icon: 'visibility_off', color: 'neutral' },
    };

    const colorClasses: Record<string, { icon: string, label: string, accentBg: string }> = {
        blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300', label: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', accentBg: 'bg-blue-500' },
        rose: { icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300', label: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200', accentBg: 'bg-rose-500' },
        yellow: { icon: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300', label: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200', accentBg: 'bg-yellow-500' },
        amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300', label: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', accentBg: 'bg-amber-500' },
        indigo: { icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300', label: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200', accentBg: 'bg-indigo-500' },
        green: { icon: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300', label: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200', accentBg: 'bg-green-500' },
        sky: { icon: 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300', label: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200', accentBg: 'bg-sky-500' },
        slate: { icon: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400', label: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300', accentBg: 'bg-slate-400' },
        neutral: { icon: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400', label: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300', accentBg: 'bg-neutral-400' },
    };

    for (const key in states) {
        if (normalizedStatus.includes(key)) {
            const state = (states as any)[key];
            const classes = colorClasses[state.color];
            return {
                icon: state.icon,
                iconContainerClass: `${baseIconContainer} ${classes.icon} ${state.animation || ''}`,
                labelClass: `${baseLabel} ${classes.label}`,
                accentBg: classes.accentBg,
            };
        }
    }

    // --- DEFAULT FALLBACK ---
    return {
        icon: 'help_outline',
        iconContainerClass: `${baseIconContainer} bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400`,
        labelClass: `${baseLabel} bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300`,
        accentBg: 'bg-slate-400',
    };
}


export function normalizeStringForComparison(str?: any): string {
  const value = String(str || '');
  if (!value) return "";
  return value
    .normalize("NFD") // Decompose accented characters into base characters and diacritics
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (e.g. accents)
    .toLowerCase()
    .trim();
}

/**
 * Parses a date string from various formats into a standardized UTC Date object.
 * This ensures that date comparisons are accurate regardless of the source string format.
 * It explicitly handles YYYY-MM-DD and DD/MM/YYYY formats.
 * @param dateString The date string to parse.
 * @returns A Date object in UTC, or null if the string is invalid.
 */
export function parseToUTCDate(dateString?: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;

    const trimmedStr = dateString.trim().split('T')[0]; // Get only the date part
    if (!trimmedStr) return null;

    // Try YYYY-MM-DD format (ISO standard)
    let parts = trimmedStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (parts) {
        const [, year, month, day] = parts.map(Number);
        // Create UTC date and validate it to avoid issues like month 13 or day 32
        const d = new Date(Date.UTC(year, month - 1, day));
        if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
            return d;
        }
    }

    // Try DD/MM/YYYY or DD-MM-YYYY format
    parts = trimmedStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts) {
        const [, day, month, year] = parts.map(Number);
        // Create UTC date and validate it
        const d = new Date(Date.UTC(year, month - 1, day));
        if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
            return d;
        }
    }

    console.warn(`[parseToUTCDate] Could not parse date string with known formats: "${dateString}"`);
    return null;
}