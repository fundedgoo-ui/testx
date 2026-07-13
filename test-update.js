fetch("http://localhost:3000/api/users/profile", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ realName: "John" })
}).then(res => res.json()).then(console.log).catch(console.error);
