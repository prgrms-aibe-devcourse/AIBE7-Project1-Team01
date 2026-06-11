(() => {
  const toggleButton = document.getElementById("travel-chat-toggle");
  const panel = document.getElementById("travel-chat-panel");
  const closeButton = document.getElementById("travel-chat-close");
  const form = document.getElementById("travel-chat-form");
  const input = document.getElementById("travel-chat-input");
  const sendButton = document.getElementById("travel-chat-send");
  const messages = document.getElementById("travel-chat-messages");

  if (!toggleButton || !panel || !closeButton || !form || !input || !sendButton || !messages) {
    return;
  }

  function scrollMessagesToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function appendTravelChatMessage(role, message) {
    const row = document.createElement("div");
    row.className = `travel-chat-message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "travel-chat-bubble";
    bubble.textContent = message;

    row.appendChild(bubble);
    messages.appendChild(row);
    scrollMessagesToBottom();
    return row;
  }

  function toggleTravelChatbot() {
    const isHidden = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !isHidden);
    toggleButton.setAttribute("aria-label", isHidden ? "AI 여행 추천 닫기" : "AI 여행 추천 열기");
    if (isHidden) {
      input.focus();
    }
  }

  function closeTravelChatbot() {
    panel.classList.add("hidden");
    toggleButton.setAttribute("aria-label", "AI 여행 추천 열기");
  }

  function setTravelChatLoading(isLoading) {
    sendButton.disabled = isLoading;
    input.disabled = isLoading;
    if (isLoading) {
      appendTravelChatMessage("ai", "AI가 추천을 찾는 중...");
    }
  }

  async function sendTravelChatMessage() {
    const message = input.value.trim();

    if (!message) {
      alert("여행 취향을 입력해 주세요.");
      return;
    }

    appendTravelChatMessage("user", message);
    input.value = "";

    setTravelChatLoading(true);

    try {
      const response = await fetch("/api/travel-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "추천 요청 실패");
      }

      const reply = payload.reply || "추천 결과를 받을 수 없었습니다.";
      const loadingBubble = messages.querySelector(".travel-chat-message.ai:last-child .travel-chat-bubble");
      if (loadingBubble && loadingBubble.textContent === "AI가 추천을 찾는 중...") {
        loadingBubble.textContent = reply;
      } else {
        appendTravelChatMessage("ai", reply);
      }
    } catch (error) {
      const loadingBubble = messages.querySelector(".travel-chat-message.ai:last-child .travel-chat-bubble");
      if (loadingBubble && loadingBubble.textContent === "AI가 추천을 찾는 중...") {
        loadingBubble.textContent = "추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
      } else {
        appendTravelChatMessage("ai", "추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setTravelChatLoading(false);
      input.focus();
    }
  }

  toggleButton.addEventListener("click", toggleTravelChatbot);
  closeButton.addEventListener("click", closeTravelChatbot);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendTravelChatMessage();
  });

  window.toggleTravelChatbot = toggleTravelChatbot;
  window.closeTravelChatbot = closeTravelChatbot;
  window.sendTravelChatMessage = sendTravelChatMessage;
  window.appendTravelChatMessage = appendTravelChatMessage;
  window.setTravelChatLoading = setTravelChatLoading;
})();
