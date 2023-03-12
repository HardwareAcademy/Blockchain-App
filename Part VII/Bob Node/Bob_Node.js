const WS = require('ws');
const { Transaction, SatoshiCoin } = require('./blockchain');
const { connect, produceMessage, sendMessage } = require('../Utils/WebSocketUtils');
const { getLastBlockHash, getLastTransaction, isMerkleRootFound } = require('../Utils/BlockchainUtils');
const Merkle = require('../Utils/MerkleRootUtils');
const readline = require('readline');
const key = require('../keys');
const PORT = 3003;
const PEERS = ["ws://localhost:3002"];
const MY_ADDRESS = "ws://localhost:3003";
const server = new WS.Server({ port:PORT });

let opened = [], connected = [];

let chain = [];
let transaction_history = [];

console.log("Bob listening on PORT", PORT);

server.on("connection", (socket) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);
        console.log(_message);

        switch(_message.type) { 
            case "TYPE_REPLACE_CHAIN":
                if (_message.data[0].blockHeader.prevHash === getLastBlockHash(chain) &&
                    _message.data[0].transactionCount >= 1 && 
                    _message.data[0].blockHeader.timestamp > chain[chain.length - 1].timestamp) {
                    chain.push(_message.data[0].blockHeader);
                }
                break;
            case "TYPE_BALANCE":
                const amount = _message.data;
                console.log("My balance:", amount);
                break;
            case "TYPE_VERIFY":
                const isValid = _message.data;
                console.log("Blockchain isValid:", isValid);
                break;
            case "VERIFY_TRANSACTION":
                const {merkleRoot, proof, leaves} = _message.data;
                const validProof = [{ position: proof[0].position, data: Buffer.from(proof[0].data)}];
                if (isMerkleRootFound(chain, merkleRoot)) {
                    const isTransactionIncluded = Merkle.verifyTransaction(validProof, leaves, getLastTransaction(transaction_history), merkleRoot);
                    console.log("Is Transaction Included:", isTransactionIncluded);
                } else {
                    console.log("MerkleRoot Not Found");
                }
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
        case 'send':
            const transaction = new Transaction(key.BOB_KEY.getPublic('hex'), key.JOHN_KEY.getPublic('hex'), 50, 10, Date.now());
            transaction.sign(key.BOB_KEY);
            transaction_history.push(transaction);
            sendMessage(produceMessage("TYPE_CREATE_TRANSACTION", transaction), opened);
            break;
        case 'balance':
            sendMessage(produceMessage("TYPE_BALANCE", ["ws://localhost:3003", key.BOB_KEY.getPublic('hex')]), opened); 
            break;
        case 'verify':
            sendMessage(produceMessage("TYPE_VERIFY", ["ws://localhost:3003"]), opened);
            break;
        case 'transaction_verify':
            const transactionToVerify = getLastTransaction(transaction_history);
            sendMessage(produceMessage("VERIFY_TRANSACTION", {transaction: transactionToVerify, address: MY_ADDRESS}), opened);
            break;
        case 'chain':
            console.log(chain);
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

chain.push(SatoshiCoin.chain[0].blockHeader);

process.on("uncaughtException", err => console.log(err));