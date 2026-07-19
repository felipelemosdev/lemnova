// js/storage.js
// Módulo independente responsável por toda a camada de persistência do Jures One.
// Concentra: chaves de armazenamento, configuração do IndexedDB, inicialização do banco,
// migração de dados legados do localStorage e as funções de leitura/gravação/remoção
// usadas pelo restante da aplicação (readStorage / saveStorage / removeStorage).

export const STORAGE_KEYS = {
    session: "juresone.session",
    clients: "juresone.clients",
    documents: "juresone.documents",
    finance: "juresone.finance",
    events: "juresone.events",
    tasks: "juresone.tasks",
    kits: "juresone.kits",
    templates: "juresone.templates",
    clientDocuments: "juresone.clientDocuments",
    clientAttachments: "juresone.clientAttachments",
    contractPdfTemplates: "juresone.contractPdfTemplates",
    initialized: "juresone.initialized"
};

// versão 2: adiciona as object stores do módulo de Kits Jurídicos (kits, modelos de
// documento, documentos gerados por cliente e anexos do cliente).
// versão 3: adiciona a store de modelos de contrato em PDF (contractPdfTemplates), usada
// pelos tipos de contrato que ainda não têm cláusulas próprias cadastradas em contract.js —
// o usuário anexa o PDF original do contrato e ele é reaproveitado para todos os clientes
// daquele tipo. O bloco "upgradeneeded" cria apenas as stores que ainda não existirem,
// então bancos já abertos em versões anteriores são atualizados automaticamente sem perda
// de dados.
const DATABASE_CONFIG = {
    name: "juresone.database",
    version: 3,
    stores: {
        [STORAGE_KEYS.clients]: "clients",
        [STORAGE_KEYS.documents]: "documents",
        [STORAGE_KEYS.finance]: "finance",
        [STORAGE_KEYS.events]: "events",
        [STORAGE_KEYS.tasks]: "tasks",
        [STORAGE_KEYS.kits]: "kits",
        [STORAGE_KEYS.templates]: "templates",
        [STORAGE_KEYS.clientDocuments]: "clientDocuments",
        [STORAGE_KEYS.clientAttachments]: "clientAttachments",
        [STORAGE_KEYS.contractPdfTemplates]: "contractPdfTemplates",
    },
    metaStore: "meta",
    legacyMigratedKey: "legacyMigrated"
};

// Estado interno do módulo: conexão ativa com o IndexedDB (ou null se indisponível).
let appDatabase = null;

/**
 * Abre (ou cria) a conexão com o IndexedDB. Deve ser chamada uma vez, no boot da aplicação.
 * Caso o navegador não suporte IndexedDB, ou a abertura falhe, o módulo cai automaticamente
 * para o modo de armazenamento simples via localStorage.
 */
export async function initializeDatabase() {
    if (!window.indexedDB) {
        return;
    }

    try {
        appDatabase = await openDatabase();
    } catch (error) {
        appDatabase = null;
        console.warn("Falha ao abrir banco de dados local. Usando armazenamento simples.", error);
    }
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DATABASE_CONFIG.name, DATABASE_CONFIG.version);

        request.addEventListener("upgradeneeded", () => {
            const database = request.result;

            Object.values(DATABASE_CONFIG.stores).forEach((storeName) => {
                if (!database.objectStoreNames.contains(storeName)) {
                    database.createObjectStore(storeName, { keyPath: "id" });
                }
            });

            if (!database.objectStoreNames.contains(DATABASE_CONFIG.metaStore)) {
                database.createObjectStore(DATABASE_CONFIG.metaStore, { keyPath: "key" });
            }
        });

        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error));
        request.addEventListener("blocked", () => {
            console.warn("Atualizacao do banco local bloqueada por outra aba aberta.");
        });
    });
}

/**
 * Migra, uma única vez, os dados que estejam gravados no localStorage (versão antiga do app)
 * para dentro do IndexedDB. Marca a migração como concluída em DATABASE_CONFIG.legacyMigratedKey
 * para não repetir o processo em execuções futuras.
 */
export async function migrateLegacyStorage() {
    if (!appDatabase) {
        return;
    }

    const alreadyMigrated = await readDatabaseMeta(DATABASE_CONFIG.legacyMigratedKey, false);
    if (alreadyMigrated) {
        return;
    }

    const legacyCollections = {
        [STORAGE_KEYS.clients]: readLegacyStorage(STORAGE_KEYS.clients, []),
        [STORAGE_KEYS.documents]: readLegacyStorage(STORAGE_KEYS.documents, []),
        [STORAGE_KEYS.finance]: readLegacyStorage(STORAGE_KEYS.finance, []),
        [STORAGE_KEYS.events]: readLegacyStorage(STORAGE_KEYS.events, [])
    };
    const hasLegacyData = Object.values(legacyCollections).some((items) => items.length > 0);

    await Promise.all(Object.entries(legacyCollections).map(([key, records]) => {
        if (!records.length) {
            return Promise.resolve();
        }

        return replaceDatabaseStore(DATABASE_CONFIG.stores[key], records);
    }));

    const legacySession = readLegacyStorage(STORAGE_KEYS.session, null);
    if (legacySession) {
        await saveDatabaseMeta(getDatabaseMetaKey(STORAGE_KEYS.session), legacySession);
    }

    const legacyInitialized = readLegacyStorage(STORAGE_KEYS.initialized, false);
    if (legacyInitialized || hasLegacyData) {
        await saveDatabaseMeta(getDatabaseMetaKey(STORAGE_KEYS.initialized), legacyInitialized || hasLegacyData);
    }

    await saveDatabaseMeta(DATABASE_CONFIG.legacyMigratedKey, true);
}

