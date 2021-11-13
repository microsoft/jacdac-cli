(function () {
    const frame = document.getElementById("frame") as HTMLIFrameElement
    const sender = Math.random() + ""
    frame.src = "https://microsoft.github.io/jacdac-docs/dashboard/#" + sender

    // node.js -> iframe dashboard
    const ws = new WebSocket("ws://localhost:8081/")
    console.debug(`devtools: connecting to local server...`)
    ws.addEventListener("open", () => {
        console.debug(`devtools: connected to local server`)
    })
    ws.addEventListener("message", (msg) => {
        const data = msg.data
        frame.contentWindow.postMessage({
            type: "messagepacket",
            channel: "jacdac",
            data: data,
            sender,
            broadcast: true,
        })
    })
    ws.addEventListener("close", () => {
        console.debug(`devtools: connection closed`)
    })
    // iframe dashboard -> node.js
    window.addEventListener("message", msg => {
        const data = msg.data
        if (data && data.type ==="messagepacket" && data.channel === "jacdac") {
            if (ws?.readyState === WebSocket.OPEN)
                ws.send(data.data)
        }
    })
})()