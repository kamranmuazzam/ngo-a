const crypto = require('crypto');

const token = process.argv[2];
if (!token) {
  console.error("Usage: node encrypt_token.js <YOUR_GITHUB_TOKEN>");
  process.exit(1);
}

const key = "ngo-a-secret-key"; // We use this simple key for XOR
let encryptedBytes = [];
for (let i = 0; i < token.length; i++) {
  encryptedBytes.push(token.charCodeAt(i) ^ key.charCodeAt(i % key.length));
}

const encryptedStr = Buffer.from(encryptedBytes).toString('base64');

console.log("\n=================================");
console.log("Your Encrypted Token String:");
console.log(encryptedStr);
console.log("=================================\n");
console.log("Now copy this string and paste it into src/App.tsx where it says 'INSERT_ENCRYPTED_TOKEN_HERE'");
