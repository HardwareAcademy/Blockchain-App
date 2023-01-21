const crypto = require('crypto'); SHA256 = message => crypto.createHash('sha256').update(message).digest('hex');
const EC = require('elliptic').ec, ec = new EC('secp256k1');

const MINT_WALLET = ec.genKeyPair();
const MINT_PUBLIC_ADDRESS = MINT_WALLET.getPublic('hex');

class Block {
    constructor (data = []) {
        this.timestamp = Date.now();
        this.data = data;
        this.hash = this.getHash();
        this.prevHash = '';
        this.nonce = 0;
    }

    getHash () {
        return SHA256(this.timestamp + JSON.stringify(this.data) + this.prevHash + this.nonce);
    }

    mine (difficulty) {
        while (!this.hash.startsWith(Array(difficulty + 1).join('0'))) {
            this.nonce++;
            this.hash = this.getHash();
        }
    }

    hasValidTransactions (chain) {
        return this.data.every(transaction => transaction.isValid(transaction, chain));
    }
}

class Blockchain {
    constructor () {
        const initialCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS, JOHN_WALLET.getPublic('hex'), 1000);
        this.chain = [new Block([initialCoinRelease])];
        this.difficulty = 2;
        this.blockTime = 5000;
        this.transactions = [];
        this.reward = 10;
    }

    addTransaction (transaction) {
        if (transaction.isValid(transaction, this)) {
            this.transactions.push(transaction);
        }
    }

    mineTransactions (rewardAddress) {
        let gas = 0;

        this.transactions.forEach(transaction => {
            gas += transaction.gas;
        })

        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward + gas);

        if (this.transactions.length !== 0) {
            this.addBlock(new Block([rewardTransaction,...this.transactions]));
        }
        this.transactions = [];
    }

    getBalance (address) {
        let balance = 0;

        this.chain.forEach(block => {
            block.data.forEach(transaction => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                    balance -= transaction.gas;
                }
                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            })
        })
        return balance;
    }

    getLastBlock () {
        return this.chain[this.chain.length - 1];
    }

    addBlock (block) {
        block.prevHash = this.getLastBlock().hash;
        block.mine(this.difficulty);

        this.chain.push(block);
        this.difficulty += Date.now() - this.getLastBlock().timestamp < this.blockTime ? 1 : -1;
    }

    isValid () {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i-1];

            if (currentBlock.hash !== currentBlock.getHash() ||
                currentBlock.prevHash !== prevBlock.hash || 
                !currentBlock.hasValidTransactions(this)) {
                return false;
            }
            return true;
        }
    }
}

class Transaction {
    constructor (from, to, amount, gas = 0) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
    }

    sign (keyPair) {
        if (keyPair.getPublic('hex') === this.from) {
            this.signature = keyPair.sign(SHA256(this.from + this.to + this.amount + this.gas)).toDER('hex');
        }
    }

    isValid (tx, chain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            chain.getBalance(tx.from) >= tx.amount + tx.gas &&
            ec.keyFromPublic(tx.from, 'hex').verify(SHA256(tx.from + tx.to + tx.amount + tx.gas), tx.signature)
        )
    }
}

const JOHN_WALLET = ec.genKeyPair();
const JENIFER_WALLET = ec.genKeyPair();
const MINER_WALLET = ec.genKeyPair();
const BOB_WALLET = ec.genKeyPair();

const SatoshiCoin = new Blockchain();

const transaction1 = new Transaction(JOHN_WALLET.getPublic('hex'), JENIFER_WALLET.getPublic('hex'), 200, 20);
transaction1.sign(JOHN_WALLET);
SatoshiCoin.addTransaction(transaction1);
SatoshiCoin.mineTransactions(MINER_WALLET.getPublic('hex'));

const transaction2 = new Transaction(JENIFER_WALLET.getPublic('hex'), BOB_WALLET.getPublic('hex'), 100, 10);
transaction2.sign(JENIFER_WALLET);
SatoshiCoin.addTransaction(transaction2);
SatoshiCoin.mineTransactions(MINER_WALLET.getPublic('hex'));

console.log(SatoshiCoin.chain);

console.log("John's balance:", SatoshiCoin.getBalance(JOHN_WALLET.getPublic('hex')));
console.log("Jenifer's balance:", SatoshiCoin.getBalance(JENIFER_WALLET.getPublic('hex')));
console.log("Bob's balance:", SatoshiCoin.getBalance(BOB_WALLET.getPublic('hex')));
console.log("Miner's balance:", SatoshiCoin.getBalance(MINER_WALLET.getPublic('hex')));


