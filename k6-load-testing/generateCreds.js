import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import os from 'os';

const generateRandomPassword = (len = 128) => Buffer.from(crypto.randomBytes(len)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hashPassword = (plainText) => bcrypt.hashSync(plainText, 10);

const password = generateRandomPassword();
const hashedPassword = hashPassword(password);

const outputPassword = () => {
    try {
        // Create a temporary file with restricted permissions
        const tempFile = path.join(os.tmpdir(), 'k6-auth-' + Date.now() + '.tmp');
        
        // Write password and hash to temporary file
        const authData = `${password}\n${hashedPassword}`;
        fs.writeFileSync(tempFile, authData, { mode: 0o600 }); // Only readable by owner
        
        // Output the file path for the script to use
        console.log(tempFile);
        process.exit(0);
    } catch (error) {
        console.error('Error generating password:', error.message);
        process.exit(1);
    }
}

outputPassword();