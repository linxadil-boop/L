// DONNÉES D'ÉTAT DU SYSTÈME
const STATE = {
    operator: 'Hassan El Raoui',
    pin: '0101',
    nbPP: 0,
    nbPE: 0,
    dechet: 0,
    rolls: [],
    history: [],
    viewMode: 'tablet' // 'tablet' ou 'pc'
};

// INITIALISATION DU SYSTÈME
document.addEventListener("DOMContentLoaded", () => {
    // Initialiser la date d'aujourd'hui
    const today = new Date();
    const formattedDate = today.toLocaleDateString('fr-FR');
    document.getElementById('dispCurrentDate').innerText = formattedDate;

    // Charger les données sauvegardées du localStorage si elles existent
    loadSavedData();
    renderRolls();
    updateTotals();
    syncToPCView();

    // Écouter les changements en direct (Synchronisation inter-onglets Tablette <-> PC)
    window.addEventListener('storage', (e) => {
        if (e.key === 'MULTIPLAST_PROD_DATA') {
            loadSavedData();
            renderRolls();
            updateTotals();
            syncToPCView();
        }
    });
});

// GESTION DE LA NAVIGATION ET DES ÉCRANS
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active-screen');
        s.style.display = 'none'; // Assure le masquage complet
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active-screen');
        targetScreen.style.display = 'block'; // Affiche l'écran cible
    }
}

function toggleViewMode() {
    const btn = document.getElementById('viewToggleBtn');
    if (STATE.viewMode === 'tablet') {
        STATE.viewMode = 'pc';
        btn.innerHTML = '<i class="fa-solid fa-tablet-screen-button"></i> Mode Tablette';
        showScreen('pcScreen');
        syncToPCView();
    } else {
        STATE.viewMode = 'tablet';
        btn.innerHTML = '<i class="fa-solid fa-desktop"></i> Mode PC / Suivi en direct';
        showScreen('appScreen');
    }
}

// LOGIQUE DU CLAVIER DE CONNEXION (PIN)
let currentPin = '';

function openKeypad(type) {
    document.getElementById('numKeypadLogin').classList.remove('hidden');
}

function typeKeypad(val) {
    const pinField = document.getElementById('pinInput');
    if (val === 'clear') {
        currentPin = '';
    } else if (val === 'backspace') {
        currentPin = currentPin.slice(0, -1);
    } else {
        if (currentPin.length < 6) {
            currentPin += val;
        }
    }
    pinField.value = currentPin;
}

// CORRECTION FAUTE 1 : Masquage parfait du login et ouverture de l'application
function attemptLogin() {
    if (currentPin === STATE.pin) {
        currentPin = '';
        document.getElementById('pinInput').value = '';
        document.getElementById('numKeypadLogin').classList.add('hidden');
        
        // Cacher explicitement l'écran de connexion et afficher l'application
        showScreen('appScreen');
    } else {
        alert('Code PIN Incorrect ! (Code par défaut: 0101)');
        currentPin = '';
        document.getElementById('pinInput').value = '';
    }
}

function logout() {
    showScreen('loginScreen');
}

// CLAVIER NUMÉRIQUE EN MODAL (PP, PE, DÉCHET, MÉTRAGE)
let activeTarget = null;
let modalValue = '0';

function openEditModal(target) {
    activeTarget = target;
    if (target === 'pp') {
        document.getElementById('modalTitle').innerText = 'Nombre de Sac (PP)';
        modalValue = STATE.nbPP.toString();
    } else if (target === 'pe') {
        document.getElementById('modalTitle').innerText = 'Nombre de Sac (PE)';
        modalValue = STATE.nbPE.toString();
    } else if (target === 'dechet') {
        document.getElementById('modalTitle').innerText = 'Déchet en Kg';
        modalValue = STATE.dechet.toString();
    } else if (target === 'metrage') {
        document.getElementById('modalTitle').innerText = 'Saisir le Métrage (m)';
        modalValue = '0';
    }

    document.getElementById('modalInputDisplay').innerText = modalValue;
    document.getElementById('valueModal').classList.remove('hidden');
}

function modalType(key) {
    if (key === 'clear') {
        modalValue = '0';
    } else if (key === 'back') {
        modalValue = modalValue.length > 1 ? modalValue.slice(0, -1) : '0';
    } else {
        if (modalValue === '0') modalValue = key;
        else modalValue += key;
    }
    document.getElementById('modalInputDisplay').innerText = modalValue;
}

function closeValueModal() {
    document.getElementById('valueModal').classList.add('hidden');
}

