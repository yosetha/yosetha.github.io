/**
 * SISTEMA DE AUTENTICACIÓN Y USUARIOS
 */

const AuthManager = {
    currentUser: null,

    init() {
        this.loadAvailableCareers();
        const savedUser = localStorage.getItem('univalle-current-user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showApp();
        }
    },

    // Usa CARRERAS_INDEX de data.js — sin fetch, funciona en file://
    loadAvailableCareers() {
        const select = document.getElementById('reg-carrera');
        select.innerHTML = '';
        const list = (typeof CARRERAS_INDEX !== 'undefined') ? CARRERAS_INDEX : [];
        list.forEach(career => {
            const opt = document.createElement('option');
            opt.value = career.id;
            opt.textContent = career.name;
            select.appendChild(opt);
        });
        if (select.options.length === 0) {
            select.innerHTML = '<option value="ing-electronica">Ingeniería Electrónica</option>';
        }
    },

    showTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`[onclick="AuthManager.showTab('${tab}')"]`).classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    },

    login(event) {
        event.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const users = this.getUsers();
        const user = users.find(u => u.username === username);
        if (!user) { alert('Usuario no encontrado'); return; }
        if (user.password !== this.hashPassword(password)) { alert('Contraseña incorrecta'); return; }
        this.currentUser = user;
        localStorage.setItem('univalle-current-user', JSON.stringify(user));
        this.showApp();
    },

    register(event) {
        event.preventDefault();
        const username  = document.getElementById('reg-username').value.trim();
        const email     = document.getElementById('reg-email').value.trim();
        const carrera   = document.getElementById('reg-carrera').value;
        const password  = document.getElementById('reg-password').value;
        const password2 = document.getElementById('reg-password2').value;

        if (password !== password2) { alert('Las contraseñas no coinciden'); return; }
        if (password.length < 6)    { alert('La contraseña debe tener al menos 6 caracteres'); return; }

        const users = this.getUsers();
        if (users.find(u => u.username === username)) { alert('El usuario ya existe'); return; }
        if (users.find(u => u.email === email))       { alert('El email ya está registrado'); return; }

        users.push({
            username, email, carrera,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('univalle-users', JSON.stringify(users));
        alert('¡Cuenta creada! Ahora puedes iniciar sesión.');
        this.showTab('login');
        document.getElementById('login-username').value = username;
    },

    logout() {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('univalle-current-user');
            location.reload();
        }
    },

    getUsers() {
        const u = localStorage.getItem('univalle-users');
        return u ? JSON.parse(u) : [];
    },

    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) - hash) + password.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString();
    },

    showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display  = 'block';
        document.getElementById('user-info').textContent = `Bienvenido, ${this.currentUser.username}`;
        if (typeof App !== 'undefined') App.init();
    }
};

document.addEventListener('DOMContentLoaded', () => { AuthManager.init(); });
