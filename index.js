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

let allInterventions = [];
let wardChart = null, trendChart = null, responseChart = null;
let unsubscribeSnapshot = null;

// --- 2. AUTHENTICATION & USER NAMING ---
// --- 2. AUTHENTICATION & USER NAMING ---
onAuthStateChanged(auth, (user) => {
    const authView = document.getElementById('view-auth');
    const nameDisplay = document.getElementById('display-user-name');
    const emailDisplay = document.getElementById('display-user-email');
    const avatarDisplay = document.querySelector('#view-setup .w-14');

    if (user) {
        authView.classList.add('hidden');
        emailDisplay.innerText = user.email;

        // Dynamic Name Mapping
        let displayName = "Hello Boss";
        let initials = "BOSS";

        // Correct email checks within the `if (user)` block
        if (user.email === "stephen.jalley@ucc.edu.gh") {
            displayName = "Dr. Stephen Jalley";
            initials = "SJ";
        } else if (user.email === "sammieamoako@gmail.com") {
            displayName = "Dr. Samuel Amoako";
            initials = "SA";
        } else if (user.email === "torihammond68@gmail.com") {
            displayName = "Dr. Victoria Hammond";
            initials = "VH";
        } else if (user.email === "adelaide-ampofo-asiama@ucc.edu.gh") {
            displayName = "Dr. Adelaide Ampofo-Asiama";
            initials = "BOSS";
        }

        if (nameDisplay) nameDisplay.innerText = displayName;
        if (avatarDisplay) avatarDisplay.innerText = initials;

        // Initialize app only when the user is authenticated
        initApp();
    } else {
        // Show the auth view and stop any snapshot listener if the user is logged out
        authView.classList.remove('hidden');
        if (unsubscribeSnapshot) unsubscribeSnapshot();
    }
});

// Authentication handling functions
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
    } catch (err) {
        alert(err.message);
    }
};

window.handleLogout = () => {
    if (confirm("Sign out of RxIntervene?")) signOut(auth);
};

window.handleResetPassword = async () => {
    const email = document.getElementById('authEmail').value;
    if (!email) return alert("Enter your email address first.");
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent!");
    } catch (err) {
        alert(err.message);
    }
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
    document.querySelectorAll('.bg-blue-600, .text-blue-600, #display-user-name, #display-user-email').forEach(el => {
        if (el.classList.contains('bg-blue-600') || el.tagName === 'BUTTON') {
            el.style.backgroundColor = themeMap[color];
        } else {
            el.style.color = themeMap[color];
        }
    });
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
        userId: auth.currentUser.uid,
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

// --- 5. SYNC, RENDER & ANALYTICS ---
const initApp = () => {
    const q = query(collection(db, "interventions"), orderBy("createdAt", "desc"));
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        allInterventions = [];
        snapshot.forEach(docSnap => {
            const item = docSnap.data();
            allInterventions.push({ ...item, timestamp: item.createdAt?.toDate(), id: docSnap.id });
        });
        window.renderHomeList();
        window.updateAllCharts();
    });
};

