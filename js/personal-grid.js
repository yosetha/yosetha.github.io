/**
 * MALLA PERSONALIZADA
 * Permite reorganizar materias con drag & drop
 */

const PersonalGrid = {
    draggedCourse: null,
    
    render() {
        const container = document.getElementById('malla-personal-container');
        
        // Obtener o inicializar grid personalizado
        if (!App.state.personalGrid || Object.keys(App.state.personalGrid).length === 0) {
            this.initializePersonalGrid();
        }
        
        const personalGrid = App.state.personalGrid;
        container.innerHTML = '';
        
        Object.keys(personalGrid).sort((a, b) => parseInt(a) - parseInt(b)).forEach(semesterNum => {
            const section = document.createElement('div');
            section.className = 'semester-section';
            section.dataset.semester = semesterNum;
            
            const semester = App.mallaData.semesters.find(s => s.numero == semesterNum);
            if (!semester) return;
            
            const header = document.createElement('div');
            header.className = 'semester-header';
            header.innerHTML = `
                <h2 class="semester-title">${semester.nombre}</h2>
                <div class="semester-stats">
                    <span>${personalGrid[semesterNum].length} materias</span>
                </div>
            `;
            section.appendChild(header);
            
            const grid = document.createElement('div');
            grid.className = 'courses-grid drop-zone';
            grid.dataset.semester = semesterNum;
            
            // Agregar eventos de drag & drop al grid
            grid.addEventListener('dragover', (e) => {
                e.preventDefault();
                grid.classList.add('drag-over');
            });
            
            grid.addEventListener('dragleave', (e) => {
                if (e.target === grid) {
                    grid.classList.remove('drag-over');
                }
            });
            
            grid.addEventListener('drop', (e) => {
                e.preventDefault();
                grid.classList.remove('drag-over');
                
                if (this.draggedCourse) {
                    this.moveCourse(this.draggedCourse, semesterNum);
                }
            });
            
            // Agregar materias
            personalGrid[semesterNum].forEach(code => {
                const course = this.findCourse(code);
                if (course) {
                    const card = this.createDraggableCard(course);
                    grid.appendChild(card);
                }
            });
            
            // Si el grid está vacío, mostrar placeholder
            if (personalGrid[semesterNum].length === 0) {
                grid.innerHTML = `
                    <div class="drop-placeholder">
                        <i class="fas fa-arrow-down"></i>
                        <p>Arrastra materias aquí</p>
                    </div>
                `;
            }
            
            section.appendChild(grid);
            container.appendChild(section);
        });
    },
    
    initializePersonalGrid() {
        // Copiar de la malla oficial
        const personalGrid = {};
        App.mallaData.semesters.forEach(semester => {
            personalGrid[semester.numero] = semester.materias.map(m => m.code);
        });
        App.state.personalGrid = personalGrid;
        App.saveState();
    },
    
    findCourse(code) {
        for (const semester of App.mallaData.semesters) {
            const course = semester.materias.find(c => c.code === code);
            if (course) return course;
        }
        return null;
    },
    
    createDraggableCard(course) {
        const card = App.createCourseCard(course, App.getAllCourses());
        card.classList.add('draggable');
        card.draggable = true;
        card.dataset.code = course.code;
        
        card.addEventListener('dragstart', (e) => {
            this.draggedCourse = course.code;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', course.code);
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
            this.draggedCourse = null;
        });
        
        return card;
    },
    
    moveCourse(code, targetSemester) {
        // Remover de todos los semestres
        Object.keys(App.state.personalGrid).forEach(sem => {
            App.state.personalGrid[sem] = App.state.personalGrid[sem].filter(c => c !== code);
        });
        
        // Agregar al semestre destino
        if (!App.state.personalGrid[targetSemester]) {
            App.state.personalGrid[targetSemester] = [];
        }
        App.state.personalGrid[targetSemester].push(code);
        
        App.saveState();
        this.render();
        App.showToast(`Materia movida a ${App.mallaData.semesters.find(s => s.numero == targetSemester)?.nombre || 'semestre ' + targetSemester}`);
    },
    
    resetToOfficial() {
        if (!confirm('¿Restaurar la malla oficial? Perderás tu organización personalizada.')) return;
        
        App.state.personalGrid = {};
        this.initializePersonalGrid();
        this.render();
        App.showToast('Malla restaurada a configuración oficial');
    },
    
    autoOrganize() {
        App.showToast('Función de organización automática en desarrollo');
    }
};
