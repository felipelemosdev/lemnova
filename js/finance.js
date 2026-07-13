// js/finance.js
// Módulo Financeiro: lançamentos (entradas/saídas), listagem, exclusão (com confirmação),
// cálculo de totais (honorários, custos, saldo) e os helpers de categoria/fluxo usados
// também pelo dashboard.

import { appState, findClient } from "./state.js";
import { elements, closeConfirmModal } from "./dom.js";
import { createId, todayISO, formatCurrency, formatDate, escapeHTML } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { renderAll } from "./main.js";

export async function handleFinanceSubmit(event) {
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


export function renderFinance() {
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


export function handleFinanceTableClick(event) {
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


export async function confirmFinanceDelete() {
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


export function calculateFinanceTotals() {
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


export function getFinanceFlow(entry) {
    if (entry.type === "Saída" || entry.type === "Pagamento") {
        return "Saída";
    }

    return "Entrada";
}


export function inferFinanceCategory(entry) {
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


export function createTypePill(type) {
    const flow = getFinanceFlow({ type });
    const className = flow === "Saída" ? "out" : "";
    return `<span class="type-pill ${className}">${escapeHTML(flow)}</span>`;
}
