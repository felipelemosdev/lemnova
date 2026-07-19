// js/kits.js
// Módulo de Kits Jurídicos: cadastro de Modelos de documento (independentes entre si) e de
// Kits Jurídicos (nome, categoria, tipo de prestação de serviço e lista ordenada de
// documentos). A partir do "Tipo de Prestação de Serviço" escolhido no cadastro do cliente,
// o sistema identifica automaticamente o Kit correspondente. O botão "Gerar Documentação"
// preenche cada modelo do kit com os dados do cliente e salva o resultado como um documento
// individual vinculado ao cliente — os modelos originais nunca são alterados.
//
// Arquitetura pensada para evoluir sem quebrar o restante do app:
//   - Modelos e Kits são coleções independentes (um modelo pode futuramente pertencer a mais
//     de um kit) e cada documento gerado guarda uma cópia própria do conteúdo (nunca uma
//     referência ao modelo), o que já viabiliza edição e versionamento por documento.
//   - `fillPlaceholders` é o único ponto que conhece a sintaxe de campos ({{token}}), então
//     trocar por um motor de templates mais robusto no futuro não afeta o resto do módulo.
//   - `renderClientDocumentItem` / `openClientDocEditor` isolam a apresentação de cada
//     documento — é o ponto de extensão natural para um editor de texto rico, assinatura
//     eletrônica (novo status "Assinado" + campo de assinatura) e histórico de versões
//     (bastaria guardar um array `history` em vez de sobrescrever `content`).
//   - Todas as gravações passam por `saveStorage`/`persistAll` (storage.js), então migrar
//     para uma API Node/Express + MySQL no futuro significa apenas trocar a implementação
//     desse módulo de storage — nenhum outro arquivo precisa mudar.

import { appState, findClient } from "./state.js";
import { elements } from "./dom.js";
import {
    createId,
    todayISO,
    formatDate,
    formatFileSize,
    escapeHTML,
    fileToDataURL,
    isAllowedAttachment,
    getAttachmentLabel,
    slugifyFileName,
    downloadBlob
} from "./utils.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import { buildPrintDocument } from "./print.js";
import { renderAll } from "./main.js";

// ============================================================================
// Dados-base (seed): 4 Kits Jurídicos de exemplo, cada um com seus modelos de documento.
// Podem ser editados/expandidos livremente pela tela de administração — este seed só
// popula o sistema na primeira execução (mesmo padrão de seedInitialData em main.js).
// ============================================================================

