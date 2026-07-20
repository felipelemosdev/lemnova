import {
    STORAGE_KEYS,
    initializeDatabase,
    migrateLegacyStorage,
    readStorage,
    saveStorage
} from "./storage.js";
import { appState, persistAll } from "./state.js";
import {
    elements,
    cacheElements,
    setActiveView,
    showLogin,
    showSystem,
    toggleMobileMenu,
    toggleSidebarCollapse,
    toggleNotifPanel,
    closeNotifPanel,
    handleOutsideNotifClick,
    closeConfirmModal
} from "./dom.js";
import { createId, todayISO } from "./utils.js";

import { hydrateSession, handleLogin, handleLogout } from "./auth.js";

import {
    handleClientSubmit,
    handleClientTableClick,
    resetClientForm,
    showClientMode,
    handleCpfInput,
    validateClientCpf,
    handleCepInput,
    lookupCep,
    confirmClientDelete,
    renderClients,
    renderClientSelects,
    handlePhotoPreview
} from "./clients.js";

import {
    handleDocumentSubmit,
    handleDocumentListClick,
    closeDocumentPreview,
    handlePreviewOverlayClick,
    renderDocuments
} from "./documents.js";

import {
    handleFinanceSubmit,
    handleFinanceTableClick,
    renderFinance
} from "./finance.js";

import {
    handleEventSubmit,
    resetEventForm,
    handleEventListClick,
    renderEvents,
    printCompletedEventsReport
} from "./agenda.js";

import {
    handleTaskSubmit,
    handleTaskListClick,
    renderTasks,
    closeTaskReply,
    saveTaskReply,
    printTaskReply,
    completeTaskFromReply,
    printTasksReport
} from "./tasks.js";

import {
    renderSummary,
    renderCalendarWidget,
    renderDate,
    startClock,
    renderDashboardEvents,
    handleNotifListClick,
    closeNotificationDetail,
    completeNotificationTask,
    handleNotifDetailOverlayClick
} from "./dashboard.js";

import { printSection } from "./print.js";
import { closeContractModal, generateAndPrintContract, refreshContractModalWarning } from "./contract.js";

// Módulo autocontido: só liga seus próprios listeners (busca de processo pelo número CNJ).
import "./cnj.js";

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

