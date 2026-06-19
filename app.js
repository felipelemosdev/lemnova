// Jures One usa uma camada simples de estado para facilitar futura migração para React ou backend Node.js.
const STORAGE_KEYS = {
    session: "juresone.session",
    clients: "juresone.clients",
    documents: "juresone.documents",
    finance: "juresone.finance",
    events: "juresone.events",
    initialized: "juresone.initialized"
};

const DATABASE_CONFIG = {
    name: "juresone.database",
    version: 1,
    stores: {
        [STORAGE_KEYS.clients]: "clients",
        [STORAGE_KEYS.documents]: "documents",
        [STORAGE_KEYS.finance]: "finance",
        [STORAGE_KEYS.events]: "events",
    },
    metaStore: "meta",
    legacyMigratedKey: "legacyMigrated"
};

const appState = {
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
};

const elements = {};
let appDatabase = null;

document.addEventListener("DOMContentLoaded", async () => {
    cacheElements();
    bindEvents();
    await initializeDatabase();
    await migrateLegacyStorage();
    await loadState();
    await seedInitialData();
    await hydrateSession();
    showClientMode("list");
    renderAll();
    startClock();
});

function cacheElements() {
    elements.loginView = document.getElementById("loginView");
    elements.systemView = document.getElementById("systemView");
    elements.loginForm = document.getElementById("loginForm");
    elements.loginUser = document.getElementById("loginUser");
    elements.loginPassword = document.getElementById("loginPassword");
    elements.loginMessage = document.getElementById("loginMessage");
    elements.logoutButton = document.getElementById("logoutButton");
    elements.confirmOverlay = document.getElementById("confirmOverlay");
    elements.cancelDeleteButton = document.getElementById("cancelDeleteButton");
    elements.confirmDeleteButton = document.getElementById("confirmDeleteButton");
    elements.mobileMenuButton = document.getElementById("mobileMenuButton");
    elements.sidebar = document.querySelector(".sidebar");
    elements.navLinks = document.querySelectorAll(".nav-link");
    elements.pageTitle = document.getElementById("pageTitle");
    elements.dateDisplays = document.querySelectorAll(".date-display");
    elements.sections = {
        dashboard: document.getElementById("dashboardSection"),
        clients: document.getElementById("clientsSection"),
        documents: document.getElementById("documentsSection"),
        finance: document.getElementById("financeSection")
    };
    elements.clientForm = document.getElementById("clientForm");
    elements.clientFormTitle = document.getElementById("clientFormTitle");
    elements.cancelClientEdit = document.getElementById("cancelClientEdit");
    elements.clientId = document.getElementById("clientId");
    elements.clientName = document.getElementById("clientName");
    elements.clientEmail = document.getElementById("clientEmail");
    elements.clientPhone = document.getElementById("clientPhone");
    elements.clientInssPassword = document.getElementById("clientInssPassword");
    elements.clientDocument = document.getElementById("clientDocument");
    elements.clientCpfMessage = document.getElementById("clientCpfMessage");
    elements.clientCep = document.getElementById("clientCep");
    elements.clientCepMessage = document.getElementById("clientCepMessage");
    elements.clientStreet = document.getElementById("clientStreet");
    elements.clientNumber = document.getElementById("clientNumber");
    elements.clientDistrict = document.getElementById("clientDistrict");
    elements.clientCity = document.getElementById("clientCity");
    elements.clientState = document.getElementById("clientState");
    elements.clientComplement = document.getElementById("clientComplement");
    elements.clientArea = document.getElementById("clientArea");
    elements.clientStatus = document.getElementById("clientStatus");
    elements.clientNotes = document.getElementById("clientNotes");
    elements.clientPhoto = document.getElementById("clientPhoto");
    elements.clientPdf = document.getElementById("clientPdf");
    elements.clientPhotoPreview = document.getElementById("clientPhotoPreview");
    elements.clientPhotoPlaceholder = document.getElementById("clientPhotoPlaceholder");
    elements.showClientRegister = document.getElementById("showClientRegister");
    elements.showClientList = document.getElementById("showClientList");
    elements.registeredClientsPanel = document.getElementById("registeredClientsPanel");
    elements.clientSearch = document.getElementById("clientSearch");
    elements.clientTableBody = document.getElementById("clientTableBody");
    elements.clientEmptyState = document.getElementById("clientEmptyState");
    elements.eventForm = document.getElementById("eventForm");
    elements.eventType = document.getElementById("eventType");
    elements.eventDate = document.getElementById("eventDate");
    elements.eventTime = document.getElementById("eventTime");
    elements.eventClient = document.getElementById("eventClient");
    elements.eventAlert = document.getElementById("eventAlert");
    elements.eventNotes = document.getElementById("eventNotes");
    elements.cancelEventEdit = document.getElementById("cancelEventEdit");
    elements.saveEventButton = document.getElementById("saveEventButton");
    elements.eventSearch = document.getElementById("eventSearch");
    elements.eventList = document.getElementById("eventList");
    elements.calendarToday = document.getElementById("calendarToday");
    elements.calendarNextEvent = document.getElementById("calendarNextEvent");
    elements.eventCount = document.getElementById("eventCount");
    elements.eventAlertCount = document.getElementById("eventAlertCount");
    elements.documentForm = document.getElementById("documentForm");
    elements.documentTitle = document.getElementById("documentTitle");
    elements.documentClient = document.getElementById("documentClient");
    elements.documentFile = document.getElementById("documentFile");
    elements.processClass = document.getElementById("processClass");
    elements.processCourt = document.getElementById("processCourt");
    elements.processPhase = document.getElementById("processPhase");
    elements.processMovement = document.getElementById("processMovement");
    elements.documentList = document.getElementById("documentList");
    elements.documentEmptyState = document.getElementById("documentEmptyState");
    elements.documentPreviewOverlay = document.getElementById("documentPreviewOverlay");
    elements.documentPreviewTitle = document.getElementById("documentPreviewTitle");
    elements.documentPreviewMeta = document.getElementById("documentPreviewMeta");
    elements.documentPreviewBody = document.getElementById("documentPreviewBody");
    elements.closeDocumentPreview = document.getElementById("closeDocumentPreview");
    elements.financeForm = document.getElementById("financeForm");
    elements.financeType = document.getElementById("financeType");
    elements.financeCategory = document.getElementById("financeCategory");
    elements.financeAmount = document.getElementById("financeAmount");
    elements.financeDate = document.getElementById("financeDate");
    elements.financeClient = document.getElementById("financeClient");
    elements.financeDescription = document.getElementById("financeDescription");
    elements.financeTableBody = document.getElementById("financeTableBody");
    elements.financeEmptyState = document.getElementById("financeEmptyState");
    elements.feesTotal = document.getElementById("feesTotal");
    elements.paymentsTotal = document.getElementById("paymentsTotal");
    elements.receiptsTotal = document.getElementById("receiptsTotal");
    elements.taskForm = document.getElementById("taskForm");
    elements.taskList = document.getElementById("taskList");
    elements.taskTitle = document.getElementById("taskTitle");
    elements.taskResponsible = document.getElementById("taskResponsible");
    elements.taskPriority = document.getElementById("taskPriority");
    elements.taskDueDate = document.getElementById("taskDueDate");
    elements.taskDescription = document.getElementById("taskDescription");
}