const SEED_TEMPLATES = [
    {
        id: "tpl-contrato-honorarios",
        name: "Contrato de Honorários Advocatícios",
        order: 1,
        status: "Ativo",
        body: `
            <h3>CONTRATO DE HONORÁRIOS ADVOCATÍCIOS</h3>
            <p>Pelo presente instrumento particular, de um lado <strong>{{escritorio.nome}}</strong>, escritório de advocacia, doravante denominado CONTRATADO, e de outro lado <strong>{{cliente.nome}}</strong>, portador(a) do CPF {{cliente.cpf}}, residente em {{cliente.enderecoCompleto}}, doravante denominado(a) CONTRATANTE, têm entre si justo e contratado o seguinte:</p>
            <p><strong>Cláusula 1ª — Do objeto.</strong> O CONTRATADO se compromete a prestar serviços advocatícios ao CONTRATANTE referentes a {{cliente.servico}}.</p>
            <p><strong>Cláusula 2ª — Dos honorários.</strong> Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO os honorários a serem ajustados em aditivo próprio, incluindo eventuais honorários de êxito.</p>
            <p><strong>Cláusula 3ª — Do foro.</strong> Fica eleito o foro do domicílio do CONTRATANTE para dirimir quaisquer dúvidas oriundas deste contrato.</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
            <p>_____________________________________<br>CONTRATANTE — {{cliente.nome}}</p>
            <p>_____________________________________<br>CONTRATADO — {{escritorio.nome}}</p>
        `
    },
    {
        id: "tpl-procuracao",
        name: "Procuração Ad Judicia",
        order: 2,
        status: "Ativo",
        body: `
            <h3>PROCURAÇÃO "AD JUDICIA ET EXTRA"</h3>
            <p><strong>OUTORGANTE:</strong> {{cliente.nome}}, CPF {{cliente.cpf}}, residente em {{cliente.enderecoCompleto}}.</p>
            <p><strong>OUTORGADO:</strong> {{escritorio.nome}}.</p>
            <p><strong>PODERES:</strong> Pelo presente instrumento, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO seu bastante procurador, conferindo-lhe poderes da cláusula "ad judicia et extra", em referência a {{cliente.servico}}, podendo substabelecer, requerer, assinar, transigir, receber valores e praticar todos os demais atos necessários ao bom e fiel cumprimento do presente mandato.</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
            <p>_____________________________________<br>{{cliente.nome}}</p>
        `
    },
    {
        id: "tpl-declaracao-hipossuficiencia",
        name: "Declaração de Hipossuficiência",
        order: 3,
        status: "Ativo",
        body: `
            <h3>DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA</h3>
            <p>Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, residente em {{cliente.enderecoCompleto}}, declaro, para os devidos fins de direito e sob as penas da lei, que não possuo condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo do meu sustento e de minha família, razão pela qual requeiro os benefícios da gratuidade da justiça, nos termos da Lei nº 1.060/50 e do art. 98 do Código de Processo Civil.</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
            <p>_____________________________________<br>{{cliente.nome}}</p>
        `
    },
    {
        id: "tpl-autorizacao-consulta",
        name: "Autorização para Consulta Processual e Dados",
        order: 4,
        status: "Ativo",
        body: `
            <h3>AUTORIZAÇÃO PARA CONSULTA PROCESSUAL E TRATAMENTO DE DADOS</h3>
            <p>Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, autorizo {{escritorio.nome}} a realizar consultas processuais em meu nome junto a tribunais, órgãos públicos e sistemas correlatos (incluindo INSS/Meu INSS, quando aplicável), bem como a tratar meus dados pessoais estritamente para a finalidade de {{cliente.servico}}, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
            <p>_____________________________________<br>{{cliente.nome}}</p>
        `
    },
    {
        id: "tpl-declaracao-residencia",
        name: "Declaração de Residência",
        order: 5,
        status: "Ativo",
        body: `
            <h3>DECLARAÇÃO DE RESIDÊNCIA</h3>
            <p>Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, declaro, sob as penas da lei, que resido no seguinte endereço: {{cliente.enderecoCompleto}}, CEP {{cliente.cep}}.</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
            <p>_____________________________________<br>{{cliente.nome}}</p>
        `
    },
    {
        id: "tpl-declaracao-dependentes",
        name: "Declaração de Dependentes (Pensão por Morte)",
        order: 6,
        status: "Ativo",
        body: `
            <h3>DECLARAÇÃO DE DEPENDENTES</h3>
            <p>Eu, {{cliente.nome}}, CPF {{cliente.cpf}}, requerente da pensão por morte junto ao INSS, declaro, sob as penas da lei, a relação de dependentes do(a) falecido(a) para fins de habilitação do benefício, comprometendo-me a apresentar a documentação comprobatória complementar (certidões de nascimento/casamento, comprovantes de dependência econômica) quando solicitada.</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
            <p>_____________________________________<br>{{cliente.nome}}</p>
        `
    },
    {
        id: "tpl-ficha-qualificacao-trabalhista",
        name: "Ficha de Qualificação Trabalhista",
        order: 7,
        status: "Ativo",
        body: `
            <h3>FICHA DE QUALIFICAÇÃO — RECLAMAÇÃO TRABALHISTA</h3>
            <p><strong>Reclamante:</strong> {{cliente.nome}}</p>
            <p><strong>CPF:</strong> {{cliente.cpf}}</p>
            <p><strong>Endereço:</strong> {{cliente.enderecoCompleto}}</p>
            <p><strong>Telefone:</strong> {{cliente.telefone}} &nbsp; <strong>E-mail:</strong> {{cliente.email}}</p>
            <p>Dados coletados para instrução da reclamação trabalhista referente a {{cliente.servico}}. Os dados do(a) empregador(a), período contratual e pedidos deverão ser complementados na petição inicial.</p>
            <p>{{cliente.cidadeEstado}}, {{data.hoje}}.</p>
        `
    }
];

const SEED_KITS = [
    {
        id: "kit-bpc-loas",
        name: "Kit BPC/LOAS",
        category: "Previdenciário",
        serviceType: "BPC LOAS",
        status: "Ativo",
        documentIds: ["tpl-contrato-honorarios", "tpl-procuracao", "tpl-declaracao-hipossuficiencia", "tpl-declaracao-residencia", "tpl-autorizacao-consulta"]
    },
    {
        id: "kit-auxilio-doenca",
        name: "Kit Auxílio-Doença",
        category: "Previdenciário",
        serviceType: "Auxílio-Doença",
        status: "Ativo",
        documentIds: ["tpl-contrato-honorarios", "tpl-procuracao", "tpl-autorizacao-consulta"]
    },
    {
        id: "kit-pensao-morte",
        name: "Kit Pensão por Morte",
        category: "Previdenciário",
        serviceType: "Pensão por Morte",
        status: "Ativo",
        documentIds: ["tpl-contrato-honorarios", "tpl-procuracao", "tpl-declaracao-dependentes", "tpl-autorizacao-consulta"]
    },
    {
        id: "kit-trabalhista",
        name: "Kit Trabalhista",
        category: "Trabalhista",
        serviceType: "Trabalhista",
        status: "Ativo",
        documentIds: ["tpl-contrato-honorarios", "tpl-procuracao", "tpl-declaracao-hipossuficiencia", "tpl-ficha-qualificacao-trabalhista"]
    }
];


