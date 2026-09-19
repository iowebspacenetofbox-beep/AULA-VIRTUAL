import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, addDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// CONFIGURACIÓN
// ==========================================
const ADMIN_EMAIL = "videosc847@gmail.com"; 
const CORREO_FORMSUBMIT = "sebastianneto84@gmail.com";

const firebaseConfig = {
  apiKey: "AIzaSyAO_RcOstMWsdsHyawSaSsNrxnI5KNDaGU",
  authDomain: "simulador-quiz20-5.firebaseapp.com",
  projectId: "simulador-quiz20-5",
  storageBucket: "simulador-quiz20-5.firebasestorage.app",
  messagingSenderId: "677582682271",
  appId: "1:677582682271:web:b1f3f2ab0b60e7f9be0aaa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let usuarioActual = null;
let materiaSeleccionada = null;
let moduloSeleccionado = null; 
let temaActualInfo = null;
let quizActivo = null;

// ==========================================
// FUNCIÓN PARA MIGAS DE PAN
// ==========================================
function actualizarRuta(mat, mod, tem) {
    let ruta = "";
    if (mat) ruta += `<span style="color:var(--color-materia)">${mat}</span>`;
    if (mod) ruta += ` > <span style="color:var(--color-modulo)">${mod}</span>`;
    if (tem) ruta += ` > <span style="color:var(--color-tema)">${tem}</span>`;
    document.getElementById('top-title').innerHTML = ruta || "Inicio";
}

// ==========================================
// NAVEGACIÓN Y CONTROL DE INTERFAZ
// ==========================================
window.mostrarVista = function(idVista) {
    document.querySelectorAll('#main-content > section').forEach(sec => sec.classList.add('hidden'));
    const vista = document.getElementById(idVista);
    if(vista) vista.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if(idVista === 'view-inicio') {
        document.getElementById('nav-inicio')?.classList.add('active');
        actualizarRuta();
    }
}

window.toggleTreeNode = function(id) {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('open');
}

// FUNCIONES NUEVAS PARA EL MENÚ DE RECURSOS
window.mostrarRecurso = function(id, nombreRecurso) {
    // 1. Ocultamos el menú principal de recursos
    document.getElementById('menu-recursos').classList.add('hidden');
    // 2. Nos aseguramos de ocultar cualquier contenido que pudiera estar abierto
    document.querySelectorAll('.recurso-content').forEach(el => el.classList.add('hidden'));
    
    // 3. Mostramos solo el contenido que el usuario seleccionó (nueva indexación visual)
    document.getElementById(id).classList.remove('hidden');
    
    // 4. Cambiamos los botones de navegación
    document.getElementById('btn-volver-modulo').classList.add('hidden');
    document.getElementById('btn-volver-recursos').classList.remove('hidden');
    
    // 5. Actualizamos el subtítulo de la vista
    document.getElementById('subtitulo-recursos').textContent = nombreRecurso;
}

window.volverRecursos = function() {
    // 1. Volvemos a mostrar el menú de botones grandes
    document.getElementById('menu-recursos').classList.remove('hidden');
    
    // 2. Ocultamos los recursos individuales
    document.querySelectorAll('.recurso-content').forEach(el => el.classList.add('hidden'));
    
    // 3. Restauramos la navegación original del tema
    document.getElementById('btn-volver-recursos').classList.add('hidden');
    document.getElementById('btn-volver-modulo').classList.remove('hidden');
    
    // 4. Restauramos el subtítulo
    document.getElementById('subtitulo-recursos').textContent = "Recursos de aprendizaje";
}

window.switchAdminTab = function(tabName) {
    document.querySelectorAll('#view-admin .tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#view-admin .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`admin-tab-${tabName}`).classList.remove('hidden');
    
    const btns = document.querySelectorAll('#view-admin .tab-btn');
    if(tabName === 'materias') btns[0].classList.add('active');
    if(tabName === 'modulos') btns[1].classList.add('active');
    if(tabName === 'temas') btns[2].classList.add('active');
    if(tabName === 'alumnos') btns[3].classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.btn-logout').forEach(btn => btn.addEventListener('click', () => signOut(auth)));

    document.getElementById('btn-ir-admin')?.addEventListener('click', () => {
        mostrarVista('view-admin');
        cargarDatosAdmin();
    });

    document.getElementById('btn-volver-modulo')?.addEventListener('click', () => {
        if(moduloSeleccionado) window.cargarModulo(moduloSeleccionado.id, moduloSeleccionado.nombre, moduloSeleccionado.materiaId, moduloSeleccionado.materiaNombre, moduloSeleccionado.evaluacion);
    });

    // Login
    document.getElementById('btn-login-email')?.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value;
        const errBox = document.getElementById('login-error');
        errBox.classList.add('hidden');
        if(!email || !pass) { errBox.textContent = "Ingresa tu correo y contraseña."; errBox.classList.remove('hidden'); return; }
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch(e) { errBox.textContent = "Error al iniciar sesión: Verifique sus credenciales."; errBox.classList.remove('hidden'); }
    });

    document.getElementById('btn-login-google')?.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(() => {
            const err = document.getElementById('login-error');
            err.textContent = "Error al conectar con Google."; err.classList.remove('hidden');
        });
    });

    document.getElementById('btn-descargar-pdf')?.addEventListener('click', () => {
        const elemento = document.getElementById('tema-resumen');
        const nombreArchivo = (temaActualInfo?.titulo || 'Resumen').replace(/\s+/g, '_') + '.pdf';
        const opt = {
            margin:       0.5,
            filename:     nombreArchivo,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(elemento).save();
    });

    // ==========================================
    // ADMINISTRADOR: GESTIÓN DE ESTRUCTURA
    // ==========================================
    
    document.getElementById('btn-crear-materia')?.addEventListener('click', async () => {
        const nombre = document.getElementById('admin-nueva-materia').value.trim();
        const orden = parseInt(document.getElementById('admin-nueva-materia-orden').value) || 0;
        if(!nombre) return alert("Escribe el nombre de la materia.");
        try {
            await addDoc(collection(db, "materias"), { nombre, orden, fecha_creacion: new Date().toISOString() });
            document.getElementById('admin-nueva-materia').value = "";
            document.getElementById('admin-nueva-materia-orden').value = "0";
            cargarDatosAdmin();
            cargarEstructuraGlobal();
            alert("Materia creada con éxito.");
        } catch(e) { alert("Error: " + e.message); }
    });

    document.getElementById('btn-crear-modulo')?.addEventListener('click', async () => {
        const materia_id = document.getElementById('admin-select-materia-modulo').value;
        const nombre = document.getElementById('admin-nuevo-modulo').value.trim();
        const archivo_eval = document.getElementById('admin-nuevo-modulo-eval').value.trim();
        
        if(!materia_id || !nombre) return alert("Selecciona la materia y escribe el nombre del módulo.");
        try {
            await addDoc(collection(db, "modulos"), { materia_id, nombre, archivo_evaluacion: archivo_eval, fecha_creacion: new Date().toISOString() });
            document.getElementById('admin-nuevo-modulo').value = "";
            document.getElementById('admin-nuevo-modulo-eval').value = "";
            cargarDatosAdmin();
            cargarEstructuraGlobal();
            alert("Módulo creado con éxito.");
        } catch(e) { alert("Error: " + e.message); }
    });

    document.getElementById('admin-tema-materia')?.addEventListener('change', async (e) => {
        const materia_id = e.target.value;
        const selModulo = document.getElementById('admin-tema-modulo');
        selModulo.innerHTML = "<option value=''>Cargando módulos...</option>";
        
        if(!materia_id) { selModulo.innerHTML = "<option value=''>Selecciona primero una materia</option>"; return; }
        
        const snap = await getDocs(query(collection(db, "modulos"), where("materia_id", "==", materia_id)));
        if(snap.empty) {
            selModulo.innerHTML = "<option value=''>No hay módulos. Crea uno primero.</option>";
        } else {
            selModulo.innerHTML = snap.docs.map(d => `<option value="${d.id}">${d.data().nombre}</option>`).join('');
        }
    });

    document.getElementById('btn-admin-guardar-tema')?.addEventListener('click', async () => {
        const materia_id = document.getElementById('admin-tema-materia').value;
        const modulo_id = document.getElementById('admin-tema-modulo').value;
        const titulo = document.getElementById('admin-tema-titulo').value.trim();
        const resumen_teorico = document.getElementById('admin-tema-resumen').value.trim();
        const lecturasRaw = document.getElementById('admin-tema-lecturas').value;
        const videosRaw = document.getElementById('admin-tema-videos').value;
        const video_laboratorio = document.getElementById('admin-tema-laboratorio').value.trim();
        const imagenesRaw = document.getElementById('admin-tema-imagenes').value;
        const status = document.getElementById('admin-status');

        if(!modulo_id || !titulo) return alert("Selecciona el módulo e ingresa el título del tema.");

        status.style.color = "var(--primary-light)";
        status.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Guardando tema...";

        try {
            const parseLinks = (txt) => txt.split('\n').filter(l => l.includes('http')).map(l => {
                const parts = l.split('http');
                let title = parts[0].replace(/^[\d\.\-\*]*\s*/, '').replace(/:\s*$/, '').trim();
                return { titulo: title || "Enlace sugerido", url: 'http' + parts[1].trim() };
            });

            const parseSimpleList = (txt) => txt.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            await addDoc(collection(db, "temas_globales"), {
                materia_id, modulo_id, titulo,
                resumen_teorico: resumen_teorico,
                lecturas_recomendadas: parseLinks(lecturasRaw),
                videos_recomendados: parseSimpleList(videosRaw),
                imagenes: parseSimpleList(imagenesRaw),
                video_laboratorio: video_laboratorio,
                fecha_creacion: new Date().toISOString()
            });

            status.style.color = "var(--success)";
            status.innerHTML = "✅ Tema publicado con éxito.";
            
            document.getElementById('admin-tema-titulo').value = "";
            document.getElementById('admin-tema-resumen').value = "";
            document.getElementById('admin-tema-lecturas').value = "";
            document.getElementById('admin-tema-videos').value = "";
            document.getElementById('admin-tema-laboratorio').value = "";
            document.getElementById('admin-tema-imagenes').value = "";
            
            cargarDatosAdmin();
            cargarEstructuraGlobal();
        } catch(e) {
            status.style.color = "var(--danger)";
            status.innerHTML = "❌ Error: " + e.message;
        } finally {
            setTimeout(() => status.innerHTML = "", 5000);
        }
    });

    document.getElementById('btn-admin-agregar-alumno')?.addEventListener('click', async () => {
        const email = document.getElementById('admin-nuevo-alumno-email').value.trim().toLowerCase();
        if(!email) return alert("Escribe un correo válido.");
        try {
            await setDoc(doc(db, "alumnos_autorizados", email), { email, fecha: new Date().toISOString() });
            document.getElementById('admin-nuevo-alumno-email').value = "";
            alert("Alumno autorizado correctamente.");
            cargarDatosAdmin();
        } catch(e) { alert("Error: " + e.message); }
    });

    // ==========================================
    // SIMULADOR IA & EVALUACIÓN
    // ==========================================
    document.getElementById('btn-generar-simulador')?.addEventListener('click', async () => {
        const status = document.getElementById('simulador-status');
        const hoy = new Date().toISOString().split('T')[0];
        const limiteRef = doc(db, "usuarios", usuarioActual.uid, "limites", `${hoy}_${temaActualInfo.id}`);
        const limiteSnap = await getDoc(limiteRef);
        let generadosHoy = limiteSnap.exists() ? limiteSnap.data().cantidad : 0;

        if (generadosHoy >= 5) {
            status.style.color = "var(--danger)";
            status.textContent = "❌ Límite diario de 5 evaluaciones alcanzado."; return;
        }

        status.style.color = "var(--primary-light)";
        status.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Cargando...";

        try {
            const promptText = `Actúa como creador de exámenes de admisión. Materia: ${materiaSeleccionada.nombre}. Tema: "${temaActualInfo.titulo}". Genera un cuestionario de 5 preguntas de opción múltiple. Devuelve EXCLUSIVAMENTE JSON sin markdown: { "preguntas": [ { "enunciado": "...", "opciones": ["A) op1", "B) op2", "C) op3", "D) op4"], "respuesta_correcta": 0, "explicacion": "..." } ] }`;

            const response = await fetch('/.netlify/functions/gemini', {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptText, modelo: "gemini-3.1-flash-lite" }) 
            });
            const data = await response.json();
            
            if(!data.candidates || data.candidates.length === 0) throw new Error("Error en la conexión con el evaluador.");
            
            const textoIA = data.candidates[0].content.parts[0].text;
            const simuladorJSON = JSON.parse(textoIA.replace(/```json/g, '').replace(/```/g, '').trim());

            await addDoc(collection(db, "usuarios", usuarioActual.uid, "simuladores_guardados"), {
                tema_id: temaActualInfo.id, tema_titulo: temaActualInfo.titulo,
                preguntas: simuladorJSON.preguntas, fecha_creacion: new Date().toISOString()
            });

            await setDoc(limiteRef, { cantidad: generadosHoy + 1 });
            status.style.color = "var(--success)";
            status.textContent = "✅ Evaluación lista.";
            cargarSimuladoresGuardados();
        } catch(e) {
            status.style.color = "var(--danger)"; status.textContent = "❌ Error al cargar: " + e.message;
        }
    });

    document.getElementById('btn-enviar-quiz')?.addEventListener('click', async () => {
        let puntaje = 0;
        quizActivo.forEach((p, index) => {
            const sel = document.querySelector(`input[name="q${index}"]:checked`);
            const divExp = document.getElementById(`exp-q${index}`);
            if(divExp) divExp.classList.remove('hidden');
            if(sel && parseInt(sel.value) === p.respuesta_correcta) puntaje++;
        });

        const resDiv = document.getElementById('quiz-resultado');
        resDiv.innerHTML = `<h3>Puntaje Obtenido</h3><p style="font-size: 36px; font-weight: 800; color: var(--primary-light); margin:0;">${puntaje} / ${quizActivo.length}</p>`;
        resDiv.classList.remove('hidden');
        document.getElementById('btn-enviar-quiz').classList.add('hidden');
        document.getElementById('btn-volver-tema-desde-quiz').classList.remove('hidden');

        await setDoc(doc(db, "usuarios", usuarioActual.uid, "progreso_temas", temaActualInfo.id), {
            status: "green", timestamp: new Date().toISOString()
        }, { merge: true });

        fetch(`https://formsubmit.co/ajax/${CORREO_FORMSUBMIT}`, {
            method: "POST", headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _subject: `Evaluación Completada - ${usuarioActual.email}`, usuario: usuarioActual.email, tema: temaActualInfo.titulo, resultado: `${puntaje}/${quizActivo.length}` })
        }).catch(() => {});
    });

    document.getElementById('btn-volver-tema-desde-quiz')?.addEventListener('click', () => mostrarVista('view-tema'));
});

