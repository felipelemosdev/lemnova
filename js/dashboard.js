// js/dashboard.js
// Módulo do Dashboard: relógio/data, mini calendário, cards de resumo (clientes,
// processos, honorários/custos/saldo), colunas de tarefas por prazo e próximos eventos.

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import { todayISO, formatDate, formatCurrency, escapeHTML } from "./utils.js";
import { calculateFinanceTotals } from "./finance.js";
import { getSortedEvents } from "./agenda.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { renderAll } from "./main.js";

export function renderCalendarWidget() {
    if (!elements.dashCalendarWidget) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayStr = todayISO();

    // Event dates for highlighting
    const eventDates = new Set(appState.events.map((e) => e.date));

    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now);
    const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

    let html = `<div class="cal-header"><span>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span></div>`;
    html += '<div class="cal-grid">';
    dayNames.forEach((d) => { html += `<div class="cal-day-name">${d}</div>`; });

    // empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isToday = dateStr === todayStr;
        const hasEvent = eventDates.has(dateStr);
        const cls = ["cal-day", isToday ? "today" : "", hasEvent && !isToday ? "has-event" : ""].filter(Boolean).join(" ");
        html += `<div class="${cls}" title="${dateStr}">${d}</div>`;
    }

    html += '</div>';
    elements.dashCalendarWidget.innerHTML = html;
}


export function renderDate() {
    updateDateTime();

    if (!elements.financeDate.value) {
        elements.financeDate.value = todayISO();
    }

    if (!elements.eventDate.value) {
        elements.eventDate.value = todayISO();
    }

    if (!elements.eventTime.value) {
        elements.eventTime.value = "09:00";
    }
}


export function startClock() {
    updateDateTime();
    window.clearInterval(appState.clockTimer);
    appState.clockTimer = window.setInterval(updateDateTime, 1000);
}


export function updateDateTime() {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).format(now);

    elements.dateDisplays.forEach((element) => {
        element.textContent = formatted;
    });
}


export function renderNotifications() {
    if (!elements.notifList) return;

    const today = todayISO();
    const overdueTasks = appState.tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today);
    const todayEvents = appState.events.filter((eventItem) => eventItem.date === today && !eventItem.done);

    const items = [
        ...overdueTasks.map((task) => ({
            kind: "overdue",
            refKind: "task",
            refId: task.id,
            title: `Tarefa atrasada: ${task.title}`,
            detail: `Prazo era ${formatDate(task.dueDate)}`
        })),
        ...todayEvents.map((eventItem) => ({
            kind: "event",
            refKind: "event",
            refId: eventItem.id,
            title: eventItem.type,
            detail: `Hoje às ${eventItem.time}`
        }))
    ];

    const count = items.length;
    if (elements.notifBadge) {
        elements.notifBadge.textContent = count > 9 ? "9+" : String(count);
        elements.notifBadge.classList.toggle("hidden", count === 0);
    }

    if (!items.length) {
        elements.notifList.innerHTML = '<p class="empty-state">Nenhuma notificação por enquanto.</p>';
        return;
    }

    elements.notifList.innerHTML = items.map((item) => `
        <button type="button" class="notif-item ${item.kind === "overdue" ? "overdue" : ""}" data-kind="${item.refKind}" data-id="${item.refId}">
            <strong>${escapeHTML(item.title)}</strong>
            <span>${escapeHTML(item.detail)}</span>
        </button>
    `).join("");
}


export function handleNotifListClick(event) {
    const button = event.target.closest(".notif-item[data-id]");
    if (!button) {
        return;
    }
    openNotificationDetail(button.dataset.kind, button.dataset.id);
}


export function openNotificationDetail(kind, id) {
    if (kind === "task") {
        const task = appState.tasks.find((item) => item.id === id);
        if (!task) return;

        const client = findClient(task.clientId);
        const priorityLabel = { low: "Baixa", medium: "Média", high: "Alta" }[task.priority] || task.priority;
        const metaParts = [
            client ? client.name : null,
            task.responsible ? `Responsável: ${task.responsible}` : null,
            task.dueDate ? `Prazo: ${formatDate(task.dueDate)}` : "Sem prazo",
            `Prioridade: ${priorityLabel}`
        ].filter(Boolean);

        appState.activeNotifTaskId = task.id;
        elements.notifDetailEyebrow.textContent = "Tarefa atrasada";
        elements.notifDetailTitle.textContent = task.title;
        elements.notifDetailText.textContent = [metaParts.join(" · "), task.description].filter(Boolean).join("\n\n");
        elements.notifDetailCompleteButton.classList.toggle("hidden", task.done);
    } else {
        const eventItem = appState.events.find((item) => item.id === id);
        if (!eventItem) return;

        const client = findClient(eventItem.clientId);
        const metaParts = [
            client ? client.name : null,
            `Hoje às ${eventItem.time}`,
            eventItem.alert ? `Alerta: ${eventItem.alert}` : null
        ].filter(Boolean);

        appState.activeNotifTaskId = null;
        elements.notifDetailEyebrow.textContent = "Evento de hoje";
        elements.notifDetailTitle.textContent = eventItem.type;
        elements.notifDetailText.textContent = [metaParts.join(" · "), eventItem.notes].filter(Boolean).join("\n\n");
        elements.notifDetailCompleteButton.classList.add("hidden");
    }

    elements.notifPanel.classList.add("hidden");
    elements.notifDetailOverlay.classList.remove("hidden");
}


export function closeNotificationDetail() {
    appState.activeNotifTaskId = null;
    elements.notifDetailOverlay.classList.add("hidden");
}


