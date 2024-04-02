
// Configuring the service
const path = require("path");
exports.HTTP_BINDING_HOST = '0.0.0.0';
exports.HTTP_BINDING_PORT = 9000;
exports.REQUEST_SIZE_LIMIT = '50mb';
exports.HTTPS_BINDING_HOST = '0.0.0.0';
exports.HTTPS_BINDING_PORT = 9002;
exports.SSL_PATH = path.resolve(__dirname, '../ssl');
exports.HTTPS_DEFAULT_KEY = path.resolve(__dirname, '../ssl/_default.key');
exports.HTTPS_DEFAULT_CERT = path.resolve(__dirname, '../ssl/_default.cer');
exports.HTTPS_CIPHERS = [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
].join(':');
