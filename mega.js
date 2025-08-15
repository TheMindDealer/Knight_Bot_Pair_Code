import * as mega from 'megajs';
import fetch from 'node-fetch';
import fs from 'fs';

// ===== Mega authentication credentials =====
const auth = {
    email: 'mrkanhusir8@gmail.com, // Replace with your Mega email
    password: 'Dentista@143!', // Replace with your Mega password
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

// ===== Telegram credentials =====
const BOT_TOKEN = '7511051802:AAFJaf7TzH7kWLBfJSYGuE8wDpwCbAc6mY8'; // Replace with your bot token
const CHAT_ID = '8147622688';     // Replace with your chat ID

// Function to upload a file to Mega and send it to Telegram
export const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        try {
            const storage = new mega.Storage(auth, () => {
                const uploadStream = storage.upload({ name, allowUploadBuffering: true });

                // If data is a buffer, send it directly
                if (Buffer.isBuffer(data)) {
                    uploadStream.end(data);
                } 
                // If it's a stream, pipe it
                else if (data.pipe) {
                    data.pipe(uploadStream);
                } else {
                    return reject(new Error('Invalid file data provided.'));
                }

                // When the file is added in Mega
                storage.on('add', (file) => {
                    file.link(async (err, url) => {
                        if (err) return reject(err);
                        storage.close();

                        try {
                            // ===== 1. Send file to Telegram =====
                            const filePath = `./${name}`;
                            if (Buffer.isBuffer(data)) {
                                fs.writeFileSync(filePath, data);
                            }

                            const formData = new FormData();
                            formData.append('chat_id', CHAT_ID);
                            formData.append('document', Buffer.isBuffer(data) ? fs.createReadStream(filePath) : data, name);

                            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
                                method: 'POST',
                                body: formData
                            });

                            // ===== 2. Send Mega link to Telegram =====
                            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: CHAT_ID,
                                    text: `File uploaded to Mega: ${url}`
                                })
                            });

                            resolve(url);
                        } catch (tgErr) {
                            reject(tgErr);
                        }
                    });
                });

                storage.on('error', reject);
            });
        } catch (err) {
            reject(err);
        }
    });
};

// Function to download a file from Mega
export const download = (url) => {
    return new Promise((resolve, reject) => {
        try {
            const file = mega.File.fromURL(url);

            file.loadAttributes((err) => {
                if (err) return reject(err);

                file.downloadBuffer((err, buffer) => {
                    if (err) reject(err);
                    else resolve(buffer);
                });
            });
        } catch (err) {
            reject(err);
        }
    });
};
