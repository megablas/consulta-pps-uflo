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
            tag: `${baseClasses} bg-success-100 text-success-800 border-success-200 dark:bg-success-900/50 dark:text-success-300 dark:border-success-700/50`,
            gradient: 'from-success-500 to-teal-500',
            textOnDark: 'text-success-100',
            headerBg: 'bg-success-50 dark:bg-success-900/20',
            headerText: 'text-success-900 dark:text-success-200',
            dot: 'bg-success-500',
        },
        educacional: {
            tag: `${baseClasses} bg-info-100 text-info-800 border-info-200 dark:bg-info-900/50 dark:text-info-300 dark:border-info-700/50`,
            gradient: 'from-info-500 to-primary-600',
            textOnDark: 'text-info-100',
            headerBg: 'bg-info-50 dark:bg-info-900/20',
            headerText: 'text-info-900 dark:text-info-200',
            dot: 'bg-info-500',
        },
        laboral: {
            tag: `${baseClasses} bg-danger-100 text-danger-800 border-danger-200 dark:bg-danger-900/50 dark:text-danger-300 dark:border-danger-700/50`,
            gradient: 'from-danger-500 to-red-600',
            textOnDark: 'text-danger-100',
            headerBg: 'bg-danger-50 dark:bg-danger-900/20',
            headerText: 'text-danger-900 dark:text-danger-200',
            dot: 'bg-danger-500',
        },
        comunitaria: {
            tag: `${baseClasses} bg-secondary-100 text-secondary-800 border-secondary-200 dark:bg-secondary-900/50 dark:text-secondary-300 dark:border-secondary-700/50`,
            gradient: 'from-secondary-500 to-purple-600',
            textOnDark: 'text-secondary-100',
            headerBg: 'bg-secondary-50 dark:bg-secondary-900/20',
            headerText: 'text-secondary-900 dark:text-secondary-200',
            dot: 'bg-secondary-500',
        },
        default: {
            tag: `${baseClasses} bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600`,
            gradient: 'from-gray-500 to-gray-600',
            textOnDark: 'text-gray-100',
            headerBg: 'bg-gray-50 dark:bg-gray-800/50',
            headerText: 'text-gray-900 dark:text-gray-200',
            dot: 'bg-gray-500',
        },
    };

    return (styles as any)[normalizedEspecialidad] || styles.default;
}

export function getStatusVisuals(status?: string): { icon: string; iconContainerClass: string; labelClass: string; accentBg: string; } {
    const normalizedStatus = normalizeStringForComparison(status);
    const baseLabel = "inline-flex items-center font-semibold px-2.5 py-1 rounded-full text-xs capitalize";
    const baseIconContainer = "flex-shrink-0 size-11 rounded-lg flex items-center justify-center mr-4";

    const states = {
        'convenio realizado': { icon: 'fact_check', color: 'primary' },
        'pps realizada': { icon: 'check_circle', color: 'primary' },
        'finalizada': { icon: 'check_circle', color: 'primary' },
        'realizada': { icon: 'check_circle', color: 'primary' },
        'no se pudo concretar': { icon: 'cancel', color: 'danger' },
        'no seleccionado': { icon: 'cancel', color: 'danger' },
        'en curso': { icon: 'sync', color: 'warning', animation: 'animate-spin [animation-duration:3s]' },
        'en conversaciones': { icon: 'hourglass_top', color: 'warning' },
        'realizando convenio': { icon: 'hourglass_top', color: 'warning' },
        'puesta en contacto': { icon: 'rocket_launch', color: 'secondary' },
        'abierta': { icon: 'door_open', color: 'success' },
        'abierto': { icon: 'door_open', color: 'success' },
        'seleccionado': { icon: 'verified', color: 'secondary' },
        'inscripto': { icon: 'how_to_reg', color: 'info' },
        'cerrado': { icon: 'lock', color: 'gray' },
        'oculto': { icon: 'visibility_off', color: 'gray' },
    };

    const colorClasses: Record<string, { icon: string, label: string, accentBg: string }> = {
        primary: { icon: 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300', label: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300', accentBg: 'bg-primary-500' },
        danger: { icon: 'bg-danger-100 text-danger-600 dark:bg-danger-900/50 dark:text-danger-300', label: 'bg-danger-100 text-danger-800 dark:bg-danger-900/50 dark:text-danger-200', accentBg: 'bg-danger-500' },
        warning: { icon: 'bg-warning-100 text-warning-600 dark:bg-warning-900/50 dark:text-warning-300', label: 'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-200', accentBg: 'bg-warning-500' },
        secondary: { icon: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900/50 dark:text-secondary-300', label: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/50 dark:text-secondary-200', accentBg: 'bg-secondary-500' },
        success: { icon: 'bg-success-100 text-success-600 dark:bg-success-900/50 dark:text-success-300', label: 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-200', accentBg: 'bg-success-500' },
        info: { icon: 'bg-info-100 text-info-600 dark:bg-info-900/50 dark:text-info-300', label: 'bg-info-100 text-info-800 dark:bg-info-900/50 dark:text-info-200', accentBg: 'bg-info-500' },
        gray: { icon: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400', label: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', accentBg: 'bg-gray-400' },
    };

    for (const key in states) {
        if (normalizedStatus.includes(key)) {
            const state = (states as any)[key];
            const classes = colorClasses[state.color] || colorClasses.gray;
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
        iconContainerClass: `${baseIconContainer} bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400`,
        labelClass: `${baseLabel} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`,
        accentBg: 'bg-gray-400',
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

export const simpleNameSplit = (fullName: string): { nombre: string; apellido: string } => {
    if (!fullName) return { nombre: '', apellido: '' };
    let nombre = '';
    let apellido = '';
    if (fullName.includes(',')) {
        const parts = fullName.split(',').map(p => p.trim());
        apellido = parts[0] || '';
        nombre = parts[1] || '';
    } else {
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        if (nameParts.length > 1) {
            apellido = nameParts.pop()!;
            nombre = nameParts.join(' ');
        } else {
            nombre = fullName;
        }
    }
    return { nombre, apellido };
};

/**
 * Checks if a location string is likely a valid, physical address.
 * @param location The location string to check.
 * @returns True if the location seems valid, false otherwise.
 */
export function isValidLocation(location?: string): boolean {
    if (!location) {
        return false;
    }
    const normalizedLocation = location.toLowerCase().trim();
    const nonPhysicalKeywords = ['online', 'virtual', 'a distancia', 'remoto', 'no especificada'];
    
    // Check if it's a known non-physical location
    if (nonPhysicalKeywords.some(keyword => normalizedLocation.includes(keyword))) {
        return false;
    }

    // Heuristic: A valid address usually contains at least one number (street number, zip code).
    // This helps filter out vague locations like "Hospital Central" without a full address.
    if (!/\d/.test(normalizedLocation)) {
        return false;
    }

    return true;
}