function bindEvents() {
    elements.loginForm.addEventListener("submit", handleLogin);
    elements.logoutButton.addEventListener("click", handleLogout);
    elements.cancelDeleteButton.addEventListener("click", closeConfirmModal);
    elements.confirmDeleteButton.addEventListener("click", confirmClientDelete);
    elements.mobileMenuButton.addEventListener("click", toggleMobileMenu);
    elements.clientForm.addEventListener("submit", handleClientSubmit);
    elements.cancelClientEdit.addEventListener("click", resetClientForm);
    elements.showClientRegister.addEventListener("click", () => showClientMode("register"));
    elements.showClientList.addEventListener("click", () => showClientMode("list"));
    elements.clientPhoto.addEventListener("change", handlePhotoPreview);
    elements.clientDocument.addEventListener("input", handleCpfInput);
    elements.clientDocument.addEventListener("blur", validateClientCpf);
    elements.clientCep.addEventListener("input", handleCepInput);
    elements.clientCep.addEventListener("blur", lookupCep);
    elements.clientState.addEventListener("input", () => {
        elements.clientState.value = elements.clientState.value.toUpperCase();
    });
    elements.clientSearch.addEventListener("input", renderClients);
    elements.clientTableBody.addEventListener("click", handleClientTableClick);
    elements.eventForm.addEventListener("submit", handleEventSubmit);
    elements.cancelEventEdit.addEventListener("click", resetEventForm);
    elements.eventSearch.addEventListener("input", renderEvents);
    elements.eventList.addEventListener("click", handleEventListClick);
    elements.documentForm.addEventListener("submit", handleDocumentSubmit);
    elements.documentList.addEventListener("click", handleDocumentListClick);
    elements.closeDocumentPreview.addEventListener("click", closeDocumentPreview);
    elements.documentPreviewOverlay.addEventListener("click", handlePreviewOverlayClick);
    elements.financeForm.addEventListener("submit", handleFinanceSubmit);
    elements.financeTableBody.addEventListener("click", handleFinanceTableClick);
    document.addEventListener("keydown", handleGlobalKeydown);

    elements.navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            setActiveView(link.dataset.view);
            elements.sidebar.classList.remove("open");
        });
    });
}

