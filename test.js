const response = await fetch("http://localhost:8000/v1/864a6931-ec14-49e8-92ca-3c35c4492ea3/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_vCZjljwgwojJnGzDmadUfeWP22803j0n"
  },
  body: JSON.stringify({
    message: "what can you do",
    session_id: "user-session-123"
  })
});
const data = await response.json();
console.log(data.message);