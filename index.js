import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, 
    query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    onAuthStateChanged, signOut, sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 1. INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBbssAjU1KVNGpON9f_pxKhWE19wqgLftU",
    authDomain: "rxintervene-ca50d.firebaseapp.com",
    projectId: "rxintervene-ca50d",
    storageBucket: "rxintervene-ca50d.firebasestorage.app",
    messagingSenderId: "412246526657",
    appId: "1:412246526657:web:70ca52ed95bc459392a240"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allInterventions = [];
let wardChart = null, trendChart = null, responseChart = null;
let unsubscribeSnapshot = null; // To clean up listeners on logout

// --- 2. AUTHENTICATION LOGIC ---

onAuthStateChanged(auth, (user) => {
    const authView = document.getElementById('view-auth');
    if (user) {
        authView.classList.add('hidden');
        document.getElementById('display-user-email').innerText = user.email;
        initApp(); // Start data sync
    } else {
        authView.classList.remove('hidden');
        if (unsubscribeSnapshot) unsubscribeSnapshot(); // Stop sync
    }
});

window.handleAuth = async (type) => {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    if (!email || !password) return alert("Please enter email and password");

    try {
        if (type === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Account created successfully!");
        }
    } catch (err) { alert(err.message); }
};

window.handleLogout = () => {
    if(confirm("Sign out of RxIntervene?")) signOut(auth);
};

window.handleResetPassword = async () => {
    const email = document.getElementById('authEmail').value;
    if (!email) return alert("Enter your email address first.");
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent!");
    } catch (err) { alert(err.message); }
};

// --- 3. NAVIGATION & UI ---

