const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Uso: node generate-password-hash.js "PasswordDiAlmeno12Caratteri"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
