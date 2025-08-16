// The Would Box - Core Logic

// Generate unique user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// App State with proper user isolation
let currentUser = {
    id: null,
    name: '',
    partnerName: '',
    pairingCode: null,
    partnerId: null,
    needs: [], // My needs from partner
    topThree: [], // Secret top 3 needs (triple points)
    woulds: [], // 5 things I would do from partner's needs
    priorities: [], // Ordered woulds with top 2 getting double points
    completedThisWeek: [],
    guessedThisWeek: [],
    score: 0,
    partnerScore: 0,
    lastDaily: null,
    todaysWould: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
});

// User Management
function loadUserData() {
    const userId = localStorage.getItem('wouldbox_userId');
    if (userId) {
        const userData = localStorage.getItem(`wouldbox_${userId}`);
        if (userData) {
            currentUser = JSON.parse(userData);
            if (currentUser.name) {
                showDashboard();
                updateNavigation(true);
            }
        }
    }
}

function saveUserData() {
    if (!currentUser.id) {
        currentUser.id = generateUserId();
        localStorage.setItem('wouldbox_userId', currentUser.id);
    }
    localStorage.setItem(`wouldbox_${currentUser.id}`, JSON.stringify(currentUser));
    
    // Save to shared space for partner access (in production, use server)
    if (currentUser.pairingCode) {
        localStorage.setItem(`wouldbox_shared_${currentUser.pairingCode}`, JSON.stringify({
            userId: currentUser.id,
            name: currentUser.name,
            needs: currentUser.needs.map(n => ({ text: n.text, id: n.id })), // Don't share top 3
            woulds: currentUser.woulds,
            completedThisWeek: currentUser.completedThisWeek
        }));
    }
}

// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
}

function updateNavigation(show) {
    document.querySelector('.bottom-nav').style.display = show ? 'flex' : 'none';
}

// Onboarding Flow
function startOnboarding() {
    showScreen('setup');
}

function loginExisting() {
    // In production, this would show a login screen
    const code = prompt('Enter your 4-digit code:');
    if (code && code.length === 4) {
        // Load existing user data
        alert('Login feature coming soon!');
    }
}

function createAccount() {
    const name = document.getElementById('userName').value.trim();
    const partnerName = document.getElementById('partnerName').value.trim();
    
    if (!name || !partnerName) {
        alert('Please enter both names');
        return;
    }
    
    currentUser.name = name;
    currentUser.partnerName = partnerName;
    currentUser.pairingCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    saveUserData();
    showNeedsList();
    updateNavigation(true);
}

// Needs Management
function showNeedsList() {
    showScreen('needsList');
    renderNeedsList();
    renderTopThreeSelector();
}

function addNeed() {
    const input = document.getElementById('newNeed');
    const text = input.value.trim();
    
    if (!text) return;
    
    const need = {
        id: Date.now(),
        text: text,
        isTopThree: false
    };
    
    currentUser.needs.push(need);
    input.value = '';
    
    renderNeedsList();
    renderTopThreeSelector();
    saveUserData();
}

function renderNeedsList() {
    const container = document.getElementById('needsListItems');
    container.innerHTML = currentUser.needs.map(need => `
        <li class="need-item ${currentUser.topThree.includes(need.id) ? 'top-three' : ''}">
            <span>${need.text}</span>
            <button onclick="removeNeed(${need.id})" style="background: none; border: none; color: #ff4444; cursor: pointer;">❌</button>
        </li>
    `).join('');
}

function renderTopThreeSelector() {
    const container = document.getElementById('topThreeList');
    container.innerHTML = currentUser.needs.map(need => `
        <label style="display: block; margin: 10px 0; cursor: pointer;">
            <input type="checkbox" 
                   value="${need.id}" 
                   ${currentUser.topThree.includes(need.id) ? 'checked' : ''}
                   onchange="toggleTopThree(${need.id})"
                   style="margin-right: 10px;">
            ${need.text}
        </label>
    `).join('');
}

function toggleTopThree(needId) {
    const index = currentUser.topThree.indexOf(needId);
    if (index > -1) {
        currentUser.topThree.splice(index, 1);
    } else {
        if (currentUser.topThree.length >= 3) {
            alert('You can only select 3 top needs');
            event.target.checked = false;
            return;
        }
        currentUser.topThree.push(needId);
    }
    renderNeedsList();
    saveUserData();
}