// ==========================================
// ESTADO DE AUTENTICACIÓN
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if(user) {
        if(user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            const authSnap = await getDoc(doc(db, "alumnos_autorizados", user.email.toLowerCase()));
            if(!authSnap.exists()) {
                const errBox = document.getElementById('login-error');
                if(errBox) { errBox.innerHTML = `El correo <b>${user.email}</b> no está autorizado. Contacta a tu docente.`; errBox.classList.remove('hidden'); }
                await signOut(auth); return;
            }
        }
        usuarioActual = user;
        document.getElementById('user-display-name').textContent = "593 TucaminoalaU";
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('top-navbar').classList.remove('hidden');

        const btnAdmin = document.getElementById('btn-ir-admin');
        if(user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) btnAdmin?.classList.remove('hidden');
        else btnAdmin?.classList.add('hidden');

        cargarEstructuraGlobal();
        mostrarVista('view-inicio');
    } else {
        usuarioActual = null;
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('top-navbar').classList.add('hidden');
        mostrarVista('view-login');
    }
});

// ==========================================
// RENDERIZADO DINÁMICO
// ==========================================
async function cargarEstructuraGlobal() {
    const cont = document.getElementById('sidebar-dynamic-content');
    cont.innerHTML = "<div style='padding:15px; color:#94A3B8; font-size:12px;'>Cargando estructura...</div>";

    const [snapMat, snapMod, snapTem] = await Promise.all([
        getDocs(collection(db, "materias")),
        getDocs(collection(db, "modulos")),
        getDocs(collection(db, "temas_globales"))
    ]);

    let materias = []; snapMat.forEach(d => materias.push({id: d.id, ...d.data()}));
    let modulos = []; snapMod.forEach(d => modulos.push({id: d.id, ...d.data()}));
    let temas = []; snapTem.forEach(d => temas.push({id: d.id, ...d.data()}));

    materias.sort((a,b) => (a.orden || 0) - (b.orden || 0));

    let html = "";
    materias.forEach(mat => {
        const idArbolMat = `tree-mat-${mat.id}`;
        html += `
            <div class="tree-subject">
                <div class="tree-subject-header" onclick="toggleTreeNode('${idArbolMat}')">
                    <span style="flex:1;"><i class="fas fa-book" style="margin-right:8px;"></i> ${mat.nombre}</span>
                    <i class="fas fa-chevron-down" style="font-size: 12px; padding: 5px;"></i>
                </div>
                <div class="tree-modulos" id="${idArbolMat}">
        `;
        
        const modulosMat = modulos.filter(m => m.materia_id === mat.id);
        if(modulosMat.length === 0) html += `<div style="font-size:11px; color:#64748B; padding:5px 15px;">Sin módulos</div>`;

        modulosMat.forEach(mod => {
            const idArbolMod = `tree-mod-${mod.id}`;
            const evalArchivo = mod.archivo_evaluacion || "";
            
            // Protección contra comillas dobles o simples en los nombres
            const safeMatNombre = (mat.nombre || "").replace(/'/g, "\\'");
            const safeModNombre = (mod.nombre || "").replace(/'/g, "\\'");

            html += `
                <div class="tree-modulo-header" onclick="toggleTreeNode('${idArbolMod}'); cargarModulo('${mod.id}', '${safeModNombre}', '${mat.id}', '${safeMatNombre}', '${evalArchivo}')">
                    <i class="fas fa-layer-group" style="margin-right:5px;"></i> ${mod.nombre}
                </div>
                <div class="tree-topics" id="${idArbolMod}">
            `;
            const temasMod = temas.filter(t => t.modulo_id === mod.id);
            if(temasMod.length === 0) html += `<div style="font-size:11px; color:#64748B; padding:5px 15px;">Sin temas</div>`;
            temasMod.forEach(t => {
                html += `<a class="tree-topic-item" onclick="abrirTema('${t.id}', '${mat.id}', '${safeMatNombre}', '${safeModNombre}')">• ${t.titulo}</a>`;
            });
            html += `</div>`;
        });
        html += `</div></div>`;
    });

    cont.innerHTML = html;
}

window.cargarModulo = async function(moduloId, moduloNombre, materiaId, materiaNombre, archivoEval) {
    materiaSeleccionada = { id: materiaId, nombre: materiaNombre };
    moduloSeleccionado = { id: moduloId, nombre: moduloNombre, materiaId, materiaNombre, evaluacion: archivoEval };
    
    document.getElementById('modulo-titulo').textContent = moduloNombre;
    actualizarRuta(materiaNombre, moduloNombre, null);
    mostrarVista('view-modulo');

    const container = document.getElementById('modulo-temas-container');
    container.innerHTML = "<p style='color: var(--text-light);'>Cargando pista...</p>";

    const [snapTem, snapProg] = await Promise.all([
        getDocs(query(collection(db, "temas_globales"), where("modulo_id", "==", moduloId))),
        getDocs(collection(db, "usuarios", usuarioActual.uid, "progreso_temas"))
    ]);

    let temas = []; snapTem.forEach(d => temas.push({id: d.id, ...d.data()}));
    let mapaProgreso = {}; snapProg.forEach(d => mapaProgreso[d.id] = d.data().status);

    if(temas.length === 0) {
        container.innerHTML = `<p style="color:white; font-size:14px;">No hay estaciones en esta pista aún.</p>`;
        return;
    }

    let indexActual = -1;
    for (let i = 0; i < temas.length; i++) {
        let st = mapaProgreso[temas[i].id] || "red";
        if (st !== 'green') {
            indexActual = i; break;
        }
    }
    if (indexActual === -1 && temas.length > 0) indexActual = temas.length - 1;

    let html = `<div class="pista-container">`;
    temas.forEach((t, index) => {
        const st = mapaProgreso[t.id] || "red";
        const bgClass = st === 'green' ? 'estado-verde' : (st === 'yellow' ? 'estado-amarillo' : 'estado-rojo');
        const cocheHtml = (index === indexActual) ? `<div class="coche">🏎️</div>` : '';
        
        const safeMatNombre = (materiaNombre || "").replace(/'/g, "\\'");
        const safeModNombre = (moduloNombre || "").replace(/'/g, "\\'");

        html += `<div class="pista-estacion" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="abrirTema('${t.id}', '${materiaId}', '${safeMatNombre}', '${safeModNombre}')">${cocheHtml}<div class="info-tema ${bgClass}">${t.titulo}</div></div>`;
    });
    
    if(archivoEval) {
        html += `<div class="pista-estacion">
                <a href="${archivoEval}" target="_blank" style="text-decoration: none; width: 100%;">
                    <div class="info-tema" style="background-color: #1E3A8A; border-color: #60A5FA; color: white;">📝 Evaluación General</div>
                </a></div>`;
    }
    
    html += `<div class="meta-bandera"><span>🏁</span><div style="margin-top: 5px;">META</div></div></div>`;
    container.innerHTML = html;
}

window.abrirTema = async function(temaId, matId, matNombre, modNombre) {
    try {
        materiaSeleccionada = { id: matId, nombre: matNombre };
        const docSnap = await getDoc(doc(db, "temas_globales", temaId));
        if(!docSnap.exists()) return;

        const data = docSnap.data();
        temaActualInfo = { id: temaId, ...data };

        document.getElementById('tema-titulo').textContent = data.titulo;
        actualizarRuta(matNombre, modNombre, data.titulo);

        const progRef = doc(db, "usuarios", usuarioActual.uid, "progreso_temas", temaId);
        const progSnap = await getDoc(progRef);
        if(!progSnap.exists() || progSnap.data().status === 'red') {
            await setDoc(progRef, { status: 'yellow', last_accessed: new Date().toISOString() }, { merge: true });
        }

        // 1. Mostrar siempre el menú principal de recursos por defecto al abrir un tema
        if(typeof window.volverRecursos === 'function') {
            window.volverRecursos();
        }

        // Textos: Resumen Manual 
        const resBox = document.getElementById('tema-resumen');
        if (resBox) resBox.innerHTML = typeof marked !== 'undefined' ? marked.parse(data.resumen_teorico || "") : data.resumen_teorico;

        // Textos: Lecturas Horizontales (CON PROTECCIÓN DE ARRAY)
        const lecList = document.getElementById('tema-lecturas-list');
        if (lecList) {
            lecList.innerHTML = (Array.isArray(data.lecturas_recomendadas) && data.lecturas_recomendadas.length) ? 
                data.lecturas_recomendadas.map((l, idx) => `<a href="${l.url}" target="_blank" class="enlace-lectura">Lectura ${idx + 1}: ${l.titulo}</a>`).join('') : "<p style='color:var(--text-light)'>No hay lecturas asignadas.</p>";
        }

        // Videos Incrustados Horizontales (CON PROTECCIÓN DE ARRAY)
        const vidList = document.getElementById('tema-videos-list');
        if (vidList) {
            if (Array.isArray(data.videos_recomendados) && data.videos_recomendados.length) {
                vidList.innerHTML = data.videos_recomendados.map(vUrl => {
                    let embedUrl = vUrl;
                    if(vUrl.includes("youtube.com/watch?v=")) embedUrl = vUrl.replace("watch?v=", "embed/").split('&')[0];
                    else if(vUrl.includes("youtu.be/")) embedUrl = vUrl.replace("youtu.be/", "youtube.com/embed/").split('?')[0];
                    
                    return `<iframe width="320" height="190" src="${embedUrl}" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"></iframe>`;
                }).join('');
            } else {
                vidList.innerHTML = "<p style='color:var(--text-light)'>No hay videos asignados.</p>";
            }
        }

        // Lógica para Química -> Laboratorio incrustado
        const secLab = document.getElementById('seccion-laboratorio');
        if (secLab) {
            const matNormalizada = (matNombre || "").trim().toUpperCase();
            if ((matNormalizada === "QUÍMICA" || matNormalizada === "QUIMICA") && data.video_laboratorio) {
                secLab.classList.remove('hidden');
                
                let embedLabUrl = data.video_laboratorio;
                if(embedLabUrl.includes("youtube.com/watch?v=")) embedLabUrl = embedLabUrl.replace("watch?v=", "embed/").split('&')[0];
                else if(embedLabUrl.includes("youtu.be/")) embedLabUrl = embedLabUrl.replace("youtu.be/", "youtube.com/embed/").split('?')[0];
                
                document.getElementById('contenedor-video-laboratorio').innerHTML = `<iframe width="100%" height="315" src="${embedLabUrl}" title="Video de Laboratorio" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); max-width: 560px;"></iframe>`;
            } else {
                secLab.classList.add('hidden');
            }
        }

        // Imágenes Horizontales (CON PROTECCIÓN DE ARRAY)
        const imgList = document.getElementById('tema-imagenes-list');
        if (imgList) {
            if (Array.isArray(data.imagenes) && data.imagenes.length) {
                imgList.innerHTML = data.imagenes.map(img => `<img src="imagenes/${img}" style="max-height: 220px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">`).join('');
            } else {
                imgList.innerHTML = "<p style='color:var(--text-light)'>No hay imágenes asignadas.</p>";
            }
        }

        cargarSimuladoresGuardados();
        mostrarVista('view-tema');

    } catch(err) {
        console.error("Error cargando el tema:", err);
        alert("Ocurrió un error interno al intentar renderizar el tema. Por favor revisa la consola.");
    }
}

async function cargarSimuladoresGuardados() {
    const cont = document.getElementById('lista-simuladores-guardados');
    cont.innerHTML = "<p>Cargando evaluaciones...</p>";
    const snap = await getDocs(query(collection(db, "usuarios", usuarioActual.uid, "simuladores_guardados"), where("tema_id", "==", temaActualInfo.id)));
    
    if(snap.empty) { cont.innerHTML = "<p style='font-size:13px; color:var(--text-light);'>No has realizado ninguna evaluación.</p>"; return; }

    let html = ""; let i = 1;
    snap.forEach(d => {
        const p = JSON.stringify(d.data().preguntas).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        html += `<button class="btn-outline" style="justify-content: flex-start; text-align: left; padding: 12px;" onclick="iniciarQuiz(${p})"><i class="fas fa-file-signature"></i> Evaluación #${i++}</button>`;
    });
    cont.innerHTML = html;
}

window.iniciarQuiz = function(preguntas) {
    quizActivo = preguntas;
    document.getElementById('quiz-titulo').textContent = temaActualInfo.titulo;
    document.getElementById('quiz-subtitulo').textContent = "Responde las siguientes preguntas:";
    document.getElementById('btn-enviar-quiz').classList.remove('hidden');
    document.getElementById('btn-volver-tema-desde-quiz').classList.add('hidden');
    document.getElementById('quiz-resultado').classList.add('hidden');

    const cont = document.getElementById('quiz-preguntas-container');
    cont.innerHTML = quizActivo.map((p, idx) => `
        <div class="instruction-card" style="margin-bottom: 15px;">
            <p style="font-weight:700;">${idx + 1}. ${p.enunciado}</p>
            ${p.opciones.map((op, opIdx) => `<label class="quiz-option"><input type="radio" name="q${idx}" value="${opIdx}"><span>${op}</span></label>`).join('')}
            <div id="exp-q${idx}" class="hidden" style="margin-top: 10px; background: #F0FDF4; padding: 10px; border-radius: 6px; font-size: 13px; color: #166534;"><strong>Explicación:</strong> ${p.explicacion}</div>
        </div>`).join('');

    if(window.MathJax) MathJax.typesetPromise();
    mostrarVista('view-quiz');
}

// ==========================================
// FUNCIONES ADMIN (CARGAR Y ELIMINAR)
// ==========================================
async function cargarDatosAdmin() {
    const snapMat = await getDocs(collection(db, "materias"));
    const contMat = document.getElementById('admin-lista-materias');
    const selMatMod = document.getElementById('admin-select-materia-modulo');
    const selMatTem = document.getElementById('admin-tema-materia');
    
    if(snapMat.empty) {
        contMat.innerHTML = "<p>No hay materias creadas.</p>";
        selMatMod.innerHTML = "<option value=''>Crea una materia primero</option>";
        selMatTem.innerHTML = "<option value=''>Crea una materia primero</option>";
    } else {
        let opcionesHTML = "<option value=''>-- Selecciona una Materia --</option>";
        
        let arrMat = []; snapMat.forEach(d => arrMat.push({id: d.id, ...d.data()}));
        arrMat.sort((a,b) => (a.orden || 0) - (b.orden || 0));

        let htmlMats = "";
        arrMat.forEach(data => {
            opcionesHTML += `<option value="${data.id}">${data.nombre}</option>`;
            htmlMats += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg); border-radius:6px; margin-bottom:8px;">
                            <strong>${data.nombre} (Orden: ${data.orden || 0})</strong>
                            <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarDocumento('materias', '${data.id}')"><i class="fas fa-trash"></i></button>
                         </div>`;
        });
        contMat.innerHTML = htmlMats;
        selMatMod.innerHTML = opcionesHTML;
        selMatTem.innerHTML = opcionesHTML;
    }

    const snapMod = await getDocs(collection(db, "modulos"));
    const contMod = document.getElementById('admin-lista-modulos');
    if(snapMod.empty) {
        contMod.innerHTML = "<p>No hay módulos creados.</p>";
    } else {
        let materiasMap = {}; snapMat.forEach(d => materiasMap[d.id] = d.data().nombre);
        contMod.innerHTML = snapMod.docs.map(d => {
            const data = d.data();
            const nomMat = materiasMap[data.materia_id] || "Materia desconocida";
            const evalHtml = data.archivo_evaluacion ? `<span style="font-size:11px; background:#F59E0B; color:white; padding: 2px 5px; border-radius: 4px;">Eval: ${data.archivo_evaluacion}</span>` : '';
            return `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg); border-radius:6px; margin-bottom:8px;">
                        <div><small style="color:var(--primary-light);">${nomMat}</small><br><strong>${data.nombre}</strong> <br>${evalHtml}</div>
                        <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarDocumento('modulos', '${d.id}')"><i class="fas fa-trash"></i></button>
                    </div>`;
        }).join('');
    }

    const snapTem = await getDocs(collection(db, "temas_globales"));
    const contTem = document.getElementById('admin-lista-temas');
    if(snapTem.empty) contTem.innerHTML = "<p>No hay temas creados.</p>";
    else {
        contTem.innerHTML = snapTem.docs.map(d => `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg); border-radius:6px; margin-bottom:8px;">
                        <span>${d.data().titulo}</span>
                        <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarDocumento('temas_globales', '${d.id}')"><i class="fas fa-trash"></i></button>
                    </div>`).join('');
    }

    const snapAlu = await getDocs(collection(db, "alumnos_autorizados"));
    const contAlu = document.getElementById('admin-lista-alumnos');
    if(snapAlu.empty) contAlu.innerHTML = "<p>No hay alumnos autorizados.</p>";
    else {
        contAlu.innerHTML = snapAlu.docs.map(d => `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg); border-radius:6px; margin-bottom:5px;">
            <span>${d.data().email}</span>
            <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarDocumento('alumnos_autorizados', '${d.id}')"><i class="fas fa-trash"></i></button>
        </div>`).join('');
    }
}

window.eliminarDocumento = async function(coleccion, id) {
    if(confirm(`¿Estás seguro de eliminar este elemento definitivamente?`)) {
        await deleteDoc(doc(db, coleccion, id));
        cargarDatosAdmin();
        cargarEstructuraGlobal();
    }
}
