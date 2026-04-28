const response = await fetch("http://localhost:8000/v1/e912e583-7a2c-4ec3-a380-a30ee70c2649/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_vCZjljwgwojJnGzDmadUfeWP22803j0n"
    },
    body: JSON.stringify({
        message: "Hello there!",
        session_id: "user-session-123"
    })
});
const data = await response.json();
console.log(data.message);