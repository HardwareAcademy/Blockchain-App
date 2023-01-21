const WS = require('ws');
const { Block, SatoshiCoin, Transaction } = require('./blockchain');
const readline = require('readline');
const key = require('./keys');
const PORT = 3002;
const MY_ADDRESS = "ws://localhost:3002";
const server = new WS.Server({ port:PORT });

let opened = [], connected = [];

console.log("Jenifer listening on PORT", PORT);

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
            case "TYPE_BALANCE":
                const [address, public_key] = _message.data;
                opened.forEach(node => {
                    if (node.address === address) {
                        const balance = SatoshiCoin.getBalance(public_key);
                        node.socket.send(JSON.stringify(produceMessage("TYPE_BALANCE", balance)));
                    }
                });
                break;
            case "TYPE_VERIFY":
                const peer_address = _message.data[0];
                const isValid = SatoshiCoin.isValid();
                opened.forEach(node => {
                    if (node.address === peer_address) {
                        node.socket.send(JSON.stringify(produceMessage("TYPE_VERIFY", isValid)));
                    }
                });
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

function broadcastTransactions () {

    SatoshiCoin.transactions.forEach((transaction, index) => {
        if (isTransactionIncluded(transaction)) {
            SatoshiCoin.transactions.splice(index, 1);
        } else {
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));
        }
    })

    setTimeout(broadcastTransactions, 10000);
}

broadcastTransactions();

function isTransactionIncluded (transaction) {
    return SatoshiCoin.chain.some(block => block.data.some(tx => JSON.stringify(tx) === JSON.stringify(transaction)));
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


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter a command:\n'
});

rl.on('line', (command) => {
    switch(command.toLowerCase())
    {
        case 'send':
            const transaction = new Transaction(key.JENIFER_KEY.getPublic('hex'), key.BOB_KEY.getPublic('hex'), 70, 10);
            transaction.sign(key.JENIFER_KEY);
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction));
            break;
        case 'balance':
            console.log("Jenifer Balance:", SatoshiCoin.getBalance(key.JENIFER_KEY.getPublic('hex')));
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