window.renderHomeList = () => {
    const filter = document.getElementById('homeFilter').value;
    const homeList = document.getElementById('intervention-list');
    const followupListToday = document.getElementById('followup-list-today');
    
    homeList.innerHTML = "";
    followupListToday.innerHTML = "";

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    allInterventions.forEach(item => {
        let showOnHome = true;
        const itemDate = item.timestamp; 

        // --- TIMELINE & STATUS FILTERING LOGIC ---
        if (filter === 'thisMonth') {
            // Check if the item belongs to the current month and year
            if (!itemDate || itemDate.getMonth() !== currentMonth || itemDate.getFullYear() !== currentYear) {
                showOnHome = false;
            }
        } 
        else if (filter === 'thisYear') {
            // Check if the item belongs to the current year
            if (!itemDate || itemDate.getFullYear() !== currentYear) {
                showOnHome = false;
            }
        }
        else if (filter === 'followUp') {
            if (!item.followUp) showOnHome = false;
        } 
        else if (filter !== 'all') {
            // Standard Status Filtering (Pending, Accepted, etc.)
            if (item.responseStatus !== filter) showOnHome = false;
        }

        if (showOnHome) {
            const colors = { 
                'Accepted': 'bg-green-100 text-green-700', 
                'Pending': 'bg-slate-100 text-slate-400', 
                'Rejected': 'bg-red-100 text-red-700', 
                'Modified': 'bg-yellow-100 text-yellow-700' 
            };
            const dateStr = itemDate?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) || "Just now";

            homeList.innerHTML += `
                <div class="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm mb-3">
                    <div class="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                        <span>${dateStr} • ${item.patientId} • ${item.ward}</span>
                        <span class="text-blue-600">${item.urgency}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 text-sm mb-1 line-clamp-2">${item.intervention}</h3>
                    <p class="text-[10px] text-slate-500 italic">Issue: ${item.issue}</p>
                    <div class="flex justify-between items-center pt-3 mt-3 border-t border-slate-50">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${colors[item.responseStatus]}">${item.responseStatus}</span>
                    </div>
                </div>`;
        }

        // --- ALWAYS MAINTAIN THE FOLLOW-UP TAB DATA ---
        if (item.followUp) {
            followupListToday.innerHTML += `
                <div class="bg-white p-5 rounded-3xl border-l-4 border-blue-500 shadow-sm mb-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-black text-slate-400 uppercase">${item.patientId} • ${item.ward}</span>
                    </div>
                    <p class="text-sm font-bold text-slate-700 mb-4">${item.intervention}</p>
                    <button onclick="completeFollowUp('${item.id}')" class="w-full py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-blue-700 theme-transition">✔ Mark Done</button>
                </div>`;
        }
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

// --- 6. EXPORT FUNCTION ---
window.exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString('en-GB');
    const generatedBy = document.getElementById('display-user-name').innerText;
    const timeline = document.getElementById('monthFilter').value;
    const appUrl = window.location.href; // Captures current URL for home button
    
    const now = new Date();
    let filteredData = allInterventions;
    let reportPeriod = "All Time History";

    if (timeline === 'current') {
        filteredData = allInterventions.filter(i => i.timestamp && i.timestamp.getMonth() === now.getMonth() && i.timestamp.getFullYear() === now.getFullYear());
        reportPeriod = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    } else if (timeline === 'year') {
        filteredData = allInterventions.filter(i => i.timestamp && i.timestamp.getFullYear() === now.getFullYear());
        reportPeriod = `Annual Report ${now.getFullYear()}`;
    }

    const rows = filteredData.map(item => {
        let extraInfo = "";
        if (item.modificationNote) extraInfo += `<div><strong>Modifications:</strong> ${item.modificationNote}</div>`;
        if (item.notes) extraInfo += `<div><strong>Clinical Notes:</strong> ${item.notes}</div>`;
        
        return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 12px; vertical-align: top; text-align: center; color: #cbd5e1;">
                <span style="font-size: 16px;">🏠</span>
            </td>
            <td style="padding: 12px; vertical-align: top;">
                <div style="font-weight: 700;">${item.timestamp?.toLocaleDateString('en-GB') || 'Just Now'}</div>
                <div style="color: #64748b; font-size: 10px;">ID: ${item.patientId}</div>
            </td>
            <td style="padding: 12px; vertical-align: top; font-weight: 600; color: #475569;">${item.ward}</td>
            <td style="padding: 12px; vertical-align: top;">
                <div style="font-weight: bold; color: #1e293b; font-size: 12px;">${item.intervention}</div>
                <div style="color: #64748b; margin-top: 2px;">Issue: ${item.issue}</div>
                <div style="background: #f8fafc; padding: 8px; border-radius: 8px; border-left: 3px solid #e2e8f0; margin-top: 8px; font-size: 10px; color: #475569;">
                    ${extraInfo || "No additional notes recorded."}
                </div>
            </td>
            <td style="padding: 12px; vertical-align: top;">
                <span style="font-weight: 800; font-size: 9px; text-transform: uppercase; padding: 4px 8px; background: #f1f5f9; border-radius: 4px; display: inline-block;">
                    ${item.responseStatus}
                </span>
            </td>
        </tr>`;
    }).join('');

    const html = `
    <html>
    <head>
        <title>RxIntervene Audit</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; }
            .no-print { margin-bottom: 20px; display: flex; justify-content: flex-end; }
            .home-btn { 
                text-decoration: none; 
                background: #2563eb; 
                color: white; 
                padding: 10px 20px; 
                border-radius: 12px; 
                font-size: 12px; 
                font-weight: 800; 
                display: flex; 
                align-items: center; 
                gap: 8px;
            }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #2563eb; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { text-align: left; background: #f8fafc; padding: 12px; font-size: 10px; color: #64748b; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
            @media print { .no-print { display: none; } }
        </style>
    </head>
    <body>
        <div class="no-print">
            <a href="${appUrl}" class="home-btn">🏠 Return to RxIntervene App</a>
        </div>
        <div class="header">
            <div>
                <h1 style="color:#2563eb; margin:0; font-size:26px; font-weight: 800;">RxIntervene Audit</h1>
                <p style="margin:0; font-weight:700; color:#64748b; text-transform:uppercase; font-size:11px;">UCC Hospital Clinical Pharmacy</p>
            </div>
            <div style="text-align: right; font-size: 11px; line-height: 1.6;">
                <strong>Period:</strong> ${reportPeriod}<br>
                <strong>Generated By:</strong> ${generatedBy}<br>
                <strong>Date:</strong> ${today}
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width:5%"></th>
                    <th style="width:15%">Date & ID</th>
                    <th style="width:12%">Ward</th>
                    <th style="width:53%">Clinical Details & Notes</th>
                    <th style="width:15%">Status</th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:20px;">No records found.</td></tr>'}</tbody>
        </table>
    </body>
    </html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
};

// --- 7. PWA & INSTALLATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW failed:', err));
    });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

window.installApp = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
    } else {
        alert("To install: Tap 'Share' and select 'Add to Home Screen'");
    }
};
