// js/installments.js
// Módulo de Contratos: geração automática de parcelas (vencimentos) quando um cliente é
// ativado, cálculo dos indicadores de status (vencidos, vencendo hoje, a vencer, vencido
// há mais de 30 dias), controle de recebimento de RPV, edição/exclusão manual de parcelas
// e renderização da aba "Contratos".

import { appState, findClient } from "./state.js";
import { elements, closeConfirmModal, setActiveView } from "./dom.js";
import { createId, todayISO, formatDate, formatCurrency, addMonthsISO, diffDaysISO, escapeHTML } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { buildPrintDocument } from "./print.js";
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


// Soma de todas as parcelas em aberto (vencidas + vencendo hoje + a vencer), usada pelo
// card "Parcelas a receber" do Financeiro para trazer o valor a receber dos contratos
// ativos para dentro do controle de caixa.
export function calculatePendingInstallmentsSummary() {
    const pending = appState.installments.filter((installment) => !installment.paid);

    const total = pending.reduce((sum, installment) => sum + (Number(installment.amount) || 0), 0);
    const overdueTotal = pending
        .filter((installment) => ["overdue", "overdue30"].includes(getInstallmentStatus(installment)))
        .reduce((sum, installment) => sum + (Number(installment.amount) || 0), 0);

    return {
        total,
        count: pending.length,
        overdueTotal,
        upcomingTotal: total - overdueTotal
    };
}


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


function getInstallmentMonthKey(dueDate) {
    return dueDate ? dueDate.slice(0, 7) : ""; // "YYYY-MM"
}


function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
    return label.charAt(0).toUpperCase() + label.slice(1);
}


