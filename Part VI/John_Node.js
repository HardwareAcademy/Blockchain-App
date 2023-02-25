const WS = require('ws');
const { Block, SatoshiCoin, Transaction } = require('./blockchain');
const { connect, produceMessage, sendMessage } = require('./Utils/WebSocketUtils');
const { isTransactionIncluded, isTransactionDuplicate } = require('./Utils/BlockchainUtils');
const readline = require('readline');
const key = require('./keys');
const PORT = 3001;
const MY_ADDRESS = "ws://localhost:3001";
const server = new WS.Server({ port:PORT });

let opened = [], connected = [];

console.log("John listening on PORT", PORT);

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

function broadcastTransactions () {

    SatoshiCoin.transactions.forEach((transaction, index) => {
        if (isTransactionIncluded(SatoshiCoin, transaction)) {
            SatoshiCoin.transactions.splice(index, 1);
        } else {
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction), opened);
        }
    })

    setTimeout(broadcastTransactions, 10000);
}

broadcastTransactions();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n'
});

rl.on('line', (command) => {
    switch(command.toLowerCase())
    {
        case 'send':
            const transaction = new Transaction(key.JOHN_KEY.getPublic('hex'), key.JENIFER_KEY.getPublic('hex'), 200, 20, Date.now());
            transaction.sign(key.JOHN_KEY);
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction), opened);
            break;
        case 'balance':
            console.log("John Balance:", SatoshiCoin.getBalance(key.JOHN_KEY.getPublic('hex')));
            break;
        case 'blockchain':
            console.log(SatoshiCoin);
            break;
        case 'header':
            console.log(SatoshiCoin.chain[1].blockHeader);
            console.log(SatoshiCoin.chain[2].blockHeader);
            console.log(SatoshiCoin.chain[3].blockHeader);
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