const WS = require('ws');
const { Block, SatoshiCoin } = require('./blockchain');
const { connect, produceMessage, sendMessage } = require('../Utils/WebSocketUtils');
const { isTransactionDuplicate } = require('../Utils/BlockchainUtils');
const readline = require('readline');
const key = require('../keys');
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

                if (newBlock.blockHeader.prevHash !== SatoshiCoin.getLastBlock().blockHeader.prevHash &&
                    SatoshiCoin.getLastBlock().hash === newBlock.blockHeader.prevHash &&
                    Block.hasValidTransactions(newBlock, SatoshiCoin)) 
                    {
                        SatoshiCoin.chain.push(newBlock);
                        SatoshiCoin.difficulty = newDiff;
                    }
                break;
            case "TYPE_CREATE_TRANSACTION":
                const transaction = _message.data;
                if (!isTransactionDuplicate(SatoshiCoin, transaction)) {
                    SatoshiCoin.addTransaction(transaction);
                }
                break;
            case "TYPE_HANDSHAKE":
                const nodes = _message.data;
                nodes.forEach(node => connect(node, MY_ADDRESS, opened, connected));
                break;
        }
    })
})

PEERS.forEach(peer => connect(peer, MY_ADDRESS, opened, connected));

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
                ]), opened);
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