export async function seedKitsIfEmpty() {
    if (appState.templates.length || appState.kits.length) {
        return;
    }

    appState.templates = SEED_TEMPLATES.map((tpl) => ({ ...tpl, createdAt: new Date().toISOString() }));
    appState.kits = SEED_KITS.map((kit) => ({ ...kit, createdAt: new Date().toISOString() }));

    await Promise.all([
        saveStorage(STORAGE_KEYS.templates, appState.templates),
        saveStorage(STORAGE_KEYS.kits, appState.kits)
    ]);
}


// ============================================================================
// Motor de preenchimento de campos ({{token}}) — único ponto que conhece a sintaxe.
// ============================================================================

export function buildTemplateContext(client) {
    const address = client.address || {};
    const enderecoCompleto = [
        [address.street, address.number].filter(Boolean).join(", "),
        address.district,
        [address.city, address.state].filter(Boolean).join(" - ")
    ].filter(Boolean).join(", ") || "Endereço não informado";

    return {
        "cliente.nome": client.name || "Cliente",
        "cliente.cpf": client.document || "Não informado",
        "cliente.email": client.email || "Não informado",
        "cliente.telefone": client.phone || "Não informado",
        "cliente.enderecoCompleto": enderecoCompleto,
        "cliente.cep": address.cep || "Não informado",
        "cliente.cidadeEstado": [address.city, address.state].filter(Boolean).join(" - ") || "Não informado",
        "cliente.area": client.area || "Não informado",
        "cliente.servico": client.serviceType || client.area || "prestação de serviço jurídico",
        "data.hoje": formatDate(todayISO()),
        "escritorio.nome": "Lemnova"
    };
}


export function fillPlaceholders(body, context) {
    return String(body || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, token) => {
        const value = context[token];
        return value !== undefined ? escapeHTML(value) : match;
    });
}


export function detectKitForClient(client) {
    if (!client || !client.serviceType) {
        return null;
    }
    return appState.kits.find((kit) => kit.serviceType === client.serviceType && kit.status !== "Inativo") || null;
}


// ============================================================================
// Geração da documentação do cliente
// ============================================================================

export async function generateClientDocumentation(clientId) {
    const client = findClient(clientId);
    if (!client) {
        alert("Cliente não encontrado.");
        return;
    }

    const kit = detectKitForClient(client);
    if (!kit) {
        alert(`Nenhum Kit Jurídico cadastrado para o tipo de prestação de serviço "${client.serviceType || "não informado"}". Cadastre um kit em Kits Jurídicos → Kits & Modelos.`);
        return;
    }

    const existing = appState.clientDocuments.filter((doc) => doc.clientId === clientId && doc.kitId === kit.id);
    if (existing.length) {
        const confirmed = window.confirm(`Este cliente já possui ${existing.length} documento(s) gerado(s) pelo ${kit.name}. Deseja gerar novamente? Os documentos atuais serão substituídos (os modelos originais não são afetados).`);
        if (!confirmed) {
            return;
        }
        appState.clientDocuments = appState.clientDocuments.filter((doc) => !(doc.clientId === clientId && doc.kitId === kit.id));
    }

    const context = buildTemplateContext(client);
    const templatesById = new Map(appState.templates.map((tpl) => [tpl.id, tpl]));

    const generated = kit.documentIds
        .map((templateId, index) => {
            const template = templatesById.get(templateId);
            if (!template || template.status === "Inativo") {
                return null;
            }
            return {
                id: createId(),
                clientId,
                kitId: kit.id,
                kitName: kit.name,
                templateId: template.id,
                name: template.name,
                order: index + 1,
                status: "Gerado",
                content: fillPlaceholders(template.body, context),
                createdAt: new Date().toISOString()
            };
        })
        .filter(Boolean);

    if (!generated.length) {
        alert(`O ${kit.name} não possui modelos ativos no momento.`);
        return;
    }

    appState.clientDocuments = [...generated, ...appState.clientDocuments];
    await saveStorage(STORAGE_KEYS.clientDocuments, appState.clientDocuments);

    appState.kitsSelectedClientId = clientId;
    appState.activeKitsTab = "clientDocs";
    renderAll();
    alert(`${generated.length} documento(s) gerado(s) com sucesso a partir do ${kit.name}.`);
}


