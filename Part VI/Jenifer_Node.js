const WS = require('ws');
const { Block, SatoshiCoin, Transaction } = require('./blockchain');
const { connect, produceMessage, sendMessage } = require('./Utils/WebSocketUtils');
const { isTransactionIncluded, isTransactionDuplicate, getTransactionBlock } = require('./Utils/BlockchainUtils');
const Merkle = require('./Utils/MerkleRootUtils');
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
            case "VERIFY_TRANSACTION":
                const {from, to, amount, gas, timestamp, signature} = _message.data.transaction;
                const block = getTransactionBlock(SatoshiCoin, from, to, amount, gas, timestamp, signature);
                if (block) {
                    const leaves = block.data.map(transaction => SHA256(JSON.stringify(transaction)));
                    const proof = Merkle.getMerkleProof(leaves, _message.data.transaction);
                    console.log(proof);
                    opened.forEach(node => {
                        if (node.address === _message.data.address) {
                            node.socket.send(JSON.stringify(produceMessage("VERIFY_TRANSACTION", {merkleRoot: block.blockHeader.merkleRoot, proof, leaves})));
                        }
                    });
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
            const transaction = new Transaction(key.JENIFER_KEY.getPublic('hex'), key.BOB_KEY.getPublic('hex'), 70, 10, Date.now());
            transaction.sign(key.JENIFER_KEY);
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction), opened);
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