function removeNeed(needId) {
    currentUser.needs = currentUser.needs.filter(n => n.id !== needId);
    currentUser.topThree = currentUser.topThree.filter(id => id !== needId);
    renderNeedsList();
    renderTopThreeSelector();
    saveUserData();
}

function saveNeeds() {
    if (currentUser.needs.length < 5) {
        alert('Please add at least 5 needs before continuing');
        return;
    }
    
    saveUserData();
    showPairing();
}

// Pairing
function showPairing() {
    showScreen('pairing');
    document.getElementById('pairingCode').textContent = currentUser.pairingCode;
}

function copyCode() {
    navigator.clipboard.writeText(currentUser.pairingCode);
    alert('Code copied to clipboard!');
}

function connectPartner() {
    const code = document.getElementById('partnerCode').value;
    if (code.length !== 4) {
        alert('Please enter a 4-digit code');
        return;
    }
    
    // Get partner's shared data
    const partnerData = localStorage.getItem(`wouldbox_shared_${code}`);
    if (!partnerData) {
        alert('Partner not found. Make sure they have created their needs list first.');
        return;
    }
    
    const partner = JSON.parse(partnerData);
    currentUser.partnerId = partner.userId;
    
    // Store partner's needs for would selection
    localStorage.setItem(`wouldbox_partner_needs_${currentUser.id}`, JSON.stringify(partner.needs));
    
    saveUserData();
    showWouldSelection();
}

// Would Selection
function showWouldSelection() {
    showScreen('wouldSelection');
    const partnerNeeds = JSON.parse(localStorage.getItem(`wouldbox_partner_needs_${currentUser.id}`) || '[]');
    
    const container = document.getElementById('partnerNeedsList');
    container.innerHTML = partnerNeeds.map(need => `
        <div class="would-item" onclick="toggleWould('${need.id}', this)">
            ${need.text}
        </div>
    `).join('');
}

let selectedWoulds = [];

function toggleWould(needId, element) {
    const index = selectedWoulds.indexOf(needId);
    
    if (index > -1) {
        selectedWoulds.splice(index, 1);
        element.classList.remove('selected');
    } else {
        if (selectedWoulds.length >= 5) {
            alert('You can only select 5 items');
            return;
        }
        selectedWoulds.push(needId);
        element.classList.add('selected');
    }
    
    document.getElementById('selectedCount').textContent = selectedWoulds.length;
}

function confirmWouldSelection() {
    if (selectedWoulds.length !== 5) {
        alert('Please select exactly 5 items');
        return;
    }
    
    currentUser.woulds = selectedWoulds;
    saveUserData();
    showPrioritySetting();
}

// Priority Setting
function showPrioritySetting() {
    showScreen('prioritySetting');
    
    const partnerNeeds = JSON.parse(localStorage.getItem(`wouldbox_partner_needs_${currentUser.id}`) || '[]');
    const container = document.getElementById('priorityList');
    
    currentUser.priorities = currentUser.woulds.slice(); // Copy woulds as initial order
    
    container.innerHTML = currentUser.priorities.map((wouldId, index) => {
        const need = partnerNeeds.find(n => n.id == wouldId);
        return `
            <div class="priority-item ${index < 2 ? 'top-two' : ''}" 
                 draggable="true" 
                 data-id="${wouldId}">
                <div class="priority-number">${index + 1}</div>
                <div>${need ? need.text : ''}</div>
            </div>
        `;
    }).join('');
    
    setupDragAndDrop();
}

function setupDragAndDrop() {
    const items = document.querySelectorAll('.priority-item');
    let draggedItem = null;
    
    items.forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            this.classList.add('dragging');
        });
        
        item.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
        });
        
        item.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        item.addEventListener('drop', function(e) {
            e.preventDefault();
            if (this !== draggedItem) {
                const allItems = [...document.querySelectorAll('.priority-item')];
                const draggedIndex = allItems.indexOf(draggedItem);
                const targetIndex = allItems.indexOf(this);
                
                if (draggedIndex < targetIndex) {
                    this.parentNode.insertBefore(draggedItem, this.nextSibling);
                } else {
                    this.parentNode.insertBefore(draggedItem, this);
                }
                
                updatePriorityOrder();
            }
        });
    });
}

