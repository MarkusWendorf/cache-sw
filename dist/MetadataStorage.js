"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataStorage = void 0;
class MetadataStorage {
    constructor(databaseName) {
        Object.defineProperty(this, "databaseName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: databaseName
        });
    }
    saveMetadata(metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transaction((store) => __awaiter(this, void 0, void 0, function* () {
                yield promise(store.put(metadata));
            }));
        });
    }
    getMetadata(cacheKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transaction((store) => {
                return promise(store.get(cacheKey));
            });
        });
    }
    transaction(handler) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield this.connect();
            const tx = db.transaction("Metadata", "readwrite");
            const store = tx.objectStore("Metadata");
            return handler(store);
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const version = 1;
            const request = indexedDB.open(this.databaseName, version);
            request.onupgradeneeded = () => {
                // Init database / object store (only on version change / migration)
                const db = request.result;
                if (!db.objectStoreNames.contains("Metadata")) {
                    db.createObjectStore("Metadata", { keyPath: "cacheKey" });
                }
            };
            const db = yield promise(request);
            db.onversionchange = () => {
                // Close old connections to the previous version
                db.close();
            };
            return db;
        });
    }
}
exports.MetadataStorage = MetadataStorage;
function promise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
