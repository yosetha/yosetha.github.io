/**
 * SEGUIMIENTO DE PROGRESO
 * Muestra el progreso del estudiante por semestre
 */

const ProgressTracker = {
    /**
     * Renderiza la vista de progreso
     */
    render(mallaData, state) {
        const container = document.getElementById('progreso-container');
        
        const stats = this.calculateStats(mallaData, state);
        
        let html = `
            <div class="progress-summary">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-trophy"></i></div>
                        <div class="stat-details">
                            <div class="stat-value">${stats.totalApproved}/${stats.totalCourses}</div>
                            <div class="stat-label">Materias aprobadas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-book-open"></i></div>
                        <div class="stat-details">
                            <div class="stat-value">${stats.approvedCredits}/${stats.totalCredits}</div>
                            <div class="stat-label">Créditos completados</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="stat-details">
                            <div class="stat-value">${stats.progressPercent}%</div>
                            <div class="stat-label">Progreso total</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-details">
                            <div class="stat-value">${stats.currentCourses}</div>
                            <div class="stat-label">Cursando actualmente</div>
                        </div>
                    </div>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${stats.progressPercent}%">
                            ${stats.progressPercent}%
                        </div>
                    </div>
                </div>
            </div>
            
            <h3 style="margin: 40px 0 20px 0;">Progreso por Semestre</h3>
        `;
        
        // Progreso por semestre
        mallaData.semesters.forEach(semester => {
            const semesterStats = this.calculateSemesterStats(semester, state);
            
            html += `
                <div class="semester-progress-card">
                    <div class="semester-progress-header">
                        <div>
                            <h4>${semester.nombre}</h4>
                            <p class="text-secondary">${semesterStats.approved}/${semesterStats.total} materias • ${semesterStats.credits}/${semesterStats.totalCredits} créditos</p>
                        </div>
                        <div class="semester-progress-badge ${this.getProgressClass(semesterStats.percent)}">
                            ${semesterStats.percent}%
                        </div>
                    </div>
                    
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-bar-fill ${this.getProgressClass(semesterStats.percent)}" 
                                 style="width: ${semesterStats.percent}%">
                            </div>
                        </div>
                    </div>
                    
                    ${this.renderSemesterDetails(semester, state, semesterStats)}
                </div>
            `;
        });
        
        // Electivas
        html += this.renderElectivasProgress(state);
        
        // Inglés
        html += this.renderInglesProgress(mallaData, state);
        
        container.innerHTML = html;
    },
    
    /**
     * Calcula estadísticas generales
     */
    calculateStats(mallaData, state) {
        let totalCourses = 0;
        let totalCredits = 0;
        let approvedCredits = 0;
        let totalApproved = 0;
        
        mallaData.semesters.forEach(semester => {
            semester.materias.forEach(course => {
                totalCourses++;
                totalCredits += course.credits;
                
                if (state.completedCourses.includes(course.code)) {
                    totalApproved++;
                    approvedCredits += course.credits;
                }
            });
        });
        
        // Agregar inglés
        if (mallaData.ingles) {
            totalCourses += mallaData.ingles.niveles.length;
            totalCredits += mallaData.ingles.niveles.length * mallaData.ingles.creditosPorNivel;
            
            mallaData.ingles.niveles.forEach(code => {
                if (state.completedCourses.includes(code)) {
                    totalApproved++;
                    approvedCredits += mallaData.ingles.creditosPorNivel;
                }
            });
        }
        
        // Agregar electivas
        if (mallaData.electivas) {
            const ecCount = mallaData.electivas.complementarias.cantidad;
            const epCount = mallaData.electivas.profesionales.cantidad;
            totalCourses += ecCount + epCount;
            totalCredits += (ecCount * mallaData.electivas.complementarias.creditosPorMateria) +
                           (epCount * mallaData.electivas.profesionales.creditosPorMateria);
            
            // Contar aprobadas
            state.completedCourses.forEach(code => {
                if (code.startsWith('EC-')) {
                    totalApproved++;
                    approvedCredits += mallaData.electivas.complementarias.creditosPorMateria;
                } else if (code.startsWith('EP-')) {
                    totalApproved++;
                    approvedCredits += mallaData.electivas.profesionales.creditosPorMateria;
                }
            });
        }
        
        const progressPercent = Math.round((approvedCredits / totalCredits) * 100);
        
        return {
            totalCourses,
            totalCredits,
            totalApproved,
            approvedCredits,
            currentCourses: state.currentCourses.length,
            seenCourses: state.seenCourses.length,
            progressPercent
        };
    },
    
    /**
     * Calcula estadísticas de un semestre
     */
    calculateSemesterStats(semester, state) {
        let total = semester.materias.length;
        let approved = 0;
        let current = 0;
        let seen = 0;
        let totalCredits = 0;
        let credits = 0;
        
        semester.materias.forEach(course => {
            totalCredits += course.credits;
            
            if (state.completedCourses.includes(course.code)) {
                approved++;
                credits += course.credits;
            } else if (state.currentCourses.includes(course.code)) {
                current++;
            } else if (state.seenCourses.includes(course.code)) {
                seen++;
            }
        });
        
        const percent = Math.round((approved / total) * 100);
        
        return {
            total,
            approved,
            current,
            seen,
            totalCredits,
            credits,
            percent
        };
    },
    
    /**
     * Renderiza detalles del semestre
     */
    renderSemesterDetails(semester, state, stats) {
        if (stats.percent === 100) {
            return `
                <div class="semester-complete">
                    <i class="fas fa-check-circle"></i>
                    <span>¡Semestre completado!</span>
                </div>
            `;
        }
        
        const pending = semester.materias.filter(c => 
            !state.completedCourses.includes(c.code) &&
            !state.currentCourses.includes(c.code)
        );
        
        if (pending.length === 0) return '';
        
        return `
            <div class="semester-pending">
                <p class="text-secondary" style="margin-bottom: 10px;">
                    <i class="fas fa-list"></i> Materias pendientes (${pending.length}):
                </p>
                <div class="pending-courses-list">
                    ${pending.map(c => `
                        <span class="pending-course-tag">
                            ${c.code} - ${c.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderiza progreso de electivas
     */
    renderElectivasProgress(state) {
        const ecCompleted = state.completedCourses.filter(c => c.startsWith('EC-')).length;
        const epCompleted = state.completedCourses.filter(c => c.startsWith('EP-')).length;
        
        return `
            <div class="semester-progress-card">
                <h4>Electivas</h4>
                
                <div class="electivas-progress">
                    <div class="electiva-item">
                        <span class="electiva-label">Complementarias</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-bar-fill" style="width: ${(ecCompleted/4)*100}%">
                                    ${ecCompleted}/4
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="electiva-item">
                        <span class="electiva-label">Profesionales</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-bar-fill" style="width: ${(epCompleted/4)*100}%">
                                    ${epCompleted}/4
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderiza progreso de inglés
     */
    renderInglesProgress(mallaData, state) {
        if (!mallaData.ingles) return '';
        
        const completed = mallaData.ingles.niveles.filter(c => 
            state.completedCourses.includes(c)
        ).length;
        const total = mallaData.ingles.niveles.length;
        const percent = Math.round((completed / total) * 100);
        
        return `
            <div class="semester-progress-card">
                <h4>Inglés</h4>
                
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${percent}%">
                            ${completed}/${total} niveles
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Obtiene la clase CSS según el porcentaje
     */
    getProgressClass(percent) {
        if (percent === 100) return 'complete';
        if (percent >= 75) return 'high';
        if (percent >= 50) return 'medium';
        if (percent >= 25) return 'low';
        return 'minimal';
    }
};
