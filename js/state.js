// js/state.js
// Estado central da aplicação (appState) e os helpers que operam diretamente sobre ele:
// busca de cliente por id e persistência conjunta de todas as coleções.

import { STORAGE_KEYS, saveStorage } from "./storage.js";

export const appState = {
    currentView: "dashboard",
    clients: [],
    documents: [],
    finance: [],
    events: [],
    editingClientId: null,
    editingEventId: null,
    pendingDeleteClientId: null,
    pendingDeleteFinanceId: null,
    activeClientDetailsId: null,
    lastCepLookup: "",
    clockTimer: null,
    tasks: [],
    activeReplyTaskId: null,
};

export function findClient(clientId) {
    return appState.clients.find((client) => client.id === clientId);
}


export async function persistAll() {
    await Promise.all([
        saveStorage(STORAGE_KEYS.clients, appState.clients),
        saveStorage(STORAGE_KEYS.documents, appState.documents),
        saveStorage(STORAGE_KEYS.finance, appState.finance),
        saveStorage(STORAGE_KEYS.events, appState.events),
        saveStorage(STORAGE_KEYS.tasks, appState.tasks)
    ]);
}
