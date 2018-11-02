'use strict';

const crypto = require('crypto');

const SHA256 = 'sha256'; // md5
const HEX = 'hex'; // base46
const UTF8 = 'utf8';
const AES192 = 'aes192';

const secret = process.env.SECRET || 'I like c00king @ java. It is #1';
const love = process.env.SALT || 'OATgJw6SgiGd9ny5vr6NCF6cKY65CXkfFZ0NZCZk5H4HIDRYmzdHlvAAUddhUmMa';
const secretHash = crypto.createHmac(SHA256, secret).update(love).digest(HEX);

function _createHash(value, type) {
    type = (type || HEX);
    let res = crypto.createHash(SHA256).update(value, UTF8).digest(type);
    return res;
};

function _encode(value) {
    let cipher = crypto.createCipher(AES192, secretHash);
    let encrypted = cipher.update(JSON.stringify(value), UTF8, HEX) + cipher.final(HEX);
    return encrypted;
};

function _decode(value) {
    let decipher = crypto.createDecipher(AES192, secretHash);
    let decrypted = decipher.update(value, HEX, UTF8) + decipher.final(UTF8);
    try {
        decrypted = JSON.parse(decrypted);
    } catch (e) {}
    return decrypted;
};

module.exports = {
    hash: _createHash,
    encode: _encode,
    decode: _decode
};