async function initializeDatabase() {
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

async function migrateLegacyStorage() {
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

async function loadState() {
    appState.clients = await readStorage(STORAGE_KEYS.clients, []);
    appState.documents = await readStorage(STORAGE_KEYS.documents, []);
    appState.finance = await readStorage(STORAGE_KEYS.finance, []);
    appState.events = await readStorage(STORAGE_KEYS.events, []);
}

async function readStorage(key, fallback) {
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

async function saveStorage(key, value) {
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

async function removeStorage(key) {
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

async function seedInitialData() {
    const isInitialized = await readStorage(STORAGE_KEYS.initialized, false);
    const hasStoredData = appState.clients.length || appState.finance.length || appState.documents.length || appState.events.length;

    if (isInitialized) {
        return;
    }

    if (hasStoredData) {
        await saveStorage(STORAGE_KEYS.initialized, true);
        return;
    }

    appState.clients = [
        {
            id: createId(),
            name: "Mariana Azevedo",
            email: "mariana@empresa.com",
            phone: "(11) 98888-1200",
            inssPassword: "meuinss2026",
            document: "529.982.247-25",
            address: {
                cep: "01001-000",
                street: "Praça da Sé",
                number: "100",
                district: "Sé",
                city: "São Paulo",
                state: "SP",
                complement: "Conjunto 12"
            },
            area: "Empresarial",
            status: "Ativo",
            notes: "Contrato societário em revisão.",
            photoData: "",
            photoName: "",
            createdAt: new Date().toISOString()
        },
        {
            id: createId(),
            name: "Carlos Henrique",
            email: "carlos@email.com",
            phone: "(21) 97777-4500",
            inssPassword: "insscliente",
            document: "111.444.777-35",
            address: {
                cep: "20040-020",
                street: "Rua da Assembleia",
                number: "45",
                district: "Centro",
                city: "Rio de Janeiro",
                state: "RJ",
                complement: "Sala 902"
            },
            area: "Trabalhista",
            status: "Em análise",
            notes: "Aguardando documentos complementares.",
            photoData: "",
            photoName: "",
            createdAt: new Date().toISOString()
        }
    ];

    appState.finance = [
        {
            id: createId(),
            type: "Entrada",
            category: "Honorário",
            amount: 4500,
            date: todayISO(),
            clientId: appState.clients[0].id,
            description: "Contrato mensal de consultoria"
        },
        {
            id: createId(),
            type: "Saída",
            category: "Custo de escritório",
            amount: 680,
            date: todayISO(),
            clientId: "",
            description: "Custas processuais"
        }
    ];

    appState.events = [
        {
            id: createId(),
            type: "Avaliação social",
            date: todayISO(),
            time: "09:00",
            clientId: appState.clients[0].id,
            alert: "1 dia antes",
            notes: "Levar documentos pessoais e comprovante de residência.",
            createdAt: new Date().toISOString()
        }
    ];

    await persistAll();
    await saveStorage(STORAGE_KEYS.initialized, true);
}

async function hydrateSession() {
    const session = await readStorage(STORAGE_KEYS.session, null);
    if (session && session.user) {
        showSystem();
    } else {
        showLogin();
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const user = elements.loginUser.value.trim();
    const password = elements.loginPassword.value.trim();

    if (!user || password.length < 4) {
        elements.loginMessage.textContent = "Informe login de usuário e senha com pelo menos 4 caracteres.";
        return;
    }

    await saveStorage(STORAGE_KEYS.session, {
        user,
        loggedAt: new Date().toISOString()
    });

    elements.loginMessage.textContent = "";
    elements.loginForm.reset();
    showSystem();
}

async function handleLogout() {
    await removeStorage(STORAGE_KEYS.session);
    showLogin();
}

function showLogin() {
    elements.loginView.classList.remove("hidden");
    elements.systemView.classList.add("hidden");
}

function showSystem() {
    elements.loginView.classList.add("hidden");
    elements.systemView.classList.remove("hidden");
    setActiveView(appState.currentView);
}

function setActiveView(viewName) {
    const titles = {
        dashboard: "Dashboard",
        clients: "Clientes",
        documents: "Processos",
        finance: "Financeiro"
    };

    appState.currentView = viewName;
    elements.pageTitle.textContent = titles[viewName];

    Object.entries(elements.sections).forEach(([key, section]) => {
        section.classList.toggle("active-section", key === viewName);
    });

    elements.navLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.view === viewName);
    });
}

function toggleMobileMenu() {
    elements.sidebar.classList.toggle("open");
}

async function handleClientSubmit(event) {
    event.preventDefault();

    const isCpfValid = validateClientCpf();
    const isCepValid = validateClientCep();

    if (!isCpfValid || !isCepValid) {
        return;
    }

    const existingClient = appState.editingClientId ? findClient(appState.editingClientId) : null;
    const previousClients = [...appState.clients];
    const photoFile = elements.clientPhoto.files[0];
    const pdfFile = elements.clientPdf.files[0];
    let photoData = existingClient ? existingClient.photoData || "" : "";
    let photoName = existingClient ? existingClient.photoName || "" : "";
    let pdfData = existingClient ? existingClient.pdfData || "" : "";
    let pdfName = existingClient ? existingClient.pdfName || "" : "";
    let pdfSize = existingClient ? existingClient.pdfSize || 0 : 0;

    if (photoFile) {
        if (!isAllowedImage(photoFile)) {
            alert("Envie uma foto 3x4 em JPG ou PNG.");
            return;
        }

        try {
            photoData = await fileToDataURL(photoFile);
        } catch (error) {
            alert("Não foi possível ler a foto selecionada.");
            return;
        }

        photoName = photoFile.name;
    }

    if (pdfFile) {
        if (!isAllowedPdf(pdfFile)) {
            alert("Envie um arquivo em PDF para anexar ao cadastro do cliente.");
            return;
        }

        try {
            pdfData = await fileToDataURL(pdfFile);
        } catch (error) {
            alert("Não foi possível ler o PDF selecionado.");
            return;
        }

        pdfName = pdfFile.name;
        pdfSize = pdfFile.size;
    }

    const payload = {
        name: elements.clientName.value.trim(),
        email: elements.clientEmail.value.trim(),
        phone: elements.clientPhone.value.trim(),
        inssPassword: elements.clientInssPassword.value.trim(),
        document: elements.clientDocument.value.trim(),
        address: {
            cep: elements.clientCep.value.trim(),
            street: elements.clientStreet.value.trim(),
            number: elements.clientNumber.value.trim(),
            district: elements.clientDistrict.value.trim(),
            city: elements.clientCity.value.trim(),
            state: elements.clientState.value.trim().toUpperCase(),
            complement: elements.clientComplement.value.trim()
        },
        area: elements.clientArea.value,
        status: elements.clientStatus.value,
        notes: elements.clientNotes.value.trim(),
        photoData,
        photoName,
        pdfData,
        pdfName,
        pdfSize
    };

    if (appState.editingClientId) {
        appState.clients = appState.clients.map((client) => (
            client.id === appState.editingClientId
                ? { ...client, ...payload, updatedAt: new Date().toISOString() }
                : client
        ));
    } else {
        appState.clients.unshift({
            id: createId(),
            ...payload,
            createdAt: new Date().toISOString()
        });
    }

    try {
        await saveStorage(STORAGE_KEYS.clients, appState.clients);
    } catch (error) {
        appState.clients = previousClients;
        alert("Não foi possível salvar a foto no navegador. Tente uma imagem menor.");
        return;
    }

    resetClientForm();
    showClientMode("list");
    renderAll();
}

function handleClientTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        const header = event.target.closest(".client-profile-header");
        if (!header) {
            return;
        }

        const card = header.closest(".client-profile-card");
        appState.activeClientDetailsId = appState.activeClientDetailsId === card.dataset.clientId ? null : card.dataset.clientId;
        renderClients();
        return;
    }

    const clientId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        fillClientForm(clientId);
    }

    if (action === "toggle-client") {
        appState.activeClientDetailsId = appState.activeClientDetailsId === clientId ? null : clientId;
        renderClients();
    }

    if (action === "delete") {
        deleteClient(clientId);
    }

    if (action === "preview-document") {
        openDocumentPreview(button.dataset.id);
    }

    if (action === "preview-client-pdf") {
        openClientPdfPreview(button.dataset.id);
    }
}