// Preenche o filtro de mês com todos os meses que têm parcela, preservando a seleção
// atual sempre que ela continuar válida.
function populateContractsMonthFilter() {
    if (!elements.contractsMonthFilter) return;

    const previousValue = elements.contractsMonthFilter.value || "all";
    const monthKeys = [...new Set(appState.installments.map((installment) => getInstallmentMonthKey(installment.dueDate)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

    const options = ['<option value="all">Todos os meses</option>']
        .concat(monthKeys.map((key) => `<option value="${key}">${formatMonthLabel(key)}</option>`));

    elements.contractsMonthFilter.innerHTML = options.join("");
    elements.contractsMonthFilter.value = monthKeys.includes(previousValue) || previousValue === "all" ? previousValue : "all";
}


function getFilteredInstallments() {
    const statusFilter = elements.contractsFilter ? elements.contractsFilter.value : "pending";
    const monthFilter = elements.contractsMonthFilter ? elements.contractsMonthFilter.value : "all";
    const searchTerm = elements.contractsSearch ? elements.contractsSearch.value.trim().toLowerCase() : "";

    return appState.installments
        .filter((installment) => {
            const status = getInstallmentStatus(installment);

            if (statusFilter === "overdue" && !["overdue", "overdue30"].includes(status)) return false;
            if (statusFilter === "upcoming" && status !== "upcoming") return false;
            if (statusFilter === "today" && status !== "today") return false;
            if (statusFilter === "pending" && installment.paid) return false;
            // statusFilter === "all" não filtra por status

            if (monthFilter !== "all" && getInstallmentMonthKey(installment.dueDate) !== monthFilter) return false;

            if (searchTerm) {
                const client = findClient(installment.clientId);
                const clientName = client ? client.name.toLowerCase() : "";
                if (!clientName.includes(searchTerm)) return false;
            }

            return true;
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}


export function renderContractsSection() {
    renderInstallmentsTable();
    renderRpvTable();
}


function renderInstallmentsTable() {
    if (!elements.contractsTableBody) return;

    populateContractsMonthFilter();

    const rows = getFilteredInstallments();
    elements.contractsTableBody.innerHTML = "";

    if (elements.contractsEmptyState) {
        elements.contractsEmptyState.classList.toggle("hidden", rows.length > 0);
    }

    if (!rows.length) {
        return;
    }

    // Agrupa por mês de vencimento (do mais antigo/vencido para o mais futuro), com uma
    // linha de subtotal por mês.
    const monthKeys = [...new Set(rows.map((installment) => getInstallmentMonthKey(installment.dueDate)))]
        .sort((a, b) => a.localeCompare(b));

    monthKeys.forEach((monthKey) => {
        const installmentsOfMonth = rows.filter((installment) => getInstallmentMonthKey(installment.dueDate) === monthKey);
        const monthTotal = installmentsOfMonth.reduce((sum, installment) => sum + (Number(installment.amount) || 0), 0);

        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `
            <td colspan="7" style="font-weight:700">
                ${monthKey ? formatMonthLabel(monthKey) : "Sem vencimento"}
                <span style="font-weight:400;color:var(--color-muted)"> · ${installmentsOfMonth.length} parcela(s) · Total: ${formatCurrency(monthTotal)}</span>
            </td>
        `;
        elements.contractsTableBody.appendChild(headerRow);

        installmentsOfMonth.forEach((installment) => {
            elements.contractsTableBody.appendChild(buildInstallmentRow(installment));
        });
    });
}


function buildInstallmentRow(installment) {
    const client = findClient(installment.clientId);
    const status = getInstallmentStatus(installment);
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${client ? escapeHTML(client.name) : "Cliente removido"}</td>
        <td>${client ? escapeHTML(client.benefit || "-") : "-"}</td>
        <td>${installment.total ? `${installment.number}/${installment.total}` : "Avulsa"}</td>
        <td>${formatCurrency(installment.amount)}</td>
        <td>${formatDate(installment.dueDate)}</td>
        <td><span class="task-pill ${STATUS_PILL_CLASS[status]}">${STATUS_LABELS[status]}</span></td>
        <td class="event-actions">
            <button class="action-button ${installment.paid ? "" : "complete"}" type="button" data-action="toggle-installment-paid" data-id="${installment.id}">${installment.paid ? "↺ Desfazer" : "✓ Marcar paga"}</button>
            <button class="action-button" type="button" data-action="edit-installment" data-id="${installment.id}">Editar</button>
            <button class="action-button danger" type="button" data-action="delete-installment" data-id="${installment.id}">Excluir</button>
        </td>
    `;
    return row;
}


function renderRpvTable() {
    if (!elements.rpvTableBody) return;

    const searchTerm = elements.contractsSearch ? elements.contractsSearch.value.trim().toLowerCase() : "";
    const rows = appState.clients.filter((client) => (
        Number(client.rpvValue) > 0 && (!searchTerm || client.name.toLowerCase().includes(searchTerm))
    ));
    elements.rpvTableBody.innerHTML = "";

    if (elements.rpvEmptyState) {
        elements.rpvEmptyState.classList.toggle("hidden", rows.length > 0);
    }

    const today = todayISO();
    rows.forEach((client) => {
        const isToday = client.rpvDate === today && !client.rpvReceived;
        const statusLabel = client.rpvReceived ? "Recebido" : isToday ? "Receber hoje" : "Aguardando";
        const statusClass = client.rpvReceived ? "low" : isToday ? "medium" : "low";
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHTML(client.name)}</td>
            <td>${formatCurrency(client.rpvValue)}</td>
            <td>${client.rpvDate ? formatDate(client.rpvDate) : "Sem previsão"}</td>
            <td><span class="task-pill ${statusClass}">${statusLabel}</span></td>
            <td class="event-actions">
                <button class="action-button ${client.rpvReceived ? "" : "complete"}" type="button" data-action="toggle-rpv-received" data-id="${client.id}">${client.rpvReceived ? "↺ Desfazer" : "✓ Marcar recebido"}</button>
                <button class="action-button" type="button" data-action="edit-rpv" data-id="${client.id}">Editar</button>
                <button class="action-button danger" type="button" data-action="delete-rpv" data-id="${client.id}">Excluir</button>
            </td>
        `;
        elements.rpvTableBody.appendChild(row);
    });
}


// ---------------------------------------------------------------------------------------
// Ações da tabela de parcelas: marcar/desfazer pagamento, editar, excluir, adicionar avulsa
// ---------------------------------------------------------------------------------------

export async function handleContractsTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "toggle-installment-paid") {
        await toggleInstallmentPaid(id);
    }
    if (action === "edit-installment") {
        openInstallmentModal({ mode: "edit", installmentId: id });
    }
    if (action === "delete-installment") {
        requestDeleteInstallment(id);
    }
}


async function toggleInstallmentPaid(installmentId) {
    appState.installments = appState.installments.map((installment) => (
        installment.id === installmentId
            ? {
                ...installment,
                paid: !installment.paid,
                paidAt: installment.paid ? null : new Date().toISOString()
            }
            : installment
    ));
    await saveStorage(STORAGE_KEYS.installments, appState.installments);
    renderAll();
}


function requestDeleteInstallment(installmentId) {
    appState.pendingDeleteClientId = null;
    appState.pendingDeleteFinanceId = null;
    appState.pendingClearRpvClientId = null;
    appState.pendingDeleteInstallmentId = installmentId;

    document.getElementById("confirmTitle").textContent = "Excluir parcela";
    document.getElementById("confirmText").textContent = "Esta ação remove definitivamente esta parcela do controle de contratos.";
    elements.confirmOverlay.classList.remove("hidden");
    elements.cancelDeleteButton.focus();
}


// Chamado pelo roteador de exclusão em clients.js (mesmo modal genérico usado para
// excluir cliente e lançamento financeiro).
export async function confirmInstallmentDelete() {
    const installmentId = appState.pendingDeleteInstallmentId;
    if (!installmentId) {
        closeConfirmModal();
        return;
    }

    appState.installments = appState.installments.filter((installment) => installment.id !== installmentId);
    await saveStorage(STORAGE_KEYS.installments, appState.installments);
    closeConfirmModal();
    renderAll();
}


// ---------------------------------------------------------------------------------------
// Modal de nova parcela avulsa / edição de parcela existente
// ---------------------------------------------------------------------------------------

function populateInstallmentClientSelect() {
    if (!elements.installmentClientSelect) return;
    elements.installmentClientSelect.innerHTML = appState.clients
        .map((client) => `<option value="${client.id}">${escapeHTML(client.name)}</option>`)
        .join("");
}


export function openInstallmentModal({ mode, installmentId = null } = {}) {
    if (!elements.installmentModalOverlay) return;

    appState.editingInstallmentId = mode === "edit" ? installmentId : null;

    if (elements.installmentModalWarning) {
        elements.installmentModalWarning.classList.add("hidden");
        elements.installmentModalWarning.textContent = "";
    }

    if (mode === "edit") {
        const installment = appState.installments.find((item) => item.id === installmentId);
        if (!installment) return;

        elements.installmentModalTitle.textContent = "Editar parcela";
        elements.installmentClientField.classList.add("hidden");
        elements.installmentValueInput.value = installment.amount;
        elements.installmentDueDateInput.value = installment.dueDate;
    } else {
        populateInstallmentClientSelect();
        elements.installmentModalTitle.textContent = "Nova parcela avulsa";
        elements.installmentClientField.classList.remove("hidden");
        elements.installmentValueInput.value = "";
        elements.installmentDueDateInput.value = todayISO();
    }

    elements.installmentModalOverlay.classList.remove("hidden");
}


export function closeInstallmentModal() {
    appState.editingInstallmentId = null;
    if (elements.installmentModalOverlay) {
        elements.installmentModalOverlay.classList.add("hidden");
    }
}


export function handleInstallmentModalOverlayClick(event) {
    if (event.target === elements.installmentModalOverlay) {
        closeInstallmentModal();
    }
}


export async function handleInstallmentModalSave() {
    const amount = Number(elements.installmentValueInput.value);
    const dueDate = elements.installmentDueDateInput.value;

    if (!amount || amount <= 0 || !dueDate) {
        elements.installmentModalWarning.textContent = "Informe um valor válido e a data de vencimento.";
        elements.installmentModalWarning.classList.remove("hidden");
        return;
    }

    if (appState.editingInstallmentId) {
        appState.installments = appState.installments.map((installment) => (
            installment.id === appState.editingInstallmentId
                ? { ...installment, amount, dueDate, updatedAt: new Date().toISOString() }
                : installment
        ));
    } else {
        const clientId = elements.installmentClientSelect.value;
        if (!clientId) {
            elements.installmentModalWarning.textContent = "Selecione o cliente.";
            elements.installmentModalWarning.classList.remove("hidden");
            return;
        }

        appState.installments = [
            {
                id: createId(),
                clientId,
                number: appState.installments.filter((item) => item.clientId === clientId).length + 1,
                total: null, // parcela avulsa, fora do parcelamento automático
                amount,
                dueDate,
                paid: false,
                paidAt: null,
                createdAt: new Date().toISOString()
            },
            ...appState.installments
        ];
    }

    await saveStorage(STORAGE_KEYS.installments, appState.installments);
    closeInstallmentModal();
    renderAll();
}


// ---------------------------------------------------------------------------------------
// Ações da tabela de RPV: marcar/desfazer recebimento, editar (leva ao cadastro do
// cliente, onde os campos de RPV já existem) e excluir (limpa o RPV do cliente)
// ---------------------------------------------------------------------------------------

export async function handleRpvTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "toggle-rpv-received") {
        await toggleRpvReceived(id);
    }
    if (action === "edit-rpv") {
        editRpv(id);
    }
    if (action === "delete-rpv") {
        requestClearRpv(id);
    }
}