export async function completeNotificationTask() {
    const taskId = appState.activeNotifTaskId;
    if (!taskId) {
        closeNotificationDetail();
        return;
    }

    appState.tasks = appState.tasks.map((task) => (
        task.id === taskId ? { ...task, done: true } : task
    ));
    await saveStorage(STORAGE_KEYS.tasks, appState.tasks);
    closeNotificationDetail();
    renderAll();
}


export function handleNotifDetailOverlayClick(event) {
    if (event.target === elements.notifDetailOverlay) {
        closeNotificationDetail();
    }
}


export function renderSummary() {
    const today = todayISO();
    const todayEvents = appState.events.filter((eventItem) => eventItem.date === today && !eventItem.done);
    const nextEvent = getSortedEvents().find((eventItem) => eventItem.date >= today);

    if (elements.calendarToday) {
        elements.calendarToday.textContent = `Hoje: ${formatDate(today)}`;
    }
    if (elements.calendarNextEvent) {
        elements.calendarNextEvent.textContent = nextEvent
            ? `${nextEvent.type} em ${formatDate(nextEvent.date)} às ${nextEvent.time}`
            : "Nenhum evento cadastrado.";
    }
    elements.eventCount.textContent = appState.events.length;
    if (elements.eventAlertCount) {
        elements.eventAlertCount.textContent = todayEvents.length
            ? `${todayEvents.length} alerta(s) para hoje.`
            : "Nenhum alerta para hoje.";
    }

    if (elements.dashClientCount) {
        elements.dashClientCount.textContent = appState.clients.length;
    }
    if (elements.dashProcessCount) {
        elements.dashProcessCount.textContent = appState.documents.length;
    }

    const totals = calculateFinanceTotals();
    elements.feesTotal.textContent = formatCurrency(totals.fees);
    elements.paymentsTotal.textContent = formatCurrency(totals.officeCosts);
    elements.receiptsTotal.textContent = formatCurrency(totals.balance);

    if (elements.dashFeesTotal) {
        elements.dashFeesTotal.textContent = formatCurrency(totals.fees);
    }
    if (elements.dashCostsTotal) {
        elements.dashCostsTotal.textContent = formatCurrency(totals.officeCosts);
    }
    if (elements.dashBalanceTotal) {
        elements.dashBalanceTotal.textContent = formatCurrency(totals.balance);
    }

    renderDashboardTasks();
    renderNotifications();
}


export function renderDashboardTasks() {
    const today = todayISO();
    const openTasks = appState.tasks.filter((t) => !t.done);

    elements.taskOpenCount.textContent = openTasks.length;
    if (elements.taskOpenText) {
        elements.taskOpenText.textContent = openTasks.length
            ? `${openTasks.length} tarefa(s) em aberto.`
            : "Nenhuma tarefa em aberto.";
    }

    const overdue = appState.tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today);
    const todayTasks = appState.tasks.filter((t) => !t.done && t.dueDate === today);
    const upcoming = appState.tasks.filter((t) => !t.done && t.dueDate && t.dueDate > today);
    const done = appState.tasks.filter((t) => t.done);

    const renderColumn = (list, container, countEl) => {
        countEl.textContent = list.length;
        container.innerHTML = "";
        if (!list.length) {
            container.innerHTML = '<p class="task-col-empty">Nenhuma</p>';
            return;
        }
        list.forEach((task) => {
            const client = findClient(task.clientId);
            const priorityLabel = { low: "Baixa", medium: "Média", high: "Alta" }[task.priority] || task.priority;
            const card = document.createElement("div");
            card.className = `task-dash-card priority-${task.priority}`;
            card.innerHTML = `
                <strong>${escapeHTML(task.title)}</strong>
                ${client ? `<span class="task-dash-client">${escapeHTML(client.name)}</span>` : ""}
                <div class="task-dash-meta">
                    <span class="task-pill ${task.priority}">${escapeHTML(priorityLabel)}</span>
                    ${task.dueDate ? `<span class="task-dash-date">${formatDate(task.dueDate)}</span>` : ""}
                </div>
            `;
            container.appendChild(card);
        });
    };

    renderColumn(overdue, elements.dashTaskOverdueList, elements.dashTaskOverdueCount);
    renderColumn(todayTasks, elements.dashTaskTodayList, elements.dashTaskTodayCount);
    renderColumn(upcoming, elements.dashTaskUpcomingList, elements.dashTaskUpcomingCount);
    renderColumn(done, elements.dashTaskDoneList, elements.dashTaskDoneCount);
}


export function renderDashboardEvents() {
    if (!elements.dashEventList) return;
    const today = todayISO();
    const upcoming = getSortedEvents().filter((ev) => ev.date >= today).slice(0, 8);
    elements.dashEventList.innerHTML = "";

    if (!upcoming.length) {
        elements.dashEventList.innerHTML = '<p class="empty-state">Nenhum evento próximo.</p>';
        return;
    }

    upcoming.forEach((eventItem) => {
        const client = findClient(eventItem.clientId);
        const item = document.createElement("article");
        item.className = "compact-item event-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(eventItem.type)}</strong>
                <span>${formatDate(eventItem.date)} às ${escapeHTML(eventItem.time)}${client ? " · " + escapeHTML(client.name) : ""}</span>
                ${eventItem.notes ? `<small>${escapeHTML(eventItem.notes)}</small>` : ""}
            </div>
            <div class="event-actions">
                <span class="status-pill">${escapeHTML(eventItem.alert)}</span>
            </div>
        `;
        elements.dashEventList.appendChild(item);
    });
}
