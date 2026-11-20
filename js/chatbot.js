/* Lumia 909 — chat logging helper. Fire-and-forget POST to /api/chats. */
window.LumiaChatLog = function (sessionId, userMessage, botReply) {
  try {
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_message: userMessage,
        bot_reply: botReply
      })
    }).catch(function () { /* logging must never break the chat */ });
  } catch (e) { /* ignore */ }
};