async function toggleRpvReceived(clientId) {
    appState.clients = appState.clients.map((client) => (
        client.id === clientId
            ? {
                ...client,
                rpvReceived: !client.rpvReceived,
                rpvReceivedAt: client.rpvReceived ? null : new Date().toISOString()
            }
            : client
    ));
    await saveStorage(STORAGE_KEYS.clients, appState.clients);
    renderAll();
}


// Reaproveita o formulário de cadastro de cliente (já tem os campos de RPV) em vez de
// duplicar um formulário de edição só para isso.
async function editRpv(clientId) {
    const clientsModule = await import("./clients.js");
    clientsModule.fillClientForm(clientId);
    clientsModule.showClientMode("register");
    setActiveView("clients");
    if (elements.sidebar) {
        elements.sidebar.classList.remove("open");
    }
}


function requestClearRpv(clientId) {
    appState.pendingDeleteClientId = null;
    appState.pendingDeleteFinanceId = null;
    appState.pendingDeleteInstallmentId = null;
    appState.pendingClearRpvClientId = clientId;

    document.getElementById("confirmTitle").textContent = "Excluir RPV";
    document.getElementById("confirmText").textContent = "Esta ação remove o valor e a previsão de RPV deste cliente (o contrato e as parcelas não são afetados).";
    elements.confirmOverlay.classList.remove("hidden");
    elements.cancelDeleteButton.focus();
}