function confirmValueModal() {
    const val = parseInt(modalValue, 10) || 0;
    if (activeTarget === 'pp') {
        STATE.nbPP = val;
        document.getElementById('valPP').innerText = val;
    } else if (activeTarget === 'pe') {
        STATE.nbPE = val;
        document.getElementById('valPE').innerText = val;
    } else if (activeTarget === 'dechet') {
        STATE.dechet = val;
        document.getElementById('valDechet').innerText = val;
    } else if (activeTarget === 'metrage') {
        tempMetrage = val;
        closeValueModal();
        openTextModal('rollName');
        return;
    }
    closeValueModal();
    persistData();
}

// CLAVIER AZERTY EN MODAL (SAISIE DU NOM DU PRODUIT OU OPERATEUR)
let textTarget = null;
let textValue = '';
let tempMetrage = 0;

function openTextModal(target) {
    textTarget = target;
    textValue = '';
    if (target === 'rollName') {
        document.getElementById('textModalTitle').innerText = 'Saisir le Nom du Rouleau / Produit';
    } else if (target === 'operator') {
        document.getElementById('textModalTitle').innerText = "Changer le Nom de l'Opérateur";
        textValue = STATE.operator;
    }
    document.getElementById('textInputDisplay').value = textValue;
    document.getElementById('textModal').classList.remove('hidden');
}

function azertyType(char) {
    if (char === 'back') {
        textValue = textValue.slice(0, -1);
    } else {
        textValue += char;
    }
    document.getElementById('textInputDisplay').value = textValue;
}

function closeTextModal() {
    document.getElementById('textModal').classList.add('hidden');
}

function confirmTextModal() {
    if (textTarget === 'rollName') {
        if (textValue.trim() === '') textValue = 'Rouleau Standard';
        
        const newRoll = {
            id: Date.now(),
            name: textValue,
            length: tempMetrage,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        
        STATE.rolls.push(newRoll);
        
        // Ajouter directement dans l'historique PC
        STATE.history.unshift({
            time: newRoll.time,
            operator: STATE.operator,
            product: newRoll.name,
            length: newRoll.length
        });

        renderRolls();
        updateTotals();
    } else if (textTarget === 'operator') {
        if (textValue.trim() !== '') {
            STATE.operator = textValue;
            document.getElementById('dispOperatorName').innerText = STATE.operator;
        }
    }
    closeTextModal();
    persistData();
}

function openAddRollModal() {
    openEditModal('metrage');
}

function deleteRoll(id) {
    STATE.rolls = STATE.rolls.filter(r => r.id !== id);
    renderRolls();
    updateTotals();
    persistData();
}

function renderRolls() {
    const tbody = document.getElementById('rollsTableBody');
    tbody.innerHTML = '';

    STATE.rolls.forEach((roll, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${roll.name}</strong></td>
            <td>${roll.length} m</td>
            <td>
                <button class="btn-delete" onclick="deleteRoll(${roll.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateTotals() {
    const totalRolls = STATE.rolls.length;
    const totalMetrage = STATE.rolls.reduce((sum, r) => sum + Number(r.length), 0);

    document.getElementById('totalRolls').innerText = totalRolls;
    document.getElementById('totalMetrage').innerText = totalMetrage;
}

// CORRECTION FAUTE 2 : Sauvegarde explicite et forçage de la synchronisation PC
function saveProduction() {
    persistData();
    alert('✅ Production enregistrée ! Les données sont directement visibles sur le moniteur PC.');
}

function persistData() {
    localStorage.setItem('MULTIPLAST_PROD_DATA', JSON.stringify(STATE));
    syncToPCView();
}

function loadSavedData() {
    const saved = localStorage.getItem('MULTIPLAST_PROD_DATA');
    if (saved) {
        const parsed = JSON.parse(saved);
        STATE.operator = parsed.operator || 'Hassan El Raoui';
        STATE.nbPP = parsed.nbPP || 0;
        STATE.nbPE = parsed.nbPE || 0;
        STATE.dechet = parsed.dechet || 0;
        STATE.rolls = parsed.rolls || [];
        STATE.history = parsed.history || [];

        document.getElementById('dispOperatorName').innerText = STATE.operator;
        document.getElementById('valPP').innerText = STATE.nbPP;
        document.getElementById('valPE').innerText = STATE.nbPE;
        document.getElementById('valDechet').innerText = STATE.dechet;
    }
}

// AFFICHAGE DES DONNÉES EN DIRECT SUR L'ÉCRAN PC
function syncToPCView() {
    document.getElementById('pcOperatorName').innerText = STATE.operator;
    document.getElementById('pcPP').innerText = STATE.nbPP;
    document.getElementById('pcPE').innerText = STATE.nbPE;
    document.getElementById('pcDechet').innerText = STATE.dechet + ' Kg';

    const pcTbody = document.getElementById('pcRollsTableBody');
    if (!pcTbody) return;
    
    pcTbody.innerHTML = '';

    STATE.history.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.time}</td>
            <td>${item.operator}</td>
            <td><strong>${item.product}</strong></td>
            <td>${item.length} m</td>
        `;
        pcTbody.appendChild(tr);
    });
}