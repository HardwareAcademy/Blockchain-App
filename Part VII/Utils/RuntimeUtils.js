
function bigIntable (str) {
    try {
        BigInt(str);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = { bigIntable };