// ============================================================================
// Aba "Kits & Modelos" — administração
// ============================================================================

export function setKitsTab(tab) {
    appState.activeKitsTab = tab;
    renderKitsTabs();
}


export function renderKitsTabs() {
    if (!elements.kitsTabButtons) return;

    elements.kitsTabButtons.forEach((button) => {
        button.classList.toggle("btn-primary", button.dataset.kitsTab === appState.activeKitsTab);
        button.classList.toggle("btn-ghost", button.dataset.kitsTab !== appState.activeKitsTab);
    });

    Object.entries(elements.kitsPanels).forEach(([key, panel]) => {
        if (panel) panel.classList.toggle("hidden", key !== appState.activeKitsTab);
    });
}


export async function handleTemplateSubmit(event) {
    event.preventDefault();

    const payload = {
        name: elements.templateName.value.trim(),
        order: Number(elements.templateOrder.value) || 1,
        status: elements.templateStatus.value,
        body: elements.templateBody.value
    };

    if (appState.editingTemplateId) {
        appState.templates = appState.templates.map((tpl) => (
            tpl.id === appState.editingTemplateId ? { ...tpl, ...payload, updatedAt: new Date().toISOString() } : tpl
        ));
    } else {
        appState.templates.unshift({ id: createId(), ...payload, createdAt: new Date().toISOString() });
    }

    await saveStorage(STORAGE_KEYS.templates, appState.templates);
    resetTemplateForm();
    renderKits();
    renderTemplates();
}


export function resetTemplateForm() {
    appState.editingTemplateId = null;
    elements.templateForm.reset();
    elements.templateOrder.value = String(appState.templates.length + 1);
    elements.templateStatus.value = "Ativo";
    elements.templateFormTitle.textContent = "Novo modelo de documento";
    elements.cancelTemplateEdit.classList.add("hidden");
}


export function fillTemplateForm(templateId) {
    const template = appState.templates.find((tpl) => tpl.id === templateId);
    if (!template) return;

    appState.editingTemplateId = templateId;
    elements.templateName.value = template.name;
    elements.templateOrder.value = template.order;
    elements.templateStatus.value = template.status;
    elements.templateBody.value = template.body;
    elements.templateFormTitle.textContent = "Editar modelo de documento";
    elements.cancelTemplateEdit.classList.remove("hidden");
    elements.templateName.focus();
}


export async function deleteTemplate(templateId) {
    const inUse = appState.kits.some((kit) => kit.documentIds.includes(templateId));
    if (inUse && !window.confirm("Este modelo está sendo usado em pelo menos um Kit Jurídico. Excluir mesmo assim? Ele será removido dos kits que o utilizam.")) {
        return;
    }
    if (!inUse && !window.confirm("Deseja excluir este modelo de documento?")) {
        return;
    }

    appState.templates = appState.templates.filter((tpl) => tpl.id !== templateId);
    appState.kits = appState.kits.map((kit) => ({ ...kit, documentIds: kit.documentIds.filter((id) => id !== templateId) }));

    if (appState.editingTemplateId === templateId) {
        resetTemplateForm();
    }

    await Promise.all([
        saveStorage(STORAGE_KEYS.templates, appState.templates),
        saveStorage(STORAGE_KEYS.kits, appState.kits)
    ]);
    renderKits();
    renderTemplates();
}


