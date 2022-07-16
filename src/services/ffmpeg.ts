import pathToFfmpeg from 'ffmpeg-static';
import * as fs from 'promise-fs';
import path from 'path';
import { ElectronFile } from '../types';
const shellescape = require('any-shell-escape');
import util from 'util';
const exec = util.promisify(require('child_process').exec);
import { doesFolderExists, getElectronFile } from './fs';
import { emptyDir } from 'fs-extra';
import { ipcRenderer } from 'electron';
import { logError } from '../utils/logging';

const ENTE_TEMP_FOLDER_NAME = 'ente_ffmpeg_temp';

class FfmpegService {
    ffmpegPath: string;

    constructor() {
        this.clearEnteTempFolder();
        this.ffmpegPath = pathToFfmpeg.replace('app.asar', 'app.asar.unpacked');
    }

    async getTranscodedFile(
        cmds: string[],
        inputFile: ElectronFile,
        outputFileExt: string
    ): Promise<ElectronFile> {
        try {
            await this.createEnteTempFolder();
            const outputFileName = this.genRandomName(10) + '.' + outputFileExt;
            const outputFilePath =
                (await this.getTempFolderPath()) + path.sep + outputFileName;
            for (let i = 0; i < cmds.length; i++) {
                if (cmds[i] === 'FFMPEG') {
                    cmds[i] = this.ffmpegPath;
                } else if (cmds[i] === 'INPUT') {
                    cmds[i] = inputFile.path
                        .split(path.posix.sep)
                        .join(path.sep);
                } else if (cmds[i] === 'OUTPUT') {
                    cmds[i] = outputFilePath;
                }
            }
            const cmd = shellescape(cmds);
            console.log('cmd', cmd);
            await exec(cmd);
            const outputFile = await getElectronFile(outputFilePath);
            return outputFile;
        } catch (err) {
            console.log(err);
            logError(err, 'ffmpeg run command error');
        }
    }

    genRandomName(length: number) {
        let result = '';
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
        }
        return result;
    }

    async getTempFolderPath() {
        const tempPath = (await ipcRenderer.invoke('get-temp-path')) as string;
        return tempPath + path.sep + ENTE_TEMP_FOLDER_NAME;
    }

    async createEnteTempFolder() {
        const tempFolder = await this.getTempFolderPath();
        if (!(await doesFolderExists(tempFolder))) {
            await fs.mkdir(tempFolder, { recursive: true });
        }
    }

    async clearEnteTempFolder() {
        const tempFolder = await this.getTempFolderPath();
        if (await doesFolderExists(tempFolder)) {
            await emptyDir(tempFolder);
        }
    }
}

export default new FfmpegService();