function fillClientForm(clientId) {
    const client = appState.clients.find((item) => item.id === clientId);
    if (!client) {
        return;
    }

    appState.editingClientId = clientId;
    elements.clientId.value = client.id;
    elements.clientName.value = client.name;
    elements.clientEmail.value = client.email;
    elements.clientPhone.value = client.phone;
    elements.clientInssPassword.value = client.inssPassword || "";
    elements.clientDocument.value = formatCpf(client.document);
    elements.clientCep.value = formatCep(client.address?.cep || "");
    elements.clientStreet.value = client.address?.street || "";
    elements.clientNumber.value = client.address?.number || "";
    elements.clientDistrict.value = client.address?.district || "";
    elements.clientCity.value = client.address?.city || "";
    elements.clientState.value = client.address?.state || "";
    elements.clientComplement.value = client.address?.complement || "";
    elements.clientArea.value = client.area;
    elements.clientStatus.value = client.status;
    elements.clientNotes.value = client.notes;
    updatePhotoPreview(client.photoData || "");
    setCpfMessage("", "");
    setCepMessage("", "");
    elements.clientFormTitle.textContent = "Editar cliente";
    elements.cancelClientEdit.classList.remove("hidden");
    showClientMode("register");
    elements.clientName.focus();
}

function deleteClient(clientId) {
    appState.pendingDeleteClientId = clientId;
    appState.pendingDeleteFinanceId = null;
    document.getElementById("confirmTitle").textContent = "Excluir cliente";
    document.getElementById("confirmText").textContent = "Esta ação removerá o cliente da sua base.";
    elements.confirmOverlay.classList.remove("hidden");
    elements.cancelDeleteButton.focus();
}

async function confirmClientDelete() {
    if (appState.pendingDeleteFinanceId) {
        await confirmFinanceDelete();
        return;
    }

    const clientId = appState.pendingDeleteClientId;
    if (!clientId) {
        closeConfirmModal();
        return;
    }

    appState.clients = appState.clients.filter((client) => client.id !== clientId);
    appState.documents = appState.documents.map((documentItem) => (
        documentItem.clientId === clientId ? { ...documentItem, clientId: "" } : documentItem
    ));
    appState.finance = appState.finance.map((entry) => (
        entry.clientId === clientId ? { ...entry, clientId: "" } : entry
    ));

    await persistAll();
    resetClientForm();
    closeConfirmModal();
    renderAll();
}

function closeConfirmModal() {
    appState.pendingDeleteClientId = null;
    appState.pendingDeleteFinanceId = null;
    elements.confirmOverlay.classList.add("hidden");
}

function resetClientForm() {
    appState.editingClientId = null;
    elements.clientForm.reset();
    elements.clientId.value = "";
    elements.clientStatus.value = "Ativo";
    updatePhotoPreview("");
    setCpfMessage("", "");
    setCepMessage("", "");
    appState.lastCepLookup = "";
    elements.clientFormTitle.textContent = "Novo cliente";
    elements.cancelClientEdit.classList.add("hidden");
}

function showClientMode(mode) {
    const isRegister = mode === "register";
    elements.clientForm.classList.toggle("hidden", !isRegister);
    elements.registeredClientsPanel.classList.toggle("hidden", isRegister);
    elements.showClientRegister.classList.toggle("btn-primary", isRegister);
    elements.showClientRegister.classList.toggle("btn-ghost", !isRegister);
    elements.showClientList.classList.toggle("btn-primary", !isRegister);
    elements.showClientList.classList.toggle("btn-ghost", isRegister);
}

function handleCpfInput() {
    elements.clientDocument.value = formatCpf(elements.clientDocument.value);
    setCpfMessage("", "");
}

function validateClientCpf() {
    const cpf = onlyDigits(elements.clientDocument.value);

    if (!cpf) {
        setCpfMessage("", "");
        return false;
    }

    if (!isValidCpf(cpf)) {
        setCpfMessage("CPF inválido.", "error");
        return false;
    }

    setCpfMessage("CPF válido.", "success");
    return true;
}

function handleCepInput() {
    elements.clientCep.value = formatCep(elements.clientCep.value);
    appState.lastCepLookup = "";
    setCepMessage("", "");

    if (onlyDigits(elements.clientCep.value).length === 8) {
        lookupCep();
    }
}

function validateClientCep() {
    const cep = onlyDigits(elements.clientCep.value);

    if (cep.length !== 8) {
        setCepMessage("CEP deve ter 8 dígitos.", "error");
        return false;
    }

    return true;
}

async function lookupCep() {
    const cep = onlyDigits(elements.clientCep.value);

    if (cep.length !== 8) {
        validateClientCep();
        return;
    }

    if (appState.lastCepLookup === cep) {
        return;
    }

    appState.lastCepLookup = cep;
    setCepMessage("Buscando endereço...", "");

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) {
            throw new Error("Falha na consulta do CEP.");
        }

        const data = await response.json();
        if (data.erro) {
            setCepMessage("CEP não encontrado.", "error");
            return;
        }

        elements.clientStreet.value = data.logradouro || "";
        elements.clientDistrict.value = data.bairro || "";
        elements.clientCity.value = data.localidade || "";
        elements.clientState.value = data.uf || "";
        setCepMessage("Endereço encontrado.", "success");

        if (!elements.clientNumber.value) {
            elements.clientNumber.focus();
        }
    } catch (error) {
        appState.lastCepLookup = "";
        setCepMessage("Não foi possível consultar o CEP agora.", "error");
    }
}

function setCpfMessage(message, type) {
    setValidationMessage(elements.clientCpfMessage, message, type);
}

function setCepMessage(message, type) {
    setValidationMessage(elements.clientCepMessage, message, type);
}

function setValidationMessage(element, message, type) {
    element.textContent = message;
    element.classList.remove("success", "error");

    if (type) {
        element.classList.add(type);
    }
}

async function handlePhotoPreview() {
    const file = elements.clientPhoto.files[0];
    if (!file) {
        updatePhotoPreview("");
        return;
    }

    if (!isAllowedImage(file)) {
        alert("Envie uma foto 3x4 em JPG ou PNG.");
        elements.clientPhoto.value = "";
        updatePhotoPreview("");
        return;
    }

    try {
        const dataURL = await fileToDataURL(file);
        updatePhotoPreview(dataURL);
    } catch (error) {
        alert("Não foi possível ler a foto selecionada.");
        elements.clientPhoto.value = "";
        updatePhotoPreview("");
    }
}

