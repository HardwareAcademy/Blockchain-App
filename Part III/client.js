const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
    console.log('Connected to the Server!');
});

ws.on('message', (data) => {
    console.log(`${data}`);
})