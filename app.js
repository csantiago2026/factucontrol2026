// ===========================
// CONFIGURATION & STATE
// ===========================
const state = {
    clientId: localStorage.getItem('factuai_client_id') || '',
    geminiKey: localStorage.getItem('factuai_gemini_key') || '',
    folderIn: localStorage.getItem('factuai_folder_in') || '',
    folderOut: localStorage.getItem('factuai_folder_out') || '',
    costCenters: localStorage.getItem('factuai_cost_centers') 
                 ? JSON.parse(localStorage.getItem('factuai_cost_centers')) 
                 : ['Administración', 'Ventas', 'IT'],
    isAuth: false,
    tokenClient: null,
    accessToken: null,
    invoicesData: [],
    processedCount: 0
};

// ===========================
// DOM ELEMENTS
// ===========================
const dom = {
    navBtns: document.querySelectorAll('.nav-btn'),
    sections: document.querySelectorAll('.view-section'),
    authBtn: document.getElementById('auth-btn'),
    userInfo: document.getElementById('user-info'),
    userEmail: document.getElementById('user-email'),
    processBtn: document.getElementById('process-btn'),
    exportBtn: document.getElementById('export-btn'),
    pendingCount: document.getElementById('pending-count'),
    processedCount: document.getElementById('processed-count'),
    tableBody: document.getElementById('table-body'),
    emptyState: document.getElementById('empty-state'),
    clientIdInp: document.getElementById('client-id'),
    folderInInp: document.getElementById('folder-in'),
    folderOutInp: document.getElementById('folder-out'),
    geminiKeyInp: document.getElementById('gemini-key'),
    ccFile: document.getElementById('cost-centers-file'),
    ccText: document.getElementById('cost-centers-text'),
    saveBtn: document.getElementById('save-settings-btn'),
    saveMsg: document.getElementById('save-msg'),
    fileNameDisplay: document.getElementById('file-name-display'),
    loadingSpinner: document.getElementById('loading-spinner'),
    statusIcon: document.getElementById('status-icon'),
    statusText: document.getElementById('status-text'),
    statusSubtext: document.getElementById('status-subtext')
};

// ===========================
// INITIALIZATION
// ===========================
function init() {
    dom.clientIdInp.value = state.clientId;
    dom.folderInInp.value = state.folderIn;
    dom.folderOutInp.value = state.folderOut;
    dom.geminiKeyInp.value = state.geminiKey;
    dom.ccText.value = state.costCenters.join('\n');

    dom.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            dom.navBtns.forEach(b => b.classList.remove('active'));
            dom.sections.forEach(s => {
                s.classList.remove('active');
                s.classList.add('hidden');
            });
            
            btn.classList.add('active');
            const targetSection = document.getElementById(btn.dataset.target);
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        });
    });

    dom.saveBtn.addEventListener('click', saveSettings);
    dom.authBtn.addEventListener('click', handleAuthClick);
    dom.ccFile.addEventListener('change', handleCCFileUpload);
    dom.processBtn.addEventListener('click', startProcessing);
    dom.exportBtn.addEventListener('click', exportCSV);

    if (window['pdfjs-dist/build/pdf']) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
}

// ===========================
// SETTINGS
// ===========================
function saveSettings() {
    state.clientId = dom.clientIdInp.value.trim();
    state.geminiKey = dom.geminiKeyInp.value.trim();
    state.folderIn = dom.folderInInp.value.trim();
    state.folderOut = dom.folderOutInp.value.trim();
    
    const ccLines = dom.ccText.value.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
    state.costCenters = ccLines.length > 0 ? ccLines : ['General'];

    localStorage.setItem('factuai_client_id', state.clientId);
    localStorage.setItem('factuai_gemini_key', state.geminiKey);
    localStorage.setItem('factuai_folder_in', state.folderIn);
    localStorage.setItem('factuai_folder_out', state.folderOut);
    localStorage.setItem('factuai_cost_centers', JSON.stringify(state.costCenters));

    dom.saveMsg.classList.remove('hidden');
    setTimeout(() => dom.saveMsg.classList.add('hidden'), 3000);

    if (state.clientId) initGoogleClient();
}

function handleCCFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    dom.fileNameDisplay.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        dom.ccText.value = e.target.result;
    };
    reader.readAsText(file);
}

