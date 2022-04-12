import path from 'path';
import * as fs from 'promise-fs';
import { FILE_STREAM_CHUNK_SIZE } from '../../config';
import { uploadStatusStore } from '../services/store';
import { ElectronFile } from '../types';

// https://stackoverflow.com/a/63111390
export const getFilesFromDir = async (dirPath: string) => {
    if (!(await fs.stat(dirPath)).isDirectory()) {
        return [dirPath];
    }

    let files: string[] = [];
    const filePaths = await fs.readdir(dirPath);

    for (const filePath of filePaths) {
        const absolute = path.join(dirPath, filePath);
        files = files.concat(await getFilesFromDir(absolute));
    }

    return files;
};

const getFileStream = async (filePath: string) => {
    const file = await fs.open(filePath, 'r');
    let offset = 0;
    const readableStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
            let buff = new Uint8Array(FILE_STREAM_CHUNK_SIZE);

            // original types were not working correctly
            const bytesRead = (await fs.read(
                file,
                buff,
                0,
                FILE_STREAM_CHUNK_SIZE,
                offset
            )) as unknown as number;
            offset += bytesRead;
            if (bytesRead === 0) {
                controller.close();
            } else {
                controller.enqueue(buff);
            }
        },
    });
    return readableStream;
};

export async function getElectronFile(filePath: string): Promise<ElectronFile> {
    const fileStats = await fs.stat(filePath);
    return {
        path: filePath.split(path.sep).join(path.posix.sep),
        name: path.basename(filePath),
        size: fileStats.size,
        lastModified: fileStats.mtime.valueOf(),
        stream: async () => {
            return await getFileStream(filePath);
        },
        blob: async () => {
            const blob = await fs.readFile(filePath);
            return new Blob([new Uint8Array(blob)]);
        },
        arrayBuffer: async () => {
            const blob = await fs.readFile(filePath);
            return new Uint8Array(blob);
        },
    };
}

export const setToUploadFiles = (
    filePaths: string[],
    collectionName: string
) => {
    if (filePaths && filePaths.length > 0) {
        uploadStatusStore.set('filePaths', filePaths);
    } else {
        uploadStatusStore.set('filePaths', []);
    }
    if (collectionName) {
        uploadStatusStore.set('collectionName', collectionName);
    } else {
        uploadStatusStore.delete('collectionName');
    }
};

export const getPendingUploads = async () => {
    const filePaths = uploadStatusStore.get('filePaths') as string[];
    const collectionName = uploadStatusStore.get('collectionName') as string;
    const validFilePaths = await getValidFilePaths(filePaths);
    return {
        files: validFilePaths
            ? await Promise.all(validFilePaths.map(getElectronFile))
            : [],
        collectionName,
    };
};

export const updatePendingUploadsFilePaths = (filePaths: string[]) => {
    uploadStatusStore.set('filePaths', filePaths);
};

const getValidFilePaths = async (filePaths: string[]) => {
    return filePaths?.filter(
        async (filePath) =>
            await fs.stat(filePath).then((stat) => stat.isFile())
    );
};

export const updateFailedFiles = (
    files: {
        filePath: string;
        fileUploadResult: number;
    }[]
) => {
    uploadStatusStore.set('failedFiles', files);
};

export const getFailedFiles = async () => {
    let failedFiles = uploadStatusStore.get('failedFiles') as {
        filePath: string;
        fileUploadResult: number;
    }[];
    const validFilePaths = await getValidFilePaths(
        failedFiles?.map(({ filePath }) => filePath)
    );
    failedFiles = failedFiles?.filter(({ filePath }) =>
        validFilePaths?.includes(filePath)
    );
    return failedFiles
        ? await Promise.all(
              failedFiles.map(async (failedFile) => {
                  const file = await getElectronFile(failedFile.filePath);
                  return {
                      file,
                      fileUploadResult: failedFile.fileUploadResult,
                  };
              })
          )
        : [];
};
