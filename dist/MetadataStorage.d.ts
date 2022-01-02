interface Metadata {
    cacheKey: string | Request;
    timestamp: number;
}
export declare class MetadataStorage {
    private databaseName;
    constructor(databaseName: string);
    saveMetadata(metadata: Metadata): Promise<void>;
    getMetadata(cacheKey: string): Promise<Metadata>;
    private transaction;
    private connect;
}
export {};