// ===========================
// AUTH
// ===========================
function initGoogleClient() {
    if (!state.clientId) return;
    try {
        state.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: state.clientId,
            scope: 'https://www.googleapis.com/auth/drive',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    state.accessToken = tokenResponse.access_token;
                    state.isAuth = true;
                    updateAuthUI(true);
                    checkPendingInvoices();
                }
            },
        });
    } catch (e) {
        console.error("Error init google client", e);
    }
}

function handleAuthClick() {
    if (!state.clientId) {
        alert("Configura tu Client ID en la pestaña Configuración.");
        document.querySelector('[data-target="settings"]').click();
        return;
    }
    if (!state.isAuth) {
        state.tokenClient.requestAccessToken();
    } else {
        google.accounts.id.revoke(state.accessToken, () => {
            state.accessToken = null;
            state.isAuth = false;
            updateAuthUI(false);
        });
    }
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        dom.authBtn.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> Desconectar';
        dom.authBtn.classList.add('connected');
        dom.userInfo.classList.remove('hidden');
        dom.userEmail.textContent = "Conectado a Drive";
    } else {
        dom.authBtn.innerHTML = '<i class="fa-brands fa-google"></i> Conectar Drive';
        dom.authBtn.classList.remove('connected');
        dom.processBtn.disabled = true;
        dom.userInfo.classList.add('hidden');
        dom.pendingCount.textContent = '-';
    }
}

// ===========================
// HELPERS / UTILS
// ===========================
function setUIMessage(msg, submsg='', loading = false) {
    dom.emptyState.classList.remove('hidden');
    dom.statusText.textContent = msg;
    dom.statusSubtext.textContent = submsg;
    
    if (loading) {
        dom.loadingSpinner.classList.remove('hidden');
        dom.statusIcon.classList.add('hidden');
    } else {
        dom.loadingSpinner.classList.add('hidden');
        dom.statusIcon.classList.remove('hidden');
    }
}

async function apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${state.accessToken}`;
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
}

async function getFolderIdByName(folderName) {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    const data = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
    if (data.files && data.files.length > 0) return data.files[0].id;
    return null;
}

// ===========================
// MAIN PROCESS LOGIC
// ===========================
async function checkPendingInvoices() {
    setUIMessage("Buscando facturas...", "", true);
    dom.processBtn.disabled = true;
    
    try {
        if (!state.folderIn) {
            setUIMessage("Buscando carpeta 'FACTURAS A PROCESAR'...", "", true);
            const autoFound = await getFolderIdByName("FACTURAS A PROCESAR");
            if (autoFound) state.folderIn = autoFound;
            else throw new Error("Carpeta no encontrada o no configurada.");
        }

        const q = `'${state.folderIn}' in parents and mimeType='application/pdf' and trashed=false`;
        const data = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink,parents)`);
        
        const files = data.files || [];
        dom.pendingCount.textContent = files.length;
        
        if (files.length > 0) {
            setUIMessage("¡Archivos detectados!", "Presiona 'Procesar Pendientes' para iniciar.");
            dom.processBtn.disabled = false;
        } else {
            setUIMessage("Todo en orden.", "No se detectaron facturas para procesar.");
        }
    } catch (e) {
        console.error(e);
        setUIMessage("Error al buscar.", "Verifica accesos o ID de carpetas.");
    }
}

async function startProcessing() {
    if (!state.geminiKey) {
        alert("Falta ingresar la API Key de Gemini en Configuración.");
        return;
    }

    try {
        if (!state.folderOut) {
            const autoOut = await getFolderIdByName("FACTURAS PROCESADAS");
            if (autoOut) state.folderOut = autoOut;
            else throw new Error("No se halló la carpeta de salida.");
        }

        dom.processBtn.disabled = true;
        const q = `'${state.folderIn}' in parents and mimeType='application/pdf' and trashed=false`;
        const data = await apiFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink,parents)`);
        const files = data.files || [];

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            setUIMessage(`Procesando ${i+1}/${files.length}...`, `Leyendo ${f.name}`, true);
            
            // 1. Download PDF blob using standard fetch due to drive download rules
            const pdfRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
                headers: { 'Authorization': `Bearer ${state.accessToken}` }
            });
            const arrayBuffer = await pdfRes.arrayBuffer();

            // 2. Extract Text via PDF.js
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let textContent = "";
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const txt = await page.getTextContent();
                textContent += txt.items.map(it => it.str).join(" ") + " ";
            }

            // 3. Gemini Extraction
            let extData = await extractWithGemini(textContent);
            if (!extData) extData = { fecha: '-', mes: '-', razon_social: 'No pudo extraerse', descripcion: '', tipo: '-', numero: '-', monto: '-' };

            // 4. Move file in Drive
            await apiFetch(`https://www.googleapis.com/drive/v3/files/${f.id}?addParents=${state.folderOut}&removeParents=${state.folderIn}`, { method: 'PATCH' });

            // 5. Update Table & UI
            addRowToTable(extData, f.webViewLink);
            state.processedCount++;
            dom.processedCount.textContent = state.processedCount;
            dom.pendingCount.textContent = files.length - (i + 1);
        }

        dom.emptyState.classList.add('hidden');
        dom.exportBtn.disabled = false;

    } catch(err) {
        console.error(err);
        alert("Ocurrió un error en el proceso: " + err.message);
    }
    
    // Check remaining
    setTimeout(() => {
        if(dom.pendingCount.textContent === '0') checkPendingInvoices();
    }, 1000);
}

