import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, 
    query, orderBy, onSnapshot, getDocs, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    onAuthStateChanged, signOut, sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// AI CONFIGURATION
const API_KEY = "AIzaSyANCStxyHo879glhuzYTzvazrB-64JUZkY";
const genAI = new GoogleGenerativeAI(API_KEY);
const aiModel = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite-preview",
    safetySettings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }]
});

let allInterventions = [];
let wardChart = null, trendChart = null, responseChart = null;
let unsubscribeSnapshot = null;
let lastAiAdvice = "";

// --- 2. AUTHENTICATION & USER NAMING ---
onAuthStateChanged(auth, (user) => {
    const authView = document.getElementById('view-auth');
    const nameDisplay = document.getElementById('display-user-name');
    const emailDisplay = document.getElementById('display-user-email');
    const avatarDisplay = document.querySelector('.avatar-box');

    if (user) {
        if (authView) authView.classList.add('hidden');
        if (emailDisplay) emailDisplay.innerText = user.email;

        let displayName = "Hello Boss";
        let initials = "BOSS";

        if (user.email === "stephen.jalley@ucc.edu.gh") { displayName = "Dr. Stephen Jalley"; initials = "SJ"; }
        else if (user.email === "sammieamoako@gmail.com") { displayName = "Dr. Samuel Amoako"; initials = "SA"; }
        else if (user.email === "torihammond68@gmail.com") { displayName = "Dr. Victoria Hammond"; initials = "VH"; }
        else if (user.email === "adelaide-ampofo-asiama@ucc.edu.gh") { displayName = "Dr. Adelaide Ampofo-Asiama"; initials = "BOSS"; }

        if (nameDisplay) nameDisplay.innerText = displayName;
        if (avatarDisplay) avatarDisplay.innerText = initials;

        initApp();
    } else {
        if (authView) authView.classList.remove('hidden');
        if (unsubscribeSnapshot) unsubscribeSnapshot();
    }
});

window.handleAuth = async (type) => {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return alert("Please enter email and password");
    try {
        if (type === 'login') await signInWithEmailAndPassword(auth, email, password);
        else { await createUserWithEmailAndPassword(auth, email, password); alert("Account created!"); }
    } catch (err) { alert(err.message); }
};

window.handleLogout = () => { if (confirm("Sign out of RxIntervene?")) signOut(auth); };

window.handleResetPassword = async () => {
    const email = document.getElementById('authEmail').value;
    if (!email) return alert("Enter email first.");
    try { await sendPasswordResetEmail(auth, email); alert("Reset email sent!"); }
    catch (err) { alert(err.message); }
};

// --- 3. HIGH-FIDELITY RAG & AI ---
async function getBnfContext(issueText) {
    try {
        const input = issueText.toLowerCase().trim();
        const words = input.split(/\W+/).filter(w => w.length > 3);
        if (words.length === 0) return "";
        const targetDrug = words.sort((a, b) => b.length - a.length)[0];

        const q = query(collection(db, "clinical_knowledge"), orderBy("chunk_index"), limit(5000));
        const snapshot = await getDocs(q);
        let allDocs = [];
        snapshot.forEach(doc => allDocs.push(doc.data()));

        const startIndex = allDocs.findIndex(d => (d.text || "").toLowerCase().includes(targetDrug));
        if (startIndex === -1) return "";

        return allDocs.slice(startIndex, startIndex + 15).map(p => p.text).join("\n---\n");
    } catch (e) { console.error(e); return ""; }
}

window.invokeAiAssistant = async () => {
    const issueInput = document.getElementById('issue');
    const panel = document.getElementById('ai-panel');
    const panelText = document.getElementById('ai-suggestion-text');

    panel.classList.remove('hidden');
    panelText.innerHTML = "Reconstructing monograph...";

    try {
        const context = await getBnfContext(issueInput.value);
        const prompt = `ROLE: BNF Mirror. CONTEXT: ${context}. Extract full monograph for ${issueInput.value}. USE 'l' for headers and '▶' for routes. NO SUMMARIZATION.`;
        
        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        lastAiAdvice = response.text().trim();
        
        panelText.innerHTML = lastAiAdvice.replace(/\n/g, '<br>')
            .replace(/l (INDICATIONS|DOSE|CAUTIONS|INTERACTIONS|SIDE-EFFECTS|PREGNANCY|HEPATIC|RENAL|MONITORING|DRUG ACTION)/g, '<br><b class="text-blue-700">l $1</b>')
            .replace(/▶/g, '<span class="text-blue-600 font-bold">▶</span>');
    } catch (err) { panelText.innerText = "Error extracting data."; }
};

