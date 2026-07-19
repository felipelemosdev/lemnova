// js/clients.js
// Módulo de Clientes: cadastro/edição, validação de CPF e CEP (com busca automática de
// endereço via ViaCEP), upload de foto/PDF, listagem com busca/ordenação, exclusão e
// os componentes de renderização do card expansível de cada cliente.

import { appState, findClient, persistAll } from "./state.js";
import { elements, closeConfirmModal } from "./dom.js";
import {
    createId,
    formatCpf,
    formatCep,
    onlyDigits,
    isValidCpf,
    getInitials,
    formatFileSize,
    getDocumentLabel,
    escapeHTML,
    fileToDataURL,
    isAllowedImage,
    isAllowedPdf,
    CONTRACT_TYPES,
    getContractTypeLabel
} from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { openDocumentPreview } from "./documents.js";
import { confirmFinanceDelete } from "./finance.js";
import { openContractModal } from "./contract.js";
import { renderAll } from "./main.js";

export async function handleClientSubmit(event) {
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
        rg: elements.clientRg.value.trim(),
        nationality: elements.clientNationality.value.trim(),
        maritalStatus: elements.clientMaritalStatus.value,
        profession: elements.clientProfession.value.trim(),
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
        benefit: elements.clientBenefit ? elements.clientBenefit.value : "",
        contractType: elements.clientContractType ? elements.clientContractType.value : "",
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


export function handleClientTableClick(event) {
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

    if (action === "print-contract") {
        openContractModal(clientId);
    }
}


export function fillClientForm(clientId) {
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
    elements.clientRg.value = client.rg || "";
    elements.clientNationality.value = client.nationality || "Brasileiro(a)";
    elements.clientMaritalStatus.value = client.maritalStatus || "";
    elements.clientProfession.value = client.profession || "";
    elements.clientCep.value = formatCep(client.address?.cep || "");
    elements.clientStreet.value = client.address?.street || "";
    elements.clientNumber.value = client.address?.number || "";
    elements.clientDistrict.value = client.address?.district || "";
    elements.clientCity.value = client.address?.city || "";
    elements.clientState.value = client.address?.state || "";
    elements.clientComplement.value = client.address?.complement || "";
    elements.clientArea.value = client.area;
    if (elements.clientBenefit) {
        elements.clientBenefit.value = client.benefit || "";
    }
    if (elements.clientContractType) {
        elements.clientContractType.value = client.contractType || "";
    }
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


export function deleteClient(clientId) {
    appState.pendingDeleteClientId = clientId;
    appState.pendingDeleteFinanceId = null;
    document.getElementById("confirmTitle").textContent = "Excluir cliente";
    document.getElementById("confirmText").textContent = "Esta ação removerá o cliente da sua base.";
    elements.confirmOverlay.classList.remove("hidden");
    elements.cancelDeleteButton.focus();
}


export async function confirmClientDelete() {
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


export function resetClientForm() {
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


export function showClientMode(mode) {
    const isRegister = mode === "register";
    elements.clientForm.classList.toggle("hidden", !isRegister);
    elements.registeredClientsPanel.classList.toggle("hidden", isRegister);
    elements.showClientRegister.classList.toggle("btn-primary", isRegister);
    elements.showClientRegister.classList.toggle("btn-ghost", !isRegister);
    elements.showClientList.classList.toggle("btn-primary", !isRegister);
    elements.showClientList.classList.toggle("btn-ghost", isRegister);
}


export function handleCpfInput() {
    elements.clientDocument.value = formatCpf(elements.clientDocument.value);
    setCpfMessage("", "");
}


export function validateClientCpf() {
    const cpf = onlyDigits(elements.clientDocument.value);

    if (!cpf) {
        setCpfMessage("", "");
        return true;
    }

    if (!isValidCpf(cpf)) {
        setCpfMessage("CPF inválido.", "error");
        return false;
    }

    setCpfMessage("CPF válido.", "success");
    return true;
}


export function handleCepInput() {
    elements.clientCep.value = formatCep(elements.clientCep.value);
    appState.lastCepLookup = "";
    setCepMessage("", "");

    if (onlyDigits(elements.clientCep.value).length === 8) {
        lookupCep();
    }
}


export function validateClientCep() {
    const cep = onlyDigits(elements.clientCep.value);

    if (cep.length !== 8) {
        setCepMessage("CEP deve ter 8 dígitos.", "error");
        return false;
    }

    return true;
}


export async function lookupCep() {
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


export function setCpfMessage(message, type) {
    setValidationMessage(elements.clientCpfMessage, message, type);
}


export function setCepMessage(message, type) {
    setValidationMessage(elements.clientCepMessage, message, type);
}


function setValidationMessage(element, message, type) {
    element.textContent = message;
    element.classList.remove("success", "error");

    if (type) {
        element.classList.add(type);
    }
}


export async function handlePhotoPreview() {
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


export function updatePhotoPreview(dataURL) {
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


export function sortClients(clients, order) {
    const sorted = [...clients];
    const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" });

    switch (order) {
        case "name-desc":
            return sorted.sort((a, b) => byName(b, a));
        case "recent":
            return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        case "oldest":
            return sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        case "status":
            return sorted.sort((a, b) => {
                const statusCompare = (a.status || "").localeCompare(b.status || "", "pt-BR", { sensitivity: "base" });
                return statusCompare !== 0 ? statusCompare : byName(a, b);
            });
        case "name-asc":
        default:
            return sorted.sort(byName);
    }
}


export function renderClients() {
    const searchTerm = elements.clientSearch.value.trim().toLowerCase();
    const sortOrder = elements.clientSortOrder ? elements.clientSortOrder.value : "name-asc";
    const contractTypeFilter = elements.clientContractTypeFilter ? elements.clientContractTypeFilter.value : "";
    const filteredClients = sortClients(
        appState.clients.filter((client) => {
            const content = `${client.name} ${client.document} ${client.phone}`.toLowerCase();
            const matchesSearch = content.includes(searchTerm);
            const matchesContractType = !contractTypeFilter || client.contractType === contractTypeFilter;
            return matchesSearch && matchesContractType;
        }),
        sortOrder
    );

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
                    <span>CPF ${escapeHTML(formatCpf(client.document))} · ${escapeHTML(client.status || "Sem status")}${client.contractType ? ` · <span class="status-pill">${escapeHTML(getContractTypeLabel(client.contractType))}</span>` : ""}</span>
                </div>
                <div class="table-actions">
                    <button class="action-button" type="button" data-action="toggle-client" data-id="${client.id}">${isOpen ? "Fechar" : "Abrir"}</button>
                    <button class="action-button" type="button" data-action="print-contract" data-id="${client.id}">🖨 Contrato</button>
                    <button class="action-button" type="button" data-action="edit" data-id="${client.id}">Editar</button>
                    <button class="action-button danger" type="button" data-action="delete" data-id="${client.id}">Excluir</button>
                </div>
            </div>

            <div class="client-expanded ${isOpen ? "" : "hidden"}">
                <div class="client-detail-grid">
                    ${createDetailItem("CPF", formatCpf(client.document))}
                    ${createDetailItem("RG", client.rg)}
                    ${createDetailItem("Nacionalidade", client.nationality)}
                    ${createDetailItem("Estado civil", client.maritalStatus)}
                    ${createDetailItem("Profissão", client.profession)}
                    ${createDetailItem("Benefício", client.benefit)}
                    ${createDetailItem("Tipo de contrato", client.contractType ? getContractTypeLabel(client.contractType) : "Não definido")}
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


export function renderClientSelects() {
    const selectTargets = [elements.documentClient, elements.financeClient, elements.eventClient, elements.taskClient].filter(Boolean);

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


export function openClientPdfPreview(clientId) {
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
