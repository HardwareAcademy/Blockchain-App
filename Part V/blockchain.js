const crypto = require('crypto'); SHA256 = message => crypto.createHash('sha256').update(message).digest('hex');
const EC = require('elliptic').ec, ec = new EC('secp256k1');

const MINT_PRIVATE_ADDRESS = "0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex');
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

const key = require('./keys');

class Block {
    constructor (timestamp, data = []) {
        this.timestamp = timestamp;
        this.data = data;
        this.hash = Block.getHash(this);
        this.prevHash = '';
        this.nonce = 0;
    }

    static getHash (block) {
        return SHA256(block.timestamp + JSON.stringify(block.data) + block.prevHash + block.nonce);
    }

    mine (difficulty) {
        while (!this.hash.startsWith(Array(difficulty + 1).join('0'))) {
            this.nonce++;
            this.hash = Block.getHash(this);
        }
    }

    static hasValidTransactions (block, chain) {
        return block.data.every(transaction => Transaction.isValid(transaction, chain));
    }
}

class Blockchain {
    constructor () {
        const initialCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS, key.JOHN_KEY.getPublic('hex'), 1000);
        this.chain = [new Block("", [initialCoinRelease])];
        this.difficulty = 2;
        this.blockTime = 5000;
        this.transactions = [];
        this.reward = 10;
    }

    addTransaction (transaction) {
        if (Transaction.isValid(transaction, this)) {
            this.transactions.push(transaction);
        }
    }

    mineTransactions (rewardAddress) {
        let gas = 0;

        this.transactions.forEach(transaction => {
            gas += transaction.gas;
        })

        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward + gas);
        rewardTransaction.sign(MINT_KEY_PAIR);

        if (this.transactions.length !== 0) {
            this.addBlock(new Block(Date.now().toString(), [rewardTransaction, ...this.transactions]));
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
        this.difficulty += Date.now() - parseInt(this.getLastBlock().timestamp) < this.blockTime ? 1 : -1;
    }

    isValid () {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i-1];

            if (currentBlock.hash !== Block.getHash(currentBlock) ||
                currentBlock.prevHash !== prevBlock.hash || 
                !Block.hasValidTransactions(currentBlock, this)) {
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

    static isValid (tx, chain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount + tx.gas || tx.from === MINT_PUBLIC_ADDRESS) &&
            ec.keyFromPublic(tx.from, 'hex').verify(SHA256(tx.from + tx.to + tx.amount + tx.gas), tx.signature)
        )
    }
}

const SatoshiCoin = new Blockchain();

module.exports = { Block, Transaction, SatoshiCoin };
