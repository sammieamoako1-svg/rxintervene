import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, onSnapshot, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- 1. INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDIQgRQm5GTUWKbPWmqc_c62mDAB6JETJs",
    authDomain: "rxintervene-f95ce.firebaseapp.com",
    projectId: "rxintervene-f95ce",
    storageBucket: "rxintervene-f95ce.firebasestorage.app",
    messagingSenderId: "785611599195",
    appId: "1:785611599195:web:712df71a19d8d71c22fe7e",
    measurementId: "G-QS2H39SH09"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const aiModel = new GoogleGenerativeAI("AIzaSyANCStxyHo879glhuzYTzvazrB-64JUZkY").getGenerativeModel({ 
    model: "gemini-3.1-flash-lite-preview",
    safetySettings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }]
});

let allInterventions = [];
let wardChart = null, trendChart = null, responseChart = null;
let unsubscribeSnapshot = null;
let lastAiAdvice = "";

// --- 2. AUTHENTICATION & USER MAPPING ---
onAuthStateChanged(auth, (user) => {
    const authView = document.getElementById('view-auth');
    if (user) {
        if (authView) authView.classList.add('hidden');
        const emailDisplay = document.getElementById('display-user-email');
        const nameDisplay = document.getElementById('display-user-name');
        const avatarDisplay = document.querySelector('.avatar-box');
        
        emailDisplay.innerText = user.email;
        let displayName = "Hello Boss", initials = "BOSS";
        if (user.email === "stephen.jalley@ucc.edu.gh") { displayName = "Dr. Stephen Jalley"; initials = "SJ"; }
        else if (user.email === "sammieamoako@gmail.com") { displayName = "Dr. Samuel Amoako"; initials = "SA"; }
        else if (user.email === "torihammond68@gmail.com") { displayName = "Dr. Victoria Hammond"; initials = "VH"; }
        else if (user.email === "adelaide-ampofo-asiama@ucc.edu.gh") { displayName = "Dr. Adelaide Ampofo-Asiama"; initials = "BA"; }
        
        if (nameDisplay) nameDisplay.innerText = displayName;
        if (avatarDisplay) avatarDisplay.innerText = initials;
        initApp();
        showView('home');
    } else {
        if (authView) authView.classList.remove('hidden');
        if (unsubscribeSnapshot) unsubscribeSnapshot();
    }
});

window.handleAuth = async (type) => {
    const e = document.getElementById('authEmail').value, p = document.getElementById('authPassword').value;
    try {
        if (type === 'login') await signInWithEmailAndPassword(auth, e, p);
        else await createUserWithEmailAndPassword(auth, e, p);
    } catch (err) { alert(err.message); }
};

window.handleLogout = () => { if (confirm("Sign out?")) signOut(auth); };

window.handleResetPassword = async () => {
    const e = document.getElementById('authEmail').value;
    if (e) await sendPasswordResetEmail(auth, e).then(() => alert("Reset email sent!"));
};

// --- 3. HIGH-FIDELITY RAG (WINDOWED RETRIEVAL) ---
async function getBnfContext(issueText) {
    const target = issueText.toLowerCase().split(/\W+/).filter(w => w.length > 3).sort((a,b) => b.length - a.length)[0];
    if (!target) return "";
    const q = query(collection(db, "clinical_knowledge"), orderBy("chunk_index"), limit(5000));
    const snap = await getDocs(q);
    let all = []; snap.forEach(d => all.push(d.data()));
    const start = all.findIndex(d => d.text.toLowerCase().includes(target));
    if (start === -1) return "";
    return all.slice(start, start + 15).map(p => p.text).join("\n---\n");
}

window.invokeAiAssistant = async () => {
    const panel = document.getElementById('ai-panel'), txt = document.getElementById('ai-suggestion-text'), issue = document.getElementById('issue').value;
    panel.classList.remove('hidden'); txt.innerHTML = "Reconstructing...";
    try {
        const ctx = await getBnfContext(issue);
        const res = await aiModel.generateContent(`ROLE: Senior Pharmacist. Reconstruct full monograph for ${issue} from CONTEXT: ${ctx}. Use 'l' for headers, '▶' for routes. NO SUMMARIZATION.`);
        lastAiAdvice = res.response.text();
        txt.innerHTML = lastAiAdvice.replace(/\n/g, '<br>').replace(/l (INDICATIONS|DOSE|CAUTIONS|SIDE-EFFECTS|PREGNANCY|HEPATIC|RENAL|MONITORING|DRUG ACTION)/g, '<br><b>l $1</b>').replace(/▶/g, '<span class="text-blue-600 font-bold">▶</span>');
    } catch (e) { txt.innerText = "Error assembling data."; }
};

