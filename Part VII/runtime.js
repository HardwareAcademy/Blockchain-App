const { bigIntable } = require('./Utils/RuntimeUtils');

function runtime (input, gas, txInfo) {
    const instructions = input.trim().replace(/\t/g, "").split("\n").map(ins => ins.trim()).filter(ins => ins !== "");
    
    const memory = {}, result = {};
    const userArgs = typeof txInfo.additionalData.txCallArgs !== "undefined" ? txInfo.additionalData.txCallArgs.map(arg => "0x" + arg.toString(16)) : [];

    let ptr = 0;
    while (
        ptr < instructions.length &&
        gas >= 0 && 
        instructions[ptr].trim() !== "stop" &&
        instructions[ptr].trim() !== "revert"
    ) {
        const line = instructions[ptr].trim();
        const command = line.split(" ").filter(tok => tok !== "")[0];
        const args = line.slice(command.length + 1).replace(/\s/g, "").split(",").filter(tok => tok !== "");

        switch (command) {
            case "set":
                setMem(args[0], getValue(args[1]));
                break;
            case "add":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) + BigInt(getValue(args[1])) ).toString(16));
                break;
            case "sub":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) - BigInt(getValue(args[1])) ).toString(16));
                break;
            case "mul":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) * BigInt(getValue(args[1])) ).toString(16));
                break;
            case "div":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) / BigInt(getValue(args[1])) ).toString(16));
                break;
            case "mod":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) % BigInt(getValue(args[1])) ).toString(16));
                break;
            case "and":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) & BigInt(getValue(args[1])) ).toString(16));
                break;
            case "or":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) | BigInt(getValue(args[1])) ).toString(16));
                break;
            case "xor":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) ^ BigInt(getValue(args[1])) ).toString(16));
                break;
            case "ls":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) << BigInt(getValue(args[1])) ).toString(16));
                break;
            case "rs":
                setMem(args[0], "0x" + ( BigInt(getValue("$" + args[0])) >> BigInt(getValue(args[1])) ).toString(16));
                break;
            case "not":
                setMem(args[0], "0x" + (~BigInt(getValue("$" + args[0]))).toString(16));
                break;
            case "gtr":
                setMem(args[0], "0x" + BigInt(getValue("$" + args[0]) > BigInt(getValue(args[1]))) ? "0x1" : "0x0");
                break;
            case "lss":
                setMem(args[0], "0x" + BigInt(getValue("$" + args[0]) < BigInt(getValue(args[1]))) ? "0x1" : "0x0");
                break;
            case "equ":
                setMem(args[0], "0x" + BigInt(getValue("$" + args[0]) === BigInt(getValue(args[1]))) ? "0x1" : "0x0");
                break;
            case "neq":
                setMem(args[0], "0x" + BigInt(getValue("$" + args[0]) !== BigInt(getValue(args[1]))) ? "0x1" : "0x0");
                break;
            case "jump":
                if (BigInt(getValue(args[0])) === 1n) {
                    const newPtr = instructions.indexOf(instructions.find(line => line.startsWith("label " + getValue(args[1]))));

                    if (newPtr !== -1) {
                        ptr = newPtr;
                    }
                }
                break;
            case "store":
                setStorage(getValue(args[0]), getValue(args[1]));
                break;
            case "pull":
                setMem(args[0], getStorage(getValue(args[1])));
                break;
            case "gas":
                setMem(args[0], "0x" + gas.toString(16));
                break;
        }
        ptr++;
        gas-=0.1;
    }


    function getValue (token) {
        if (token.startsWith("$")) {
            token = token.replace("$", "");
            if (typeof memory[token] === "undefined") {
                memory[token] = "0x0";
            }
            return memory[token];
        } else if (token.startsWith("%")) {
            token = token.replace("%", "");

            if (typeof userArgs[parseInt(token)] === "undefined") {
                return "0x0";
            } else {
                return bigIntable(userArgs[parseInt(token)]) ? "0x" + BigInt(userArgs[parseInt(token)]).toString(16) : "0x0";
            }
        } else {
            return token;
        }
    }

    function setMem (key, value) {
        memory[key] = bigIntable(value) ? "0x" + BigInt(value).toString(16) : "0x0";
    }

    function setStorage (key, value) {
        result[key] = bigIntable(value) ? "0x" + BigInt(value).toString(16) : "0x0";
    }

    function getStorage (key) {
        return result[key] ? result[key] : "0x0";
    }

    return result;
}

module.exports = { runtime }