window.applyAiSuggestion = () => {
    document.getElementById('intervention').value = lastAiAdvice;
    document.getElementById('ai-panel').classList.add('hidden');
};

const checkIssueForAi = () => {
    const text = document.getElementById('issue').value.toLowerCase();
    const sparkle = document.getElementById('ai-trigger');
    const triggers = ['mg', 'dose', 'renal', 'pregnancy', 'caution'];
    if (text.length > 5 && triggers.some(t => text.includes(t))) sparkle.classList.remove('hidden');
    else sparkle.classList.add('hidden');
};

// --- 4. NAVIGATION & UI ---
window.showView = (viewName) => {
    ['home', 'analytics', 'form', 'followup', 'setup'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });
    document.getElementById(`view-${viewName}`)?.classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('text-blue-600'); btn.classList.add('text-slate-300');
    });
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) activeBtn.classList.replace('text-slate-300', 'text-blue-600');
};

window.toggleModField = () => {
    const status = document.getElementById('responseStatus').value;
    document.getElementById('modField').classList.toggle('hidden', status !== 'Modified');
};

window.changeTheme = (color) => {
    const themeMap = { 'blue': '#2563eb', 'emerald': '#10b981', 'indigo': '#4f46e5', 'slate': '#1e293b' };
    document.querySelectorAll('.bg-blue-600, .text-blue-600, #display-user-name, #display-user-email, .avatar-box').forEach(el => {
        if (el.classList.contains('bg-blue-600') || el.tagName === 'BUTTON') el.style.backgroundColor = themeMap[color];
        else el.style.color = themeMap[color];
    });
};

// --- 5. COUNSELING NOTES LOGIC ---
window.toggleCounselingForm = (show) => {
    document.getElementById('view-counseling').classList.toggle('hidden', !show);
};

document.getElementById('counselingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('counselingSubmitBtn');
    btn.disabled = true; btn.innerText = "...";

    const data = {
        patientId: document.getElementById('counselPatientId').value,
        drugs: document.getElementById('counselDrugs').value,
        notes: document.getElementById('counselNotes').value,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "counseling"), data);
        await addDoc(collection(db, "interventions"), {
            patientId: data.patientId, ward: "Counseling", urgency: "Normal",
            issue: "Patient Counseling", intervention: `Counseling: ${data.drugs}`,
            responseStatus: "Accepted", userId: auth.currentUser.uid, createdAt: serverTimestamp()
        });
        e.target.reset(); window.toggleCounselingForm(false); alert("Saved!");
    } catch (err) { alert("Error saving."); }
    finally { btn.disabled = false; btn.innerText = "Save"; }
});

// --- 6. DATA ACTIONS & SYNC ---
window.completeFollowUp = async (id) => {
    try { await updateDoc(doc(db, "interventions", id), { followUp: false, completedAt: serverTimestamp() }); }
    catch (err) { console.error(err); }
};

document.getElementById('interventionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.innerText = "...";
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
    try { await addDoc(collection(db, "interventions"), data); e.target.reset(); window.showView('home'); }
    catch (err) { console.error(err); }
    finally { btn.disabled = false; btn.innerText = "Save"; }
});

const initApp = () => {
    const q = query(collection(db, "interventions"), orderBy("createdAt", "desc"));
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        allInterventions = [];
        snapshot.forEach(docSnap => {
            const item = docSnap.data();
            allInterventions.push({ ...item, timestamp: item.createdAt?.toDate(), id: docSnap.id });
        });
        window.renderHomeList(); window.updateAllCharts();
    });
};

