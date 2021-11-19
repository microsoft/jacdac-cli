(function () {
    var frame = document.getElementById("frame");
    var sender = Math.random() + "";
    frame.src = "https://microsoft.github.io/jacdac-docs/dashboard/#" + sender;
    var location = window.location;
    var secure = location.protocol === "https:";
    var protocol = secure ? "wss:" : "ws:";
    var hostname = location.hostname;
    var port = secure ? 443 : 8081;
    var wsurl = protocol + "//" + hostname + ":" + port + "/";
    // node.js -> iframe dashboard
    var ws = new WebSocket(wsurl);
    ws.binaryType = "arraybuffer";
    console.debug("devtools: connecting " + wsurl + "...");
    ws.addEventListener("open", function () {
        console.debug("devtools: connected " + ws.url);
    });
    ws.addEventListener("message", function (msg) {
        var data = new Uint8Array(msg.data);
        var pktMsg = {
            type: "messagepacket",
            channel: "jacdac",
            data: data,
            sender: sender
        };
        frame.contentWindow.postMessage(pktMsg, "*");
    });
    ws.addEventListener("close", function () {
        console.debug("devtools: connection closed");
    });
    ws.addEventListener("error", function (e) {
        console.error("devtools: error " + (e + ""), e);
    });
    // iframe dashboard -> node.js
    window.addEventListener("message", function (msg) {
        var data = msg.data;
        if (data && data.type === "messagepacket" && data.channel === "jacdac") {
            if ((ws === null || ws === void 0 ? void 0 : ws.readyState) === WebSocket.OPEN) {
                ws.send(data.data);
            }
        }
    });
})();
