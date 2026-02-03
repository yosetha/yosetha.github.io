/**
 * APLICACIÓN PRINCIPAL v2.1
 * Cambios: color de fondo completo + opacidad, selectores separados, catálogo procedural
 */

const App = {
    state: null,
    mallaData: null,
    currentTab: 'malla-oficial',
    _importBuffer: null,
    _catalogoMaterias: null,

    async init() {
        await this.loadUserData();
        await this.loadMallaData();
        this.applyTheme();
        this.renderAll();
        this.wireUploadZone();
        this.populateScheduleCourseSelector();
        this.applyCustomColors();
    },

    async loadUserData() {
        const username = AuthManager.currentUser.username;
        const savedState = localStorage.getItem(`univalle-user-${username}`);
        if (savedState) {
            this.state = JSON.parse(savedState);
        } else {
            this.state = {
                completedCourses: [],
                currentCourses: [],
                seenCourses: [],
                customCourses: [],
                electivas: [],
                manualSchedule: [],  // [{ code, day, start, end, room, teacher, color, opacity }]
                personalGrid: {},
                colors: {},
                customColors: {},
                theme: 'light'
            };
        }
        if (!this.state.electivas) this.state.electivas = [];
    },

    async loadMallaData() {
        const carreraId = AuthManager.currentUser.carrera;
        if (typeof CARRERAS_DATA !== 'undefined' && CARRERAS_DATA[carreraId]) {
            this.mallaData = CARRERAS_DATA[carreraId];
        } else {
            console.warn('Carrera no encontrada:', carreraId);
            this.mallaData = {
                carrera: { name: 'Carrera no encontrada' },
                semesters: [],
                ingles: { niveles: [], creditosPorNivel: 2 },
                electivas: {
                    complementarias: { cantidad: 2, creditosPorMateria: 3 },
                    profesionales: { cantidad: 5, creditosPorMateria: 3 }
                }
            };
        }
    },

    renderAll() {
        this.updateStats();
        this.renderMallaOficial();
        this.renderMallaPersonal();
        this.renderSchedule();
        this.renderIngles();
        this.renderElectivas();
        this.renderProgress();
        this.renderCustomCourses();
    },

    updateStats() {
        let totalCredits = 0, completedCredits = 0;
        this.mallaData.semesters.forEach(semester => {
            semester.materias.forEach(course => {
                totalCredits += course.credits;
                if (this.state.completedCourses.includes(course.code)) {
                    completedCredits += course.credits;
                }
            });
        });
        totalCredits += this.mallaData.ingles.totalCreditos || (this.mallaData.ingles.niveles.length * this.mallaData.ingles.creditosPorNivel);
        this.mallaData.ingles.niveles.forEach(code => {
            if (this.state.completedCourses.includes(code)) {
                completedCredits += this.mallaData.ingles.creditosPorNivel;
            }
        });
        totalCredits += this.mallaData.electivas.complementarias.creditosRequeridos || 0;
        totalCredits += this.mallaData.electivas.profesionales.creditosRequeridos || 0;
        this.state.electivas.forEach(e => {
            if (this.state.completedCourses.includes(e.code)) {
                completedCredits += e.credits;
            }
        });

        const percent = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;
        document.getElementById('total-credits').textContent = totalCredits;
        document.getElementById('completed-credits').textContent = completedCredits;
        document.getElementById('progress-percent').textContent = percent + '%';
    },

    renderMallaOficial() {
        const container = document.getElementById('malla-oficial-container');
        container.innerHTML = '';
        this.mallaData.semesters.forEach(semester => {
            container.appendChild(this.createSemesterSection(semester));
        });
    },

    createSemesterSection(semester) {
        const section = document.createElement('div');
        section.className = 'semester-section';
        const stats = this.calculateSemesterStats(semester);
        const header = document.createElement('div');
        header.className = 'semester-header';
        header.innerHTML = `
            <h2 class="semester-title">${semester.nombre}</h2>
            <div class="semester-stats">
                <span><i class="fas fa-check-circle"></i> ${stats.approved}/${stats.total}</span>
                <span><i class="fas fa-book"></i> ${stats.credits} créditos</span>
            </div>`;
        section.appendChild(header);
        const grid = document.createElement('div');
        grid.className = 'courses-grid';
        semester.materias.forEach(course => {
            grid.appendChild(this.createCourseCard(course, this.getAllCourses()));
        });
        section.appendChild(grid);
        return section;
    },

    calculateSemesterStats(semester) {
        let approved = 0, credits = 0;
        semester.materias.forEach(course => {
            if (this.state.completedCourses.includes(course.code)) {
                approved++;
                credits += course.credits;
            }
        });
        return { total: semester.materias.length, approved, credits };
    },

    createCourseCard(course, allCourses) {
        const card = document.createElement('div');
        const status = PrerequisiteEngine.getCourseStatus(course.code, allCourses, this.state);
        card.className = `course-card status-${status}`;
        const availability = PrerequisiteEngine.checkAvailability(course, this.state);

        let prereqText = '';
        if (course.prereq && course.prereq.length > 0) {
            const prereqCodes = course.prereq.map(p => typeof p === 'string' ? p : p.code || 'opciones');
            prereqText = `<div class="course-prereq"><i class="fas fa-link"></i> Prereq: ${prereqCodes.join(', ')}</div>`;
        }

        let statusBadge = '';
        if (status === 'approved') statusBadge = '<span class="badge badge-success">Aprobada</span>';
        else if (status === 'current') statusBadge = '<span class="badge badge-info">Cursando</span>';
        else if (status === 'seen') statusBadge = '<span class="badge badge-warning">Vista</span>';

        card.innerHTML = `
            <div class="course-header">
                <div class="course-code">${course.code}</div>
                <div class="course-credits">${course.credits} CR</div>
            </div>
            <div class="course-name">${course.name}</div>
            ${prereqText}
            <div class="course-actions">
                ${statusBadge}
                ${this.createCourseActions(course.code, status, availability)}
            </div>`;
        return card;
    },

    createCourseActions(code, status, availability) {
        if (status === 'approved') {
            return `<button class="btn btn-sm btn-danger" onclick="App.markAs('${code}','none')"><i class="fas fa-undo"></i> Desmarcar</button>`;
        }
        if (status === 'current') {
            return `
                <button class="btn btn-sm btn-success"   onclick="App.markAs('${code}','approved')"><i class="fas fa-check"></i> Aprobar</button>
                <button class="btn btn-sm btn-warning"   onclick="App.markAs('${code}','seen')"><i class="fas fa-eye"></i> Vista</button>
                <button class="btn btn-sm btn-secondary" onclick="App.markAs('${code}','none')"><i class="fas fa-times"></i> Cancelar</button>`;
        }
        if (status === 'seen') {
            return `
                <button class="btn btn-sm btn-success"   onclick="App.markAs('${code}','approved')"><i class="fas fa-check"></i> Aprobar</button>
                <button class="btn btn-sm btn-info"      onclick="App.markAs('${code}','current')"><i class="fas fa-book-open"></i> Cursar</button>
                <button class="btn btn-sm btn-secondary" onclick="App.markAs('${code}','none')"><i class="fas fa-undo"></i> Desmarcar</button>`;
        }
        return `<button class="btn btn-sm btn-primary" onclick="App.markAs('${code}','current')" ${!availability.available ? 'disabled' : ''}>
            <i class="fas fa-plus"></i> Cursar</button>`;
    },

    markAs(code, status) {
        this.state.completedCourses = this.state.completedCourses.filter(c => c !== code);
        this.state.currentCourses   = this.state.currentCourses.filter(c => c !== code);
        this.state.seenCourses      = this.state.seenCourses.filter(c => c !== code);
        if (status === 'approved') this.state.completedCourses.push(code);
        else if (status === 'current') this.state.currentCourses.push(code);
        else if (status === 'seen') this.state.seenCourses.push(code);
        this.saveState();
        this.renderAll();
        this.showToast(`Materia ${code} actualizada`);
    },

    getAllCourses() {
        let courses = [];
        this.mallaData.semesters.forEach(s => { courses = courses.concat(s.materias); });
        this.mallaData.ingles.niveles.forEach((code, i) => {
            courses.push({
                code, name: `Inglés Nivel ${i+1}`,
                credits: this.mallaData.ingles.creditosPorNivel,
                type: 'BG', prereq: i > 0 ? [this.mallaData.ingles.niveles[i-1]] : []
            });
        });
        this.state.electivas.forEach(e => courses.push(e));
        if (this.state.customCourses) courses = courses.concat(this.state.customCourses);
        return courses;
    },

    renderMallaPersonal() {
        PersonalGrid.render();
    },

    // ═══════════════════════════════════════════════════════════════════
    //  HORARIOS — color de fondo completo + opacidad
    // ═══════════════════════════════════════════════════════════════════
    renderSchedule() {
        const container = document.getElementById('schedule-grid');
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const timeSlots = this.generateTimeSlots('06:00', '22:00');

        const scheduleByDay = {};
        days.forEach(d => scheduleByDay[d] = []);
        if (this.state.manualSchedule) {
            this.state.manualSchedule.forEach(item => {
                if (scheduleByDay[item.day]) scheduleByDay[item.day].push(item);
            });
        }

        let html = `<div class="schedule-container">
            <div class="schedule-header">
                <div class="time-header">Hora</div>
                ${days.map(d => `<div class="day-header">${d}</div>`).join('')}
            </div>
            <div class="schedule-body">`;

        timeSlots.forEach(time => {
            html += `<div class="schedule-row"><div class="time-cell">${time}</div>`;
            const slotMin = this.timeToMinutes(time);

            days.forEach(day => {
                const match = scheduleByDay[day].find(item => {
                    return slotMin >= this.timeToMinutes(item.start) && slotMin < this.timeToMinutes(item.end);
                });

                if (match) {
                    const course = this.findCourseByCode(match.code);
                    const name = course ? course.name : match.code;
                    const isTop = slotMin === this.timeToMinutes(match.start);
                    const bgColor = match.color || '#00703c';
                    const opacity = match.opacity !== undefined ? match.opacity : 0.2;
                    
                    // Convertir hex a rgba
                    const r = parseInt(bgColor.slice(1,3), 16);
                    const g = parseInt(bgColor.slice(3,5), 16);
                    const b = parseInt(bgColor.slice(5,7), 16);
                    const bgRgba = `rgba(${r},${g},${b},${opacity})`;
                    
                    // Decidir color de texto (blanco si fondo oscuro)
                    const brightness = (r*299 + g*587 + b*114) / 1000;
                    const textColor = (brightness > 155 && opacity > 0.5) ? '#000' : '#fff';
                    
                    html += `<div class="schedule-cell has-class" onclick="App.showScheduleItemDetails('${match.code}','${match.day}','${match.start}')" style="background:${bgRgba};">
                        ${isTop ? `<div class="schedule-item" style="border-left-color:${bgColor}; color:${textColor};">
                            <div class="schedule-item-code">${match.code}</div>
                            <div class="schedule-item-name">${name}</div>
                            <div class="schedule-item-time">${match.start} – ${match.end}</div>
                            ${match.teacher ? `<div class="schedule-item-teacher"><i class="fas fa-chalkboard-teacher"></i> ${match.teacher}</div>` : ''}
                            ${match.room ? `<div class="schedule-item-room"><i class="fas fa-door-open"></i> ${match.room}</div>` : ''}
                        </div>` : `<div class="schedule-item schedule-item-cont" style="border-left-color:${bgColor};"></div>`}
                    </div>`;
                } else {
                    html += `<div class="schedule-cell"></div>`;
                }
            });
            html += `</div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    },

    generateTimeSlots(start, end) {
        const slots = [];
        let cur = this.timeToMinutes(start);
        const fin = this.timeToMinutes(end);
        while (cur < fin) {
            const h = Math.floor(cur / 60);
            const m = cur % 60;
            slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
            cur += 60;
        }
        return slots;
    },

    timeToMinutes(time) {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    },

    findCourseByCode(code) {
        return this.getAllCourses().find(c => c.code === code) || null;
    },

    // ═══════════════════════════════════════════════════════════════════
    //  POBLAR SELECTORES (malla y catálogo separados)
    // ═══════════════════════════════════════════════════════════════════
    populateScheduleCourseSelector() {
        const select = document.getElementById('schedule-course');
        if (!select) return;
        select.innerHTML = '<option value="">— Selecciona una materia —</option>';

        // Materias de la malla
        this.mallaData.semesters.forEach(sem => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = sem.nombre;
            sem.materias.forEach(course => {
                const opt = document.createElement('option');
                opt.value = course.code;
                opt.textContent = `${course.code} – ${course.name}`;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        });

        // Inglés
        if (this.mallaData.ingles && this.mallaData.ingles.niveles) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Inglés';
            this.mallaData.ingles.niveles.forEach((code, i) => {
                const opt = document.createElement('option');
                opt.value = code;
                opt.textContent = `${code} – Inglés Nivel ${i + 1}`;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }

        // Electivas
        if (this.state.electivas && this.state.electivas.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Electivas';
            this.state.electivas.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.code;
                opt.textContent = `${e.code} – ${e.name}`;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }

        // Personalizadas
        if (this.state.customCourses && this.state.customCourses.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Personalizadas';
            this.state.customCourses.forEach(course => {
                const opt = document.createElement('option');
                opt.value = course.code;
                opt.textContent = `${course.code} – ${course.name}`;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }
    },

    populateCatalogoMateriaSelector() {
        const select = document.getElementById('catalogo-materia');
        if (!select || !this._catalogoMaterias) return;
        select.innerHTML = '<option value="">— Selecciona materia —</option>';
        this._catalogoMaterias.forEach((mat, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${mat.codigo} – ${mat.nombre}`;
            select.appendChild(opt);
        });
    },

    onCatalogoMateriaChange() {
        const idx = document.getElementById('catalogo-materia').value;
        const grupoSelect = document.getElementById('catalogo-grupo');
        const horarioSelect = document.getElementById('catalogo-horario');
        grupoSelect.innerHTML = '<option value="">— Selecciona docente/grupo —</option>';
        horarioSelect.innerHTML = '';
        horarioSelect.disabled = true;

        if (idx === '') return;

        const materia = this._catalogoMaterias[parseInt(idx)];
        materia.grupos.forEach((grupo, gidx) => {
            const opt = document.createElement('option');
            opt.value = gidx;
            opt.textContent = `${grupo.id} | ${grupo.docente || 'Sin docente'}`;
            grupoSelect.appendChild(opt);
        });
    },

    onCatalogoGrupoChange() {
        const matIdx = document.getElementById('catalogo-materia').value;
        const grupoIdx = document.getElementById('catalogo-grupo').value;
        const horarioSelect = document.getElementById('catalogo-horario');
        horarioSelect.innerHTML = '';
        horarioSelect.disabled = true;

        if (matIdx === '' || grupoIdx === '') return;

        const grupo = this._catalogoMaterias[parseInt(matIdx)].grupos[parseInt(grupoIdx)];
        if (!grupo.horarios || grupo.horarios.length === 0) return;

        horarioSelect.disabled = false;
        grupo.horarios.forEach((h, hidx) => {
            const opt = document.createElement('option');
            opt.value = hidx;
            opt.textContent = `${h.dia} ${h.horaInicio}–${h.horaFin} | ${h.salon || 'Sin salón'}`;
            horarioSelect.appendChild(opt);
        });

        // Si hay múltiples horarios, mostrar mensaje
        if (grupo.horarios.length > 1) {
            const msg = document.createElement('option');
            msg.disabled = true;
            msg.textContent = '↑ Esta materia tiene varias sesiones — selecciona cada una';
            horarioSelect.insertBefore(msg, horarioSelect.firstChild);
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    //  GUARDAR CLASE (manual o desde catálogo)
    // ═══════════════════════════════════════════════════════════════════
    saveScheduleItem() {
        let code, day, start, end, room, teacher;

        // Modo catálogo
        if (this._catalogoMaterias) {
            const matIdx = document.getElementById('catalogo-materia').value;
            const grupoIdx = document.getElementById('catalogo-grupo').value;
            const horarioIdx = document.getElementById('catalogo-horario').value;

            if (matIdx !== '' && grupoIdx !== '' && horarioIdx !== '') {
                const materia = this._catalogoMaterias[parseInt(matIdx)];
                const grupo = materia.grupos[parseInt(grupoIdx)];
                const horario = grupo.horarios[parseInt(horarioIdx)];

                code = materia.codigo;
                day = horario.dia;
                start = horario.horaInicio;
                end = horario.horaFin;
                room = horario.salon || '';
                teacher = grupo.docente || '';
            } else {
                this.showToast('⚠️ Completa materia, docente y horario');
                return;
            }
        } else {
            // Modo manual
            const courseValue = document.getElementById('schedule-course').value;
            if (!courseValue) { this.showToast('⚠️ Selecciona una materia'); return; }

            code = courseValue;
            day = document.getElementById('schedule-day').value;
            start = document.getElementById('schedule-start').value;
            end = document.getElementById('schedule-end').value;
            room = document.getElementById('schedule-room').value.trim();
            teacher = document.getElementById('schedule-teacher').value.trim();
        }

        const color = document.getElementById('schedule-color').value;
        const opacity = parseFloat(document.getElementById('schedule-opacity').value);

        if (!day || !start || !end) { this.showToast('⚠️ Completa día y horario'); return; }
        if (this.timeToMinutes(end) <= this.timeToMinutes(start)) {
            this.showToast('⚠️ La hora de fin debe ser mayor'); return;
        }

        // Conflicto
        const conflict = (this.state.manualSchedule || []).some(item => {
            if (item.day !== day) return false;
            const s1 = this.timeToMinutes(start), e1 = this.timeToMinutes(end);
            const s2 = this.timeToMinutes(item.start), e2 = this.timeToMinutes(item.end);
            return s1 < e2 && e1 > s2;
        });
        if (conflict && !confirm('Ya hay una clase en ese horario. ¿Agregar de todas formas?')) return;

        if (!this.state.manualSchedule) this.state.manualSchedule = [];
        this.state.manualSchedule.push({ code, day, start, end, room, teacher, color, opacity });

        this.saveState();
        this.closeModal('modal-schedule');
        this.renderSchedule();
        this.showToast('✅ Clase agregada');

        // limpiar
        document.getElementById('schedule-course').value = '';
        document.getElementById('schedule-day').value = 'Lunes';
        document.getElementById('schedule-start').value = '08:00';
        document.getElementById('schedule-end').value = '10:00';
        document.getElementById('schedule-room').value = '';
        document.getElementById('schedule-teacher').value = '';
        document.getElementById('schedule-color').value = '#00703c';
        document.getElementById('schedule-opacity').value = '0.3';
        
        if (this._catalogoMaterias) {
            document.getElementById('catalogo-materia').value = '';
            document.getElementById('catalogo-grupo').innerHTML = '<option value="">— Selecciona docente/grupo —</option>';
            document.getElementById('catalogo-horario').innerHTML = '';
            document.getElementById('catalogo-horario').disabled = true;
        }
    },

    showScheduleItemDetails(code, day, start) {
        const item = (this.state.manualSchedule || []).find(i =>
            i.code === code && i.day === day && i.start === start
        );
        if (!item) return;
        const course = this.findCourseByCode(code);
        const name = course ? course.name : code;
        const teacher = item.teacher ? `\nDocente: ${item.teacher}` : '';
        if (confirm(`${name}\n${day}  ${item.start} – ${item.end}${teacher}\n${item.room || 'Sin salón'}\n\n¿Eliminar?`)) {
            this.state.manualSchedule = this.state.manualSchedule.filter(i =>
                !(i.code === item.code && i.day === item.day && i.start === item.start)
            );
            this.saveState();
            this.renderSchedule();
            this.showToast('Clase eliminada');
        }
    },

    clearSchedule() {
        if (!confirm('¿Limpiar todo el horario?')) return;
        this.state.manualSchedule = [];
        this.saveState();
        this.renderSchedule();
        this.showToast('Horario limpiado');
    },

    // ═══════════════════════════════════════════════════════════════════
    //  IMPORTAR CATÁLOGO DE MATERIAS
    // ═══════════════════════════════════════════════════════════════════
    wireUploadZone() {
        const zone = document.getElementById('upload-zone');
        const input = document.getElementById('horario-file-input');
        if (!zone || !input) return;

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) this.readCatalogoFile(file);
        });
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.readCatalogoFile(file);
            input.value = '';
        });
    },

    readCatalogoFile(file) {
        if (!file.name.endsWith('.json')) { this.showToast('⚠️ Debe ser .json'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.processCatalogoMaterias(data);
            } catch (err) {
                this.showToast('⚠️ JSON inválido: ' + err.message);
            }
        };
        reader.readAsText(file);
    },

    processCatalogoMaterias(data) {
        if (!data.materias || !Array.isArray(data.materias)) {
            this.showToast('⚠️ El JSON debe tener un array "materias"');
            return;
        }

        this._catalogoMaterias = data.materias;
        this.populateCatalogoMateriaSelector();
        this.closeModal('modal-import-schedule');
        this.showToast(`✅ Catálogo cargado: ${data.materias.length} materias`);
    },

    renderIngles() {
        const container = document.getElementById('ingles-container');
        container.innerHTML = '';
        this.mallaData.ingles.niveles.forEach((code, index) => {
            const course = {
                code,
                name: `Inglés con fines generales y académicos ${index + 1}`,
                credits: this.mallaData.ingles.creditosPorNivel,
                type: 'BG',
                prereq: index > 0 ? [this.mallaData.ingles.niveles[index - 1]] : []
            };
            container.appendChild(this.createCourseCard(course, this.getAllCourses()));
        });
    },

    renderElectivas() {
        const container = document.getElementById('electivas-container');
        container.innerHTML = '';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.style = 'margin-bottom:20px;';
        addBtn.innerHTML = '<i class="fas fa-plus"></i> Agregar electiva';
        addBtn.onclick = () => this.openModal('modal-electiva');
        container.appendChild(addBtn);

        const grid = document.createElement('div');
        grid.className = 'courses-grid';
        grid.style.gridColumn = '1/-1';

        if (this.state.electivas.length === 0) {
            grid.innerHTML = `<div class="drop-placeholder">
                <i class="fas fa-puzzle-piece"></i>
                <p>No hay electivas agregadas. Usa el botón de arriba.</p>
            </div>`;
        } else {
            this.state.electivas.forEach(electiva => {
                const card = this.createCourseCard(electiva, this.getAllCourses());
                const actions = card.querySelector('.course-actions');
                if (actions) {
                    const del = document.createElement('button');
                    del.className = 'btn btn-danger btn-sm';
                    del.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
                    del.onclick = (e) => { e.stopPropagation(); this.deleteElectiva(electiva.code); };
                    actions.appendChild(del);
                }
                grid.appendChild(card);
            });
        }
        container.appendChild(grid);

        const ecCount = this.state.electivas.filter(e => e.type === 'EC' && this.state.completedCourses.includes(e.code)).length;
        const epCount = this.state.electivas.filter(e => e.type === 'EP' && this.state.completedCourses.includes(e.code)).length;
        const ecReq = this.mallaData.electivas.complementarias.cantidad;
        const epReq = this.mallaData.electivas.profesionales.cantidad;
        document.getElementById('ec-count').textContent = `${ecCount}/${ecReq}`;
        document.getElementById('ep-count').textContent = `${epCount}/${epReq}`;
    },

    saveElectiva() {
        const code = document.getElementById('electiva-code').value.trim();
        const name = document.getElementById('electiva-name').value.trim();
        const credits = parseInt(document.getElementById('electiva-credits').value);
        const type = document.getElementById('electiva-type').value;

        if (!code || !name || !credits) { this.showToast('⚠️ Completa todos los campos'); return; }
        if (this.state.electivas.some(e => e.code === code)) { this.showToast('⚠️ Ya existe ese código'); return; }

        this.state.electivas.push({ code, name, credits, type, prereq: [] });
        this.saveState();
        this.closeModal('modal-electiva');
        this.renderElectivas();
        this.populateScheduleCourseSelector();
        this.showToast('Electiva agregada');

        document.getElementById('electiva-code').value = '';
        document.getElementById('electiva-name').value = '';
        document.getElementById('electiva-credits').value = '3';
    },

    deleteElectiva(code) {
        if (!confirm('¿Eliminar esta electiva?')) return;
        this.state.electivas = this.state.electivas.filter(e => e.code !== code);
        this.state.completedCourses = this.state.completedCourses.filter(c => c !== code);
        this.state.currentCourses = this.state.currentCourses.filter(c => c !== code);
        this.state.seenCourses = this.state.seenCourses.filter(c => c !== code);
        this.saveState();
        this.renderAll();
        this.populateScheduleCourseSelector();
        this.showToast('Electiva eliminada');
    },

    renderProgress() {
        ProgressTracker.render(this.mallaData, this.state);
    },

    renderCustomCourses() {
        const container = document.getElementById('custom-container');
        if (!this.state.customCourses || this.state.customCourses.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-secondary);">
                    <i class="fas fa-folder-open" style="font-size:4rem; margin-bottom:20px; opacity:0.3;"></i>
                    <h3>No hay materias personalizadas</h3>
                    <p>Agrega materias extras, cursos de extensión, etc.</p>
                </div>`;
        } else {
            container.innerHTML = '';
            this.state.customCourses.forEach(course => {
                const card = this.createCourseCard(course, this.getAllCourses());
                const actions = card.querySelector('.course-actions');
                if (actions) {
                    const del = document.createElement('button');
                    del.className = 'btn btn-danger btn-sm';
                    del.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
                    del.onclick = (e) => { e.stopPropagation(); this.deleteCustomCourse(course.code); };
                    actions.appendChild(del);
                }
                container.appendChild(card);
            });
        }
    },

    saveCustomCourse() {
        const code = document.getElementById('custom-code').value.trim();
        const name = document.getElementById('custom-name').value.trim();
        const credits = parseInt(document.getElementById('custom-credits').value);
        const type = document.getElementById('custom-type').value;

        if (!code || !name || !credits) { this.showToast('⚠️ Completa todos los campos'); return; }
        if (!this.state.customCourses) this.state.customCourses = [];
        if (this.state.customCourses.some(c => c.code === code)) { this.showToast('⚠️ Ya existe ese código'); return; }

        this.state.customCourses.push({ code, name, credits, type, prereq: [] });
        this.saveState();
        this.closeModal('modal-custom');
        this.renderCustomCourses();
        this.populateScheduleCourseSelector();
        this.showToast('Materia agregada');

        document.getElementById('custom-code').value = '';
        document.getElementById('custom-name').value = '';
        document.getElementById('custom-credits').value = '';
    },

    deleteCustomCourse(code) {
        if (!confirm('¿Eliminar esta materia?')) return;
        this.state.customCourses = this.state.customCourses.filter(c => c.code !== code);
        this.state.completedCourses = this.state.completedCourses.filter(c => c !== code);
        this.state.currentCourses = this.state.currentCourses.filter(c => c !== code);
        this.state.seenCourses = this.state.seenCourses.filter(c => c !== code);
        this.saveState();
        this.renderAll();
        this.populateScheduleCourseSelector();
        this.showToast('Materia eliminada');
    },

    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`[onclick="App.switchTab('${tab}')"]`).classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
        this.currentTab = tab;
        if (tab === 'horarios') this.populateScheduleCourseSelector();
    },

    openModal(id) {
        document.getElementById(id).classList.add('open');
        if (id === 'modal-schedule') {
            this.populateScheduleCourseSelector();
            if (this._catalogoMaterias) this.populateCatalogoMateriaSelector();
        }
    },
    
    switchScheduleMode(mode) {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.schedule-mode').forEach(m => m.classList.remove('active'));
        
        if (mode === 'manual') {
            document.querySelectorAll('.modal-tab')[0].classList.add('active');
            document.getElementById('schedule-mode-manual').classList.add('active');
        } else {
            document.querySelectorAll('.modal-tab')[1].classList.add('active');
            document.getElementById('schedule-mode-catalogo').classList.add('active');
        }
    },
    
    closeModal(id) {
        document.getElementById(id).classList.remove('open');
    },

    openSettings() {
        this.openModal('modal-settings');
        const c = this.state.colors || {};
        document.getElementById('color-approved').value = c.approved || '#10b981';
        document.getElementById('color-current').value = c.current || '#3b82f6';
        document.getElementById('color-seen').value = c.seen || '#f59e0b';
        document.getElementById('color-available').value = c.available || '#00703c';
        document.getElementById('color-locked').value = c.locked || '#6b7280';

        const cc = this.state.customColors || {};
        document.getElementById('color-header').value = cc.header || '#00703c';
        document.getElementById('color-buttons').value = cc.buttons || '#00703c';
    },

    saveColors() {
        this.state.colors = {
            approved: document.getElementById('color-approved').value,
            current: document.getElementById('color-current').value,
            seen: document.getElementById('color-seen').value,
            available: document.getElementById('color-available').value,
            locked: document.getElementById('color-locked').value
        };
        this.state.customColors = {
            header: document.getElementById('color-header').value,
            buttons: document.getElementById('color-buttons').value
        };
        this.applyCustomColors();
        this.saveState();
        this.closeModal('modal-settings');
        this.showToast('Colores guardados');
    },

    resetColors() {
        this.state.colors = {};
        this.state.customColors = {};
        this.saveState();
        this.closeModal('modal-settings');
        location.reload();
    },

    applyCustomColors() {
        if (!this.state.colors) return;
        const root = document.documentElement;
        if (this.state.colors.approved) root.style.setProperty('--course-approved', this.state.colors.approved);
        if (this.state.colors.current) root.style.setProperty('--course-current', this.state.colors.current);
        if (this.state.colors.seen) root.style.setProperty('--course-seen', this.state.colors.seen);
        if (this.state.colors.available) root.style.setProperty('--course-available', this.state.colors.available);
        if (this.state.colors.locked) root.style.setProperty('--course-locked', this.state.colors.locked);

        if (this.state.customColors && this.state.customColors.header) {
            root.style.setProperty('--primary', this.state.customColors.header);
            root.style.setProperty('--primary-dark', this.adjustColor(this.state.customColors.header, -20));
        }
        if (this.state.customColors && this.state.customColors.buttons) {
            root.style.setProperty('--btn-primary', this.state.customColors.buttons);
        }
    },

    adjustColor(hex, percent) {
        const num = parseInt(hex.replace('#',''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
            (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
            .toString(16).slice(1);
    },

    toggleTheme() {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveState();
        this.showToast(`Tema ${this.state.theme === 'dark' ? 'oscuro' : 'claro'} activado`);
    },
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme || 'light');
        this.applyCustomColors();
    },

    exportData() {
        const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `univalle_${AuthManager.currentUser.username}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Datos exportados');
    },

    saveState() {
        localStorage.setItem(`univalle-user-${AuthManager.currentUser.username}`, JSON.stringify(this.state));
    },

    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};
