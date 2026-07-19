// js/dom.js
// Cache de elementos do DOM e funções de "shell" da aplicação: navegação entre views,
// alternância login/sistema, menu mobile e o modal de confirmação genérico (usado por
// exclusão de clientes e de lançamentos financeiros).

import { appState } from "./state.js";

export const elements = {};

export function cacheElements() {
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
    elements.sidebarToggle = document.getElementById("sidebarToggle");
    elements.navLinks = document.querySelectorAll(".nav-link");
    elements.pageTitle = document.getElementById("pageTitle");
    elements.dateDisplays = document.querySelectorAll(".date-display");
    elements.sections = {
        dashboard: document.getElementById("dashboardSection"),
        clients: document.getElementById("clientsSection"),
        documents: document.getElementById("documentsSection"),
        finance: document.getElementById("financeSection"),
        agenda: document.getElementById("agendaSection"),
        tasks: document.getElementById("tasksSection"),
        kits: document.getElementById("kitsSection")
    };
    elements.dashAddEventButton = document.getElementById("dashAddEventButton");
    elements.dashEventList = document.getElementById("dashEventList");
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
    elements.clientServiceType = document.getElementById("clientServiceType");
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
    elements.clientSortOrder = document.getElementById("clientSortOrder");
    elements.clientTableBody = document.getElementById("clientTableBody");
    elements.clientEmptyState = document.getElementById("clientEmptyState");
    elements.dashClientCount = document.getElementById("dashClientCount");
    elements.dashProcessCount = document.getElementById("dashProcessCount");
    elements.dashFeesTotal = document.getElementById("dashFeesTotal");
    elements.dashCostsTotal = document.getElementById("dashCostsTotal");
    elements.dashBalanceTotal = document.getElementById("dashBalanceTotal");
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
    elements.printCompletedEventsButton = document.getElementById("printCompletedEventsButton");
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
    elements.taskClient = document.getElementById("taskClient");
    elements.taskAlert = document.getElementById("taskAlert");
    elements.taskOpenCount = document.getElementById("taskOpenCount");
    elements.taskOpenText = document.getElementById("taskOpenText");
    elements.dashTaskOverdueCount = document.getElementById("dashTaskOverdueCount");
    elements.dashTaskOverdueList = document.getElementById("dashTaskOverdueList");
    elements.dashTaskTodayCount = document.getElementById("dashTaskTodayCount");
    elements.dashTaskTodayList = document.getElementById("dashTaskTodayList");
    elements.dashTaskUpcomingCount = document.getElementById("dashTaskUpcomingCount");
    elements.dashTaskUpcomingList = document.getElementById("dashTaskUpcomingList");
    elements.dashTaskDoneCount = document.getElementById("dashTaskDoneCount");
    elements.dashTaskDoneList = document.getElementById("dashTaskDoneList");
    elements.taskReplyOverlay = document.getElementById("taskReplyOverlay");
    elements.taskReplyTitle = document.getElementById("taskReplyTitle");
    elements.taskReplySubtitle = document.getElementById("taskReplySubtitle");
    elements.replyResponsible = document.getElementById("replyResponsible");
    elements.replyText = document.getElementById("replyText");
    elements.replyPdf = document.getElementById("replyPdf");
    elements.replyPdfName = document.getElementById("replyPdfName");
    elements.taskReplyHistory = document.getElementById("taskReplyHistory");
    elements.taskReplyCompleteButton = document.getElementById("taskReplyCompleteButton");
    elements.dashCalendarWidget = document.getElementById("dashCalendarWidget");
    elements.notifButton = document.getElementById("notifButton");
    elements.notifPanel = document.getElementById("notifPanel");
    elements.notifBadge = document.getElementById("notifBadge");
    elements.notifList = document.getElementById("notifList");
    elements.notifWrap = document.querySelector(".notif-wrap");
    elements.emailButton = document.getElementById("emailButton");
    elements.whatsappButton = document.getElementById("whatsappButton");
    elements.topbarPrintButton = document.getElementById("topbarPrintButton");
    elements.notifDetailOverlay = document.getElementById("notifDetailOverlay");
    elements.notifDetailEyebrow = document.getElementById("notifDetailEyebrow");
    elements.notifDetailTitle = document.getElementById("notifDetailTitle");
    elements.notifDetailText = document.getElementById("notifDetailText");
    elements.notifDetailCloseButton = document.getElementById("notifDetailCloseButton");
    elements.notifDetailCompleteButton = document.getElementById("notifDetailCompleteButton");
    elements.printTasksReportButton = document.getElementById("printTasksReportButton");

    // --- Módulo Kits Jurídicos ---
    elements.kitsTabButtons = document.querySelectorAll("[data-kits-tab]");
    elements.kitsPanels = {
        kits: document.getElementById("kitsPanel"),
        templates: document.getElementById("templatesPanel"),
        clientDocs: document.getElementById("clientDocsPanel")
    };

    elements.kitForm = document.getElementById("kitForm");
    elements.kitFormTitle = document.getElementById("kitFormTitle");
    elements.cancelKitEdit = document.getElementById("cancelKitEdit");
    elements.kitName = document.getElementById("kitName");
    elements.kitCategory = document.getElementById("kitCategory");
    elements.kitServiceType = document.getElementById("kitServiceType");
    elements.kitStatus = document.getElementById("kitStatus");
    elements.kitDocumentsPicker = document.getElementById("kitDocumentsPicker");
    elements.kitList = document.getElementById("kitList");

    elements.templateForm = document.getElementById("templateForm");
    elements.templateFormTitle = document.getElementById("templateFormTitle");
    elements.cancelTemplateEdit = document.getElementById("cancelTemplateEdit");
    elements.templateName = document.getElementById("templateName");
    elements.templateOrder = document.getElementById("templateOrder");
    elements.templateStatus = document.getElementById("templateStatus");
    elements.templateBody = document.getElementById("templateBody");
    elements.templateList = document.getElementById("templateList");

    elements.kitsClientSelect = document.getElementById("kitsClientSelect");
    elements.kitDetectionInfo = document.getElementById("kitDetectionInfo");
    elements.generateDocsButton = document.getElementById("generateDocsButton");
    elements.clientDocList = document.getElementById("clientDocList");
    elements.clientDocEmptyState = document.getElementById("clientDocEmptyState");

    elements.attachmentUploadWrap = document.getElementById("attachmentUploadWrap");
    elements.attachmentInput = document.getElementById("attachmentInput");
    elements.attachmentList = document.getElementById("attachmentList");
    elements.attachmentEmptyState = document.getElementById("attachmentEmptyState");

    elements.docEditorOverlay = document.getElementById("docEditorOverlay");
    elements.docEditorTitle = document.getElementById("docEditorTitle");
    elements.docEditorTextarea = document.getElementById("docEditorTextarea");
    elements.closeDocEditor = document.getElementById("closeDocEditor");
    elements.saveDocEditorButton = document.getElementById("saveDocEditorButton");
}


