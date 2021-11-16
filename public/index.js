(function () {
    var frame = document.getElementById("frame");
    var sender = Math.random() + "";
    frame.src = "https://microsoft.github.io/jacdac-docs/dashboard/#" + sender;
    // node.js -> iframe dashboard
    var ws = new WebSocket("ws://localhost:8081/");
    ws.binaryType = "arraybuffer";
    console.debug("devtools: connecting to local server...");
    ws.addEventListener("open", function () {
        console.debug("devtools: connected to local server");
    });
    ws.addEventListener("message", function (msg) {
        var data = new Uint8Array(msg.data);
        var pktMsg = {
            type: "messagepacket",
            channel: "jacdac",
            data: data,
            sender: sender
        };
        frame.contentWindow.postMessage(pktMsg);
    });
    ws.addEventListener("close", function () {
        console.debug("devtools: connection closed");
    });
    // iframe dashboard -> node.js
    window.addEventListener("message", function (msg) {
        var data = msg.data;
        if (data && data.type === "messagepacket" && data.channel === "jacdac") {
            if ((ws === null || ws === void 0 ? void 0 : ws.readyState) === WebSocket.OPEN)
                ws.send(data.data);
        }
    });
})();
