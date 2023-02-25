const crypto = require('crypto'); SHA256 = message => crypto.createHash('sha256').update(message).digest('hex');
const EC = require('elliptic').ec, ec = new EC('secp256k1');
const Merkle = require('./Utils/MerkleRootUtils');

const MINT_PRIVATE_ADDRESS = "0700a1ad28a20e5b2a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, 'hex');
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic('hex');

const key = require('./keys');

class Block {
    constructor (timestamp, data = [], transactionCount, difficulty, merkleRoot = 0) {
        this.data = data;
        this.blockHeader = {
            nonce: 0, 
            prevHash: '',
            merkleRoot: merkleRoot,
            timestamp: timestamp,
            difficulty: difficulty
        };
        this.transactionCount = transactionCount;
        this.blockSize = JSON.stringify(this).length;
        this.hash = Block.getHash(this.blockHeader);
    }

    static getHash (blockHeader) {
        return SHA256(blockHeader.nonce + blockHeader.prevHash + blockHeader.merkleRoot + blockHeader.timestamp + blockHeader.difficulty);
    }

    mine (difficulty) {
        while (!this.hash.startsWith(Array(difficulty + 1).join('0'))) {
            this.blockHeader.nonce++;
            this.hash = Block.getHash(this.blockHeader);
        }
    }

    static hasValidTransactions (block, chain) {
        return block.data.every(transaction => Transaction.isValid(transaction, chain));
    }
}

class Blockchain {
    constructor () {
        const initialCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS, key.JOHN_KEY.getPublic('hex'), 1000, 0, Date.now());
        this.difficulty = 2;
        this.blockTime = 5000;
        this.transactions = [];
        this.reward = 10;
        this.chain = [new Block("", [initialCoinRelease], 1, this.difficulty)];
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

        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward + gas, Date.now());
        rewardTransaction.sign(MINT_KEY_PAIR);

        if (this.transactions.length !== 0) {
            this.addBlock(new Block(Date.now(), [rewardTransaction, ...this.transactions], this.transactions.length + 1, this.difficulty));
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
        block.blockHeader.prevHash = this.getLastBlock().hash;
        block.blockHeader.merkleRoot = Merkle.getMerkleRoot(block);
        block.mine(this.difficulty);

        this.chain.push(block);
        this.difficulty += Date.now() - parseInt(this.getLastBlock().blockHeader.timestamp) < this.blockTime ? 1 : -1;
    }

    isValid () {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i-1];

            if (currentBlock.hash !== Block.getHash(currentBlock.blockHeader) ||
                currentBlock.blockHeader.prevHash !== prevBlock.hash || 
                !Block.hasValidTransactions(currentBlock, this)) {
                return false;
            }
            return true;
        }
    }
}

class Transaction {
    constructor (from, to, amount, gas = 0, timestamp) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
        this.timestamp = timestamp;
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