function updatePhotoPreview(dataURL) {
    if (dataURL) {
        elements.clientPhotoPreview.src = dataURL;
        elements.clientPhotoPreview.classList.remove("hidden");
        elements.clientPhotoPlaceholder.classList.add("hidden");
        return;
    }

    elements.clientPhotoPreview.removeAttribute("src");
    elements.clientPhotoPreview.classList.add("hidden");
    elements.clientPhotoPlaceholder.classList.remove("hidden");
}

async function handleDocumentSubmit(event) {
    event.preventDefault();

    const file = elements.documentFile.files[0];
    if (!file || !isAllowedDocument(file)) {
        alert("Envie um arquivo PDF, JPG ou PNG.");
        return;
    }

    let fileData = "";
    try {
        fileData = await fileToDataURL(file);
    } catch (error) {
        alert("Não foi possível ler o arquivo do processo selecionado.");
        return;
    }

    const documentItem = {
        id: createId(),
        title: elements.documentTitle.value.trim(),
        clientId: elements.documentClient.value,
        processClass: elements.processClass.value.trim(),
        processCourt: elements.processCourt.value.trim(),
        processPhase: elements.processPhase.value,
        processMovement: elements.processMovement.value.trim(),
        fileName: file.name,
        fileType: file.type || getExtension(file.name),
        fileSize: file.size,
        fileData,
        createdAt: new Date().toISOString()
    };

    const previousDocuments = [...appState.documents];
    appState.documents.unshift(documentItem);

    try {
        await saveStorage(STORAGE_KEYS.documents, appState.documents);
    } catch (error) {
        appState.documents = previousDocuments;
        alert("Não foi possível salvar o arquivo no navegador. Tente um PDF ou imagem menor.");
        return;
    }

    elements.documentForm.reset();
    renderAll();
}

function isAllowedDocument(file) {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
    const extension = getExtension(file.name);
    return allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
}

function isAllowedImage(file) {
    const allowedTypes = ["image/jpeg", "image/png"];
    const allowedExtensions = [".jpg", ".jpeg", ".png"];
    const extension = getExtension(file.name);
    return allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
}

function isAllowedPdf(file) {
    return file.type === "application/pdf" || getExtension(file.name) === ".pdf";
}

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(file);
    });
}

function getExtension(fileName) {
    const parts = fileName.toLowerCase().split(".");
    return parts.length > 1 ? `.${parts.pop()}` : "";
}

async function handleFinanceSubmit(event) {
    event.preventDefault();

    appState.finance.unshift({
        id: createId(),
        type: elements.financeType.value,
        category: elements.financeCategory.value,
        amount: Number(elements.financeAmount.value),
        date: elements.financeDate.value,
        clientId: elements.financeClient.value,
        description: elements.financeDescription.value.trim(),
        createdAt: new Date().toISOString()
    });

    await saveStorage(STORAGE_KEYS.finance, appState.finance);
    elements.financeForm.reset();
    elements.financeType.value = "Entrada";
    elements.financeCategory.value = "Honorário";
    elements.financeDate.value = todayISO();
    renderAll();
}

async function handleEventSubmit(event) {
    event.preventDefault();

    const payload = {
        type: elements.eventType.value,
        date: elements.eventDate.value,
        time: elements.eventTime.value,
        clientId: elements.eventClient.value,
        alert: elements.eventAlert.value,
        notes: elements.eventNotes.value.trim(),
    };

    if (appState.editingEventId) {
        appState.events = appState.events.map((eventItem) => (
            eventItem.id === appState.editingEventId
                ? { ...eventItem, ...payload, updatedAt: new Date().toISOString() }
                : eventItem
        ));
    } else {
        appState.events.unshift({
            id: createId(),
            ...payload,
            createdAt: new Date().toISOString()
        });
    }

    await saveStorage(STORAGE_KEYS.events, appState.events);
    resetEventForm();
    renderAll();
}

function resetEventForm() {
    appState.editingEventId = null;
    elements.eventForm.reset();
    elements.eventDate.value = todayISO();
    elements.eventTime.value = "09:00";
    elements.eventAlert.value = "No horário";
    elements.cancelEventEdit.classList.add("hidden");
    elements.saveEventButton.textContent = "Salvar evento";
}

function renderAll() {
    renderDate();
    renderSummary();
    renderClients();
    renderClientSelects();
    renderDocuments();
    renderFinance();
    renderEvents();
}

function renderDate() {
    updateDateTime();

    if (!elements.financeDate.value) {
        elements.financeDate.value = todayISO();
    }

    if (!elements.eventDate.value) {
        elements.eventDate.value = todayISO();
    }

    if (!elements.eventTime.value) {
        elements.eventTime.value = "09:00";
    }
}

function startClock() {
    updateDateTime();
    window.clearInterval(appState.clockTimer);
    appState.clockTimer = window.setInterval(updateDateTime, 1000);
}

function updateDateTime() {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(now);

    elements.dateDisplays.forEach((element) => {
        element.textContent = formatted;
    });
}

function renderSummary() {
    const today = todayISO();
    const todayEvents = appState.events.filter((eventItem) => eventItem.date === today);
    const nextEvent = getSortedEvents().find((eventItem) => eventItem.date >= today);

    elements.calendarToday.textContent = formatDate(today);
    elements.calendarNextEvent.textContent = nextEvent
        ? `${nextEvent.type} em ${formatDate(nextEvent.date)} às ${nextEvent.time}`
        : "Nenhum evento cadastrado.";
    elements.eventCount.textContent = appState.events.length;
    elements.eventAlertCount.textContent = todayEvents.length
        ? `${todayEvents.length} alerta(s) para hoje.`
        : "Nenhum alerta para hoje.";

    const totals = calculateFinanceTotals();
    elements.feesTotal.textContent = formatCurrency(totals.fees);
    elements.paymentsTotal.textContent = formatCurrency(totals.officeCosts);
    elements.receiptsTotal.textContent = formatCurrency(totals.balance);
}

