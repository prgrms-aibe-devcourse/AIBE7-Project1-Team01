let currentStep = 1;
let currentFestivalData = null;

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
        const response = await fetch('/api/chat', {
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
        const response = await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const res = await fetch('/api/saved');
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
        const res = await fetch('/api/history');
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
        await fetch('/api/history', {
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
    await fetch(`/api/saved/${id}`, { method: 'DELETE' });
    loadSaved();
}

async function loadPlannerPhoto(keyword) {
    const imgTag = document.getElementById('planner-img');
    const loader = document.getElementById('photo-loading');
    const credit = document.getElementById('unsplash-credit');
    const authorLink = document.getElementById('author-link');

    if (!keyword) return;

    loader.style.display = 'block';
    imgTag.style.display = 'none';
    credit.style.display = 'none';

    try {
        const res = await fetch(`/api/planner-photo?keyword=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        if (data.success) {
            imgTag.onload = () => {
                loader.style.display = 'none';
                imgTag.style.display = 'block';
            };
            imgTag.src = data.imageUrl;
            if (data.authorName && data.authorUrl) {
                authorLink.textContent = data.authorName;
                authorLink.href = data.authorUrl;
                credit.style.display = 'block';
            }
        } else {
            loader.innerText = '이미지를 불러오지 못했습니다.';
        }
    } catch (e) {
        loader.innerText = '이미지 로드 실패';
    }
}

function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
}
