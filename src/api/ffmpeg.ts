import ffmpegService from '../services/ffmpeg';
import { ElectronFile } from '../types';

export async function getTranscodedFile(
    cmds: string[],
    inputFile: ElectronFile,
    fileExt: string
): Promise<ElectronFile> {
    return await ffmpegService.getTranscodedFile(cmds, inputFile, fileExt);
}
