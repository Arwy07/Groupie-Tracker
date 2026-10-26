const MEMBER_INFO = {
    generateInfo: function(memberName) {
        const nameParts = memberName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const roles = [
            { name: 'Guitariste', icon: 'fas fa-guitar', description: 'Joue de la guitare électrique et acoustique' },
            { name: 'Chanteur', icon: 'fas fa-microphone', description: 'Voix principale du groupe' },
            { name: 'Batteur', icon: 'fas fa-drum', description: 'Joue de la batterie et des percussions' },
            { name: 'Bassiste', icon: 'fas fa-music', description: 'Joue de la basse électrique' },
            { name: 'Claviériste', icon: 'fas fa-keyboard', description: 'Joue du clavier et du synthétiseur' },
            { name: 'Multi-instrumentiste', icon: 'fas fa-sliders-h', description: 'Joue de plusieurs instruments' }
        ];
        
        const instruments = [
            'Guitare électrique', 'Guitare acoustique', 'Basse', 'Batterie', 
            'Clavier', 'Synthétiseur', 'Piano', 'Violon', 'Saxophone', 'Harmonica'
        ];
        
        const roleIndex = memberName.length % roles.length;
        const role = roles[roleIndex];
        const selectedInstruments = [];
        
        if (role.name === 'Guitariste') {
            selectedInstruments.push('Guitare électrique', 'Guitare acoustique');
        } else if (role.name === 'Batteur') {
            selectedInstruments.push('Batterie', 'Percussions');
        } else if (role.name === 'Bassiste') {
            selectedInstruments.push('Basse électrique');
        } else if (role.name === 'Chanteur') {
            selectedInstruments.push('Voix', instruments[Math.floor(Math.random() * instruments.length)]);
        } else {
            const numInstruments = Math.floor(Math.random() * 2) + 2;
            for (let i = 0; i < numInstruments; i++) {
                const inst = instruments[Math.floor(Math.random() * instruments.length)];
                if (!selectedInstruments.includes(inst)) {
                    selectedInstruments.push(inst);
                }
            }
        }
        
        const bioTemplates = [
            `${firstName} ${lastName} est un musicien talentueux qui a rejoint le groupe et apporte sa propre touche artistique unique.`,
            `Avec ${firstName} au ${role.name.toLowerCase()}, le groupe a développé un son distinctif qui résonne avec les fans du monde entier.`,
            `${firstName} ${lastName} est reconnu${firstName.endsWith('a') ? 'e' : ''} pour ${firstName.endsWith('a') ? 'sa' : 'son'} maîtrise technique et ${firstName.endsWith('a') ? 'sa' : 'son'} passion pour la musique.`,
            `Depuis ${firstName.endsWith('a') ? 'son' : 'son'} arrivée dans le groupe, ${firstName} a contribué à plusieurs albums et tournées mémorables.`
        ];
        
        const bio = bioTemplates[memberName.length % bioTemplates.length];
        
        const birthYear = 1950 + (memberName.length * 3) % 30;
        const birthMonth = (memberName.length * 5) % 12 + 1;
        const birthDay = (memberName.length * 7) % 28 + 1;
        
        const countries = ['États-Unis', 'Royaume-Uni', 'Australie', 'Canada', 'France', 'Allemagne', 'Suède'];
        const country = countries[memberName.length % countries.length];
        
        return {
            name: memberName,
            role: role.name,
            roleIcon: role.icon,
            roleDescription: role.description,
            instruments: selectedInstruments,
            bio: bio,
            birthDate: `${birthDay}/${birthMonth}/${birthYear}`,
            country: country,
            yearsInBand: Math.floor((2024 - birthYear) / 3) + 5,
            albums: Math.floor(memberName.length / 2) + 3
        };
    }
};

