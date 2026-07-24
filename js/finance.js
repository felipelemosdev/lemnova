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
        contractType: elements.financeContractType ? elements.financeContractType.value : "",
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
    if (elements.financeContractType) {
        elements.financeContractType.value = "";
    }
    elements.financeDate.value = todayISO();
    renderAll();
}


export function ensureFinancialScheduleForClient(client, previousClient = null) {
    if (!client || client.status !== "Ativo") {
        return false;
    }

    const amount = Number(client.feesAmount) || 0;
    const totalInstallments = Math.max(1, Number(client.feeInstallments) || 1);
    const firstDueDate = client.firstDueDate || "";
    const contractId = getClientContractId(client);

    if (!amount || !firstDueDate) {
        return false;
    }

    const alreadyScheduled = appState.financialSchedule.some((item) => (
        item.clientId === client.id && item.contractId === contractId
    ));
    const becameActive = !previousClient || previousClient.status !== "Ativo";
    const scheduleChanged = previousClient && (
        Number(previousClient.feesAmount) !== amount
        || Number(previousClient.feeInstallments) !== totalInstallments
        || previousClient.firstDueDate !== firstDueDate
        || getClientContractId(previousClient) !== contractId
    );

    if (alreadyScheduled && !scheduleChanged) {
        return false;
    }

    if (alreadyScheduled && !becameActive && scheduleChanged) {
        const hasPayments = appState.financialSchedule.some((item) => (
            item.clientId === client.id && item.contractId === contractId && item.status === "paid"
        ));
        if (hasPayments) {
            return false;
        }
    }

    appState.financialSchedule = appState.financialSchedule.filter((item) => (
        !(item.clientId === client.id && item.contractId === contractId && item.status !== "paid")
    ));

    const installmentAmount = roundCurrency(amount / totalInstallments);
    const scheduleItems = Array.from({ length: totalInstallments }, (_, index) => {
        const isLast = index === totalInstallments - 1;
        const calculatedAmount = isLast
            ? roundCurrency(amount - (installmentAmount * (totalInstallments - 1)))
            : installmentAmount;

        return normalizeScheduleItem({
            id: createId(),
            clientId: client.id,
            contractId,
            installment: index + 1,
            totalInstallments,
            dueDate: addMonths(firstDueDate, index),
            amount: calculatedAmount,
            status: "pending",
            paidDate: "",
            paymentMethod: ""
        });
    });

    appState.financialSchedule.unshift(...scheduleItems);
    return true;
}


export async function receiveInstallment(installmentId, paymentMethod = "Recebimento") {
    const paidDate = todayISO();
    const installment = appState.financialSchedule.find((item) => item.id === installmentId);
    if (!installment || installment.status === "paid") {
        return;
    }

    const client = findClient(installment.clientId);
    appState.financialSchedule = appState.financialSchedule.map((item) => (
        item.id === installmentId
            ? normalizeScheduleItem({ ...item, status: "paid", paidDate, paymentMethod })
            : item
    ));

    appState.finance.unshift({
        id: createId(),
        type: "Entrada",
        category: "Honorário",
        contractType: installment.contractId,
        amount: Number(installment.amount) || 0,
        date: paidDate,
        clientId: installment.clientId,
        description: `Recebimento parcela ${installment.installment}/${installment.totalInstallments}${client ? ` - ${client.name}` : ""}`,
        scheduleId: installment.id,
        createdAt: new Date().toISOString()
    });

    await Promise.all([
        saveStorage(STORAGE_KEYS.financialSchedule, appState.financialSchedule),
        saveStorage(STORAGE_KEYS.finance, appState.finance)
    ]);
    renderAll();
}