window.showView = (viewName) => {
    const views = ['home', 'analytics', 'form', 'followup', 'setup'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');
    
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-slate-300');
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
    document.querySelectorAll('.bg-blue-600, .text-blue-600').forEach(el => {
        el.classList.contains('bg-blue-600') ? el.style.backgroundColor = themeMap[color] : el.style.color = themeMap[color];
    });
};

window.exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const content = allInterventions.map(item => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; font-family: sans-serif;">
            <p style="font-size: 10px; color: #888;">${item.timestamp?.toLocaleDateString()} | ${item.patientId}</p>
            <p><strong>Ward:</strong> ${item.ward} | <strong>Status:</strong> ${item.responseStatus}</p>
            <p><strong>Issue:</strong> ${item.issue}</p>
            <p><strong>Intervention:</strong> ${item.intervention}</p>
        </div>`).join('');
    printWindow.document.write(`<html><body><h1 style="color:#2563eb;">Clinical Intervention Report</h1><p>UCC Hospital | ${new Date().toLocaleDateString()}</p><hr>${content}</body></html>`);
    printWindow.document.close();
    printWindow.print();
};

// --- 4. DATA ACTIONS ---

window.completeFollowUp = async (id) => {
    try {
        await updateDoc(doc(db, "interventions", id), { followUp: false, completedAt: serverTimestamp() });
    } catch (err) { console.error(err); }
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
        userId: auth.currentUser.uid, // Tagging data to the user
        createdAt: serverTimestamp()
    };
    try {
        await addDoc(collection(db, "interventions"), data);
        e.target.reset();
        window.toggleModField();
        window.showView('home');
    } catch (err) { console.error(err); }
    finally { btn.disabled = false; btn.innerText = "Save"; }
});

// --- 5. SYNC & ANALYTICS ---

const initApp = () => {
    const q = query(collection(db, "interventions"), orderBy("createdAt", "desc"));
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        allInterventions = [];
        const homeList = document.getElementById('intervention-list');
        const followupListToday = document.getElementById('followup-list-today');
        homeList.innerHTML = "";
        followupListToday.innerHTML = "";

        snapshot.forEach(docSnap => {
            const item = docSnap.data();
            const id = docSnap.id;
            const timestamp = item.createdAt?.toDate();
            allInterventions.push({ ...item, timestamp });

            const colors = { 'Accepted': 'bg-green-100 text-green-700', 'Pending': 'bg-slate-100 text-slate-400', 'Rejected': 'bg-red-100 text-red-700', 'Modified': 'bg-yellow-100 text-yellow-700' };
            const dateStr = timestamp?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) || "Just now";

            homeList.innerHTML += `
                <div class="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm mb-3">
                    <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                        <span>${dateStr} • ${item.patientId} • ${item.ward}</span>
                        <span class="text-blue-600">${item.urgency}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 text-sm mb-1">${item.intervention}</h3>
                    <p class="text-[10px] text-slate-500 italic">Issue: ${item.issue}</p>
                    <div class="flex justify-between items-center pt-3 mt-3 border-t border-slate-50">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${colors[item.responseStatus]}">${item.responseStatus}</span>
                    </div>
                </div>`;

            if (item.followUp) {
                followupListToday.innerHTML += `
                    <div class="bg-white p-5 rounded-3xl border-l-4 border-blue-500 shadow-sm mb-3">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-[10px] font-black text-slate-400 uppercase">${item.patientId} • ${item.ward}</span>
                        </div>
                        <p class="text-sm font-bold text-slate-700 mb-4">${item.intervention}</p>
                        <button onclick="completeFollowUp('${id}')" class="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-blue-700">✔ Mark Done</button>
                    </div>`;
            }
        });
        window.updateAllCharts();
    });
};

window.updateAllCharts = () => {
    const selectedMonth = document.getElementById('monthFilter').value;
    const now = new Date();
    const currentMonth = selectedMonth === 'all' ? now.getMonth() : parseInt(selectedMonth);

    let filtered = allInterventions;
    if (selectedMonth !== 'all') {
        filtered = allInterventions.filter(item => item.timestamp && item.timestamp.getMonth() === currentMonth);
    }

    const wardData = {};
    const outcomeData = { Accepted: 0, Rejected: 0, Modified: 0, Pending: 0 };
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[currentMonth];
    const weekLabels = [`${monthName} 1-7`, `${monthName} 8-14`, `${monthName} 15-21`, `${monthName} 22-28`, `${monthName} 29+` ];
    const weekCounts = [0, 0, 0, 0, 0];

    filtered.forEach(item => {
        wardData[item.ward] = (wardData[item.ward] || 0) + 1;
        if (outcomeData.hasOwnProperty(item.responseStatus)) outcomeData[item.responseStatus]++;
        if (item.timestamp) {
            const day = item.timestamp.getDate();
            const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
            weekCounts[weekIdx]++;
        }
    });

    document.getElementById('stat-total').innerText = filtered.length;
    const rate = filtered.length > 0 ? Math.round((outcomeData.Accepted / filtered.length) * 100) : 0;
    document.getElementById('stat-rate').innerText = rate + "%";

    renderChart('wardChart', 'doughnut', Object.keys(wardData), Object.values(wardData));
    renderChart('responseChart', 'bar', ['Acc', 'Rej', 'Mod', 'Pen'], [outcomeData.Accepted, outcomeData.Rejected, outcomeData.Modified, outcomeData.Pending]);
    renderChart('trendChart', 'line', weekLabels, weekCounts);
};

function renderChart(id, type, labels, data) {
    const ctx = document.getElementById(id).getContext('2d');
    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: id === 'responseChart' ? ['#22c55e', '#ef4444', '#f59e0b', '#94a3b8'] : ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bae6fd'],
                borderColor: '#2563eb',
                borderWidth: 0,
                fill: type === 'line',
                tension: 0.4
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { display: false }, x: { grid: { display: false }, ticks: { font: { size: 8 } } } }
        }
    };
    if (id === 'wardChart' && wardChart) wardChart.destroy();
    if (id === 'responseChart' && responseChart) responseChart.destroy();
    if (id === 'trendChart' && trendChart) trendChart.destroy();

    const newChart = new Chart(ctx, config);
    if (id === 'wardChart') wardChart = newChart;
    if (id === 'responseChart') responseChart = newChart;
    if (id === 'trendChart') trendChart = newChart;
}