window.applyAiSuggestion = () => { document.getElementById('intervention').value = lastAiAdvice; document.getElementById('ai-panel').classList.add('hidden'); };

// --- 4. NAVIGATION & COUNSELING ---
window.showView = (name) => {
    ['home', 'analytics', 'form', 'followup', 'setup'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });
    const targetView = document.getElementById(`view-${name}`);
    if (targetView) targetView.classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(b => {
        if (b.classList.contains('text-blue-600')) b.classList.replace('text-blue-600', 'text-slate-300');
    });
    const activeNav = document.getElementById(`nav-${name}`);
    if (activeNav) activeNav.classList.replace('text-slate-300', 'text-blue-600');
};

window.toggleCounselingForm = (show) => { document.getElementById('view-counseling').classList.toggle('hidden', !show); };

document.getElementById('counselingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { 
        patientId: document.getElementById('counselPatientId').value, 
        drugs: document.getElementById('counselDrugs').value, 
        notes: document.getElementById('counselNotes').value, 
        userId: auth.currentUser.uid, 
        createdAt: serverTimestamp() 
    };
    await addDoc(collection(db, "counseling"), data);
    await addDoc(collection(db, "interventions"), { 
        patientId: data.patientId, 
        ward: "Counseling", 
        urgency: "Normal", 
        issue: "Patient Counseling", 
        intervention: `Counseling: ${data.drugs}`, 
        responseStatus: "Accepted", 
        userId: auth.currentUser.uid, 
        createdAt: serverTimestamp() 
    });
    e.target.reset(); window.toggleCounselingForm(false);
});

// --- 5. CORE ACTIONS ---
window.toggleModField = () => { document.getElementById('modField').classList.toggle('hidden', document.getElementById('responseStatus').value !== 'Modified'); };

window.completeFollowUp = async (id) => { await updateDoc(doc(db, "interventions", id), { followUp: false }); };

document.getElementById('interventionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = { 
        patientId: document.getElementById('patientId').value, 
        ward: document.getElementById('ward').value, 
        urgency: document.getElementById('urgency').value, 
        issue: document.getElementById('issue').value, 
        intervention: document.getElementById('intervention').value, 
        responseStatus: document.getElementById('responseStatus').value, 
        modificationNote: document.getElementById('modificationNote').value || "", 
        notes: document.getElementById('notes').value || "", 
        followUp: document.getElementById('followUp').checked, 
        userId: auth.currentUser.uid, 
        createdAt: serverTimestamp() 
    };
    await addDoc(collection(db, "interventions"), data); 
    e.target.reset(); 
    showView('home');
});

const initApp = () => {
    const q = query(collection(db, "interventions"), orderBy("createdAt", "desc"));
    unsubscribeSnapshot = onSnapshot(q, (snap) => {
        allInterventions = []; 
        snap.forEach(d => {
            const data = d.data();
            allInterventions.push({ ...data, timestamp: data.createdAt?.toDate(), id: d.id });
        });
        window.renderHomeList(); 
        window.updateAllCharts();
    });
};

window.renderHomeList = () => {
    const filter = document.getElementById('homeFilter').value;
    const list = document.getElementById('intervention-list');
    const fup = document.getElementById('followup-list-today');
    list.innerHTML = ""; fup.innerHTML = "";
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    allInterventions.forEach(item => {
        let show = true;
        const itemDate = item.timestamp;

        if (filter === 'Counseling') {
            if (item.ward !== 'Counseling') show = false;
        } else {
            if (item.ward === 'Counseling') show = false;
        }

        if (show && (filter === 'thisMonth' || filter === 'thisYear')) {
            if (!itemDate) {
                show = false;
            } else {
                if (filter === 'thisMonth' && (itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear)) show = false;
                if (filter === 'thisYear' && itemDate.getFullYear() !== currentYear) show = false;
            }
        }

        if (show && filter !== 'all' && filter !== 'Counseling' && filter !== 'thisMonth' && filter !== 'thisYear') {
            if (filter === 'followUp') {
                if (!item.followUp) show = false;
            } else if (item.responseStatus !== filter) {
                show = false;
            }
        }

        if (show) {
            const colors = { 'Accepted': 'bg-green-100 text-green-700', 'Pending': 'bg-slate-100 text-slate-400', 'Rejected': 'bg-red-100 text-red-700', 'Modified': 'bg-yellow-100 text-yellow-700' };
            const cardDate = itemDate ? itemDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Recent';
            
            // Integrated Card Update Action Click Trigger
            list.innerHTML += `
                <div onclick="window.openEditModal('${item.id}')" class="bg-white p-5 rounded-[2rem] border mb-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">
                    <div class="flex justify-between items-center mb-1">
                        <p class="text-[10px] uppercase font-bold text-slate-400">${item.patientId} • ${item.ward}</p>
                        <p class="text-[9px] text-slate-400">${cardDate}</p>
                    </div>
                    <h3 class="font-bold text-sm text-slate-800 mb-2">${item.intervention}</h3>
                    <span class="px-2 py-1 rounded-full text-[10px] uppercase font-bold ${colors[item.responseStatus] || 'bg-slate-100 text-slate-700'}">${item.responseStatus}</span>
                </div>`;
        }
        
        if (item.followUp) {
            fup.innerHTML += `<div class="bg-white p-5 rounded-3xl border-l-4 border-blue-500 mb-3 shadow-sm"><p class="text-[10px] font-bold text-slate-400 uppercase mb-1">${item.patientId}</p><p class="text-sm font-bold text-slate-800">${item.intervention}</p><button onclick="completeFollowUp('${item.id}'); event.stopPropagation();" class="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] mt-2 font-bold uppercase tracking-wider">Done</button></div>`;
        }
    });
    
    if(list.innerHTML === "") list.innerHTML = `<p class="text-center py-8 text-slate-400 text-xs font-semibold">No interventions found.</p>`;
    if(fup.innerHTML === "") fup.innerHTML = `<p class="text-center py-8 text-slate-400 text-xs font-semibold">No active follow-ups.</p>`;
};