export function setActiveView(viewName) {
    const titles = {
        dashboard: "Dashboard",
        clients: "Clientes",
        documents: "Processos",
        finance: "Financeiro",
        agenda: "Agenda",
        tasks: "Tarefas",
        kits: "Kits Jurídicos"
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


export function showLogin() {
    elements.loginView.classList.remove("hidden");
    elements.systemView.classList.add("hidden");
}


export function showSystem() {
    elements.loginView.classList.add("hidden");
    elements.systemView.classList.remove("hidden");
    setActiveView(appState.currentView);
    scheduleSidebarAutoCollapse();
}


export function toggleMobileMenu() {
    elements.sidebar.classList.toggle("open");
}


let sidebarAutoCollapseTimer = null;

export function toggleSidebarCollapse() {
    if (!elements.sidebar) return;
    window.clearTimeout(sidebarAutoCollapseTimer);
    elements.sidebar.classList.toggle("collapsed");
}


export function scheduleSidebarAutoCollapse(delay = 5000) {
    if (!elements.sidebar) return;
    window.clearTimeout(sidebarAutoCollapseTimer);
    sidebarAutoCollapseTimer = window.setTimeout(() => {
        elements.sidebar.classList.add("collapsed");
    }, delay);
}


export function closeConfirmModal() {
    appState.pendingDeleteClientId = null;
    appState.pendingDeleteFinanceId = null;
    elements.confirmOverlay.classList.add("hidden");
}


export function toggleNotifPanel() {
    if (!elements.notifPanel) return;
    elements.notifPanel.classList.toggle("hidden");
}


export function closeNotifPanel() {
    if (!elements.notifPanel) return;
    elements.notifPanel.classList.add("hidden");
}


export function handleOutsideNotifClick(event) {
    if (!elements.notifWrap || !elements.notifPanel || elements.notifPanel.classList.contains("hidden")) {
        return;
    }
    if (!elements.notifWrap.contains(event.target)) {
        closeNotifPanel();
    }
}
