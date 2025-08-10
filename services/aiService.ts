
// La funcionalidad de IA se ha eliminado de este archivo ya que no es necesaria.

/**
 * Una función simple para dividir un nombre completo en nombre y apellido.
 * Maneja formatos como "APELLIDO, NOMBRE" y "NOMBRE APELLIDO".
 * @param fullName El nombre completo a dividir.
 * @returns Un objeto con `nombre` y `apellido`.
 */
const simpleNameSplit = (fullName: string): { nombre: string; apellido: string } => {
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
            // Asume que es solo un nombre si solo hay una parte.
            nombre = fullName;
        }
    }
    return { nombre, apellido };
};