// Chamado pelo roteador de exclusão em clients.js (mesmo modal genérico usado para
// excluir cliente e lançamento financeiro).
export async function confirmRpvClear() {
    const clientId = appState.pendingClearRpvClientId;
    if (!clientId) {
        closeConfirmModal();
        return;
    }

    appState.clients = appState.clients.map((client) => (
        client.id === clientId
            ? { ...client, rpvValue: 0, rpvDate: "", rpvReceived: false, rpvReceivedAt: null }
            : client
    ));
    await saveStorage(STORAGE_KEYS.clients, appState.clients);
    closeConfirmModal();
    renderAll();
}


// ---------------------------------------------------------------------------------------
// Relatório de impressão da aba Contratos: respeita busca/mês/status aplicados na tela
// (mesma lógica de getFilteredInstallments), mostra os indicadores no topo, as parcelas
// agrupadas por mês e a lista de RPVs pendentes — sem formulários/filtros/botões de ação.
// ---------------------------------------------------------------------------------------

export function printContractsReport() {
    const filteredInstallments = getFilteredInstallments();
    const indicators = calculateContractIndicators();

    const monthFilterValue = elements.contractsMonthFilter ? elements.contractsMonthFilter.value : "all";
    const monthLabel = monthFilterValue && monthFilterValue !== "all" ? formatMonthLabel(monthFilterValue) : "Todos os meses";
    const statusFilterValue = elements.contractsFilter ? elements.contractsFilter.value : "pending";
    const statusLabel = {
        pending: "Em aberto",
        overdue: "Vencidos",
        today: "Vencendo hoje",
        upcoming: "A vencer",
        all: "Todos"
    }[statusFilterValue] || statusFilterValue;
    const searchTerm = elements.contractsSearch ? elements.contractsSearch.value.trim() : "";

    const summary = `
        <div class="finance-overview">
            <article class="summary-card">
                <span>Vencidos</span>
                <strong>${indicators.overdue}</strong>
                <p>Parcelas em atraso</p>
            </article>
            <article class="summary-card">
                <span>Vencendo hoje</span>
                <strong>${indicators.dueToday}</strong>
                <p>Parcelas com vencimento hoje</p>
            </article>
            <article class="summary-card">
                <span>Receber hoje</span>
                <strong>${indicators.receiveToday}</strong>
                <p>RPVs previstos para hoje</p>
            </article>
            <article class="summary-card">
                <span>A vencer</span>
                <strong>${indicators.upcoming}</strong>
                <p>Parcelas futuras</p>
            </article>
            <article class="summary-card">
                <span>Vencido +30 dias</span>
                <strong>${indicators.overdue30}</strong>
                <p>Atraso crítico</p>
            </article>
        </div>
    `;

    let installmentsBody;
    if (!filteredInstallments.length) {
        installmentsBody = '<p style="color:#667085">Nenhuma parcela encontrada para os filtros aplicados.</p>';
    } else {
        const monthKeys = [...new Set(filteredInstallments.map((installment) => getInstallmentMonthKey(installment.dueDate)))]
            .sort((a, b) => a.localeCompare(b));

        installmentsBody = monthKeys.map((monthKey) => {
            const installmentsOfMonth = filteredInstallments.filter((installment) => getInstallmentMonthKey(installment.dueDate) === monthKey);
            const monthTotal = installmentsOfMonth.reduce((sum, installment) => sum + (Number(installment.amount) || 0), 0);

            const rows = installmentsOfMonth.map((installment) => {
                const client = findClient(installment.clientId);
                const status = getInstallmentStatus(installment);
                return `
                    <tr>
                        <td>${client ? escapeHTML(client.name) : "Cliente removido"}</td>
                        <td>${client ? escapeHTML(client.benefit || "-") : "-"}</td>
                        <td>${installment.total ? `${installment.number}/${installment.total}` : "Avulsa"}</td>
                        <td>${formatCurrency(installment.amount)}</td>
                        <td>${formatDate(installment.dueDate)}</td>
                        <td>${escapeHTML(STATUS_LABELS[status])}</td>
                    </tr>
                `;
            }).join("");

            return `
                <h3 style="margin:14px 0 4px">${monthKey ? formatMonthLabel(monthKey) : "Sem vencimento"} — Total: ${formatCurrency(monthTotal)}</h3>
                <table>
                    <thead>
                        <tr><th>Cliente</th><th>Benefício</th><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }).join("");
    }

    const rpvClients = appState.clients.filter((client) => Number(client.rpvValue) > 0);
    let rpvBody = "";
    if (rpvClients.length) {
        const today = todayISO();
        const rpvRows = rpvClients.map((client) => {
            const isToday = client.rpvDate === today && !client.rpvReceived;
            const statusLabel = client.rpvReceived ? "Recebido" : isToday ? "Receber hoje" : "Aguardando";
            return `
                <tr>
                    <td>${escapeHTML(client.name)}</td>
                    <td>${formatCurrency(client.rpvValue)}</td>
                    <td>${client.rpvDate ? formatDate(client.rpvDate) : "Sem previsão"}</td>
                    <td>${escapeHTML(statusLabel)}</td>
                </tr>
            `;
        }).join("");

        rpvBody = `
            <h3 style="margin:18px 0 4px">RPVs</h3>
            <table>
                <thead>
                    <tr><th>Cliente</th><th>Valor do RPV</th><th>Previsão</th><th>Status</th></tr>
                </thead>
                <tbody>${rpvRows}</tbody>
            </table>
        `;
    }

    const subtitleParts = [`Mês: ${escapeHTML(monthLabel)}`, `Status: ${escapeHTML(statusLabel)}`];
    if (searchTerm) subtitleParts.push(`Busca: "${escapeHTML(searchTerm)}"`);
    subtitleParts.push(`${filteredInstallments.length} parcela(s)`);

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument("Relatório de contratos", subtitleParts.join(" · "), `${summary}${installmentsBody}${rpvBody}`));
    win.document.close();
    win.focus();
    win.print();
}
