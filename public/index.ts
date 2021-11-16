(function () {
    const frame = document.getElementById("frame") as HTMLIFrameElement
    const sender = Math.random() + ""
    frame.src = "https://microsoft.github.io/jacdac-docs/dashboard/#" + sender

    // node.js -> iframe dashboard
    const ws = new WebSocket("ws://localhost:8081/")
    ws.binaryType = "arraybuffer"
    console.debug(`devtools: connecting to local server...`)
    ws.addEventListener("open", () => {
        console.debug(`devtools: connected to local server`)
    })
    ws.addEventListener("message", (msg) => {
        const data = new Uint8Array(msg.data)
        const pktMsg = {
            type: "messagepacket",
            channel: "jacdac",
            data,
            sender,
        }
        frame.contentWindow.postMessage(pktMsg, "*")
    })
    ws.addEventListener("close", () => {
        console.debug(`devtools: connection closed`)
    })
    // iframe dashboard -> node.js
    window.addEventListener("message", msg => {
        const data = msg.data
        if (data && data.type ==="messagepacket" && data.channel === "jacdac") {
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(data.data)
            }
        }
    })
})()