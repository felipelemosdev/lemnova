// js/finance.js
// Módulo Financeiro: lançamentos (entradas/saídas), listagem com busca e filtro por mês
// (agrupada por mês), exclusão (com confirmação), cálculo de totais realizados x
// lançamentos futuros (honorários, custos, saldo) e os helpers de categoria/fluxo usados
// também pelo dashboard.

import { appState, findClient } from "./state.js";
import { elements, closeConfirmModal } from "./dom.js";
import {
    createId, todayISO, formatCurrency, formatDate, escapeHTML, diffDaysISO, addMonthsISO,
    getFinanceCategoryOptions, getFinanceStatusOptions
} from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { buildPrintDocument } from "./print.js";
import { renderAll } from "./main.js";
import { syncInstallmentFromFinanceEntry } from "./installments.js";

// Repopula a Categoria (Tipo de Recebimento / Categoria de Despesa) de acordo com o Tipo
// de fluxo selecionado (Entrada x Saída). Chamada na inicialização e sempre que o Tipo muda.
export function updateFinanceCategoryOptions() {
    if (!elements.financeType || !elements.financeCategory) return;
    const type = elements.financeType.value;
    const previousValue = elements.financeCategory.value;
    const categories = getFinanceCategoryOptions(type);
    elements.financeCategory.innerHTML = categories
        .map((category) => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`)
        .join("");
    if (categories.includes(previousValue)) {
        elements.financeCategory.value = previousValue;
    }
}


// Repopula a Situação (Recebido/Pendente/Cancelado ou Pago/Pendente/Cancelado) de acordo
// com o Tipo de fluxo, pré-selecionando com base na Data (futura = Pendente, passada/hoje =
// já concluída). Chamada na inicialização e sempre que o Tipo ou a Data mudam.
export function updateFinanceStatusOptions() {
    if (!elements.financeType || !elements.financeStatus) return;
    const type = elements.financeType.value;
    const statuses = getFinanceStatusOptions(type);
    const dateISO = (elements.financeDate && elements.financeDate.value) || todayISO();
    const defaultStatus = dateISO > todayISO() ? "Pendente" : statuses[1];

    elements.financeStatus.innerHTML = statuses
        .map((status) => `<option value="${escapeHTML(status)}"${status === defaultStatus ? " selected" : ""}>${escapeHTML(status)}</option>`)
        .join("");
}


export async function handleFinanceSubmit(event) {
    event.preventDefault();

    const installmentsCount = elements.financeInstallmentsCount
        ? Math.min(60, Math.max(1, Math.trunc(Number(elements.financeInstallmentsCount.value)) || 1))
        : 1;
    const isInstallmentSeries = installmentsCount > 1;
    const groupId = isInstallmentSeries ? createId() : null;
    const baseDate = elements.financeDate.value;
    const flow = elements.financeType.value;
    const baseDescription = elements.financeDescription.value.trim();

    const baseEntry = {
        type: flow,
        category: elements.financeCategory.value,
        method: elements.financeMethod ? elements.financeMethod.value : "",
        responsible: elements.financeResponsible ? elements.financeResponsible.value.trim() : "",
        contractType: elements.financeContractType ? elements.financeContractType.value : "",
        amount: Number(elements.financeAmount.value),
        clientId: elements.financeClient.value
    };

    const newEntries = [];
    for (let index = 0; index < installmentsCount; index += 1) {
        const entryDate = index === 0 ? baseDate : addMonthsISO(baseDate, index);
        // Em série parcelada, a situação de cada parcela é decidida pela própria data (futura
        // = Pendente); no lançamento único, respeita a Situação escolhida no formulário.
        const status = isInstallmentSeries
            ? (entryDate > todayISO() ? "Pendente" : (flow === "Saída" ? "Pago" : "Recebido"))
            : (elements.financeStatus ? elements.financeStatus.value : "");

        newEntries.push({
            id: createId(),
            ...baseEntry,
            status,
            date: entryDate,
            description: isInstallmentSeries ? `${baseDescription} (${index + 1}/${installmentsCount})` : baseDescription,
            installmentGroupId: groupId,
            installmentIndex: isInstallmentSeries ? index + 1 : null,
            installmentTotal: isInstallmentSeries ? installmentsCount : null,
            createdAt: new Date().toISOString()
        });
    }

    appState.finance = [...newEntries, ...appState.finance];

    await saveStorage(STORAGE_KEYS.finance, appState.finance);
    elements.financeForm.reset();
    elements.financeType.value = "Entrada";
    if (elements.financeContractType) {
        elements.financeContractType.value = "";
    }
    elements.financeDate.value = todayISO();
    if (elements.financeInstallmentsCount) {
        elements.financeInstallmentsCount.value = 1;
    }
    updateFinanceCategoryOptions();
    updateFinanceStatusOptions();
    renderAll();
}


// Alterna entre as 4 abas do módulo Financeiro (Movimentações, Contas a Receber,
// Contas a Pagar, Fluxo de Caixa), no mesmo padrão de showClientMode() em clients.js.
export function showFinanceTab(tab) {
    const tabs = {
        movements: { button: elements.financeTabMovements, panel: elements.financeMovementsPanel },
        receivables: { button: elements.financeTabReceivables, panel: elements.financeReceivablesPanel },
        payables: { button: elements.financeTabPayables, panel: elements.financePayablesPanel },
        cashflow: { button: elements.financeTabCashflow, panel: elements.financeCashflowPanel }
    };

    Object.entries(tabs).forEach(([key, { button, panel }]) => {
        if (!button || !panel) return;
        const isActive = key === tab;
        panel.classList.toggle("hidden", !isActive);
        button.classList.toggle("btn-primary", isActive);
        button.classList.toggle("btn-ghost", !isActive);
    });
}


function getFinanceMonthKey(dateISO) {
    return dateISO ? dateISO.slice(0, 7) : ""; // "YYYY-MM"
}


function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
    return label.charAt(0).toUpperCase() + label.slice(1);
}


// Preenche o filtro de mês com todos os meses que têm lançamento, do mais recente para o
// mais antigo, preservando a seleção atual sempre que ela continuar válida.
export function populateFinanceMonthFilter() {
    if (!elements.financeMonthFilter) return;

    const previousValue = elements.financeMonthFilter.value || "all";
    const monthKeys = [...new Set(appState.finance.map((entry) => getFinanceMonthKey(entry.date)).filter(Boolean))]
        .sort((a, b) => b.localeCompare(a));

    const options = ['<option value="all">Todos os meses</option>']
        .concat(monthKeys.map((key) => `<option value="${key}">${formatMonthLabel(key)}</option>`));

    elements.financeMonthFilter.innerHTML = options.join("");
    elements.financeMonthFilter.value = monthKeys.includes(previousValue) || previousValue === "all" ? previousValue : "all";
}


function getFilteredFinanceEntries() {
    const searchTerm = elements.financeSearch ? elements.financeSearch.value.trim().toLowerCase() : "";
    const monthFilter = elements.financeMonthFilter ? elements.financeMonthFilter.value : "all";

    return appState.finance.filter((entry) => {
        if (monthFilter !== "all" && getFinanceMonthKey(entry.date) !== monthFilter) {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const client = findClient(entry.clientId);
        const content = [
            entry.description,
            entry.category || inferFinanceCategory(entry),
            entry.contractType,
            entry.type,
            client ? client.name : ""
        ].join(" ").toLowerCase();

        return content.includes(searchTerm);
    });
}


export function renderFinance() {
    populateFinanceMonthFilter();

    const filtered = getFilteredFinanceEntries();
    elements.financeTableBody.innerHTML = "";
    elements.financeEmptyState.classList.toggle("hidden", filtered.length > 0);

    if (!filtered.length) {
        return;
    }

    // Agrupa por mês (mês mais recente/futuro primeiro), com uma linha de subtotal por mês.
    const monthKeys = [...new Set(filtered.map((entry) => getFinanceMonthKey(entry.date)))]
        .sort((a, b) => b.localeCompare(a));

    monthKeys.forEach((monthKey) => {
        const entriesOfMonth = filtered
            .filter((entry) => getFinanceMonthKey(entry.date) === monthKey)
            .sort((a, b) => b.date.localeCompare(a.date));

        const incomeEntries = entriesOfMonth.filter((entry) => getFinanceFlow(entry) === "Entrada");
        const expenseEntries = entriesOfMonth.filter((entry) => getFinanceFlow(entry) === "Saída");
        const incomeTotal = incomeEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const expenseTotal = expenseEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const monthBalance = incomeTotal - expenseTotal;

        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `
            <td colspan="9" style="font-weight:700">
                ${monthKey ? formatMonthLabel(monthKey) : "Sem data"}
                <span style="font-weight:400;color:var(--color-muted)"> · Saldo do mês: ${formatCurrency(monthBalance)}</span>
            </td>
        `;
        elements.financeTableBody.appendChild(headerRow);

        elements.financeTableBody.appendChild(buildFinanceSubgroupRow(`Entradas (${incomeEntries.length})`, incomeTotal, "#027a48"));
        incomeEntries.forEach((entry) => {
            elements.financeTableBody.appendChild(buildFinanceRow(entry));
        });

        elements.financeTableBody.appendChild(buildFinanceSubgroupRow(`Saídas (${expenseEntries.length})`, expenseTotal, "#b42318"));
        expenseEntries.forEach((entry) => {
            elements.financeTableBody.appendChild(buildFinanceRow(entry));
        });
    });

    renderReceivables();
    renderPayables();
    renderCashFlow();
}


function buildFinanceSubgroupRow(label, total, color) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td colspan="9" style="background:rgba(2,32,58,0.03);font-weight:600;font-size:0.82em;color:${color}">
            ${escapeHTML(label)} <span style="font-weight:400;color:var(--color-muted)">· ${formatCurrency(total)}</span>
        </td>
    `;
    return row;
}


function buildFinanceRow(entry) {
    const client = findClient(entry.clientId);
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${createTypePill(entry.type)}</td>
        <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
        <td>${entry.method ? `<span class="status-pill">${escapeHTML(entry.method)}</span>` : "—"}</td>
        <td>${entry.contractType ? `<span class="status-pill">${escapeHTML(entry.contractType)}</span>` : "—"}</td>
        <td>
            <div class="transaction-cell">
                <strong>${escapeHTML(entry.description)}</strong>
                <span>${client ? escapeHTML(client.name) : "Sem cliente"}</span>
            </div>
        </td>
        <td>${formatCurrency(entry.amount)}</td>
        <td>${formatDate(entry.date)}</td>
        <td>${financeStatusPill(entry)}</td>
        <td><button class="action-button danger" type="button" data-action="delete-finance" data-id="${entry.id}">Excluir</button></td>
    `;
    return row;
}


export function handleFinanceTableClick(event) {
    const button = event.target.closest("button[data-action='delete-finance']");
    if (!button) {
        return;
    }

    appState.pendingDeleteFinanceId = button.dataset.id;
    appState.pendingDeleteClientId = null;
    appState.pendingDeleteInstallmentId = null;
    appState.pendingClearRpvClientId = null;
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


// "Realizado" agora é definido pela Situação do lançamento (Recebido/Pago), não só pela
// data — uma parcela vencida mas ainda não confirmada (Pendente) não entra no saldo/
// honorários/custos realizados, mesmo com a data já passada. Veja calculateFutureFinanceTotals()
// para os valores previstos/pendentes.
// "Honorários" e "Custo de escritório" (cards do topo) somam todas as Entradas e Saídas
// já confirmadas, independente da categoria específica escolhida, já que o modelo de
// categorias agora cobre vários tipos de recebimento/despesa (ver utils.js).
export function calculateFinanceTotals() {
    return appState.finance
        .filter((entry) => {
            const status = getFinanceStatus(entry);
            return status !== "Pendente" && status !== "Cancelado";
        })
        .reduce((totals, entry) => {
            const flow = getFinanceFlow(entry);
            const amount = Number(entry.amount) || 0;

            if (flow === "Entrada") {
                totals.fees += amount;
                totals.entries += amount;
                totals.balance += amount;
            }

            if (flow === "Saída") {
                totals.officeCosts += amount;
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


// Lançamentos ainda pendentes (independente da data — cobre tanto parcelas futuras quanto
// contas já vencidas mas não confirmadas): saldo líquido previsto (entradas - saídas) e a
// contagem de quantos existem, usados no card "Lançamentos futuros".
export function calculateFutureFinanceTotals() {
    const pendingEntries = appState.finance.filter((entry) => getFinanceStatus(entry) === "Pendente");

    const balance = pendingEntries.reduce((total, entry) => (
        total + (getFinanceFlow(entry) === "Entrada" ? Number(entry.amount) || 0 : -(Number(entry.amount) || 0))
    ), 0);

    return { balance, count: pendingEntries.length };
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


// Situação do lançamento. Entradas/saídas antigas (criadas antes deste campo existir) não
// têm "status" salvo — nesse caso, mantemos o comportamento anterior (Realizado/Previsto
// por data) como fallback, já com o rótulo do novo modelo (Recebido/Pago vs Pendente).
export function getFinanceStatus(entry) {
    if (entry.status) {
        return entry.status;
    }

    const isFuture = entry.date > todayISO();
    if (isFuture) {
        return "Pendente";
    }

    return getFinanceFlow(entry) === "Entrada" ? "Recebido" : "Pago";
}


function financeStatusPill(entry) {
    const status = getFinanceStatus(entry);
    const className = status === "Pendente" ? "task-pill medium" : status === "Cancelado" ? "task-pill" : "task-pill low";
    return `<span class="${className}">${escapeHTML(status)}</span>`;
}


// ============================================================================
// Contas a Receber / Contas a Pagar
// Não é uma coleção separada: são os próprios lançamentos do Financeiro com
// status "Pendente", filtrados por fluxo (Entrada = a receber, Saída = a pagar).
// Isso evita duplicar dados — quando o usuário marca como recebido/pago aqui,
// o lançamento correspondente em "Movimentações" já reflete a mudança.
// ============================================================================

function getPendingEntries(flow) {
    return appState.finance
        .filter((entry) => getFinanceFlow(entry) === flow && getFinanceStatus(entry) === "Pendente")
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export function getReceivables() {
    return getPendingEntries("Entrada");
}

export function getPayables() {
    return getPendingEntries("Saída");
}

function daysOverdueLabel(dateISO) {
    const today = todayISO();
    if (!dateISO || dateISO >= today) {
        return "—";
    }
    const days = diffDaysISO(today, dateISO);
    return `<span class="task-pill medium">${days} dia(s)</span>`;
}

export function renderReceivables() {
    if (!elements.financeReceivablesTableBody) return;

    const receivables = getReceivables();
    elements.financeReceivablesTableBody.innerHTML = "";
    if (elements.financeReceivablesEmptyState) {
        elements.financeReceivablesEmptyState.classList.toggle("hidden", receivables.length > 0);
    }

    const total = receivables.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    if (elements.receivablesSummary) {
        elements.receivablesSummary.textContent = `${formatCurrency(total)} em aberto · ${receivables.length} conta(s)`;
    }

    receivables.forEach((entry) => {
        const client = findClient(entry.clientId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${client ? escapeHTML(client.name) : "Sem cliente"}</td>
            <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
            <td>${escapeHTML(entry.description)}</td>
            <td>${formatCurrency(entry.amount)}</td>
            <td>${formatDate(entry.date)}</td>
            <td>${daysOverdueLabel(entry.date)}</td>
            <td>${financeStatusPill(entry)}</td>
            <td>
                <button class="action-button complete" type="button" data-action="mark-received" data-id="${entry.id}">✓ Recebido</button>
                <button class="action-button danger" type="button" data-action="delete-finance" data-id="${entry.id}">Excluir</button>
            </td>
        `;
        elements.financeReceivablesTableBody.appendChild(row);
    });
}

