const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto'); SHA256 = message => crypto.createHash('sha256').update(message).digest('hex');

function getMerkleRoot (block) {
    const leaves = block.data.map(transaction => SHA256(JSON.stringify(transaction)));
    const tree = new MerkleTree(leaves, SHA256);
    const root = tree.getRoot().toString('hex');
    return root;
}

function getMerkleProof (leaves, transaction) {
    const tree = new MerkleTree(leaves, SHA256);
    const proof = tree.getProof(SHA256(JSON.stringify(transaction)));
    return proof;
}

function verifyTransaction (proof, leaves, targetNode, merkleRoot) {
    const tree = new MerkleTree(leaves, SHA256);
    const leaf = SHA256(JSON.stringify(targetNode));
    return tree.verify(proof, leaf, merkleRoot);
}

module.exports = { getMerkleRoot, getMerkleProof, verifyTransaction };