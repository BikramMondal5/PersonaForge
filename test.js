const response = await fetch("http://localhost:8000/v1/3fac33aa-fe95-4582-96a5-88b693e7f357/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer pf_024b439b4f2f4572ac51"
    },
    body: JSON.stringify({
        message: "Can you search on web for me for irregular periods?",
        session_id: "user-session-123"
    })
});
const data = await response.json();
console.log(data.message);