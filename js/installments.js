// js/installments.js
// Módulo de Contratos: geração automática de parcelas (vencimentos) quando um cliente é
// ativado, cálculo dos indicadores de status (vencidos, vencendo hoje, a vencer, vencido
// há mais de 30 dias), controle de recebimento de RPV e renderização da aba "Contratos".

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import { createId, todayISO, formatDate, formatCurrency, addMonthsISO, diffDaysISO, escapeHTML } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { renderAll } from "./main.js";

const OVERDUE_30_DAYS_THRESHOLD = 30;

// Gera as parcelas mensais de um contrato assim que o cliente é salvo com status "Ativo"
// pela primeira vez. Não gera de novo se o cliente já tiver parcelas (evita duplicar
// vencimentos ao simplesmente editar o cadastro outras vezes).
export function generateInstallmentsForClient(client) {
    const total = Number(client.contractValue) || 0;
    const count = Math.max(0, Math.floor(Number(client.installmentsCount) || 0));

    if (!total || !count) {
        return [];
    }

    const baseAmount = Math.floor((total / count) * 100) / 100;
    const roundingAdjustment = Math.round((total - baseAmount * count) * 100) / 100;
    const startDate = todayISO();

    const newInstallments = [];
    for (let index = 0; index < count; index += 1) {
        const isLast = index === count - 1;
        newInstallments.push({
            id: createId(),
            clientId: client.id,
            number: index + 1,
            total: count,
            amount: isLast ? Math.round((baseAmount + roundingAdjustment) * 100) / 100 : baseAmount,
            dueDate: addMonthsISO(startDate, index + 1),
            paid: false,
            paidAt: null,
            createdAt: new Date().toISOString()
        });
    }

    return newInstallments;
}


export function hasInstallments(clientId) {
    return appState.installments.some((installment) => installment.clientId === clientId);
}


// Chamado pelo módulo de Clientes logo após salvar o cadastro. Só gera parcelas quando o
// status vira "Ativo" pela primeira vez (transição) e o contrato ainda não tem vencimentos.
export async function maybeGenerateInstallmentsOnActivation(client, previousStatus) {
    const justActivated = client.status === "Ativo" && previousStatus !== "Ativo";
    if (!justActivated || hasInstallments(client.id)) {
        return;
    }

    const generated = generateInstallmentsForClient(client);
    if (!generated.length) {
        return;
    }

    appState.installments = [...generated, ...appState.installments];
    await saveStorage(STORAGE_KEYS.installments, appState.installments);
}


export function getInstallmentStatus(installment) {
    if (installment.paid) {
        return "paid";
    }

    const today = todayISO();
    const diff = diffDaysISO(today, installment.dueDate); // dias em atraso (positivo = vencido)

    if (diff > OVERDUE_30_DAYS_THRESHOLD) {
        return "overdue30";
    }
    if (diff > 0) {
        return "overdue";
    }
    if (diff === 0) {
        return "today";
    }
    return "upcoming";
}


const STATUS_LABELS = {
    paid: "Paga",
    overdue30: "Vencido +30 dias",
    overdue: "Vencido",
    today: "Vence hoje",
    upcoming: "A vencer"
};

// Reaproveita classes de pílula já existentes no CSS (task-pill high/medium/low) para não
// depender de estilos novos.
const STATUS_PILL_CLASS = {
    paid: "low",
    overdue30: "high",
    overdue: "high",
    today: "medium",
    upcoming: "low"
};


export function calculateContractIndicators() {
    const pending = appState.installments.filter((installment) => !installment.paid);

    const overdue = pending.filter((installment) => getInstallmentStatus(installment) === "overdue" || getInstallmentStatus(installment) === "overdue30").length;
    const overdue30 = pending.filter((installment) => getInstallmentStatus(installment) === "overdue30").length;
    const dueToday = pending.filter((installment) => getInstallmentStatus(installment) === "today").length;
    const upcoming = pending.filter((installment) => getInstallmentStatus(installment) === "upcoming").length;

    const today = todayISO();
    const receiveToday = appState.clients.filter((client) => (
        client.rpvValue && Number(client.rpvValue) > 0 && client.rpvDate === today && !client.rpvReceived
    )).length;

    return { overdue, dueToday, receiveToday, upcoming, overdue30 };
}


