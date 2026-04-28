const response = await fetch("http://localhost:8000/v1/5271a944-5f5c-4bf6-baa0-08854635f50b/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_E9hFgzzoOX2CthOIkBBrYIZzSvEQWZgD"
    },
    body: JSON.stringify({
        message: "Hello there!",
        session_id: "user-session-123"
    })
});
const data = await response.json();
console.log(data.message);