export function renderPayables() {
    if (!elements.financePayablesTableBody) return;

    const payables = getPayables();
    elements.financePayablesTableBody.innerHTML = "";
    if (elements.financePayablesEmptyState) {
        elements.financePayablesEmptyState.classList.toggle("hidden", payables.length > 0);
    }

    const total = payables.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    if (elements.payablesSummary) {
        elements.payablesSummary.textContent = `${formatCurrency(total)} em aberto · ${payables.length} conta(s)`;
    }

    payables.forEach((entry) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHTML(entry.description)}</td>
            <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
            <td>${formatCurrency(entry.amount)}</td>
            <td>${formatDate(entry.date)}</td>
            <td>${daysOverdueLabel(entry.date)}</td>
            <td>${financeStatusPill(entry)}</td>
            <td>
                <button class="action-button complete" type="button" data-action="mark-paid" data-id="${entry.id}">✓ Pago</button>
                <button class="action-button danger" type="button" data-action="delete-finance" data-id="${entry.id}">Excluir</button>
            </td>
        `;
        elements.financePayablesTableBody.appendChild(row);
    });
}

async function markFinanceStatus(entryId, newStatus) {
    appState.finance = appState.finance.map((entry) => (
        entry.id === entryId ? { ...entry, status: newStatus, settledAt: new Date().toISOString() } : entry
    ));
    await saveStorage(STORAGE_KEYS.finance, appState.finance);
    // Se este lançamento é o espelho de uma parcela de contrato, mantém a aba Contratos
    // sincronizada (parcela passa a "paga" também por lá).
    await syncInstallmentFromFinanceEntry(entryId, newStatus === "Recebido" || newStatus === "Pago");
    renderAll();
}

export function handleReceivablesTableClick(event) {
    const markButton = event.target.closest("button[data-action='mark-received']");
    if (markButton) {
        markFinanceStatus(markButton.dataset.id, "Recebido");
        return;
    }
    handleFinanceTableClick(event);
}

export function handlePayablesTableClick(event) {
    const markButton = event.target.closest("button[data-action='mark-paid']");
    if (markButton) {
        markFinanceStatus(markButton.dataset.id, "Pago");
        return;
    }
    handleFinanceTableClick(event);
}


// ============================================================================
// Fluxo de Caixa: resumo mensal (Entradas x Saídas x Saldo do mês x Saldo
// acumulado), do mês mais antigo para o mais recente/futuro, com todos os
// lançamentos (realizados ou não) — reflete o caixa projetado, como na aba
// "FluxoCaixa" da planilha de referência.
// ============================================================================

export function calculateCashFlowByMonth() {
    const monthKeys = [...new Set(appState.finance.map((entry) => getFinanceMonthKey(entry.date)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    let accumulated = 0;
    return monthKeys.map((monthKey) => {
        const entriesOfMonth = appState.finance.filter((entry) => getFinanceMonthKey(entry.date) === monthKey);
        const income = entriesOfMonth.filter((entry) => getFinanceFlow(entry) === "Entrada")
            .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const expense = entriesOfMonth.filter((entry) => getFinanceFlow(entry) === "Saída")
            .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const monthBalance = income - expense;
        accumulated += monthBalance;

        return { monthKey, income, expense, monthBalance, accumulated };
    });
}

export function renderCashFlow() {
    if (!elements.financeCashflowTableBody) return;

    const rows = calculateCashFlowByMonth();
    elements.financeCashflowTableBody.innerHTML = "";
    if (elements.financeCashflowEmptyState) {
        elements.financeCashflowEmptyState.classList.toggle("hidden", rows.length > 0);
    }

    rows.forEach((row) => {
        const tr = document.createElement("tr");
        const balanceColor = row.accumulated < 0 ? "#b42318" : "#027a48";
        tr.innerHTML = `
            <td style="font-weight:600">${formatMonthLabel(row.monthKey)}</td>
            <td>${formatCurrency(row.income)}</td>
            <td>${formatCurrency(row.expense)}</td>
            <td>${formatCurrency(row.monthBalance)}</td>
            <td style="color:${balanceColor};font-weight:600">${formatCurrency(row.accumulated)}</td>
        `;
        elements.financeCashflowTableBody.appendChild(tr);
    });
}


// Relatório de impressão do Financeiro: respeita a busca e o filtro de mês que estiverem
// ativos na tela (mesma lógica de getFilteredFinanceEntries), mostra o resumo de totais
// no topo e a listagem agrupada por mês, sem formulário/filtros/botões de ação.
export function printFinanceReport() {
    const filtered = getFilteredFinanceEntries();
    const totals = calculateFinanceTotals();
    const futureTotals = calculateFutureFinanceTotals();

    const monthFilterValue = elements.financeMonthFilter ? elements.financeMonthFilter.value : "all";
    const monthLabel = monthFilterValue && monthFilterValue !== "all" ? formatMonthLabel(monthFilterValue) : "Todos os meses";
    const searchTerm = elements.financeSearch ? elements.financeSearch.value.trim() : "";

    const summary = `
        <div class="finance-overview">
            <article class="summary-card">
                <span>Honorários</span>
                <strong>${formatCurrency(totals.fees)}</strong>
                <p>Entradas realizadas</p>
            </article>
            <article class="summary-card">
                <span>Custo de escritório</span>
                <strong>${formatCurrency(totals.officeCosts)}</strong>
                <p>Saídas realizadas</p>
            </article>
            <article class="summary-card">
                <span>Saldo do caixa</span>
                <strong>${formatCurrency(totals.balance)}</strong>
                <p>Realizado até hoje</p>
            </article>
            <article class="summary-card">
                <span>Lançamentos futuros</span>
                <strong>${formatCurrency(futureTotals.balance)}</strong>
                <p>${futureTotals.count} lançamento(s) previsto(s)</p>
            </article>
        </div>
    `;

    let body;
    if (!filtered.length) {
        body = '<p style="color:#667085">Nenhuma movimentação encontrada para os filtros aplicados.</p>';
    } else {
        const monthKeys = [...new Set(filtered.map((entry) => getFinanceMonthKey(entry.date)))]
            .sort((a, b) => b.localeCompare(a));

        const groups = monthKeys.map((monthKey) => {
            const entriesOfMonth = filtered
                .filter((entry) => getFinanceMonthKey(entry.date) === monthKey)
                .sort((a, b) => b.date.localeCompare(a.date));

            const incomeEntries = entriesOfMonth.filter((entry) => getFinanceFlow(entry) === "Entrada");
            const expenseEntries = entriesOfMonth.filter((entry) => getFinanceFlow(entry) === "Saída");
            const incomeTotal = incomeEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
            const expenseTotal = expenseEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
            const monthBalance = incomeTotal - expenseTotal;

            const buildRows = (entries) => entries.map((entry) => {
                const client = findClient(entry.clientId);
                return `
                    <tr>
                        <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
                        <td>${escapeHTML(entry.description)}</td>
                        <td>${client ? escapeHTML(client.name) : "-"}</td>
                        <td>${formatCurrency(entry.amount)}</td>
                        <td>${formatDate(entry.date)}</td>
                        <td>${escapeHTML(getFinanceStatus(entry))}</td>
                    </tr>
                `;
            }).join("");

            const buildTable = (title, entries, total, color) => `
                <p style="margin:8px 0 3px;font-weight:700;color:${color}">${title} (${entries.length}) — ${formatCurrency(total)}</p>
                <table>
                    <thead>
                        <tr><th>Categoria</th><th>Descrição</th><th>Cliente</th><th>Valor</th><th>Data</th><th>Status</th></tr>
                    </thead>
                    <tbody>${entries.length ? buildRows(entries) : '<tr><td colspan="6" style="color:#667085">Nenhum lançamento.</td></tr>'}</tbody>
                </table>
            `;

            return `
                <h3 style="margin:16px 0 2px">${monthKey ? formatMonthLabel(monthKey) : "Sem data"} — Saldo do mês: ${formatCurrency(monthBalance)}</h3>
                ${buildTable("Entradas", incomeEntries, incomeTotal, "#027a48")}
                ${buildTable("Saídas", expenseEntries, expenseTotal, "#b42318")}
            `;
        }).join("");

        body = `${summary}${groups}`;
    }

    const subtitleParts = [`Mês: ${escapeHTML(monthLabel)}`];
    if (searchTerm) subtitleParts.push(`Busca: "${escapeHTML(searchTerm)}"`);
    subtitleParts.push(`${filtered.length} lançamento(s)`);

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument("Relatório financeiro", subtitleParts.join(" · "), body));
    win.document.close();
    win.focus();
    win.print();
}


function printPendingReport(entries, title, columns) {
    let body;
    if (!entries.length) {
        body = '<p style="color:#667085">Nenhuma conta em aberto.</p>';
    } else {
        const rows = entries.map((entry) => columns.row(entry)).join("");
        body = `
            <table>
                <thead><tr>${columns.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument(title, `${entries.length} conta(s) em aberto`, body));
    win.document.close();
    win.focus();
    win.print();
}


