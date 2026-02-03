# 📚 Instrucciones de Uso - Univalle Planner

## 🚀 Inicio Rápido

### 1. Estructura de Archivos

Asegúrate de mantener esta estructura:

```
univalle-planner/
├── index.html              # Archivo principal
├── css/                    # Estilos
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   └── modals.css
├── js/                     # Lógica de la aplicación
│   ├── auth.js
│   ├── data-manager.js
│   ├── prerequisite-engine.js
│   ├── personal-grid.js
│   ├── progress-tracker.js
│   └── app.js
├── carreras/               # Datos de carreras
│   ├── index.json
│   └── ing-electronica.json
├── data/                   # Datos adicionales
│   └── horarios/
└── docs/                   # Documentación
    ├── README.md
    ├── FORMATO_MALLA.json
    └── FORMATO_HORARIOS.json
```

### 2. Publicar en GitHub Pages

1. **Crear repositorio:**
   - Ve a GitHub y crea un nuevo repositorio
   - Nombre sugerido: `univalle-planner`

2. **Subir archivos:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/univalle-planner.git
   git push -u origin main
   ```

3. **Activar GitHub Pages:**
   - Ve a Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save

4. **Acceder:**
   - Tu sitio estará en: `https://TU-USUARIO.github.io/univalle-planner`

## 📝 Cómo Agregar/Actualizar Contenido

### Agregar una Nueva Carrera

**Paso 1:** Crea el archivo de la malla en `carreras/nombre-carrera.json`

Usa el formato de `docs/FORMATO_MALLA.json` como guía.

Ejemplo básico:
```json
{
  "carrera": {
    "id": "nombre-carrera",
    "name": "Nombre Completo de la Carrera",
    "facultad": "Facultad",
    "totalCreditos": 170,
    "duracionSemestres": 10
  },
  "semesters": [
    {
      "numero": 1,
      "nombre": "Primer Semestre",
      "materias": [
        {
          "code": "MAT001",
          "name": "Matemáticas I",
          "credits": 4,
          "type": "BG",
          "prereq": [],
          "coreq": []
        }
      ]
    }
  ],
  "ingles": {
    "niveles": ["ING-1", "ING-2", "ING-3"],
    "creditosPorNivel": 2
  },
  "electivas": {
    "complementarias": { "cantidad": 4, "creditosPorMateria": 3 },
    "profesionales": { "cantidad": 4, "creditosPorMateria": 3 }
  }
}
```

**Paso 2:** Actualiza `carreras/index.json`

Agrega tu carrera al array:
```json
[
  {
    "id": "ing-electronica",
    "name": "Ingeniería Electrónica",
    "facultad": "Facultad de Ingeniería",
    "archivo": "ing-electronica.json",
    "activa": true
  },
  {
    "id": "nombre-carrera",
    "name": "Nombre Completo",
    "facultad": "Tu Facultad",
    "archivo": "nombre-carrera.json",
    "activa": true
  }
]
```

**¡Listo!** La carrera aparecerá automáticamente en el selector.

### Actualizar la Malla de una Carrera Existente

Simplemente edita el archivo correspondiente en `carreras/`.

**Importante:** Mantén el formato correcto y valida el JSON antes de guardar.

### Agregar Horarios Oficiales

**Paso 1:** Crea `data/horarios/2026-1.json` (usa el semestre correspondiente)

Usa el formato de `docs/FORMATO_HORARIOS.json`:

```json
{
  "carrera": "ing-electronica",
  "semestre": "2026-1",
  "grupos": [
    {
      "id": "grupo-1",
      "nombre": "Grupo 1 - Diurno",
      "clases": [
        {
          "codigo": "111001",
          "nombreMateria": "Cálculo I",
          "profesor": "Nombre Profesor",
          "horarios": [
            {
              "dia": "Lunes",
              "horaInicio": "08:00",
              "horaFin": "10:00",
              "salon": "Aula 201",
              "tipo": "Teoría"
            }
          ]
        }
      ]
    }
  ]
}
```

## 🎯 Prerequisitos Avanzados

El sistema soporta 3 tipos de condiciones:

### 1. Prerequisito Simple
```json
"prereq": ["MAT001"]
```
Se cumple si la materia está: **aprobada, cursando o vista**

### 2. Prerequisito con Requerimiento Específico
```json
"prereq": [
  { "code": "MAT001", "requirement": "approved" }
]
```
Opciones:
- `"approved"`: Solo si está aprobada
- `"current"`: Si se está cursando o aprobada
- `"seen"`: Si fue vista, se está cursando o aprobada

### 3. Prerequisito con Opciones
```json
"prereq": [
  { "options": ["MAT001", "MAT002"] }
]
```
Se cumple si **al menos una** opción está cumplida.

### 4. Co-requisitos
```json
"coreq": ["MAT002"]
```
Materias que deben cursarse simultáneamente o ya estar aprobadas.

## 🎨 Personalización

### Cambiar Colores del Tema

Edita `css/variables.css`:

```css
:root {
  --primary: #TU-COLOR;
  --primary-dark: #TU-COLOR-OSCURO;
  /* ... más variables ... */
}
```

### Personalización por Usuario

Los usuarios pueden personalizar colores desde la interfaz:
- Configuración → Personalizar → Colores de estados

## 🔧 Solución de Problemas

### Las carreras no aparecen
- Verifica que `carreras/index.json` sea JSON válido
- Verifica que los archivos de carrera existan

### Los prerequisitos no funcionan
- Verifica que los códigos de materia sean exactos
- Revisa la consola del navegador (F12) para errores

### Los datos no se guardan
- Verifica que localStorage esté habilitado
- No uses el navegador en modo incógnito

## 📊 Estados de Materias

1. **Aprobada (Verde)**: Materia completada exitosamente
2. **Cursando (Azul)**: Se está viendo actualmente
3. **Vista (Amarillo)**: Se cursó pero no se aprobó
4. **Disponible (Verde oscuro)**: Puede cursarse
5. **Bloqueada (Gris)**: Faltan prerequisitos

## 💡 Tips

- Usa el botón **Exportar** para hacer backups regulares
- Revisa el **Progreso** para ver tu avance semestral
- Personaliza tu **Malla** para planificar tu semestre
- Importa **Horarios Oficiales** para evitar conflictos

## 🆘 Soporte

Para reportar problemas:
1. Abre un Issue en GitHub
2. Incluye descripción del problema
3. Adjunta captura de pantalla si es posible

## ✨ Próximas Características

Algunas ideas para expandir:
- Export a PDF
- Integración con calendario
- Calculadora de promedio
- Vista de prerequisitos en diagrama
- Backend con base de datos

---

**¡Disfruta planificando tu carrera!** 🎓
