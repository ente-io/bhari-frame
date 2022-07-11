import { ipcRenderer } from 'electron';
import { safeStorageStore } from '../services/store';

export async function setEncryptionKey(encryptionKey: string) {
    try {
        const encryptedKey: Buffer = await ipcRenderer.invoke(
            'safeStorage-encrypt',
            encryptionKey
        );
        const b64EncryptedKey = Buffer.from(encryptedKey).toString('base64');
        safeStorageStore.set('encryptionKey', b64EncryptedKey);
    } catch (e) {
        console.log(e);
        throw e;
    }
}

export async function getEncryptionKey() {
    try {
        const b64EncryptedKey = safeStorageStore.get('encryptionKey');
        if (b64EncryptedKey) {
            const keyBuffer = new Uint8Array(
                Buffer.from(b64EncryptedKey, 'base64')
            );
            return await ipcRenderer.invoke('safeStorage-decrypt', keyBuffer);
        }
    } catch (e) {
        console.log(e);
        throw e;
    }
}