export function printReceivablesReport() {
    printPendingReport(getReceivables(), "Contas a receber", {
        headers: ["Cliente", "Categoria", "Descrição", "Valor", "Vencimento"],
        row: (entry) => {
            const client = findClient(entry.clientId);
            return `<tr>
                <td>${client ? escapeHTML(client.name) : "-"}</td>
                <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
                <td>${escapeHTML(entry.description)}</td>
                <td>${formatCurrency(entry.amount)}</td>
                <td>${formatDate(entry.date)}</td>
            </tr>`;
        }
    });
}


export function printPayablesReport() {
    printPendingReport(getPayables(), "Contas a pagar", {
        headers: ["Fornecedor/Descrição", "Categoria", "Valor", "Vencimento"],
        row: (entry) => `<tr>
            <td>${escapeHTML(entry.description)}</td>
            <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
            <td>${formatCurrency(entry.amount)}</td>
            <td>${formatDate(entry.date)}</td>
        </tr>`
    });
}


export function printCashflowReport() {
    const rows = calculateCashFlowByMonth();
    let body;
    if (!rows.length) {
        body = '<p style="color:#667085">Nenhuma movimentação cadastrada.</p>';
    } else {
        const tableRows = rows.map((row) => `
            <tr>
                <td>${formatMonthLabel(row.monthKey)}</td>
                <td>${formatCurrency(row.income)}</td>
                <td>${formatCurrency(row.expense)}</td>
                <td>${formatCurrency(row.monthBalance)}</td>
                <td>${formatCurrency(row.accumulated)}</td>
            </tr>
        `).join("");
        body = `
            <table>
                <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo do mês</th><th>Saldo acumulado</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
    }

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument("Fluxo de caixa mensal", "", body));
    win.document.close();
    win.focus();
    win.print();
}
