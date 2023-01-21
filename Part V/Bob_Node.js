const WS = require('ws');
const { Transaction } = require('./blockchain');
const readline = require('readline');
const key = require('./keys');
const PORT = 3003;
const PEERS = ["ws://localhost:3002"];
const MY_ADDRESS = "ws://localhost:3003";
const server = new WS.Server({ port:PORT });

let opened = [], connected = [];

console.log("Bob listening on PORT", PORT);

server.on("connection", (socket) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);
        console.log(_message);

        switch(_message.type) { 
            case "TYPE_BALANCE":
                const amount = _message.data;
                console.log("My balance:", amount);
                break;
            case "TYPE_VERIFY":
                const isValid = _message.data;
                console.log("Blockchain isValid:", isValid);
                break;
        }
    })
})

function connect (address) {
    if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
        const socket = new WS(address);

        socket.on("open", () => {
            socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [MY_ADDRESS, ...connected])));

            opened.forEach(node => node.socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [address]))));
            
            if (!opened.find(peer => peer.address === address) && address !== MY_ADDRESS) {
                opened.push({ socket, address });
                connected.push(address);
            }
        });

        socket.on("close", () => {
            opened.splice(connected.indexOf(address), 1);
            connected.splice(connected.indexOf(address), 1);
        });
    }
}

function produceMessage (type, data) {
    return { type, data };
}

function sendMessage (message) {
    opened.forEach(node => {
        node.socket.send(JSON.stringify(message));
    })
}

PEERS.forEach(peer => connect(peer));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n'
});

rl.on('line', (command) => {
    switch(command.toLowerCase())
    {
        case 'send':
            const transaction = new Transaction(key.BOB_KEY.getPublic('hex'), key.JOHN_KEY.getPublic('hex'), 50, 10);
            transaction.sign(key.BOB_KEY);
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));
            break;
        case 'balance':
            sendMessage(produceMessage("TYPE_BALANCE", ["ws://localhost:3003", key.BOB_KEY.getPublic('hex')])); 
            break;
        case 'verify':
            sendMessage(produceMessage("TYPE_VERIFY", ["ws://localhost:3003"]));
            break;
        case 'clear':
            console.clear();
            break;
    }
    rl.prompt();
}).on('close', () => {
    console.log("Exiting!");
    process.exit(0);
});


process.on("uncaughtException", err => console.log(err));