function updatePriorityOrder() {
    const items = document.querySelectorAll('.priority-item');
    currentUser.priorities = [];
    
    items.forEach((item, index) => {
        const wouldId = item.dataset.id;
        currentUser.priorities.push(wouldId);
        
        // Update number and styling
        item.querySelector('.priority-number').textContent = index + 1;
        item.classList.toggle('top-two', index < 2);
    });
}

function savePriorities() {
    saveUserData();
    showDashboard();
}

// Dashboard
function showDashboard() {
    showScreen('dashboard');
    updateDashboard();
}

function updateDashboard() {
    document.getElementById('myScore').textContent = currentUser.score || 0;
    document.getElementById('partnerScore').textContent = currentUser.partnerScore || 0;
    
    // Get today's would
    const today = new Date().toDateString();
    if (currentUser.lastDaily !== today && currentUser.priorities.length > 0) {
        // Pick random would for today
        const randomIndex = Math.floor(Math.random() * currentUser.priorities.length);
        currentUser.todaysWould = currentUser.priorities[randomIndex];
        currentUser.lastDaily = today;
        saveUserData();
    }
    
    // Display today's would
    const partnerNeeds = JSON.parse(localStorage.getItem(`wouldbox_partner_needs_${currentUser.id}`) || '[]');
    const todaysNeed = partnerNeeds.find(n => n.id == currentUser.todaysWould);
    document.getElementById('todaysAction').textContent = todaysNeed ? todaysNeed.text : 'Set up your Would list first';
}

function markComplete() {
    if (!currentUser.todaysWould) return;
    
    if (!currentUser.completedThisWeek.includes(currentUser.todaysWould)) {
        currentUser.completedThisWeek.push(currentUser.todaysWould);
        saveUserData();
        alert('Marked as complete! Your partner will guess this in the weekly review.');
    } else {
        alert('Already completed this week!');
    }
}

// Weekly Guessing Game
function showWeeklyGuessing() {
    showScreen('weeklyGuessing');
    
    // Get partner's woulds
    const partnerData = localStorage.getItem(`wouldbox_shared_${currentUser.pairingCode}`);
    if (!partnerData) {
        alert('Partner data not found');
        return;
    }
    
    const partner = JSON.parse(partnerData);
    const container = document.getElementById('guessingList');
    
    // Show partner's would list for guessing
    container.innerHTML = partner.woulds.map(wouldId => {
        const need = currentUser.needs.find(n => n.id == wouldId);
        return `
            <label style="display: block; margin: 10px 0; cursor: pointer;">
                <input type="checkbox" value="${wouldId}" style="margin-right: 10px;">
                ${need ? need.text : ''}
            </label>
        `;
    }).join('');
}

function submitGuesses() {
    const checkboxes = document.querySelectorAll('#guessingList input:checked');
    const guesses = Array.from(checkboxes).map(cb => cb.value);
    
    // Calculate scores
    const partnerData = JSON.parse(localStorage.getItem(`wouldbox_shared_${currentUser.pairingCode}`));
    const partnerCompleted = partnerData.completedThisWeek || [];
    
    let correctGuesses = 0;
    guesses.forEach(guess => {
        if (partnerCompleted.includes(guess)) {
            correctGuesses++;
            
            // Check if it was a top priority (double points)
            const priorityIndex = currentUser.priorities.indexOf(guess);
            if (priorityIndex < 2) {
                currentUser.partnerScore += 2; // Double points for top 2
            } else {
                currentUser.partnerScore += 1;
            }
            
            // Check if it was a top 3 need (triple points)
            if (currentUser.topThree.includes(guess)) {
                currentUser.partnerScore += 2; // Additional 2 points (total 3)
            }
        }
        currentUser.score += 1; // 1 point for each guess
    });
    
    saveUserData();
    alert(`You got ${correctGuesses} correct! Points earned: ${currentUser.score}`);
    showDashboard();
}

// Additional Navigation Functions
function showWouldList() {
    if (currentUser.woulds.length === 0) {
        showWouldSelection();
    } else {
        showPrioritySetting();
    }
}

function showScores() {
    showWeeklyGuessing();
}