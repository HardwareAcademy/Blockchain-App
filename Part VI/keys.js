const EC = require('elliptic').ec, ec = new EC('secp256k1');


const John_Private_Key = "62d101759086c306848a0c1020922a78e8402e1330981afe9404d0ecc0a4be3d";
const JOHN_KEY_PAIR = ec.keyFromPrivate(John_Private_Key, 'hex');

const Jenifer_Private_Key = "12a301658495b205738z09101812w67d7301f122087z9ef8303c0dbbz9ad2c";
const JENIFER_KEY_PAIR = ec.keyFromPrivate(Jenifer_Private_Key, 'hex');

const Bob_Private_Key = "15e301468795b406849g0d1030915f86e8503g132098fbfg505d0edd0b4cf3d";
const BOB_KEY_PAIR = ec.keyFromPrivate(Bob_Private_Key, 'hex');

const Miner_Private_Key = "33f201809376d407959b1d2030933b89f9503f2441a92bf0505e0fdd1b5cf4e";
const MINER_KEY_PAIR = ec.keyFromPrivate(Miner_Private_Key, "hex");

module.exports = {
    JOHN_KEY: JOHN_KEY_PAIR,
    JENIFER_KEY: JENIFER_KEY_PAIR,
    BOB_KEY: BOB_KEY_PAIR,
    MINER_KEY: MINER_KEY_PAIR
}