export function renderTemplates() {
    if (!elements.templateList) return;

    elements.templateList.innerHTML = "";

    if (!appState.templates.length) {
        elements.templateList.innerHTML = '<p class="empty-state">Nenhum modelo de documento cadastrado.</p>';
        return;
    }

    const sorted = [...appState.templates].sort((a, b) => (a.order || 0) - (b.order || 0));

    sorted.forEach((template) => {
        const kitsUsing = appState.kits.filter((kit) => kit.documentIds.includes(template.id));
        const item = document.createElement("article");
        item.className = "compact-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(template.name)}</strong>
                <span>Ordem ${template.order} · ${kitsUsing.length ? `usado em ${kitsUsing.length} kit(s)` : "não vinculado a nenhum kit"}</span>
            </div>
            <div class="event-actions">
                <span class="status-pill ${template.status === "Inativo" ? "archived" : ""}">${escapeHTML(template.status)}</span>
                <button class="action-button" type="button" data-action="edit-template" data-id="${template.id}">Editar</button>
                <button class="action-button danger" type="button" data-action="delete-template" data-id="${template.id}">Excluir</button>
            </div>
        `;
        elements.templateList.appendChild(item);
    });

    renderKitTemplateCheckboxes();
}


export function handleTemplateListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "edit-template") fillTemplateForm(button.dataset.id);
    if (button.dataset.action === "delete-template") deleteTemplate(button.dataset.id);
}


function renderKitTemplateCheckboxes() {
    if (!elements.kitDocumentsPicker) return;

    const selected = new Set(appState.editingKitId
        ? (appState.kits.find((kit) => kit.id === appState.editingKitId)?.documentIds || [])
        : []);

    if (!appState.templates.length) {
        elements.kitDocumentsPicker.innerHTML = '<p class="empty-state">Cadastre modelos de documento primeiro.</p>';
        return;
    }

    const sorted = [...appState.templates].sort((a, b) => (a.order || 0) - (b.order || 0));

    elements.kitDocumentsPicker.innerHTML = sorted.map((template) => `
        <label class="kit-doc-check ${template.status === "Inativo" ? "is-inactive" : ""}">
            <input type="checkbox" name="kitDocument" value="${template.id}" ${selected.has(template.id) ? "checked" : ""}>
            <span>${escapeHTML(template.name)}</span>
            ${template.status === "Inativo" ? '<small>(inativo)</small>' : ""}
        </label>
    `).join("");
}


export async function handleKitSubmit(event) {
    event.preventDefault();

    const documentIds = Array.from(elements.kitDocumentsPicker.querySelectorAll('input[name="kitDocument"]:checked'))
        .map((input) => input.value);

    if (!documentIds.length) {
        alert("Selecione ao menos um documento para compor o kit.");
        return;
    }

    const payload = {
        name: elements.kitName.value.trim(),
        category: elements.kitCategory.value,
        serviceType: elements.kitServiceType.value.trim(),
        status: elements.kitStatus.value,
        documentIds
    };

    if (appState.editingKitId) {
        appState.kits = appState.kits.map((kit) => (
            kit.id === appState.editingKitId ? { ...kit, ...payload, updatedAt: new Date().toISOString() } : kit
        ));
    } else {
        appState.kits.unshift({ id: createId(), ...payload, createdAt: new Date().toISOString() });
    }

    await saveStorage(STORAGE_KEYS.kits, appState.kits);
    resetKitForm();
    renderKits();
    renderClientDocumentsTab();
}


export function resetKitForm() {
    appState.editingKitId = null;
    elements.kitForm.reset();
    elements.kitStatus.value = "Ativo";
    elements.kitFormTitle.textContent = "Novo Kit Jurídico";
    elements.cancelKitEdit.classList.add("hidden");
    renderKitTemplateCheckboxes();
}


export function fillKitForm(kitId) {
    const kit = appState.kits.find((item) => item.id === kitId);
    if (!kit) return;

    appState.editingKitId = kitId;
    elements.kitName.value = kit.name;
    elements.kitCategory.value = kit.category;
    elements.kitServiceType.value = kit.serviceType;
    elements.kitStatus.value = kit.status;
    elements.kitFormTitle.textContent = "Editar Kit Jurídico";
    elements.cancelKitEdit.classList.remove("hidden");
    renderKitTemplateCheckboxes();
    elements.kitName.focus();
}


export async function deleteKit(kitId) {
    if (!window.confirm("Deseja excluir este Kit Jurídico? Documentos já gerados a partir dele não serão apagados.")) {
        return;
    }

    appState.kits = appState.kits.filter((kit) => kit.id !== kitId);
    if (appState.editingKitId === kitId) {
        resetKitForm();
    }
    await saveStorage(STORAGE_KEYS.kits, appState.kits);
    renderKits();
    renderClientDocumentsTab();
}


export function renderKits() {
    if (!elements.kitList) return;

    elements.kitList.innerHTML = "";

    if (!appState.kits.length) {
        elements.kitList.innerHTML = '<p class="empty-state">Nenhum Kit Jurídico cadastrado.</p>';
        return;
    }

    const templatesById = new Map(appState.templates.map((tpl) => [tpl.id, tpl]));

    appState.kits.forEach((kit) => {
        const docsLabel = kit.documentIds
            .map((id) => templatesById.get(id)?.name)
            .filter(Boolean)
            .join(", ") || "Nenhum documento vinculado";

        const item = document.createElement("article");
        item.className = "compact-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(kit.name)}</strong>
                <span>${escapeHTML(kit.category || "Sem categoria")} · Tipo de prestação: ${escapeHTML(kit.serviceType || "Não definido")}</span>
                <small>${escapeHTML(docsLabel)}</small>
            </div>
            <div class="event-actions">
                <span class="status-pill ${kit.status === "Inativo" ? "archived" : ""}">${escapeHTML(kit.status)}</span>
                <span class="document-badge">${kit.documentIds.length} doc(s)</span>
                <button class="action-button" type="button" data-action="edit-kit" data-id="${kit.id}">Editar</button>
                <button class="action-button danger" type="button" data-action="delete-kit" data-id="${kit.id}">Excluir</button>
            </div>
        `;
        elements.kitList.appendChild(item);
    });
}