function bindEvents() {
    elements.loginForm.addEventListener("submit", handleLogin);
    elements.logoutButton.addEventListener("click", handleLogout);
    elements.cancelDeleteButton.addEventListener("click", closeConfirmModal);
    elements.confirmDeleteButton.addEventListener("click", confirmClientDelete);
    elements.mobileMenuButton.addEventListener("click", toggleMobileMenu);
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener("click", toggleSidebarCollapse);
    }
    if (elements.notifButton) {
        elements.notifButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleNotifPanel();
        });
        document.addEventListener("click", handleOutsideNotifClick);
    }
    if (elements.notifList) {
        elements.notifList.addEventListener("click", handleNotifListClick);
    }
    if (elements.notifDetailCloseButton) {
        elements.notifDetailCloseButton.addEventListener("click", closeNotificationDetail);
    }
    if (elements.notifDetailCompleteButton) {
        elements.notifDetailCompleteButton.addEventListener("click", completeNotificationTask);
    }
    if (elements.notifDetailOverlay) {
        elements.notifDetailOverlay.addEventListener("click", handleNotifDetailOverlayClick);
    }
    if (elements.printTasksReportButton) {
        elements.printTasksReportButton.addEventListener("click", printTasksReport);
    }
    if (elements.contractCancelButton) {
        elements.contractCancelButton.addEventListener("click", closeContractModal);
    }
    if (elements.contractTemplateSelect) {
        elements.contractTemplateSelect.addEventListener("change", refreshContractModalWarning);
    }
    if (elements.contractGenerateButton) {
        elements.contractGenerateButton.addEventListener("click", generateAndPrintContract);
    }
    if (elements.contractOverlay) {
        elements.contractOverlay.addEventListener("click", (event) => {
            if (event.target === elements.contractOverlay) closeContractModal();
        });
    }
    if (elements.topbarPrintButton) {
        elements.topbarPrintButton.addEventListener("click", handleTopbarPrint);
    }
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
    if (elements.clientBenefitFilter) {
        elements.clientBenefitFilter.addEventListener("change", renderClients);
    }
    elements.clientSortOrder.addEventListener("change", renderClients);
    elements.clientTableBody.addEventListener("click", handleClientTableClick);
    elements.dashAddEventButton.addEventListener("click", () => {
        resetEventForm();
        setActiveView("agenda");
        elements.sidebar.classList.remove("open");
    });
    elements.eventForm.addEventListener("submit", handleEventSubmit);
    elements.cancelEventEdit.addEventListener("click", resetEventForm);
    elements.eventSearch.addEventListener("input", renderEvents);
    elements.eventList.addEventListener("click", handleEventListClick);
    if (elements.printCompletedEventsButton) {
        elements.printCompletedEventsButton.addEventListener("click", printCompletedEventsReport);
    }
    elements.documentForm.addEventListener("submit", handleDocumentSubmit);
    elements.documentList.addEventListener("click", handleDocumentListClick);
    elements.closeDocumentPreview.addEventListener("click", closeDocumentPreview);
    elements.documentPreviewOverlay.addEventListener("click", handlePreviewOverlayClick);
    elements.financeForm.addEventListener("submit", handleFinanceSubmit);
    elements.financeTableBody.addEventListener("click", handleFinanceTableClick);
    document.addEventListener("keydown", handleGlobalKeydown);
    elements.taskForm.addEventListener("submit", handleTaskSubmit);
    elements.taskList.addEventListener("click", handleTaskListClick);
    elements.replyPdf.addEventListener("change", () => {
        const file = elements.replyPdf.files[0];
        elements.replyPdfName.textContent = file ? `📎 ${file.name}` : "";
    });

    elements.navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            setActiveView(link.dataset.view);
            elements.sidebar.classList.remove("open");
        });
    });
}



async function loadState() {
    appState.clients = await readStorage(STORAGE_KEYS.clients, []);
    appState.documents = await readStorage(STORAGE_KEYS.documents, []);
    appState.finance = await readStorage(STORAGE_KEYS.finance, []);
    appState.events = await readStorage(STORAGE_KEYS.events, []);
    appState.tasks = await readStorage(STORAGE_KEYS.tasks, []);
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



export function renderAll() {
    renderDate();
    renderSummary();
    renderCalendarWidget();
    renderClients();
    renderClientSelects();
    renderDocuments();
    renderFinance();
    renderEvents();
    renderDashboardEvents();
    renderTasks();
}



const PRINT_TARGETS = {
    dashboard: { sectionId: "dashboardSection", title: "Dashboard" },
    clients: { sectionId: "registeredClientsPanel", title: "Clientes" },
    documents: { sectionId: "documentListPanel", title: "Processos" },
    finance: { sectionId: "financeSection", title: "Financeiro" },
    agenda: { sectionId: "agendaSection", title: "Agenda" },
    tasks: { sectionId: "taskListPanel", title: "Tarefas" }
};

function handleTopbarPrint() {
    if (appState.currentView === "tasks") {
        printTasksReport();
        return;
    }

    const target = PRINT_TARGETS[appState.currentView];
    if (!target) return;
    printSection(target.sectionId, target.title);
}



function handleGlobalKeydown(event) {
    if (event.key !== "Escape") {
        return;
    }

    closeConfirmModal();
    closeDocumentPreview();
    closeNotifPanel();
    closeNotificationDetail();
    closeContractModal();
}



// Algumas ações do HTML (botões do modal de resposta de tarefa e botões "Imprimir")
// usam atributos onclick="..." inline, então essas funções precisam ficar acessíveis
// globalmente em window — módulos ES não expõem suas funções no escopo global sozinhos.
window.closeTaskReply = closeTaskReply;
window.saveTaskReply = saveTaskReply;
window.printTaskReply = printTaskReply;
window.completeTaskFromReply = completeTaskFromReply;
window.printSection = printSection;