// ===========================
// GEMINI API
// ===========================
async function extractWithGemini(pdfText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`;
    const prompt = `Extrae de esta factura los siguientes datos y devuelve SOLAMENTE el JSON raw (sin markdown de código):
    {
      "fecha": "DD/MM/YYYY",
      "mes": "Mes en español (ej: Enero)",
      "razon_social": "Quien emite o a quien va dirigida",
      "descripcion": "Motivo / Descripción de la factura",
      "tipo": "A, B, C, N/C",
      "numero": "Num exacto",
      "monto": "Monto final (sin simbolos, ej: 15400.50)"
    }
    
    Texto Factura:
    ${pdfText.substring(0, 15000)}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: [{ parts: [{text: prompt}] }] })
        });
        const rJson = await response.json();
        const rawText = rJson.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Gemini Parse Error:", e);
        return null;
    }
}

// ===========================
// TABLE & EXPORT
// ===========================
function addRowToTable(data, url) {
    const tr = document.createElement('tr');
    
    // Select dropdown for Cost Centers
    let ccOptions = state.costCenters.map(cc => `<option value="${cc}">${cc}</option>`).join('');
    
    let tipoBadge = 'type-a';
    if(data.tipo.includes('B')) tipoBadge = 'type-b';
    if(data.tipo.includes('C')) tipoBadge = 'type-c';
    if(data.tipo.toLowerCase().includes('nota') || data.tipo.toLowerCase().includes('n/c')) tipoBadge = 'type-nc';

    tr.innerHTML = `
        <td>${data.fecha}</td>
        <td>${data.mes}</td>
        <td style="font-weight:600">${data.razon_social}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${data.descripcion}">${data.descripcion}</td>
        <td><span class="badge ${tipoBadge}">${data.tipo}</span></td>
        <td>${data.numero}</td>
        <td style="font-weight:700">$${data.monto}</td>
        <td><select class="cost-center-select">${ccOptions}</select></td>
        <td><a href="${url}" target="_blank" class="link-btn"><i class="fa-solid fa-up-right-from-square"></i> Ver PDF</a></td>
    `;
    
    dom.tableBody.appendChild(tr);
    dom.emptyState.classList.add('hidden');
}

function exportCSV() {
    const rows = document.querySelectorAll('#results-table tbody tr');
    if (rows.length === 0) return;
    
    let csv = "Fecha,Mes,Razón Social,Descripción,Tipo,Número,Monto Final,Centro de Costos,Enlace\n";
    rows.forEach(tr => {
        const cols = tr.querySelectorAll('td');
        const fecha = cols[0].innerText;
        const mes = cols[1].innerText;
        const rs = `"${cols[2].innerText}"`; // Quotes to handle commas in description/Razon Social
        const desc = `"${cols[3].innerText}"`;
        const tipo = cols[4].innerText;
        const num = cols[5].innerText;
        const monto = cols[6].innerText.replace('$', '');
        const centroId = cols[7].querySelector('select');
        const centro = centroId ? `"${centroId.value}"` : 'General';
        const link = cols[8].querySelector('a').href;
        
        csv += `${fecha},${mes},${rs},${desc},${tipo},${num},${monto},${centro},${link}\n`;
    });
    
    const blob = new Blob(["\uFEFF"+csv], {type: 'text/csv;charset=utf-8;'});
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `Facturas_Procesadas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

window.addEventListener('DOMContentLoaded', init);
window.onload = function () {
    if (window.google && window.google.accounts) initGoogleClient();
};