export function renderContractIndicators() {
    const indicators = calculateContractIndicators();

    if (elements.dashContractsOverdue) elements.dashContractsOverdue.textContent = indicators.overdue;
    if (elements.dashContractsDueToday) elements.dashContractsDueToday.textContent = indicators.dueToday;
    if (elements.dashContractsReceiveToday) elements.dashContractsReceiveToday.textContent = indicators.receiveToday;
    if (elements.dashContractsUpcoming) elements.dashContractsUpcoming.textContent = indicators.upcoming;
    if (elements.dashContractsOverdue30) elements.dashContractsOverdue30.textContent = indicators.overdue30;
}


function getCurrentMonthISO() {
    const today = new Date(todayISO());
    return todayISO().slice(0, 7); // "YYYY-MM"
}

function getFilteredInstallments() {
    const filter = elements.contractsFilter ? elements.contractsFilter.value : "current-month";
    const sorted = [...appState.installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const currentMonth = getCurrentMonthISO();

    if (filter === "all") {
        return sorted;
    }
    if (filter === "overdue") {
        return sorted.filter((installment) => !installment.paid && ["overdue", "overdue30"].includes(getInstallmentStatus(installment)));
    }
    if (filter === "current-month") {
        return sorted.filter((installment) => installment.dueDate.startsWith(currentMonth) && !installment.paid);
    }
    if (filter === "future") {
        return sorted.filter((installment) => installment.dueDate > todayISO() && !installment.paid);
    }
    return sorted.filter((installment) => !installment.paid);
}


export function renderContractsSection() {
    renderInstallmentsTable();
    renderRpvTable();
}


function renderInstallmentsTable() {
    if (!elements.contractsTableBody) return;

    const rows = getFilteredInstallments()
        .filter((installment) => findClient(installment.clientId));

    elements.contractsTableBody.innerHTML = "";

    if (elements.contractsEmptyState) {
        elements.contractsEmptyState.classList.toggle("hidden", rows.length > 0);
    }

    // Agrupar por mês
    const groupedByMonth = {};
    rows.forEach((installment) => {
        const month = installment.dueDate.slice(0, 7); // "YYYY-MM"
        if (!groupedByMonth[month]) {
            groupedByMonth[month] = [];
        }
        groupedByMonth[month].push(installment);
    });

    // Renderizar agrupado por mês
    Object.keys(groupedByMonth).sort().forEach((month) => {
        const monthInstallments = groupedByMonth[month];
        const monthTotal = monthInstallments.reduce((sum, inst) => sum + inst.amount, 0);

        // Cabeçalho do mês
        const monthHeaderRow = document.createElement("tr");
        monthHeaderRow.className = "month-header-row";
        monthHeaderRow.innerHTML = `
            <td colspan="7" style="font-weight: bold; background-color: #f5f5f5; padding: 12px;">
                📅 ${formatDate(month + "-01").split("/").slice(0, 2).join("/")} — 
                <span style="color: #2c3e50;">Total: ${formatCurrency(monthTotal)}</span>
            </td>
        `;
        elements.contractsTableBody.appendChild(monthHeaderRow);

        // Linhas de cada parcela
        monthInstallments.forEach((installment) => {
            const client = findClient(installment.clientId);
            const status = getInstallmentStatus(installment);

            const row = document.createElement("tr");
            row.className = "installment-row";

            row.innerHTML = `
                <td>${escapeHTML(client.name)}</td>
                <td>${escapeHTML(client.benefit || "-")}</td>
                <td>${installment.number}/${installment.total}</td>
                <td>${formatCurrency(installment.amount)}</td>
                <td>${formatDate(installment.dueDate)}</td>
                <td><span class="task-pill ${STATUS_PILL_CLASS[status]}">${STATUS_LABELS[status]}</span></td>
                <td>${installment.paid
                    ? "—"
                    : `<button class="action-button complete" type="button" data-action="pay-installment" data-id="${installment.id}">✓ Marcar paga</button>`
                }</td>
            `;

            elements.contractsTableBody.appendChild(row);
        });
    });
}


function renderRpvTable() {
    if (!elements.rpvTableBody) return;

    const rows = appState.clients.filter((client) => Number(client.rpvValue) > 0);
    elements.rpvTableBody.innerHTML = "";

    if (elements.rpvEmptyState) {
        elements.rpvEmptyState.classList.toggle("hidden", rows.length > 0);
    }

    // Agrupar por mês
    const groupedByMonth = {};
    const today = todayISO();
    
    rows.forEach((client) => {
        const month = client.rpvDate ? client.rpvDate.slice(0, 7) : "sem-data"; // "YYYY-MM"
        if (!groupedByMonth[month]) {
            groupedByMonth[month] = [];
        }
        groupedByMonth[month].push(client);
    });

    // Renderizar agrupado por mês
    Object.keys(groupedByMonth).sort().forEach((month) => {
        const monthClients = groupedByMonth[month];
        const monthTotal = monthClients.reduce((sum, client) => sum + Number(client.rpvValue), 0);

        // Cabeçalho do mês
        const monthHeaderRow = document.createElement("tr");
        monthHeaderRow.className = "month-header-row";
        const monthLabel = month === "sem-data" 
            ? "Sem previsão" 
            : `${formatDate(month + "-01").split("/").slice(0, 2).join("/")}`;
        monthHeaderRow.innerHTML = `
            <td colspan="5" style="font-weight: bold; background-color: #f5f5f5; padding: 12px;">
                📅 ${monthLabel} — 
                <span style="color: #2c3e50;">Total: ${formatCurrency(monthTotal)}</span>
            </td>
        `;
        elements.rpvTableBody.appendChild(monthHeaderRow);

        // Linhas de cada RPV
        monthClients.forEach((client) => {
            const isToday = client.rpvDate === today && !client.rpvReceived;
            const isFuture = client.rpvDate && client.rpvDate > today && !client.rpvReceived;
            const statusLabel = client.rpvReceived 
                ? "Recebido" 
                : isToday 
                    ? "Receber hoje" 
                    : isFuture
                        ? "Lançamento futuro"
                        : "Aguardando";
            const statusClass = client.rpvReceived 
                ? "low" 
                : isToday 
                    ? "medium" 
                    : isFuture
                        ? "low"
                        : "low";
            
            const row = document.createElement("tr");
            row.className = "rpv-row";
            row.innerHTML = `
                <td>${escapeHTML(client.name)}</td>
                <td>${formatCurrency(client.rpvValue)}</td>
                <td>${client.rpvDate ? formatDate(client.rpvDate) : "Sem previsão"}</td>
                <td><span class="task-pill ${statusClass}">${statusLabel}</span></td>
                <td>${client.rpvReceived
                    ? "—"
                    : `<button class="action-button complete" type="button" data-action="receive-rpv" data-id="${client.id}">✓ Marcar recebido</button>`
                }</td>
            `;
            elements.rpvTableBody.appendChild(row);
        });
    });
}


export async function handleContractsTableClick(event) {
    const button = event.target.closest("button[data-action='pay-installment']");
    if (!button) return;

    appState.installments = appState.installments.map((installment) => (
        installment.id === button.dataset.id
            ? { ...installment, paid: true, paidAt: new Date().toISOString() }
            : installment
    ));
    await saveStorage(STORAGE_KEYS.installments, appState.installments);
    renderAll();
}


export async function handleRpvTableClick(event) {
    const button = event.target.closest("button[data-action='receive-rpv']");
    if (!button) return;

    appState.clients = appState.clients.map((client) => (
        client.id === button.dataset.id
            ? { ...client, rpvReceived: true, rpvReceivedAt: new Date().toISOString() }
            : client
    ));
    await saveStorage(STORAGE_KEYS.clients, appState.clients);
    renderAll();
}