export function renderFinance() {
    renderFinanceSummary();
    renderFinancialSchedule();
    renderRpvTable();
    elements.financeTableBody.innerHTML = "";
    elements.financeEmptyState.classList.toggle("hidden", appState.finance.length > 0);

    appState.finance.forEach((entry) => {
        const client = findClient(entry.clientId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${createTypePill(entry.type)}</td>
            <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
            <td>${entry.contractType ? `<span class="status-pill">${escapeHTML(entry.contractType)}</span>` : "—"}</td>
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
    const receiveButton = event.target.closest("button[data-action='receive-installment']");
    if (receiveButton) {
        receiveInstallment(receiveButton.dataset.id);
        return;
    }

    const tabButton = event.target.closest("button[data-finance-tab]");
    if (tabButton) {
        setFinanceTab(tabButton.dataset.financeTab);
        return;
    }

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


export function calculateFinancialScheduleSummary() {
    const today = todayISO();
    return appState.financialSchedule.reduce((summary, rawItem) => {
        const item = normalizeScheduleItem(rawItem);
        const amount = Number(item.amount) || 0;
        const status = item.status;

        if (status === "paid") {
            if (item.paidDate === today) {
                summary.receivedToday += amount;
            }
            return summary;
        }

        if (item.dueDate < today) {
            summary.overdueContracts.add(`${item.clientId}:${item.contractId}`);
            if (daysBetween(item.dueDate, today) > 30) {
                summary.overdueMoreThan30 += 1;
            }
        }

        if (item.dueDate === today) {
            summary.dueToday += 1;
            summary.receiveToday += amount;
        }

        if (item.dueDate > today) {
            summary.upcoming += 1;
        }

        return summary;
    }, {
        overdueContracts: new Set(),
        dueToday: 0,
        receiveToday: 0,
        receivedToday: 0,
        upcoming: 0,
        overdueMoreThan30: 0
    });
}


export function refreshFinancialScheduleStatuses() {
    appState.financialSchedule = appState.financialSchedule.map(normalizeScheduleItem);
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


function renderFinanceSummary() {
    if (!elements.financialSummaryPanel) return;
    const scheduleSummary = calculateFinancialScheduleSummary();
    const totals = calculateFinanceTotals();

    if (elements.financeOverdueContracts) {
        elements.financeOverdueContracts.textContent = scheduleSummary.overdueContracts.size;
    }
    if (elements.financeDueToday) {
        elements.financeDueToday.textContent = scheduleSummary.dueToday;
    }
    if (elements.financeReceiveToday) {
        elements.financeReceiveToday.textContent = formatCurrency(scheduleSummary.receiveToday);
    }
    if (elements.financeUpcoming) {
        elements.financeUpcoming.textContent = scheduleSummary.upcoming;
    }
    if (elements.financeOverdue30) {
        elements.financeOverdue30.textContent = scheduleSummary.overdueMoreThan30;
    }
    if (elements.feesTotal) {
        elements.feesTotal.textContent = formatCurrency(totals.fees);
    }
    if (elements.paymentsTotal) {
        elements.paymentsTotal.textContent = formatCurrency(totals.officeCosts);
    }
    if (elements.receiptsTotal) {
        elements.receiptsTotal.textContent = formatCurrency(totals.balance);
    }
}


function renderFinancialSchedule() {
    if (!elements.financialScheduleTableBody) return;
    const scheduleItems = [...appState.financialSchedule]
        .map(normalizeScheduleItem)
        .sort((first, second) => first.dueDate.localeCompare(second.dueDate));

    elements.financialScheduleTableBody.innerHTML = "";
    elements.financialScheduleEmpty.classList.toggle("hidden", scheduleItems.length > 0);

    scheduleItems.forEach((item) => {
        const client = findClient(item.clientId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${client ? escapeHTML(client.name) : "Sem cliente"}</td>
            <td>${escapeHTML(item.contractId || "Contrato")}</td>
            <td>${item.installment}/${item.totalInstallments}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${formatDate(item.dueDate)}</td>
            <td>${createScheduleStatusPill(item.status)}</td>
            <td>
                ${item.status === "paid"
                    ? `<span>${formatDate(item.paidDate)}</span>`
                    : `<button class="action-button" type="button" data-action="receive-installment" data-id="${item.id}">Receber</button>`}
            </td>
        `;
        elements.financialScheduleTableBody.appendChild(row);
    });
}


function renderRpvTable() {
    if (!elements.rpvTableBody) return;
    const rpvItems = appState.rpv || [];
    elements.rpvTableBody.innerHTML = "";
    elements.rpvEmptyState.classList.toggle("hidden", rpvItems.length > 0);

    rpvItems.forEach((item) => {
        const client = findClient(item.clientId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${client ? escapeHTML(client.name) : escapeHTML(item.clientName || "Sem cliente")}</td>
            <td>${escapeHTML(item.process || "")}</td>
            <td>${formatCurrency(item.expectedAmount)}</td>
            <td>${formatCurrency(item.receivedAmount)}</td>
            <td>${formatDate(item.expectedDate)}</td>
            <td>${formatDate(item.receivedDate)}</td>
            <td>${createScheduleStatusPill(item.status || "pending")}</td>
            <td>${escapeHTML(item.notes || "")}</td>
        `;
        elements.rpvTableBody.appendChild(row);
    });
}


function setFinanceTab(tabName) {
    if (!elements.financeTabButtons || !elements.financeTabPanels) return;
    elements.financeTabButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.financeTab === tabName);
    });
    elements.financeTabPanels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.financePanel !== tabName);
    });
}


function normalizeScheduleItem(item) {
    if (!item) return item;
    if (item.status === "paid") {
        return item;
    }

    const today = todayISO();
    let status = "pending";
    if (item.dueDate === today) {
        status = "today";
    } else if (item.dueDate && item.dueDate < today) {
        status = "overdue";
    }

    return { ...item, status };
}


function createScheduleStatusPill(status) {
    const labels = {
        pending: "Pendente",
        today: "Hoje",
        overdue: "Vencido",
        paid: "Pago"
    };
    const classes = {
        pending: "review",
        today: "today",
        overdue: "overdue",
        paid: ""
    };
    return `<span class="status-pill ${classes[status] || ""}">${escapeHTML(labels[status] || status)}</span>`;
}


function getClientContractId(client) {
    return client.contractId || client.benefit || client.area || "Contrato";
}


function addMonths(dateValue, months) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1 + months, day));
    return date.toISOString().slice(0, 10);
}


function daysBetween(startDate, endDate) {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((new Date(`${endDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`)) / dayMs);
}


function roundCurrency(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}