// --- 6. ACTIVITY INLINE CARD EDIT ENGINE ---
window.openEditModal = (id) => {
    const item = allInterventions.find(i => i.id === id);
    if (!item) return;

    document.getElementById('editItemId').value = id;
    document.getElementById('editPatientId').value = item.patientId || "";
    document.getElementById('editWard').value = item.ward || "Emergency";
    document.getElementById('editUrgency').value = item.urgency || "Normal";
    document.getElementById('editIssue').value = item.issue || "";
    document.getElementById('editIntervention').value = item.intervention || "";
    document.getElementById('editResponseStatus').value = item.responseStatus || "Pending";
    document.getElementById('editNotes').value = item.notes || "";
    document.getElementById('editModificationNote').value = item.modificationNote || "";

    window.toggleEditModField();
    document.getElementById('view-edit-modal').classList.remove('hidden');
};

window.closeEditModal = () => {
    document.getElementById('view-edit-modal').classList.add('hidden');
    document.getElementById('editForm').reset();
};

window.toggleEditModField = () => {
    const isMod = document.getElementById('editResponseStatus').value === 'Modified';
    document.getElementById('editModField').classList.toggle('hidden', !isMod);
};

document.getElementById('editSubmitBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    if (!id) return;

    const updatedData = {
        patientId: document.getElementById('editPatientId').value,
        ward: document.getElementById('editWard').value,
        urgency: document.getElementById('editUrgency').value,
        issue: document.getElementById('editIssue').value,
        intervention: document.getElementById('editIntervention').value,
        responseStatus: document.getElementById('editResponseStatus').value,
        notes: document.getElementById('editNotes').value || "",
        modificationNote: document.getElementById('editResponseStatus').value === 'Modified' ? document.getElementById('editModificationNote').value : ""
    };

    try {
        await updateDoc(doc(db, "interventions", id), updatedData);
        window.closeEditModal();
    } catch (err) { alert("Failed to update: " + err.message); }
});

// --- 7. HIGH-FIDELITY PRINT & HOME CONTROLS ---
const sharedPrintStyle = `
    <style>
        body { font-family: sans-serif; padding: 40px; margin-bottom: 80px; }
        .header { border-bottom: 4px solid #2563eb; padding-bottom: 20px; }
        .counsel-header { border-bottom: 4px solid #10b981; padding-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th { text-align: left; background: #f8fafc; padding: 12px; font-size: 10px; color: #64748b; text-transform: uppercase; }
        .home-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1e293b; padding: 12px 24px; border-radius: 50px; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); z-index: 9999; }
        .home-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 8px; cursor: pointer; }
        .home-text { color: #94a3b8; font-family: sans-serif; font-size: 11px; font-weight: 500; }
        @media print { .no-print { display: none !important; } }
    </style>
`;

