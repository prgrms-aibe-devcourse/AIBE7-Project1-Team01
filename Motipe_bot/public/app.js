let currentStep = 1;
let currentFestivalData = null;

// 로그인이 없으므로 브라우저별 고정 게스트 ID를 생성해 재사용
function getUserId() {
    let id = localStorage.getItem('motipe_user_id');
    if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) ||
             ('guest-' + Date.now() + '-' + Math.random().toString(36).slice(2));
        localStorage.setItem('motipe_user_id', id);
    }
    return id;
}

window.onload = () => {
    loadHistory();
    loadSaved();
};

async function sendMessage() {
    const inputEl = document.getElementById('userInput');
    const message = inputEl.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    inputEl.value = '';

    try {
        const response = await fetch('api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, step: currentStep })
        });
        const data = await response.json();

        appendMessage(data.reply || '응답을 받지 못했습니다.', 'assistant');
        currentStep = data.step || currentStep;

        if (data.festivalData) {
            currentFestivalData = data.festivalData;
            displayRecommendation(data.festivalData);
        }
    } catch (e) {
        appendMessage('서버 통신 중 에러가 발생했습니다.', 'assistant');
    }
}

function appendMessage(text, sender) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}`;
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function appendFestivalCards(festivals) {
    const chatBox = document.getElementById('chatBox');

    const containerEl = document.createElement('div');
    containerEl.className = 'festival-container';
    containerEl.innerHTML = `<div class="festival-container-title">🎉 검색된 축제 ${festivals.length}건</div>`;

    festivals.forEach((f, i) => {
        const rows = [];
        if (f.eventPlace) rows.push(['🏟️', '행사장', escapeHtml(f.eventPlace)]);
        if (f.address)    rows.push(['📍', '장소', escapeHtml(f.address)]);

        const period = f.startDate
            ? `${escapeHtml(f.startDate)} ~ ${escapeHtml(f.endDate || '')}`
            : '';
        if (period)       rows.push(['📅', '기간', period]);
        if (f.playTime)   rows.push(['⏱️', '운영시간', escapeHtml(f.playTime)]);
        if (f.useFee)     rows.push(['💰', '입장료', escapeHtml(f.useFee)]);
        if (f.tel)        rows.push(['📞', '문의', escapeHtml(f.tel)]);
        if (f.homepage)   rows.push(['🌐', '홈페이지',
            `<a href="${escapeHtml(f.homepage)}" target="_blank" rel="noopener">${escapeHtml(f.homepage)}</a>`]);

        const rowsHtml = rows.map(([icon, label, value]) => `
            <div class="festival-row">
                <span class="festival-row-icon">${icon}</span>
                <span class="festival-row-label">${label}</span>
                <span class="festival-row-value">${value}</span>
            </div>`).join('');

        const card = document.createElement('div');
        card.className = 'festival-card';
        card.innerHTML = `
            <div class="festival-card-header">
                <span class="festival-card-badge">🎪 축제 ${i + 1}</span>
                <h3 class="festival-card-title">${escapeHtml(f.title)}</h3>
            </div>
            <div class="festival-card-body">${rowsHtml}</div>
        `;
        containerEl.appendChild(card);
    });

    chatBox.appendChild(containerEl);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function displayRecommendation(data) {
    const container = document.getElementById('recommendation-container');
    if (!container) return;

    if (!data || !data.title) {
        container.innerHTML = '<p>추천 데이터를 불러오지 못했습니다.</p>';
        return;
    }

    container.innerHTML = `
        <div class="recommend-card">
            <h3>${data.title}</h3>
            <p>지역: ${data.region || '-'} | 날짜: ${data.date || '-'}</p>
            <button class="scrap-btn" onclick="saveDestination('${data.title}', '${data.region || ''}', '${data.date || ''}')">
                내 보관함에 스크랩하기
            </button>
        </div>
    `;
}

async function saveDestination(title, region, date) {
    try {
        const response = await fetch('api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'user-id': getUserId() },
            body: JSON.stringify({ title, region, date })
        });
        const result = await response.json();

        if (result.success) {
            alert('스크랩 성공!');
            loadSaved();
        } else {
            alert('저장 실패: ' + result.message);
        }
    } catch (error) {
        alert('통신 중 문제가 발생했습니다.');
    }
}

async function loadSaved() {
    try {
        const res = await fetch('api/saved', {
            headers: { 'user-id': getUserId() }
        });
        const result = await res.json();
        const list = result.data || [];
        const container = document.getElementById('savedList');
        if (container) {
            container.innerHTML = list.map(item => `
                <li>
                    <div>
                        <strong>${item.title}</strong>
                        <div>${item.date || ''}</div>
                    </div>
                    <button class="del-btn" onclick="deleteSaved('${item.id}')">삭제</button>
                </li>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadHistory() {
    try {
        const res = await fetch('api/history');
        const result = await res.json();
        const list = result.data || [];
        const container = document.getElementById('history-list');
        if (container) {
            container.innerHTML = list.map(item => `
                <li>
                    <span>${item.title} (${item.date || ''})</span>
                </li>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

async function addHistory() {
    const titleEl = document.getElementById('histName');
    const dateEl = document.getElementById('histDate');
    const title = titleEl?.value.trim();
    const date = dateEl?.value;

    if (!title || !date) {
        alert('여행지명과 날짜를 입력해 주세요.');
        return;
    }

    try {
        await fetch('api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, date })
        });
        titleEl.value = '';
        dateEl.value = '';
        loadHistory();
    } catch (err) {
        alert('기록 추가에 실패했습니다.');
    }
}

async function deleteSaved(id) {
    await fetch(`api/saved/${id}`, {
        method: 'DELETE',
        headers: { 'user-id': getUserId() }
    });
    loadSaved();
}


function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
}