function renderClients() {
    const searchTerm = elements.clientSearch.value.trim().toLowerCase();
    const filteredClients = appState.clients.filter((client) => {
        const content = `${client.name} ${client.document} ${client.phone}`.toLowerCase();
        return content.includes(searchTerm);
    });

    elements.clientTableBody.innerHTML = "";
    elements.clientEmptyState.classList.toggle("hidden", filteredClients.length > 0);

    filteredClients.forEach((client) => {
        const card = document.createElement("article");
        card.className = "client-profile-card";
        card.dataset.clientId = client.id;
        const clientDocuments = getClientDocuments(client.id);
        const isOpen = appState.activeClientDetailsId === client.id;

        card.innerHTML = `
            <div class="client-profile-header">
                ${createClientAvatar(client)}
                <div class="client-profile-title">
                    <strong>${escapeHTML(client.name)}</strong>
                    <span>CPF ${escapeHTML(formatCpf(client.document))} · ${escapeHTML(client.status || "Sem status")}</span>
                </div>
                <div class="table-actions">
                    <button class="action-button" type="button" data-action="toggle-client" data-id="${client.id}">${isOpen ? "Fechar" : "Abrir"}</button>
                    <button class="action-button" type="button" data-action="edit" data-id="${client.id}">Editar</button>
                    <button class="action-button danger" type="button" data-action="delete" data-id="${client.id}">Excluir</button>
                </div>
            </div>

            <div class="client-expanded ${isOpen ? "" : "hidden"}">
                <div class="client-detail-grid">
                    ${createDetailItem("CPF", formatCpf(client.document))}
                    ${createDetailItem("Telefone", client.phone)}
                    ${createDetailItem("Email", client.email)}
                    ${createDetailItem("Senha INSS", client.inssPassword || "Não informado")}
                    ${createDetailItem("CEP", client.address?.cep || "Não informado")}
                    ${createDetailItem("Rua", client.address?.street || "Não informado")}
                    ${createDetailItem("Número", client.address?.number || "Não informado")}
                    ${createDetailItem("Bairro", client.address?.district || "Não informado")}
                    ${createDetailItem("Cidade/UF", [client.address?.city, client.address?.state].filter(Boolean).join(" - ") || "Não informado")}
                    ${createDetailItem("Complemento", client.address?.complement || "Não informado")}
                    ${createDetailItem("Observações", client.notes || "Sem observações", "wide")}
                </div>

                ${createClientPdfBlock(client)}

                <div class="client-documents-block">
                    <div>
                        <strong>Processos judiciais vinculados</strong>
                        <span>${clientDocuments.length ? `${clientDocuments.length} processo(s) vinculado(s)` : "Nenhum processo vinculado"}</span>
                    </div>
                    <div class="client-document-list">
                        ${clientDocuments.length ? clientDocuments.map(createClientDocumentItem).join("") : '<span class="empty-state">Nenhum processo judicial cadastrado para este cliente.</span>'}
                    </div>
                </div>
            </div>
        `;

        elements.clientTableBody.appendChild(card);
    });
}
function createDetailItem(label, value, extraClass = "") {
    return `
        <div class="detail-item ${extraClass}">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(value || "Não informado")}</strong>
        </div>
    `;
}