window.exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const rows = allInterventions.map(item => `<tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;"><td style="padding: 12px; vertical-align: top;">${item.timestamp?.toLocaleDateString('en-GB') || ''}<br>ID: ${item.patientId}</td><td style="padding: 12px; vertical-align: top;">${item.ward}</td><td style="padding: 12px; vertical-align: top;"><b>${item.intervention}</b><br>Issue: ${item.issue}</td><td style="padding: 12px; vertical-align: top;">${item.responseStatus}</td></tr>`).join('');
    
    printWindow.document.write(`
        <html>
            <head>${sharedPrintStyle}</head>
            <body>
                <div class="header">
                    <h1 style="color:#2563eb; margin:0;">RxIntervene Audit</h1>
                    <p>UCC Hospital Clinical Pharmacy</p>
                </div>
                <table>
                    <thead><tr><th>Date & ID</th><th>Ward</th><th>Clinical Details</th><th>Status</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="home-bar no-print">
                    <span class="home-text">Reviewing Print Layout</span>
                    <button class="home-btn" onclick="window.close()">🏠 Return to App</button>
                </div>
            </body>
        </html>`);
    printWindow.document.close();
};

window.exportCounselingToPDF = async () => {
    const snap = await getDocs(query(collection(db, "counseling"), orderBy("createdAt", "desc")));
    const printWindow = window.open('', '_blank');
    let rows = ""; 
    snap.forEach(d => { 
        const v = d.data(); 
        const ds = v.createdAt?.toDate() ? v.createdAt.toDate().toLocaleDateString('en-GB') : '';
        rows += `<tr style="border-bottom:1px solid #e2e8f0; font-size:11px;"><td style="padding:12px; vertical-align:top;">${ds}<br>ID: ${v.patientId}</td><td style="padding:12px; vertical-align:top;"><b>Drugs: ${v.drugs}</b><br>Notes: ${v.notes}</td></tr>`; 
    });
    
    printWindow.document.write(`
        <html>
            <head>${sharedPrintStyle}</head>
            <body>
                <div class="counsel-header">
                    <h1 style="color:#10b981; margin:0;">Counseling Audit</h1>
                    <p>UCC Hospital Clinical Pharmacy</p>
                </div>
                <table>
                    <thead><tr><th>Date & ID</th><th>Counseling Details</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="home-bar no-print">
                    <span class="home-text">Reviewing Print Layout</span>
                    <button class="home-btn" style="background:#10b981;" onclick="window.close()">🏠 Return to App</button>
                </div>
            </body>
        </html>`);
    printWindow.document.close();
};

// --- 8. DYNAMIC ANALYTICS SYSTEM ---
window.updateAllCharts = () => {
    const mon = document.getElementById('monthFilter').value;
    const activeDataset = allInterventions.filter(i => i.ward !== 'Counseling');
    let filtered = (mon === 'all') ? activeDataset : activeDataset.filter(i => i.timestamp && i.timestamp.getMonth() === parseInt(mon));
    
    const wardData = {}, outcomeData = { Accepted: 0, Rejected: 0, Modified: 0, Pending: 0 }, weekCounts = [0, 0, 0, 0, 0];
    
    filtered.forEach(i => { 
        wardData[i.ward] = (wardData[i.ward] || 0) + 1; 
        if (outcomeData.hasOwnProperty(i.responseStatus)) outcomeData[i.responseStatus]++; 
        if (i.timestamp) weekCounts[Math.min(Math.floor((i.timestamp.getDate() - 1) / 7), 4)]++; 
    });
    
    document.getElementById('stat-total').innerText = filtered.length;
    document.getElementById('stat-rate').innerText = filtered.length > 0 ? Math.round((outcomeData.Accepted / filtered.length) * 100) + "%" : "0%";
    
    renderChart('wardChart', 'doughnut', Object.keys(wardData), Object.values(wardData));
    renderChart('responseChart', 'bar', ['Acc', 'Rej', 'Mod', 'Pen'], [outcomeData.Accepted, outcomeData.Rejected, outcomeData.Modified, outcomeData.Pending]);
    renderChart('trendChart', 'line', ['W1', 'W2', 'W3', 'W4', 'W5'], weekCounts);
};

function renderChart(id, type, labels, data) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (id === 'wardChart' && wardChart) { wardChart.destroy(); }
    else if (id === 'responseChart' && responseChart) { responseChart.destroy(); }
    else if (id === 'trendChart' && trendChart) { trendChart.destroy(); }

    const nc = new Chart(ctx, { 
        type, 
        data: { 
            labels, 
            datasets: [{ 
                data, 
                backgroundColor: id === 'responseChart' ? ['#22c55e', '#ef4444', '#f59e0b', '#94a3b8'] : ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bae6fd'], 
                tension: 0.4 
            }] 
        }, 
        options: { 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }, 
            scales: { y: { display: false }, x: { grid: { display: false }, ticks: { font: { size: 8 } } } } 
        } 
    });

    if (id === 'wardChart') wardChart = nc;
    else if (id === 'responseChart') responseChart = nc;
    else if (id === 'trendChart') trendChart = nc;
}

document.addEventListener('keyup', (e) => { if (e.target.id === 'issue') document.getElementById('ai-trigger').classList.toggle('hidden', e.target.value.length < 5); });