/**
 * Lê uma coleção/valor. Prioriza IndexedDB (object store dedicado ou meta store);
 * cai para localStorage quando o banco não está disponível.
 */
export async function readStorage(key, fallback) {
    try {
        const storeName = DATABASE_CONFIG.stores[key];
        const metaKey = getDatabaseMetaKey(key);

        if (appDatabase && storeName) {
            return sortNewestFirst(await readDatabaseStore(storeName));
        }

        if (appDatabase && metaKey) {
            return await readDatabaseMeta(metaKey, fallback);
        }

        return readLegacyStorage(key, fallback);
    } catch (error) {
        console.warn(`Falha ao ler ${key}`, error);
        return readLegacyStorage(key, fallback);
    }
}

/**
 * Grava uma coleção/valor. Prioriza IndexedDB; cai para localStorage quando o banco
 * não está disponível.
 */
export async function saveStorage(key, value) {
    const storeName = DATABASE_CONFIG.stores[key];
    const metaKey = getDatabaseMetaKey(key);

    if (appDatabase && storeName) {
        await replaceDatabaseStore(storeName, value);
        return;
    }

    if (appDatabase && metaKey) {
        await saveDatabaseMeta(metaKey, value);
        return;
    }

    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Remove um valor tanto do meta store do IndexedDB quanto do localStorage (garante
 * limpeza mesmo que a aplicação alterne de modo de armazenamento entre execuções).
 */
export async function removeStorage(key) {
    const metaKey = getDatabaseMetaKey(key);

    if (appDatabase && metaKey) {
        await deleteDatabaseMeta(metaKey);
    }

    localStorage.removeItem(key);
}

function readLegacyStorage(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
        console.warn(`Falha ao ler ${key}`, error);
        return fallback;
    }
}

function readDatabaseStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = appDatabase.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).getAll();

        request.addEventListener("success", () => resolve(request.result || []));
        request.addEventListener("error", () => reject(request.error));
    });
}

function replaceDatabaseStore(storeName, records) {
    return new Promise((resolve, reject) => {
        const transaction = appDatabase.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        transaction.addEventListener("complete", () => resolve());
        transaction.addEventListener("error", () => reject(transaction.error));
        transaction.addEventListener("abort", () => reject(transaction.error));

        store.clear();
        records.forEach((record) => {
            store.put(record);
        });
    });
}

function readDatabaseMeta(key, fallback) {
    return new Promise((resolve, reject) => {
        const transaction = appDatabase.transaction(DATABASE_CONFIG.metaStore, "readonly");
        const request = transaction.objectStore(DATABASE_CONFIG.metaStore).get(key);

        request.addEventListener("success", () => {
            resolve(request.result ? request.result.value : fallback);
        });
        request.addEventListener("error", () => reject(request.error));
    });
}

function saveDatabaseMeta(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = appDatabase.transaction(DATABASE_CONFIG.metaStore, "readwrite");
        const store = transaction.objectStore(DATABASE_CONFIG.metaStore);

        transaction.addEventListener("complete", () => resolve());
        transaction.addEventListener("error", () => reject(transaction.error));
        transaction.addEventListener("abort", () => reject(transaction.error));

        store.put({ key, value });
    });
}

function deleteDatabaseMeta(key) {
    return new Promise((resolve, reject) => {
        const transaction = appDatabase.transaction(DATABASE_CONFIG.metaStore, "readwrite");
        const store = transaction.objectStore(DATABASE_CONFIG.metaStore);

        transaction.addEventListener("complete", () => resolve());
        transaction.addEventListener("error", () => reject(transaction.error));
        transaction.addEventListener("abort", () => reject(transaction.error));

        store.delete(key);
    });
}

function getDatabaseMetaKey(key) {
    const metaKeys = {
        [STORAGE_KEYS.session]: "session",
        [STORAGE_KEYS.initialized]: "initialized"
    };

    return metaKeys[key] || "";
}

function sortNewestFirst(records) {
    return [...records].sort((first, second) => getRecordTimestamp(second) - getRecordTimestamp(first));
}

function getRecordTimestamp(record) {
    return Date.parse(record.createdAt || record.updatedAt || "") || Number(String(record.id || "").split("-")[0]) || 0;
}
