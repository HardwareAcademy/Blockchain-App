const crypto = require('crypto'); SHA256 = message => crypto.createHash('sha256').update(message).digest('hex');

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
}

class Blockchain {
    constructor () {
        this.chain = [new Block(['Genesis Block'])];
        this.difficulty = 2;
        this.blockTime = 5000;
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

            if (currentBlock.hash !== currentBlock.getHash() || currentBlock.prevHash !== prevBlock.hash) {
                return false;
            }
            return true;
        }
    }
}

const SatoshiCoin = new Blockchain();
SatoshiCoin.addBlock(new Block(['Transaction 1']));
SatoshiCoin.addBlock(new Block(['Transaction 2']));
SatoshiCoin.addBlock(new Block(['Transaction 3']));
SatoshiCoin.chain[1].data = ['This is Hacked!!'];
console.log(SatoshiCoin.chain);
console.log("Is Blockchain Valid:", SatoshiCoin.isValid());