export function handleKitListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "edit-kit") fillKitForm(button.dataset.id);
    if (button.dataset.action === "delete-kit") deleteKit(button.dataset.id);
}


// ============================================================================
// Aba "Documentos do Cliente"
// ============================================================================

export function renderClientDocumentsTab() {
    if (!elements.kitsClientSelect) return;

    const previousValue = elements.kitsClientSelect.value || appState.kitsSelectedClientId;
    elements.kitsClientSelect.innerHTML = '<option value="">Selecione um cliente</option>';
    appState.clients.forEach((client) => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = client.name;
        elements.kitsClientSelect.appendChild(option);
    });

    const clientId = appState.clients.some((c) => c.id === previousValue) ? previousValue : "";
    elements.kitsClientSelect.value = clientId;
    appState.kitsSelectedClientId = clientId;

    renderKitDetectionInfo(clientId);
    renderClientDocumentList(clientId);
    renderClientAttachments(clientId);
}


export function handleKitsClientChange() {
    appState.kitsSelectedClientId = elements.kitsClientSelect.value;
    renderKitDetectionInfo(appState.kitsSelectedClientId);
    renderClientDocumentList(appState.kitsSelectedClientId);
    renderClientAttachments(appState.kitsSelectedClientId);
}


function renderKitDetectionInfo(clientId) {
    if (!elements.kitDetectionInfo) return;

    const client = findClient(clientId);
    if (!client) {
        elements.kitDetectionInfo.textContent = "Selecione um cliente para identificar o Kit Jurídico correspondente.";
        elements.generateDocsButton.disabled = true;
        return;
    }

    const kit = detectKitForClient(client);
    if (!kit) {
        elements.kitDetectionInfo.textContent = `Tipo de prestação de serviço: ${client.serviceType || "não informado"}. Nenhum Kit Jurídico cadastrado para este tipo — cadastre um em "Kits & Modelos".`;
        elements.generateDocsButton.disabled = true;
        return;
    }

    elements.kitDetectionInfo.textContent = `Kit identificado: ${kit.name} (${kit.documentIds.length} documento(s)) — tipo de prestação: ${client.serviceType}.`;
    elements.generateDocsButton.disabled = false;
}


