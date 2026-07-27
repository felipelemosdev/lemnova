// js/finance.js
// Módulo Financeiro: lançamentos (entradas/saídas), listagem com busca e filtro por mês
// (agrupada por mês), exclusão (com confirmação), cálculo de totais realizados x
// lançamentos futuros (honorários, custos, saldo) e os helpers de categoria/fluxo usados
// também pelo dashboard.

import { appState, findClient } from "./state.js";
import { elements, closeConfirmModal } from "./dom.js";
import { createId, todayISO, formatCurrency, formatDate, escapeHTML } from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { buildPrintDocument } from "./print.js";
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

        const monthTotals = entriesOfMonth.reduce((totals, entry) => {
            const amount = Number(entry.amount) || 0;
            if (getFinanceFlow(entry) === "Entrada") {
                totals.balance += amount;
            } else {
                totals.balance -= amount;
            }
            return totals;
        }, { balance: 0 });

        const headerRow = document.createElement("tr");
        headerRow.innerHTML = `
            <td colspan="8" style="font-weight:700">
                ${monthKey ? formatMonthLabel(monthKey) : "Sem data"}
                <span style="font-weight:400;color:var(--color-muted)"> · Saldo do mês: ${formatCurrency(monthTotals.balance)}</span>
            </td>
        `;
        elements.financeTableBody.appendChild(headerRow);

        entriesOfMonth.forEach((entry) => {
            elements.financeTableBody.appendChild(buildFinanceRow(entry));
        });
    });
}


function buildFinanceRow(entry) {
    const client = findClient(entry.clientId);
    const isFuture = entry.date > todayISO();
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
        <td>${isFuture ? '<span class="task-pill medium">Previsto</span>' : '<span class="task-pill low">Realizado</span>'}</td>
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


// Só considera lançamentos com data até hoje — lançamentos futuros (previstos) não entram
// no saldo/honorários/custos "realizados" para não inflar o caixa com algo que ainda não
// aconteceu. Veja calculateFutureFinanceTotals() para os valores previstos.
export function calculateFinanceTotals() {
    const today = todayISO();
    return appState.finance
        .filter((entry) => entry.date <= today)
        .reduce((totals, entry) => {
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


// Lançamentos com data futura (ainda não realizados): saldo líquido previsto (entradas -
// saídas) e a contagem de quantos existem, usados no card "Lançamentos futuros".
export function calculateFutureFinanceTotals() {
    const today = todayISO();
    const futureEntries = appState.finance.filter((entry) => entry.date > today);

    const balance = futureEntries.reduce((total, entry) => (
        total + (getFinanceFlow(entry) === "Entrada" ? Number(entry.amount) || 0 : -(Number(entry.amount) || 0))
    ), 0);

    return { balance, count: futureEntries.length };
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

            const monthBalance = entriesOfMonth.reduce((sum, entry) => (
                sum + (getFinanceFlow(entry) === "Entrada" ? Number(entry.amount) || 0 : -(Number(entry.amount) || 0))
            ), 0);

            const rows = entriesOfMonth.map((entry) => {
                const client = findClient(entry.clientId);
                const isFuture = entry.date > todayISO();
                return `
                    <tr>
                        <td>${escapeHTML(getFinanceFlow(entry))}</td>
                        <td>${escapeHTML(entry.category || inferFinanceCategory(entry))}</td>
                        <td>${escapeHTML(entry.description)}</td>
                        <td>${client ? escapeHTML(client.name) : "-"}</td>
                        <td>${formatCurrency(entry.amount)}</td>
                        <td>${formatDate(entry.date)}</td>
                        <td>${isFuture ? "Previsto" : "Realizado"}</td>
                    </tr>
                `;
            }).join("");

            return `
                <h3 style="margin:14px 0 4px">${monthKey ? formatMonthLabel(monthKey) : "Sem data"} — Saldo do mês: ${formatCurrency(monthBalance)}</h3>
                <table>
                    <thead>
                        <tr><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Cliente</th><th>Valor</th><th>Data</th><th>Status</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
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
