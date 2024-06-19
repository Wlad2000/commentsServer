const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const dbManager = require("./databasemanager");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'uploads'))); // Serve images from the uploads directory


const server = createServer(app);
const port = process.env.PORT || 3434;

const wss = new WebSocketServer({ server });

var db = dbManager.open("./mycomments.db");
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            avatar TEXT,
            username TEXT,
            email TEXT,
            homepage TEXT,
            text TEXT,
            file TEXT,
            parent_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

let connectedClients = 0;

wss.on('connection', (ws, req) => {
    console.log('connecting to WebSocket');
    connectedClients++;

    ws.on('message', (message) => {
        try {
            const mes = JSON.parse(message);
            if (mes.type === 'debug') {
                console.log(mes.msg);
            } else if (mes.type === 'getConnectedUsers') {
                ws.send(JSON.stringify({ type: 'connectedUsers', count: connectedClients }));
            } else if (mes.type === "database") {
                dbManager.control(ws, mes);
            } 
        } catch (error) {
            console.error(error);
        }
    });

    ws.on('close', () => {
        console.log('Disconnecting...');
        connectedClients--;
    });
});

server.listen(port, function () {
    console.log("Comments Server v0.0.1 starting...");
    console.log("Comments Server v0.0.1 listening at port %d", port);
});
