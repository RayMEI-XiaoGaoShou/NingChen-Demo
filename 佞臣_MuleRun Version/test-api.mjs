const body = JSON.stringify({
    model: "K2.5",
    messages: [{ role: "user", content: "say hi in 3 words" }],
    max_tokens: 30,
});

fetch("http://localhost:5173/api/ai/chat/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer sk-kimi-rhe2InJe9pRSFMPWVtX3NBVoYiI0N8v24DhGPOvHPVW14qRkhcwJymE8zpbMADrU",
    },
    body,
})
    .then((r) => {
        console.log("Status:", r.status);
        return r.text();
    })
    .then((t) => console.log("Response:", t))
    .catch((e) => console.error("Error:", e));
