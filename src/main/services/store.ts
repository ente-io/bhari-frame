import Store, { Schema } from 'electron-store';
import { StoreType } from '../types';

export const uploadStoreSchema: Schema<StoreType> = {
    filePaths: {
        type: 'array',
        items: {
            type: 'string',
        },
    },
    collectionName: {
        type: 'string',
    },
    failedFiles: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                filePath: {
                    type: 'string',
                },
                fileUploadResult: {
                    type: 'number',
                },
            },
        },
    },
};

export const uploadStatusStore = new Store({
    name: 'upload-status',
    schema: uploadStoreSchema,
});
