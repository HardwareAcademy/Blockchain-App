const WS = require('ws');
const { Block, SatoshiCoin } = require('./blockchain');
const readline = require('readline');
const key = require('./keys');
const PORT = 3000;
const PEERS = ["ws://localhost:3001", "ws://localhost:3002"];
const MY_ADDRESS = "ws://localhost:3000";
const server = new WS.Server({ port:PORT });

let opened = [], connected = [];

console.log("Miner listening on PORT", PORT);

server.on("connection", (socket) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);
        console.log(_message);

        switch(_message.type) {
            case "TYPE_REPLACE_CHAIN":
                const [ newBlock, newDiff ] = _message.data;

                if (newBlock.prevHash !== SatoshiCoin.getLastBlock().prevHash &&
                    SatoshiCoin.getLastBlock().hash === newBlock.prevHash &&
                    Block.hasValidTransactions(newBlock, SatoshiCoin)) 
                    {
                        SatoshiCoin.chain.push(newBlock);
                        SatoshiCoin.difficulty = newDiff;
                    }
                break;
            case "TYPE_CREATE_TRANSACTION":
                const transaction = _message.data;
                if (!isTransactionDuplicate(transaction)) {
                    SatoshiCoin.addTransaction(transaction);
                }
                break;
            case "TYPE_HANDSHAKE":
                const nodes = _message.data;
                nodes.forEach(node => connect(node));
        }
    })
})

function isTransactionDuplicate (transaction) {
    return SatoshiCoin.transactions.some(tx => JSON.stringify(tx) === JSON.stringify(transaction));
}

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
        case 'mine':
            if (SatoshiCoin.transactions.length !== 0) {
                SatoshiCoin.mineTransactions(key.MINER_KEY.getPublic('hex'));

                sendMessage(produceMessage('TYPE_REPLACE_CHAIN', [
                    SatoshiCoin.getLastBlock(),
                    SatoshiCoin.difficulty
                ]));
            }
            break;
        case 'balance':
            console.log("Miner Balance:", SatoshiCoin.getBalance(key.MINER_KEY.getPublic('hex')));
            break;
        case 'blockchain':
            console.log(SatoshiCoin);
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