function createClientPdfBlock(client) {
    if (!client.pdfData) {
        return `
            <div class="client-documents-block">
                <div>
                    <strong>PDF anexado ao cadastro</strong>
                    <span>Nenhum PDF anexado.</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="client-documents-block">
            <div>
                <strong>PDF anexado ao cadastro</strong>
                <span>${escapeHTML(client.pdfName || "Arquivo PDF")} · ${formatFileSize(client.pdfSize)}</span>
            </div>
            <div class="client-document-list">
                <div class="client-document-item">
                    <div>
                        <strong>${escapeHTML(client.pdfName || "Arquivo PDF")}</strong>
                        <span>Cadastro do cliente</span>
                    </div>
                    <button class="action-button" type="button" data-action="preview-client-pdf" data-id="${client.id}">Visualizar</button>
                    <span class="document-badge">PDF</span>
                </div>
            </div>
        </div>
    `;
}
function createClientDocumentItem(documentItem) {
    const label = getDocumentLabel(documentItem.fileType);

    return `
        <div class="client-document-item">
            <div>
                <strong>Processo ${escapeHTML(documentItem.title)}</strong>
                <span>${escapeHTML(documentItem.processPhase || "Cadastrado")} · ${escapeHTML(documentItem.fileName)} · ${formatFileSize(documentItem.fileSize)}</span>
            </div>
            <button class="action-button" type="button" data-action="preview-document" data-id="${documentItem.id}">Visualizar</button>
            <span class="document-badge">${escapeHTML(label)}</span>
        </div>
    `;
}
function getClientDocuments(clientId) {
    return appState.documents.filter((documentItem) => documentItem.clientId === clientId);
}

function createClientAvatar(client) {
    if (client.photoData) {
        return `<img class="client-avatar large" src="${escapeHTML(client.photoData)}" alt="Foto 3x4 de ${escapeHTML(client.name)}">`;
    }

    return `<span class="client-avatar large" aria-hidden="true">${escapeHTML(getInitials(client.name))}</span>`;
}

function renderClientSelects() {
    const selectTargets = [elements.documentClient, elements.financeClient, elements.eventClient];

    selectTargets.forEach((select) => {
        const selectedValue = select.value;
        select.innerHTML = '<option value="">Sem cliente vinculado</option>';

        appState.clients.forEach((client) => {
            const option = document.createElement("option");
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });

        select.value = selectedValue;
    });
}

function renderDocuments() {
    elements.documentList.innerHTML = "";
    elements.documentEmptyState.classList.toggle("hidden", appState.documents.length > 0);

    appState.documents.forEach((documentItem) => {
        const client = findClient(documentItem.clientId);
        const item = document.createElement("article");
        item.className = "document-item";
        item.innerHTML = `
            <div class="document-meta">
                <strong>${escapeHTML(documentItem.title)}</strong>
                <span>${escapeHTML(documentItem.processClass || "Classe não informada")} · ${escapeHTML(documentItem.processCourt || "Tribunal não informado")} · ${client ? escapeHTML(client.name) : "Sem cliente"}</span>
                <small>${escapeHTML(documentItem.processMovement || "Sem movimentação cadastrada")}</small>
            </div>
            <div class="document-actions">
                <span class="status-pill">${escapeHTML(documentItem.processPhase || "Cadastrado")}</span>
                <span class="document-badge">${escapeHTML(getDocumentLabel(documentItem.fileType))}</span>
                ${documentItem.fileData
                    ? `<button class="action-button" type="button" data-action="preview-document" data-id="${documentItem.id}">Visualizar</button>`
                    : '<span class="empty-state">Prévia indisponível</span>'}
            </div>
        `;
        elements.documentList.appendChild(item);
    });
}

function handleDocumentListClick(event) {
    const button = event.target.closest("button[data-action='preview-document']");
    if (!button) {
        return;
    }

    openDocumentPreview(button.dataset.id);
}

function openClientPdfPreview(clientId) {
    const client = findClient(clientId);
    if (!client || !client.pdfData) {
        alert("PDF indisponível para este cliente.");
        return;
    }

    elements.documentPreviewTitle.textContent = `Cadastro - ${client.name}`;
    elements.documentPreviewMeta.textContent = `${client.pdfName || "Arquivo PDF"} · ${formatFileSize(client.pdfSize)}`;
    elements.documentPreviewBody.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.src = client.pdfData;
    iframe.title = `PDF cadastral de ${client.name}`;
    elements.documentPreviewBody.appendChild(iframe);

    elements.documentPreviewOverlay.classList.remove("hidden");
    elements.closeDocumentPreview.focus();
}

function openDocumentPreview(documentId) {
    const documentItem = appState.documents.find((item) => item.id === documentId);
    if (!documentItem || !documentItem.fileData) {
        alert("Prévia indisponível para este processo.");
        return;
    }

    const client = findClient(documentItem.clientId);
    const label = getDocumentLabel(documentItem.fileType);
    elements.documentPreviewTitle.textContent = `Processo ${documentItem.title}`;
    elements.documentPreviewMeta.textContent = `${documentItem.processClass || "Classe não informada"} · ${documentItem.processCourt || "Tribunal não informado"} · ${documentItem.fileName} · ${formatFileSize(documentItem.fileSize)} · ${client ? client.name : "Sem cliente"}`;
    elements.documentPreviewBody.innerHTML = "";

    if (label === "PDF") {
        const iframe = document.createElement("iframe");
        iframe.src = documentItem.fileData;
        iframe.title = `Visualização de ${documentItem.title}`;
        elements.documentPreviewBody.appendChild(iframe);
    } else {
        const image = document.createElement("img");
        image.src = documentItem.fileData;
        image.alt = `Visualização de ${documentItem.title}`;
        elements.documentPreviewBody.appendChild(image);
    }

    elements.documentPreviewOverlay.classList.remove("hidden");
    elements.closeDocumentPreview.focus();
}

function closeDocumentPreview() {
    elements.documentPreviewOverlay.classList.add("hidden");
    elements.documentPreviewBody.innerHTML = "";
}

function handlePreviewOverlayClick(event) {
    if (event.target === elements.documentPreviewOverlay) {
        closeDocumentPreview();
    }
}

function handleGlobalKeydown(event) {
    if (event.key !== "Escape") {
        return;
    }

    closeConfirmModal();
    closeDocumentPreview();
}

function renderFinance() {
    elements.financeTableBody.innerHTML = "";
    elements.financeEmptyState.classList.toggle("hidden", appState.finance.length > 0);

    appState.finance.forEach((entry) => {
        const client = findClient(entry.clientId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${createTypePill(entry.type)}</td>
            <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
            <td>
                <div class="transaction-cell">
                    <strong>${escapeHTML(entry.description)}</strong>
                    <span>${client ? escapeHTML(client.name) : "Sem cliente"}</span>
                </div>
            </td>
            <td>${formatCurrency(entry.amount)}</td>
            <td>${formatDate(entry.date)}</td>
            <td><button class="action-button danger" type="button" data-action="delete-finance" data-id="${entry.id}">Excluir</button></td>
        `;
        elements.financeTableBody.appendChild(row);
    });
}

function handleFinanceTableClick(event) {
    const button = event.target.closest("button[data-action='delete-finance']");
    if (!button) {
        return;
    }

    appState.pendingDeleteFinanceId = button.dataset.id;
    appState.pendingDeleteClientId = null;
    document.getElementById("confirmTitle").textContent = "Excluir lançamento";
    document.getElementById("confirmText").textContent = "Esta ação removerá o gasto ou compra lançado por engano.";
    elements.confirmOverlay.classList.remove("hidden");
    elements.cancelDeleteButton.focus();
}

async function confirmFinanceDelete() {
    const financeId = appState.pendingDeleteFinanceId;
    if (!financeId) {
        closeConfirmModal();
        return;
    }

    appState.finance = appState.finance.filter((entry) => entry.id !== financeId);
    await saveStorage(STORAGE_KEYS.finance, appState.finance);
    closeConfirmModal();
    renderAll();
}

function renderEvents() {
    const searchTerm = elements.eventSearch.value.trim().toLowerCase();
    const filteredEvents = getSortedEvents().filter((eventItem) => {
        const client = findClient(eventItem.clientId);
        const content = [
            eventItem.type,
            eventItem.date,
            eventItem.time,
            eventItem.alert,
            eventItem.notes,
            eventItem.createdAt ? formatDate(eventItem.createdAt.slice(0, 10)) : "",
            client ? client.name : ""
        ].join(" ").toLowerCase();

        return content.includes(searchTerm);
    });

    elements.eventList.innerHTML = "";

    if (!filteredEvents.length) {
        elements.eventList.textContent = "Nenhum evento cadastrado.";
        elements.eventList.classList.add("empty-state");
        return;
    }

    elements.eventList.classList.remove("empty-state");
    filteredEvents.forEach((eventItem) => {
        const client = findClient(eventItem.clientId);
        const item = document.createElement("article");
        item.className = "compact-item event-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(eventItem.type)}</strong>
                <span>${formatDate(eventItem.date)} às ${escapeHTML(eventItem.time)} · ${client ? escapeHTML(client.name) : "Sem cliente"}</span>
                ${eventItem.notes ? `<small>${escapeHTML(eventItem.notes)}</small>` : ""}
            </div>
            <div class="event-actions">
                <span class="status-pill">${escapeHTML(eventItem.alert)}</span>
                <button class="action-button" type="button" data-action="edit-event" data-id="${eventItem.id}">Editar</button>
                <button class="action-button danger" type="button" data-action="delete-event" data-id="${eventItem.id}">Excluir</button>
            </div>
        `;
        elements.eventList.appendChild(item);
    });
}

function handleEventListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const eventId = button.dataset.id;

    if (button.dataset.action === "edit-event") {
        fillEventForm(eventId);
    }

    if (button.dataset.action === "delete-event") {
        deleteEvent(eventId);
    }
}

function fillEventForm(eventId) {
    const eventItem = appState.events.find((item) => item.id === eventId);
    if (!eventItem) {
        return;
    }

    appState.editingEventId = eventId;
    elements.eventType.value = eventItem.type || "Avaliação social";
    elements.eventDate.value = eventItem.date || todayISO();
    elements.eventTime.value = eventItem.time || "09:00";
    elements.eventClient.value = eventItem.clientId || "";
    elements.eventAlert.value = eventItem.alert || "No horário";
    elements.eventNotes.value = eventItem.notes || "";
    elements.cancelEventEdit.classList.remove("hidden");
    elements.saveEventButton.textContent = "Alterar evento";
    elements.eventType.focus();
}

async function deleteEvent(eventId) {
    const eventItem = appState.events.find((item) => item.id === eventId);
    const description = eventItem ? `${eventItem.type} de ${formatDate(eventItem.date)}` : "este evento";

    if (!window.confirm(`Deseja excluir ${description}?`)) {
        return;
    }

    appState.events = appState.events.filter((item) => item.id !== eventId);
    if (appState.editingEventId === eventId) {
        resetEventForm();
    }
    await saveStorage(STORAGE_KEYS.events, appState.events);
    renderAll();
}

function getSortedEvents() {
    return [...appState.events].sort((first, second) => (
        `${first.date || ""}T${first.time || "00:00"}`.localeCompare(`${second.date || ""}T${second.time || "00:00"}`)
    ));
}

function calculateFinanceTotals() {
    return appState.finance.reduce((totals, entry) => {
        const flow = getFinanceFlow(entry);
        const category = inferFinanceCategory(entry);
        const amount = Number(entry.amount) || 0;

        if (category === "Honorário") {
            totals.fees += amount;
        }

        if (category === "Custo de escritório") {
            totals.officeCosts += amount;
        }

        if (flow === "Entrada") {
            totals.entries += amount;
            totals.balance += amount;
        }

        if (flow === "Saída") {
            totals.exits += amount;
            totals.balance -= amount;
        }

        return totals;
    }, {
        fees: 0,
        officeCosts: 0,
        entries: 0,
        exits: 0,
        balance: 0
    });
}

function getFinanceFlow(entry) {
    if (entry.type === "Saída" || entry.type === "Pagamento") {
        return "Saída";
    }

    return "Entrada";
}

function inferFinanceCategory(entry) {
    if (entry.category) {
        return entry.category;
    }

    if (entry.type === "Honorários") {
        return "Honorário";
    }

    if (entry.type === "Pagamento") {
        return "Custo de escritório";
    }

    return "Recebimento";
}

async function persistAll() {
    await Promise.all([
        saveStorage(STORAGE_KEYS.clients, appState.clients),
        saveStorage(STORAGE_KEYS.documents, appState.documents),
        saveStorage(STORAGE_KEYS.finance, appState.finance),
        saveStorage(STORAGE_KEYS.events, appState.events)
    ]);
}

function findClient(clientId) {
    return appState.clients.find((client) => client.id === clientId);
}

function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function formatCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(value) {
    const cpf = onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const calculateDigit = (base) => {
        let sum = 0;
        for (let index = 0; index < base.length; index += 1) {
            sum += Number(base[index]) * (base.length + 1 - index);
        }

        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    const firstDigit = calculateDigit(cpf.slice(0, 9));
    const secondDigit = calculateDigit(cpf.slice(0, 10));

    return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
}

function formatCep(value) {
    const digits = onlyDigits(value).slice(0, 8);
    return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

function formatAddress(address = {}) {
    const streetLine = [address.street, address.number].filter(Boolean).join(", ");
    const cityLine = [address.district, address.city, address.state].filter(Boolean).join(" - ");
    return [streetLine, cityLine].filter(Boolean).join(" | ") || "Endereço não informado";
}

function getInitials(name) {
    return String(name || "Cliente")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value || 0);
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC"
    }).format(new Date(`${value}T00:00:00Z`));
}

function formatFileSize(bytes) {
    if (!bytes) {
        return "0 KB";
    }

    const kilobytes = bytes / 1024;
    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function getDocumentLabel(fileType) {
    const normalizedType = String(fileType || "").toLowerCase();

    if (normalizedType.includes("pdf")) {
        return "PDF";
    }

    if (normalizedType.includes("png")) {
        return "PNG";
    }

    return "JPG";
}

function createStatusPill(status) {
    const className = status === "Em análise" ? "review" : status === "Arquivado" ? "archived" : "";
    return `<span class="status-pill ${className}">${escapeHTML(status)}</span>`;
}

function createTypePill(type) {
    const flow = getFinanceFlow({ type });
    const className = flow === "Saída" ? "out" : "";
    return `<span class="type-pill ${className}">${escapeHTML(flow)}</span>`;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