function renderClientDocumentList(clientId) {
    if (!elements.clientDocList) return;

    const docs = appState.clientDocuments
        .filter((doc) => doc.clientId === clientId)
        .sort((a, b) => (a.kitName || "").localeCompare(b.kitName || "") || (a.order || 0) - (b.order || 0));

    elements.clientDocList.innerHTML = "";
    elements.clientDocEmptyState.classList.toggle("hidden", docs.length > 0 || !clientId);

    if (!clientId) {
        elements.clientDocEmptyState.classList.add("hidden");
        return;
    }

    if (!docs.length) {
        elements.clientDocEmptyState.textContent = "Nenhum documento gerado para este cliente ainda. Clique em \"Gerar Documentação\".";
        return;
    }

    docs.forEach((doc) => {
        const item = document.createElement("article");
        item.className = "compact-item document-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(doc.name)}</strong>
                <span>${escapeHTML(doc.kitName)} · gerado em ${new Date(doc.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            <div class="document-actions">
                <span class="status-pill">${escapeHTML(doc.status)}</span>
                <button class="action-button" type="button" data-action="view-doc" data-id="${doc.id}">Visualizar</button>
                <button class="action-button" type="button" data-action="edit-doc" data-id="${doc.id}">Editar</button>
                <button class="action-button" type="button" data-action="pdf-doc" data-id="${doc.id}">Gerar PDF</button>
                <button class="action-button" type="button" data-action="print-doc" data-id="${doc.id}">Imprimir</button>
                <button class="action-button" type="button" data-action="download-doc" data-id="${doc.id}">Baixar</button>
                <button class="action-button danger" type="button" data-action="delete-doc" data-id="${doc.id}">Excluir</button>
            </div>
        `;
        elements.clientDocList.appendChild(item);
    });
}


export function handleClientDocListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const docId = button.dataset.id;
    const actions = {
        "view-doc": openClientDocPreview,
        "edit-doc": openClientDocEditor,
        "pdf-doc": printClientDoc,
        "print-doc": printClientDoc,
        "download-doc": downloadClientDoc,
        "delete-doc": deleteClientDoc
    };

    const handler = actions[button.dataset.action];
    if (handler) handler(docId);
}


export function openClientDocPreview(docId) {
    const doc = appState.clientDocuments.find((item) => item.id === docId);
    if (!doc) return;

    const client = findClient(doc.clientId);
    elements.documentPreviewTitle.textContent = doc.name;
    elements.documentPreviewMeta.textContent = `${doc.kitName} · ${client ? client.name : "Sem cliente"} · gerado em ${new Date(doc.createdAt).toLocaleString("pt-BR")}`;
    elements.documentPreviewBody.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.title = `Visualização de ${doc.name}`;
    iframe.srcdoc = buildDocumentPreviewHtml(doc.content);
    elements.documentPreviewBody.appendChild(iframe);

    elements.documentPreviewOverlay.classList.remove("hidden");
    elements.closeDocumentPreview.focus();
}


function buildDocumentPreviewHtml(content) {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <style>
            body { font-family: Georgia, 'Times New Roman', serif; color: #1c2333; padding: 24px; line-height: 1.5; }
            h3 { margin-top: 0; }
        </style>
        </head><body>${content}</body></html>`;
}


export function openClientDocEditor(docId) {
    const doc = appState.clientDocuments.find((item) => item.id === docId);
    if (!doc) return;

    appState.activeClientDocId = docId;
    elements.docEditorTitle.textContent = `Editar documento — ${doc.name}`;
    elements.docEditorTextarea.value = htmlToPlainText(doc.content);
    elements.docEditorOverlay.classList.remove("hidden");
    elements.docEditorTextarea.focus();
}


export function closeClientDocEditor() {
    appState.activeClientDocId = null;
    elements.docEditorOverlay.classList.add("hidden");
}


export async function saveClientDocEdit() {
    const docId = appState.activeClientDocId;
    if (!docId) {
        closeClientDocEditor();
        return;
    }

    const plainText = elements.docEditorTextarea.value;
    const htmlContent = plainText
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHTML(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("");

    appState.clientDocuments = appState.clientDocuments.map((doc) => (
        doc.id === docId ? { ...doc, content: htmlContent, status: "Editado", updatedAt: new Date().toISOString() } : doc
    ));

    await saveStorage(STORAGE_KEYS.clientDocuments, appState.clientDocuments);
    closeClientDocEditor();
    renderClientDocumentList(appState.kitsSelectedClientId);
}


// Conversão simples HTML → texto (mantém quebras de parágrafo) só para alimentar o
// textarea de edição. Quando um editor rico for adotado, este passo deixa de ser necessário.
function htmlToPlainText(html) {
    const container = document.createElement("div");
    container.innerHTML = html;
    return Array.from(container.querySelectorAll("p"))
        .map((p) => p.innerHTML.replace(/<br\s*\/?>/gi, "\n"))
        .map((text) => {
            const span = document.createElement("span");
            span.innerHTML = text;
            return span.textContent;
        })
        .join("\n\n");
}


export function printClientDoc(docId) {
    const doc = appState.clientDocuments.find((item) => item.id === docId);
    if (!doc) return;

    const client = findClient(doc.clientId);
    const subtitle = `${doc.kitName}${client ? " · " + client.name : ""}`;

    const win = window.open("", "_blank");
    win.document.write(buildPrintDocument(doc.name, subtitle, doc.content));
    win.document.close();
    win.focus();
    win.print();
}


export function downloadClientDoc(docId) {
    const doc = appState.clientDocuments.find((item) => item.id === docId);
    if (!doc) return;

    // Truque compatível com Word: um arquivo .doc contendo HTML é aberto normalmente pelo
    // Microsoft Word. É uma solução 100% front-end; quando o backend existir, este ponto
    // pode passar a chamar uma rota que gera .docx "de verdade" com uma lib como docx/officegen.
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>${escapeHTML(doc.name)}</title></head>
        <body style="font-family:Georgia, 'Times New Roman', serif;">${doc.content}</body></html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    downloadBlob(blob, `${slugifyFileName(doc.name)}.doc`);
}


export async function deleteClientDoc(docId) {
    if (!window.confirm("Deseja excluir este documento gerado?")) {
        return;
    }

    appState.clientDocuments = appState.clientDocuments.filter((doc) => doc.id !== docId);
    await saveStorage(STORAGE_KEYS.clientDocuments, appState.clientDocuments);
    renderClientDocumentList(appState.kitsSelectedClientId);
}


// ============================================================================
// Anexos livres do cliente (PDF, DOCX, imagens)
// ============================================================================

export async function handleAttachmentUpload(event) {
    const clientId = appState.kitsSelectedClientId;
    const files = Array.from(elements.attachmentInput.files || []);
    if (!clientId) {
        alert("Selecione um cliente antes de anexar arquivos.");
        elements.attachmentInput.value = "";
        return;
    }
    if (!files.length) {
        return;
    }

    const invalid = files.find((file) => !isAllowedAttachment(file));
    if (invalid) {
        alert("Envie apenas arquivos PDF, DOCX, JPG ou PNG.");
        elements.attachmentInput.value = "";
        return;
    }

    try {
        const records = await Promise.all(files.map(async (file) => ({
            id: createId(),
            clientId,
            fileName: file.name,
            fileType: file.type || "",
            fileSize: file.size,
            fileData: await fileToDataURL(file),
            createdAt: new Date().toISOString()
        })));

        appState.clientAttachments = [...records, ...appState.clientAttachments];
        await saveStorage(STORAGE_KEYS.clientAttachments, appState.clientAttachments);
    } catch (error) {
        alert("Não foi possível ler um dos arquivos selecionados.");
    }

    elements.attachmentInput.value = "";
    renderClientAttachments(clientId);
}


function renderClientAttachments(clientId) {
    if (!elements.attachmentList) return;

    const attachments = appState.clientAttachments.filter((item) => item.clientId === clientId);
    elements.attachmentList.innerHTML = "";
    elements.attachmentUploadWrap.classList.toggle("hidden", !clientId);
    elements.attachmentEmptyState.classList.toggle("hidden", attachments.length > 0 || !clientId);

    if (!clientId || !attachments.length) {
        return;
    }

    attachments.forEach((attachment) => {
        const label = getAttachmentLabel(attachment.fileType, attachment.fileName);
        const item = document.createElement("div");
        item.className = "client-document-item";
        item.innerHTML = `
            <div>
                <strong>${escapeHTML(attachment.fileName)}</strong>
                <span>${formatFileSize(attachment.fileSize)} · anexado em ${new Date(attachment.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            ${label !== "DOCX"
                ? `<button class="action-button" type="button" data-action="view-attachment" data-id="${attachment.id}">Visualizar</button>`
                : ""}
            <button class="action-button" type="button" data-action="download-attachment" data-id="${attachment.id}">Baixar</button>
            <span class="document-badge">${label}</span>
            <button class="action-button danger" type="button" data-action="delete-attachment" data-id="${attachment.id}">Excluir</button>
        `;
        elements.attachmentList.appendChild(item);
    });
}


export function handleAttachmentListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const attachmentId = button.dataset.id;
    if (button.dataset.action === "view-attachment") openAttachmentPreview(attachmentId);
    if (button.dataset.action === "download-attachment") downloadAttachment(attachmentId);
    if (button.dataset.action === "delete-attachment") deleteAttachment(attachmentId);
}


function openAttachmentPreview(attachmentId) {
    const attachment = appState.clientAttachments.find((item) => item.id === attachmentId);
    if (!attachment) return;

    const label = getAttachmentLabel(attachment.fileType, attachment.fileName);
    elements.documentPreviewTitle.textContent = attachment.fileName;
    elements.documentPreviewMeta.textContent = `${label} · ${formatFileSize(attachment.fileSize)}`;
    elements.documentPreviewBody.innerHTML = "";

    if (label === "PDF") {
        const iframe = document.createElement("iframe");
        iframe.src = attachment.fileData;
        iframe.title = `Visualização de ${attachment.fileName}`;
        elements.documentPreviewBody.appendChild(iframe);
    } else {
        const image = document.createElement("img");
        image.src = attachment.fileData;
        image.alt = `Visualização de ${attachment.fileName}`;
        elements.documentPreviewBody.appendChild(image);
    }

    elements.documentPreviewOverlay.classList.remove("hidden");
    elements.closeDocumentPreview.focus();
}


function downloadAttachment(attachmentId) {
    const attachment = appState.clientAttachments.find((item) => item.id === attachmentId);
    if (!attachment) return;

    const link = document.createElement("a");
    link.href = attachment.fileData;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
}


async function deleteAttachment(attachmentId) {
    if (!window.confirm("Deseja excluir este anexo?")) {
        return;
    }

    appState.clientAttachments = appState.clientAttachments.filter((item) => item.id !== attachmentId);
    await saveStorage(STORAGE_KEYS.clientAttachments, appState.clientAttachments);
    renderClientAttachments(appState.kitsSelectedClientId);
}
