function isTransactionDuplicate (SatoshiCoin, transaction) {
    return SatoshiCoin.transactions.some(tx => JSON.stringify(tx) === JSON.stringify(transaction));
}

function isTransactionIncluded (SatoshiCoin, transaction) {
    return SatoshiCoin.chain.some(block => block.data.some(tx => JSON.stringify(tx) === JSON.stringify(transaction)));
}

function getLastBlockHash (chain) {
    const lastHeader = chain[chain.length - 1];
    return SHA256(lastHeader.nonce + lastHeader.prevHash + lastHeader.merkleRoot + lastHeader.timestamp + lastHeader.difficulty);
}

function getLastTransaction (transaction_history) {
    return transaction_history[transaction_history.length - 1];
}

function getTransactionBlock (blockchain, from, to, amount, gas, timestamp, signature) {
    for (const block of blockchain.chain) {
        for (const transaction of block.data) {
            if (transaction.from === from && 
                transaction.to === to &&
                transaction.amount === amount &&
                transaction.gas === gas &&
                transaction.timestamp === timestamp &&
                transaction.signature === signature) {
                    return block;
            }
        }
    }
    return null;
}

function isMerkleRootFound (chain, merkleRoot) {
    let found = false;
    chain.forEach(blockHeader => {
        if (blockHeader.merkleRoot === merkleRoot) {
            found = true;
        }
    });
    return found;
}

module.exports = { isTransactionIncluded, isTransactionDuplicate, getLastBlockHash, getLastTransaction, getTransactionBlock, isMerkleRootFound };