// js/documents.js
// Módulo de Processos/Documentos: upload e cadastro de processos vinculados a um cliente,
// listagem e o modal de pré-visualização de PDF/imagem (também usado pelo PDF do cadastro
// do cliente, em clients.js).

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import { createId, getExtension, isAllowedDocument, fileToDataURL, getDocumentLabel, formatFileSize, escapeHTML } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { renderAll } from "./main.js";

export async function handleDocumentSubmit(event) {
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


export function renderDocuments() {
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


export function handleDocumentListClick(event) {
    const button = event.target.closest("button[data-action='preview-document']");
    if (!button) {
        return;
    }

    openDocumentPreview(button.dataset.id);
}


export function openDocumentPreview(documentId) {
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


export function closeDocumentPreview() {
    elements.documentPreviewOverlay.classList.add("hidden");
    elements.documentPreviewBody.innerHTML = "";
}


export function handlePreviewOverlayClick(event) {
    if (event.target === elements.documentPreviewOverlay) {
        closeDocumentPreview();
    }
}
