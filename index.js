import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, onSnapshot, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDIQgRQm5GTUWKbPWmqc_c62mDAB6JETJs",
    authDomain: "rxintervene-f95ce.firebaseapp.com",
    projectId: "rxintervene-f95ce",
    storageBucket: "rxintervene-f95ce.firebasestorage.app",
    messagingSenderId: "785611599195",
    appId: "1:785611599195:web:712df71a19d8d71c22fe7e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const genAI = new GoogleGenerativeAI("AIzaSyANCStxyHo879glhuzYTzvazrB-64JUZkY");
const aiModel = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

let allInterventions = [];
let trendChart = null;
let lastAiAdvice = "";
let unsubscribeSnapshot = null;

// --- AUTHENTICATION (FIXED ERROR) ---
onAuthStateChanged(auth, (user) => {
    const authView = document.getElementById('view-auth');
    if (!authView) return; // Error Prevention

    if (user) {
        authView.classList.add('hidden');
        document.getElementById('display-user-email').innerText = user.email;
        initApp();
        showView('home');
    } else {
        authView.classList.remove('hidden');
        if (unsubscribeSnapshot) unsubscribeSnapshot();
    }
});

window.handleAuth = async (type) => {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    try {
        if (type === 'login') await signInWithEmailAndPassword(auth, email, password);
        else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { alert(err.message); }
};

window.handleLogout = () => { if (confirm("Sign out?")) signOut(auth); };

// --- COUNSELING LOGIC ---
window.toggleCounselingForm = (show) => {
    document.getElementById('view-counseling').classList.toggle('hidden', !show);
};

document.getElementById('counselingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('counselingSubmitBtn');
    btn.disabled = true;

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
        e.target.reset(); window.toggleCounselingForm(false);
    } catch (err) { alert("Error"); }
    finally { btn.disabled = false; }
});

// --- RAG LOGIC ---
async function getBnfContext(drug) {
    const q = query(collection(db, "clinical_knowledge"), orderBy("chunk_index"), limit(5000));
    const snap = await getDocs(q);
    let docs = []; snap.forEach(d => docs.push(d.data()));
    const start = docs.findIndex(d => d.text.toLowerCase().includes(drug.toLowerCase()));
    if (start === -1) return "";
    return docs.slice(start, start + 15).map(p => p.text).join("\n");
}

window.invokeAiAssistant = async () => {
    const issue = document.getElementById('issue').value;
    const panel = document.getElementById('ai-panel');
    const text = document.getElementById('ai-suggestion-text');
    panel.classList.remove('hidden'); text.innerText = "Processing...";
    
    try {
        const ctx = await getBnfContext(issue);
        const res = await aiModel.generateContent(`Reconstruct BNF monograph for ${issue} from context: ${ctx}. NO SUMMARY.`);
        lastAiAdvice = res.response.text();
        text.innerText = lastAiAdvice;
    } catch (e) { text.innerText = "Error"; }
};

window.applyAiSuggestion = () => {
    document.getElementById('intervention').value = lastAiAdvice;
    document.getElementById('ai-panel').classList.add('hidden');
};

// --- CORE UI ---
window.showView = (name) => {
    ['home','analytics','form','followup','setup'].forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
    document.getElementById(`view-${name}`).classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(b => b.classList.replace('text-blue-600', 'text-slate-300'));
    document.getElementById(`nav-${name}`)?.classList.replace('text-slate-300', 'text-blue-600');
};

const initApp = () => {
    const q = query(collection(db, "interventions"), orderBy("createdAt", "desc"));
    unsubscribeSnapshot = onSnapshot(q, (snap) => {
        allInterventions = [];
        snap.forEach(d => allInterventions.push({ ...d.data(), id: d.id, timestamp: d.data().createdAt?.toDate() }));
        window.renderHomeList();
    });
};

window.renderHomeList = () => {
    const list = document.getElementById('intervention-list');
    const fup = document.getElementById('followup-list-today');
    list.innerHTML = ""; fup.innerHTML = "";
    allInterventions.forEach(item => {
        list.innerHTML += `<div class="bg-white p-5 rounded-3xl border border-slate-200 mb-3 shadow-sm">
            <p class="text-[10px] font-black text-slate-400 uppercase">${item.patientId} • ${item.ward}</p>
            <h3 class="font-bold text-sm">${item.intervention}</h3>
        </div>`;
        if (item.followUp) {
            fup.innerHTML += `<div class="bg-white p-5 rounded-3xl border-l-4 border-blue-500 mb-3 shadow-sm">
                <p class="text-sm font-bold">${item.intervention}</p>
                <button onclick="window.completeFollowUp('${item.id}')" class="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase mt-2">Done</button>
            </div>`;
        }
    });
};

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
        followUp: document.getElementById('followUp').checked,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
    };
    await addDoc(collection(db, "interventions"), data);
    e.target.reset(); showView('home');
});

document.addEventListener('keyup', (e) => {
    if (e.target.id === 'issue') {
        document.getElementById('ai-trigger').classList.toggle('hidden', e.target.value.length < 5);
    }
});
