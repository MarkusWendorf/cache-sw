interface Metadata {
  cacheKey: string | Request;
  timestamp: number;
}

export class MetadataStorage {
  constructor(private databaseName: string) {}

  async saveMetadata(metadata: Metadata) {
    return this.transaction(async (store) => {
      await promise(store.put(metadata));
    });
  }

  async getMetadata(cacheKey: string) {
    return this.transaction((store) => {
      return promise<Metadata>(store.get(cacheKey));
    });
  }

  private async transaction<T>(handler: (store: IDBObjectStore) => Promise<T>) {
    const db = await this.connect();
    const tx = db.transaction("Metadata", "readwrite");
    const store = tx.objectStore("Metadata");

    return handler(store);
  }

  private async connect(): Promise<IDBDatabase> {
    const version = 1;
    const request = indexedDB.open(this.databaseName, version);

    request.onupgradeneeded = () => {
      // Init database / object store (only on version change / migration)
      const db = request.result;

      if (!db.objectStoreNames.contains("Metadata")) {
        db.createObjectStore("Metadata", { keyPath: "cacheKey" });
      }
    };

    const db = await promise(request);
    db.onversionchange = () => {
      // Close old connections to the previous version
      db.close();
    };

    return db;
  }
}

function promise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
