/**
 * GESTOR DE DATOS
 * Maneja carga y validación de datos de carreras y horarios
 */

const DataManager = {
    /**
     * Carga una carrera desde el archivo JSON
     */
    async loadCarrera(carreraId) {
        try {
            const response = await fetch(`carreras/${carreraId}.json`);
            if (!response.ok) throw new Error('Carrera no encontrada');
            
            const data = await response.json();
            return this.validateMallaData(data);
        } catch (error) {
            console.error('Error cargando carrera:', error);
            throw error;
        }
    },
    
    /**
     * Valida estructura de datos de malla
     */
    validateMallaData(data) {
        if (!data.carrera) throw new Error('Falta información de carrera');
        if (!data.semesters || !Array.isArray(data.semesters)) {
            throw new Error('Falta información de semestres');
        }
        
        // Validar cada semestre
        data.semesters.forEach(semester => {
            if (!semester.numero || !semester.materias) {
                throw new Error('Semestre inválido');
            }
            
            semester.materias.forEach(course => {
                if (!course.code || !course.name || !course.credits) {
                    throw new Error(`Materia inválida: ${course.code}`);
                }
            });
        });
        
        return data;
    },
    
    /**
     * Carga horarios oficiales
     */
    async loadHorarios(semestre) {
        try {
            const response = await fetch(`data/horarios/${semestre}.json`);
            if (!response.ok) return null;
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error cargando horarios:', error);
            return null;
        }
    },
    
    /**
     * Lista todas las carreras disponibles
     */
    async listCarreras() {
        try {
            const response = await fetch('carreras/index.json');
            const carreras = await response.json();
            return carreras.filter(c => c.activa);
        } catch (error) {
            console.error('Error listando carreras:', error);
            return [];
        }
    },
    
    /**
     * Exporta datos del usuario
     */
    exportUserData(username) {
        const data = localStorage.getItem(`univalle-user-${username}`);
        if (!data) return null;
        
        return JSON.parse(data);
    },
    
    /**
     * Importa datos del usuario
     */
    importUserData(username, data) {
        try {
            // Validar estructura básica
            if (!data.completedCourses || !Array.isArray(data.completedCourses)) {
                throw new Error('Datos inválidos');
            }
            
            localStorage.setItem(`univalle-user-${username}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error importando datos:', error);
            return false;
        }
    }
};
