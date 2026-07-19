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
    activeNotifTaskId: null,

    // --- Módulo Kits Jurídicos ---
    kits: [],               // Kit Jurídico: nome, categoria, tipo de prestação de serviço, lista de documentos
    templates: [],          // Modelos de documento (independentes): nome, corpo, ordem, status
    clientDocuments: [],    // Documentos gerados por cliente a partir de um Kit (nunca alteram o modelo original)
    clientAttachments: [],  // Arquivos anexados livremente ao cadastro do cliente (PDF, DOCX, imagens)
    editingKitId: null,
    editingTemplateId: null,
    activeKitsTab: "kits",           // "kits" | "templates" | "clientDocs"
    kitsSelectedClientId: "",        // cliente selecionado na aba "Documentos do Cliente"
    activeClientDocId: null,         // documento aberto no editor/visualizador
    pendingDeleteKitId: null,
    pendingDeleteTemplateId: null,
    pendingDeleteClientDocId: null,
    pendingDeleteAttachmentId: null,
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
        saveStorage(STORAGE_KEYS.tasks, appState.tasks),
        saveStorage(STORAGE_KEYS.kits, appState.kits),
        saveStorage(STORAGE_KEYS.templates, appState.templates),
        saveStorage(STORAGE_KEYS.clientDocuments, appState.clientDocuments),
        saveStorage(STORAGE_KEYS.clientAttachments, appState.clientAttachments)
    ]);
}
