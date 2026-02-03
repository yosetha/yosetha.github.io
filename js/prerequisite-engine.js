/**
 * MOTOR DE PREREQUISITOS
 * Maneja las 3 condiciones de prerequisitos:
 * 1. Aprobada - La materia está completada
 * 2. Cursando - La materia se está viendo actualmente
 * 3. Vista (perdida) - La materia se cursó pero no se aprobó
 * 
 * También maneja co-requisitos (materias que deben cursarse juntas)
 */

const PrerequisiteEngine = {
    /**
     * Verifica si una materia está disponible para cursar
     * @param {Object} course - La materia a verificar
     * @param {Object} state - Estado actual del usuario
     * @returns {Object} { available, reason, blockedBy }
     */
    checkAvailability(course, state) {
        const { completedCourses, currentCourses, seenCourses } = state;
        
        // Si no tiene prerequisitos, está disponible
        if (!course.prereq || course.prereq.length === 0) {
            return { available: true, reason: 'Sin prerequisitos' };
        }
        
        const blocked = [];
        const warnings = [];
        
        // Verificar cada prerequisito
        for (const prereq of course.prereq) {
            const status = this.getPrereqStatus(prereq, state);
            
            if (!status.satisfied) {
                blocked.push({
                    code: prereq.code || prereq,
                    reason: status.reason
                });
            } else if (status.warning) {
                warnings.push({
                    code: prereq.code || prereq,
                    warning: status.warning
                });
            }
        }
        
        // Verificar co-requisitos
        if (course.coreq && course.coreq.length > 0) {
            const coreqStatus = this.checkCorequisites(course.coreq, state);
            if (!coreqStatus.satisfied) {
                return {
                    available: false,
                    reason: 'Co-requisitos no cumplidos',
                    blockedBy: blocked,
                    coreqIssues: coreqStatus.issues
                };
            }
        }
        
        if (blocked.length > 0) {
            return {
                available: false,
                reason: 'Prerequisitos no cumplidos',
                blockedBy: blocked
            };
        }
        
        return {
            available: true,
            reason: 'Prerequisitos cumplidos',
            warnings
        };
    },
    
    /**
     * Verifica el estado de un prerequisito individual
     * @param {String|Object} prereq - Prerequisito (puede ser código o objeto con opciones)
     * @param {Object} state - Estado del usuario
     * @returns {Object} Estado del prerequisito
     */
    getPrereqStatus(prereq, state) {
        const { completedCourses, currentCourses, seenCourses } = state;
        
        // Prerequisito simple (solo código)
        // Se cumple si está: APROBADA, CURSANDO o VISTA
        if (typeof prereq === 'string') {
            // 1. APROBADA - La mejor condición
            if (completedCourses.includes(prereq)) {
                return { satisfied: true, condition: 'approved' };
            }
            
            // 2. CURSANDO - Puede avanzar (con advertencia)
            if (currentCourses.includes(prereq)) {
                return { 
                    satisfied: true, 
                    condition: 'current',
                    warning: 'Prerequisito en curso actualmente' 
                };
            }
            
            // 3. VISTA (perdida) - Puede avanzar (con advertencia fuerte)
            if (seenCourses.includes(prereq)) {
                return { 
                    satisfied: true, 
                    condition: 'seen',
                    warning: 'Prerequisito visto pero no aprobado' 
                };
            }
            
            // No cumple ninguna condición
            return { 
                satisfied: false, 
                reason: 'No cumple con prerequisito',
                missing: prereq
            };
        }
        
        // Prerequisito con opciones (objeto)
        if (prereq.options) {
            // Al menos una opción debe cumplirse
            for (const option of prereq.options) {
                const optStatus = this.getPrereqStatus(option, state);
                if (optStatus.satisfied) {
                    return optStatus;
                }
            }
            return {
                satisfied: false,
                reason: 'Ninguna opción de prerequisito cumplida',
                options: prereq.options
            };
        }
        
        // Prerequisito con requerimiento específico
        if (prereq.code) {
            const requirement = prereq.requirement || 'approved';
            const code = prereq.code;
            
            switch (requirement) {
                case 'approved':
                    if (completedCourses.includes(code)) {
                        return { satisfied: true, condition: 'approved' };
                    }
                    break;
                    
                case 'current':
                    if (currentCourses.includes(code) || completedCourses.includes(code)) {
                        return { satisfied: true, condition: 'current' };
                    }
                    break;
                    
                case 'seen':
                    if (seenCourses.includes(code) || currentCourses.includes(code) || completedCourses.includes(code)) {
                        return { satisfied: true, condition: 'seen' };
                    }
                    break;
            }
            
            return {
                satisfied: false,
                reason: `Requiere: ${requirement}`,
                missing: code
            };
        }
        
        return { satisfied: false, reason: 'Prerequisito inválido' };
    },
    
    /**
     * Verifica co-requisitos (materias que deben cursarse juntas)
     * @param {Array} coreqs - Lista de co-requisitos
     * @param {Object} state - Estado del usuario
     * @returns {Object} Estado de los co-requisitos
     */
    checkCorequisites(coreqs, state) {
        const { completedCourses, currentCourses } = state;
        const issues = [];
        
        for (const coreq of coreqs) {
            const code = typeof coreq === 'string' ? coreq : coreq.code;
            
            // Co-requisito se cumple si:
            // 1. Ya está aprobada
            // 2. Se está cursando actualmente
            if (!completedCourses.includes(code) && !currentCourses.includes(code)) {
                issues.push({
                    code,
                    reason: 'Debe cursarse simultáneamente o estar aprobada'
                });
            }
        }
        
        return {
            satisfied: issues.length === 0,
            issues
        };
    },
    
    /**
     * Obtiene todas las materias disponibles para cursar
     * @param {Array} allCourses - Todas las materias
     * @param {Object} state - Estado del usuario
     * @returns {Array} Materias disponibles
     */
    getAvailableCourses(allCourses, state) {
        return allCourses.filter(course => {
            // Ya aprobadas no están disponibles
            if (state.completedCourses.includes(course.code)) {
                return false;
            }
            
            const availability = this.checkAvailability(course, state);
            return availability.available;
        });
    },
    
    /**
     * Obtiene el estado de una materia
     * @param {String} code - Código de la materia
     * @param {Object} state - Estado del usuario
     * @returns {String} Estado: 'approved', 'current', 'seen', 'available', 'locked'
     */
    getCourseStatus(code, allCourses, state) {
        if (state.completedCourses.includes(code)) {
            return 'approved';
        }
        
        if (state.currentCourses.includes(code)) {
            return 'current';
        }
        
        if (state.seenCourses.includes(code)) {
            return 'seen';
        }
        
        const course = allCourses.find(c => c.code === code);
        if (!course) return 'unknown';
        
        const availability = this.checkAvailability(course, state);
        return availability.available ? 'available' : 'locked';
    },
    
    /**
     * Valida que se puedan marcar materias como cursando
     * @param {Array} courseCodes - Códigos de materias a cursar
     * @param {Array} allCourses - Todas las materias
     * @param {Object} state - Estado del usuario
     * @returns {Object} Resultado de la validación
     */
    validateCurrentCourses(courseCodes, allCourses, state) {
        const errors = [];
        
        for (const code of courseCodes) {
            const course = allCourses.find(c => c.code === code);
            if (!course) continue;
            
            const availability = this.checkAvailability(course, {
                ...state,
                currentCourses: courseCodes // Incluir las que se están agregando
            });
            
            if (!availability.available) {
                errors.push({
                    code,
                    name: course.name,
                    issues: availability.blockedBy || []
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
};