window.renderHomeList = () => {
    const filter = document.getElementById('homeFilter').value;
    const homeList = document.getElementById('intervention-list');
    const followupList = document.getElementById('followup-list-today');
    homeList.innerHTML = ""; followupList.innerHTML = "";

    allInterventions.forEach(item => {
        let show = true;
        if (filter === 'followUp' && !item.followUp) show = false;
        else if (filter !== 'all' && filter !== 'followUp' && item.responseStatus !== filter) show = false;

        if (show) {
            const colors = { 'Accepted': 'bg-green-100 text-green-700', 'Pending': 'bg-slate-100 text-slate-400', 'Rejected': 'bg-red-100 text-red-700', 'Modified': 'bg-yellow-100 text-yellow-700' };
            homeList.innerHTML += `<div class="bg-white p-5 rounded-[2rem] border border-slate-200 mb-3 shadow-sm">
                <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2"><span>${item.timestamp?.toLocaleDateString('en-GB') || 'Now'} • ${item.patientId}</span><span class="text-blue-600">${item.urgency}</span></div>
                <h3 class="font-bold text-slate-800 text-sm mb-1 line-clamp-2">${item.intervention}</h3>
                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${colors[item.responseStatus]}">${item.responseStatus}</span>
            </div>`;
        }
        if (item.followUp) {
            followupList.innerHTML += `<div class="bg-white p-5 rounded-3xl border-l-4 border-blue-500 mb-3 shadow-sm">
                <p class="text-sm font-bold text-slate-700 mb-4">${item.intervention}</p>
                <button onclick="completeFollowUp('${item.id}')" class="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase">Mark Done</button>
            </div>`;
        }
    });
};

// ANALYTICS & CHARTS
window.updateAllCharts = () => {
    const selectedMonth = document.getElementById('monthFilter').value;
    let filtered = allInterventions;
    if (selectedMonth !== 'all') filtered = allInterventions.filter(item => item.timestamp && item.timestamp.getMonth() === parseInt(selectedMonth));

    const wardData = {}; const outcomeData = { Accepted: 0, Rejected: 0, Modified: 0, Pending: 0 };
    filtered.forEach(item => {
        wardData[item.ward] = (wardData[item.ward] || 0) + 1;
        if (outcomeData.hasOwnProperty(item.responseStatus)) outcomeData[item.responseStatus]++;
    });

    document.getElementById('stat-total').innerText = filtered.length;
    document.getElementById('stat-rate').innerText = filtered.length > 0 ? Math.round((outcomeData.Accepted / filtered.length) * 100) + "%" : "0%";

    renderChart('wardChart', 'doughnut', Object.keys(wardData), Object.values(wardData));
    renderChart('responseChart', 'bar', ['Acc', 'Rej', 'Mod', 'Pen'], [outcomeData.Accepted, outcomeData.Rejected, outcomeData.Modified, outcomeData.Pending]);
};

function renderChart(id, type, labels, data) {
    const ctx = document.getElementById(id).getContext('2d');
    const newChart = new Chart(ctx, {
        type: type,
        data: { labels: labels, datasets: [{ data: data, backgroundColor: id === 'responseChart' ? ['#22c55e', '#ef4444', '#f59e0b', '#94a3b8'] : ['#2563eb', '#3b82f6'] }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    if (id === 'wardChart' && wardChart) wardChart.destroy(); wardChart = newChart;
    if (id === 'responseChart' && responseChart) responseChart.destroy(); responseChart = newChart;
}

// EXPORT TO PDF
window.exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const rows = allInterventions.map(item => `<tr><td>${item.patientId}</td><td>${item.ward}</td><td>${item.intervention}</td><td>${item.responseStatus}</td></tr>`).join('');
    printWindow.document.write(`<html><body><h1>RxIntervene Report</h1><table border="1"><thead><tr><th>ID</th><th>Ward</th><th>Intervention</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close(); printWindow.print();
};

document.addEventListener('keyup', (e) => { if (e.target.id === 'issue') checkIssueForAi(); });
