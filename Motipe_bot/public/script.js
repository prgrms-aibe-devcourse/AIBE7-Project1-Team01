let currentStep = 1;
let currentFestivalData = null;

// 페이지 로드 시 백엔드 데이터(CRUD 데이터) 읽어오기
window.onload = () => {
    loadHistory();
    loadSaved();
};

// 1. 대화 통신 기능 (챗봇 서비스 래핑)
async function sendMessage() {
    const inputEl = document.getElementById('userInput');
    const message = inputEl.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    inputEl.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, step: currentStep })
        });
        const data = await response.json();
        
        appendMessage(data.reply, 'assistant');
        currentStep = data.step;

        if (data.festivalData) {
            currentFestivalData = data.festivalData;
            renderRecommendCard(data.festivalData);
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

function renderRecommendCard(data) {
    const card = document.getElementById('recommendationCard');
    card.innerHTML = `
        <strong>${data.title}</strong><br>
        📍 주소: ${data.addr}<br>
        📅 기간: ${data.event_start_date} ~ ${data.event_end_date}<br>
        <button class="scrap-btn" onclick="saveDestination()">⭐ 이 축제 내 보관함에 스크랩하기</button>
    `;
}

// ===== CRUD 연동 Frontend 함수 세트 =====

// [CREATE] 스크랩 등록
async function saveDestination() {
    if (!currentFestivalData) return alert('추천된 축제 데이터가 없습니다.');
    const response = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentFestivalData)
    });
    if (response.ok) {
        alert('스크랩 성공!');
        loadSaved();
    }
}

// [READ] 스크랩 목록 가져오기
async function loadSaved() {
    const res = await fetch('/api/saved');
    const list = await res.json();
    const ul = document.getElementById('savedList');
    ul.innerHTML = list.map(item => `
        <li>
            <div>
                <strong>${item.title}</strong> (${item.addr})<br>
                <small>메모: ${item.user_memo || '없음'}</small>
            </div>
            <div>
                <button onclick="updateMemo(${item.id})">📝 메모수정</button>
                <button class="del-btn" onclick="deleteSaved(${item.id})">X</button>
            </div>
        </li>
    `).join('');
}

// [UPDATE] 스크랩 메모 수정
async function updateMemo(id) {
    const user_memo = prompt('이 축제에 대한 노트를 적어주세요:');
    if (user_memo === null) return;
    await fetch(`/api/saved/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_memo })
    });
    loadSaved();
}

// [DELETE] 스크랩 제거
async function deleteSaved(id) {
    if (!confirm('스크랩을 취소하시겠습니까?')) return;
    await fetch(`/api/saved/${id}`, { method: 'DELETE' });
    loadSaved();
}

// [CREATE] 과거 기록 추가
async function addHistory() {
    const destination_name = document.getElementById('histName').value;
    const visit_date = document.getElementById('histDate').value;
    if (!destination_name || !visit_date) return alert('정보를 모두 입력해 주세요.');

    await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_name, visit_date, rating: 5, review_text: '좋았음' })
    });
    loadHistory();
}

// [READ] 과거 기록 조회
async function loadHistory() {
    const res = await fetch('/api/history');
    const list = await res.json();
    const ul = document.getElementById('historyList');
    ul.innerHTML = list.map(item => `
        <li>
            <span>✈️ ${item.destination_name} (${item.visit_date})</span>
            <button class="del-btn" onclick="deleteHistory(${item.id})">삭제</button>
        </li>
    `).join('');
}

// [DELETE] 과거 기록 삭제
async function deleteHistory(id) {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    loadHistory();
}