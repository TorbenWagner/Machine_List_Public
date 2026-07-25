import { hashPassword } from "../src/lib/auth/password";

const password = process.argv[2];

if (!password) {
  console.error("Verwendung: npm run create-password-hash -- <Passwort>");
  process.exit(1);
}

console.log(hashPassword(password));