function openMemberModal(memberName) {
    console.log('Ouverture du modal pour:', memberName);
    
    const memberInfo = MEMBER_INFO.generateInfo(memberName);
    
    let modal = document.getElementById('member-modal');
    if (!modal) {
        modal = createMemberModal();
        document.body.appendChild(modal);
    }
    
    document.getElementById('member-modal-name').textContent = memberInfo.name;
    document.getElementById('member-modal-role').innerHTML = `<i class="${memberInfo.roleIcon}"></i> ${memberInfo.role}`;
    document.getElementById('member-modal-role-desc').textContent = memberInfo.roleDescription;
    document.getElementById('member-modal-bio').textContent = memberInfo.bio;
    document.getElementById('member-modal-instruments').innerHTML = memberInfo.instruments.map(inst => 
        `<span class="instrument-tag">${inst}</span>`
    ).join('');
    document.getElementById('member-modal-birth').textContent = memberInfo.birthDate;
    document.getElementById('member-modal-country').textContent = memberInfo.country;
    document.getElementById('member-modal-years').textContent = `${memberInfo.yearsInBand} ans`;
    document.getElementById('member-modal-albums').textContent = `${memberInfo.albums} albums`;
    
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    
    setupMemberModalListeners();
}

function createMemberModal() {
    const modal = document.createElement('div');
    modal.id = 'member-modal';
    modal.className = 'member-modal';
    modal.innerHTML = `
        <div class="member-modal-overlay"></div>
        <div class="member-modal-content">
            <button class="member-modal-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="member-modal-header">
                <div class="member-modal-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="member-modal-title">
                    <h2 id="member-modal-name">Nom du membre</h2>
                    <div id="member-modal-role" class="member-role-badge"></div>
                </div>
            </div>
            
            <div class="member-modal-body">
                <div class="member-section">
                    <h3><i class="fas fa-info-circle"></i> À propos</h3>
                    <p id="member-modal-role-desc" class="member-role-description"></p>
                    <p id="member-modal-bio" class="member-bio"></p>
                </div>
                
                <div class="member-section">
                    <h3><i class="fas fa-music"></i> Instruments</h3>
                    <div id="member-modal-instruments" class="instruments-list"></div>
                </div>
                
                <div class="member-stats-grid">
                    <div class="member-stat">
                        <i class="fas fa-birthday-cake"></i>
                        <div>
                            <span class="stat-label">Date de naissance</span>
                            <span class="stat-value" id="member-modal-birth">-</span>
                        </div>
                    </div>
                    <div class="member-stat">
                        <i class="fas fa-globe"></i>
                        <div>
                            <span class="stat-label">Origine</span>
                            <span class="stat-value" id="member-modal-country">-</span>
                        </div>
                    </div>
                    <div class="member-stat">
                        <i class="fas fa-calendar-alt"></i>
                        <div>
                            <span class="stat-label">Dans le groupe</span>
                            <span class="stat-value" id="member-modal-years">-</span>
                        </div>
                    </div>
                    <div class="member-stat">
                        <i class="fas fa-compact-disc"></i>
                        <div>
                            <span class="stat-label">Albums</span>
                            <span class="stat-value" id="member-modal-albums">-</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="member-modal-footer">
                <button class="btn btn-primary" id="member-modal-close-btn">
                    <i class="fas fa-check"></i>
                    <span>Fermer</span>
                </button>
            </div>
        </div>
    `;
    
    return modal;
}

function setupMemberModalListeners() {
    const modal = document.getElementById('member-modal');
    
    const closeBtn = modal.querySelector('.member-modal-close');
    const closeFooterBtn = document.getElementById('member-modal-close-btn');
    const overlay = modal.querySelector('.member-modal-overlay');
    
    [closeBtn, closeFooterBtn, overlay].forEach(element => {
        if (element) {
            element.addEventListener('click', closeMemberModal);
        }
    });
    
    const escapeHandler = function(e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeMemberModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function closeMemberModal() {
    const modal = document.getElementById('member-modal');
    if (modal) {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
    }
}

window.openMemberModal = openMemberModal;
window.closeMemberModal = closeMemberModal;

