// js/map_ui.js

/**
 * 축제 카드 렌더링
 * @param {Array} festivals
 * @param {Function} onCardClick - (festival) => void
 */
export function renderList(festivals, onCardClick) {
  const list = document.getElementById('festival-list');
  const empty = document.getElementById('list-empty');
  const countEl = document.getElementById('festival-count');
  const subtitleEl = document.getElementById('list-subtitle');

  countEl.textContent = festivals.length;
  list.innerHTML = '';

  if (festivals.length === 0) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');
    subtitleEl.textContent = '조건에 맞는 축제가 없습니다';
    return;
  }

  list.classList.remove('hidden');
  empty.classList.add('hidden');
  subtitleEl.textContent = `총 ${festivals.length}개의 축제`;

  const today = new Date().toISOString().slice(0, 10);

  const fragment = document.createDocumentFragment();

  festivals.forEach(f => {
    const isOngoing = f.start_date <= today && f.end_date >= today;
    const card = document.createElement('li');
    card.className = 'festival-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', f.title);
    card.dataset.id = f.id;

    const badgeClass = isOngoing ? 'badge-ongoing' : 'badge-upcoming';
    const badgeText = isOngoing ? '진행 중' : '예정';
    const badgeDot = isOngoing ? '●' : '○';

    card.innerHTML = `
      <span class="card-badge ${badgeClass}">${badgeDot} ${badgeText}</span>
      <p class="card-title">${escHtml(f.title)}</p>
      <div class="card-meta">
        <div class="card-meta-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>${f.start_date} ~ ${f.end_date}</span>
        </div>
        ${f.addr ? `
        <div class="card-meta-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          <span>${escHtml(f.addr.slice(0, 20))}${f.addr.length > 20 ? '…' : ''}</span>
        </div>` : ''}
      </div>
      ${f.detail_url ? `
      <a class="card-link" href="${escHtml(f.detail_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        자세히 보기
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </a>` : ''}
    `;

    card.addEventListener('click', () => {
      setActiveCard(f.id);
      onCardClick(f);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    fragment.appendChild(card);
  });

  list.appendChild(fragment);
}

export function setActiveCard(id) {
  document.querySelectorAll('.festival-card').forEach(el => {
    el.classList.toggle('active', el.dataset.id === String(id));
  });
}

export function scrollToCard(id) {
  const card = document.querySelector(`.festival-card[data-id="${id}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
