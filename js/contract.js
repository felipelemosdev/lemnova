// js/contract.js
// Geração de contratos de prestação de serviços advocatícios preenchidos com os dados
// do cliente, no timbre do escritório Débora Lopes Advogada, prontos para impressão.
//
// COMO FUNCIONA O SISTEMA DE MODELOS (CONTRACT_TEMPLATES)
// ---------------------------------------------------------------------------
// Os 11 tipos de contrato disponíveis vivem em utils.js (CONTRACT_TYPES), como fonte
// única de ids/labels — reaproveitados aqui, no cadastro de cliente (filtro/busca) e no
// financeiro (tipo de recebimento). Cada tipo tem, aqui, um "modelo" próprio dentro de
// CONTRACT_TEMPLATES que define:
//   - matches: valores do campo "Tipo de Benefício" do cliente que sugerem esse modelo
//              automaticamente ao abrir o popup (não precisa bater 100%, usa "contém")
//   - hasOriginalText: true quando o modelo já tem cláusulas próprias digitadas abaixo
//              (buildBody preenche com os dados do cliente). false quando ainda não
//              recebemos o texto original desse contrato — nesse caso o popup mostra um
//              campo para anexar o PDF original do contrato (uma vez só, reaproveitado
//              para todos os clientes desse tipo) e o botão "Gerar e imprimir" abre esse
//              PDF tal como enviado, preservando 100% da formatação original.
//   - signatures: quais linhas de assinatura aparecem no final ("contratada" e/ou
//                 "contratante") — só usado quando hasOriginalText é true.
//   - buildBody(client): retorna o HTML das cláusulas específicas daquele contrato (a
//                 introdução com os dados do cliente e a assinatura já são montadas
//                 automaticamente pelo restante do arquivo, não precisa repetir) — só
//                 usado quando hasOriginalText é true.
//
// PARA CADASTRAR O TEXTO ORIGINAL DE UM MODELO QUE AINDA NÃO TEM (ex: "trabalhista"):
//   1. Troque hasOriginalText para true.
//   2. Escreva o texto das cláusulas em buildBody(client) (copie a estrutura de um dos
//      modelos que já têm hasOriginalText: true como referência).
//   3. Pronto — o campo de upload de PDF desaparece automaticamente para esse modelo e o
//      botão "Gerar e imprimir" passa a montar o contrato em HTML, como os demais.
// ---------------------------------------------------------------------------

import { appState } from "./state.js";
import { elements } from "./dom.js";
import { STORAGE_KEYS, saveStorage } from "./storage.js";
import {
    formatCpf,
    formatCep,
    formatAddress,
    todayISO,
    formatDate,
    formatFileSize,
    escapeHTML,
    fileToDataURL,
    isAllowedPdf,
    CONTRACT_TYPES,
    getContractTypeLabel
} from "./utils.js";

const OFFICE_ADDRESS = "Av. Marechal Deodoro, nº 474, loja B, Jd. 25 de Agosto, Duque de Caxias/RJ";

// Texto genérico reaproveitado pelos benefícios previdenciários "clássicos" (aposentadoria,
// auxílio-doença, auxílio-acidente e salário-maternidade), que já usavam a mesma cláusula
// no modelo anterior ("previdenciario").
function buildPrevidenciarioBody() {
    return `
        <p>Pelo presente, venho confirmar nossos entendimentos verbais no sentido do patrocínio de
            requerimento de <strong>AÇÃO DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO</strong> no importe de
            30% (trinta por cento) a título de honorários, a ser calculado com base nos atrasados de RPV
            a ser expedido pelo juízo em separado, conforme art. 18 da Resolução nº. 405/2016 CJF.</p>

        <p>Estando V.Sa. de acordo com os termos do presente, é favor manifestar-se expressamente,
            apondo o seu ciente no lugar indicado.</p>
    `;
}

function buildLoasBody(beneficioLabel) {
    return `
        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como objeto a
            Prestação de Serviços de Assessoria Jurídica ao Contratante, no REQUERIMENTO DE LOAS –
            ${escapeHTML(beneficioLabel)}.</p>

        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios serão devidos
            em esfera administrativa o importe de cinco parcelas integrais do benefício, acrescidos de
            trinta por cento sob os atrasados.</p>

        <p><span class="clause-label">Parágrafo Primeiro:</span> Em sede judicial serão devidos o
            importe de seis parcelas integrais do valor do benefício, acrescidos de trinta por cento
            sob os atrasados.</p>

        <p><span class="clause-label">Cláusula Terceira:</span> As partes estabelecem que havendo
            atraso no pagamento dos honorários, serão cobrados juros de mora na proporção de 1% (um por
            cento) ao mês, acrescidos de multa de 20% (vinte por cento). A quitação do contrato terá seu
            início no primeiro pagamento de benefício pelo contratante junto ao banco.</p>

        <p><span class="clause-label">Cláusula Quarta:</span> Todas as despesas efetuadas pelo
            CONTRATADO, ligadas direta ou indiretamente com o processo, incluindo-se fotocópias,
            emolumentos, viagens, custas, entre outros encargos relativos ao processo, ficarão a cargo
            do CONTRATANTE, desde que devidamente comprovadas.</p>

        <p><span class="clause-label">Cláusula Quinta:</span> O contrato poderá ser rescindido por
            qualquer das partes, no curso de sua execução, mediante prévia notificação por escrito; em
            caso de substabelecimento sem reserva de poderes; renúncia do mandato outorgado; ou
            descumprimento do contrato.</p>

        <p><span class="clause-label">Parágrafo primeiro:</span> no caso de rescisão por parte do
            contratante serão devidas as despesas até a data da rescisão do contrato; além de multa de
            40% (quarenta por cento) da quantia ajustada pelos serviços ora contratados.</p>

        <p><span class="clause-label">Parágrafo segundo:</span> Caberá ainda a referida multa
            estipulada no parágrafo anterior no caso da ação vir a ser julgada improcedente ou extinta
            por culpa exclusiva do contratante, como por exemplo, falta em audiência, falta a perícias
            médicas, deixar de entregar documentos solicitados dentro do prazo estabelecido para
            atendimento de despachos e outros.</p>

        <p><span class="clause-label">Cláusula Sexta:</span> O Contratante fica obrigado a, sempre que
            houver mudança de endereço, telefone ou e-mail, comunicar imediatamente ao Contratado.</p>

        <p><span class="clause-label">Cláusula Sétima:</span> O presente contrato não tem caráter
            personalíssimo, podendo o Contratado ser representado por outro(s) advogado(s) em qualquer
            ato processual.</p>

        <p>Por estarem justos certos e contratados assinamos o presente instrumento, elegendo o foro de
            Duque de Caxias/RJ, para dirimir quaisquer dúvidas provenientes deste contrato.</p>
    `;
}

// Placeholder mostrado apenas se o "Gerar e imprimir" for usado num modelo sem texto
// próprio e sem PDF anexado ainda (na prática isso é bloqueado antes, ver
// generateAndPrintContract, mas fica aqui como rede de segurança).
function buildPendingOriginalBody() {
    return `
        <p style="color:#b42318"><strong>Modelo ainda não cadastrado.</strong> Anexe o PDF original deste
            contrato na tela de geração de contrato antes de imprimir, ou cadastre o texto das cláusulas
            em CONTRACT_TEMPLATES (contract.js).</p>
    `;
}

// ids batem 1:1 com CONTRACT_TYPES (utils.js) — é isso que popula o seletor do modal,
// o filtro de clientes e o campo "Tipo de contrato" do financeiro.
export const CONTRACT_TEMPLATES = {
    aposentadoria: {
        matches: ["Aposentadoria"],
        hasOriginalText: true,
        signatures: ["contratante"],
        buildBody: buildPrevidenciarioBody
    },
    auxilio_doenca: {
        matches: ["Auxílio-Doença", "Auxilio-Doença", "Auxílio Doença"],
        hasOriginalText: true,
        signatures: ["contratante"],
        buildBody: buildPrevidenciarioBody
    },
    auxilio_acidente: {
        matches: ["Acidente de Trabalho", "Auxílio-Acidente", "Auxílio Acidente"],
        hasOriginalText: true,
        signatures: ["contratante"],
        buildBody: buildPrevidenciarioBody
    },
    maternidade: {
        matches: ["Salário-Maternidade", "Maternidade"],
        hasOriginalText: true,
        signatures: ["contratante"],
        buildBody: buildPrevidenciarioBody
    },
    loas_idoso: {
        matches: ["BPC Idoso", "LOAS Idoso"],
        hasOriginalText: true,
        signatures: ["contratada", "contratante"],
        buildBody: () => buildLoasBody("Benefício Assistencial ao Idoso")
    },
    loas_deficiente: {
        matches: ["BPC Deficiente", "LOAS Deficiente"],
        hasOriginalText: true,
        signatures: ["contratada", "contratante"],
        buildBody: () => buildLoasBody("Benefício Assistencial ao Portador de Deficiência")
    },
    doenca_ocupacional: {
        matches: ["Doença Ocupacional"],
        hasOriginalText: false,
        signatures: ["contratada", "contratante"],
        buildBody: buildPendingOriginalBody
    },
    pensao_morte: {
        matches: ["Pensão por Morte", "Pensão"],
        hasOriginalText: false,
        signatures: ["contratada", "contratante"],
        buildBody: buildPendingOriginalBody
    },
    trabalhista: {
        matches: ["Trabalhista"],
        hasOriginalText: false,
        signatures: ["contratada", "contratante"],
        buildBody: buildPendingOriginalBody
    },
    majoracao: {
        matches: ["Majoração"],
        hasOriginalText: false,
        signatures: ["contratada", "contratante"],
        buildBody: buildPendingOriginalBody
    },
    consumidor: {
        matches: ["Consumidor"],
        hasOriginalText: false,
        signatures: ["contratada", "contratante"],
        buildBody: buildPendingOriginalBody
    }

    // Para dar texto próprio a um dos modelos acima (hasOriginalText: false), veja as
    // instruções no topo do arquivo.
};


export function openContractModal(clientId) {
    const client = appState.clients.find((item) => item.id === clientId);
    if (!client) {
        return;
    }

    appState.activeContractClientId = clientId;
    elements.contractModalSubtitle.textContent = `Cliente: ${client.name}. Escolha o modelo de contrato correspondente ao serviço prestado.`;

    populateTemplateSelect();
    elements.contractTemplateSelect.value = suggestTemplateId(client);
    updateContractPdfSection();

    const missingFields = [
        !client.name && "nome",
        !client.nationality && "nacionalidade",
        !client.maritalStatus && "estado civil",
        !client.rg && "RG",
        !client.document && "CPF",
        !(client.address && client.address.street) && "endereço"
    ].filter(Boolean);

    if (missingFields.length) {
        elements.contractModalWarning.textContent = `Atenção: ${missingFields.join(", ")} não informado(s) no cadastro. O contrato sairá com espaços em branco nesses campos — edite o cliente para completar antes de imprimir, se preferir.`;
        elements.contractModalWarning.classList.remove("hidden");
    } else {
        elements.contractModalWarning.textContent = "";
        elements.contractModalWarning.classList.add("hidden");
    }

    elements.contractOverlay.classList.remove("hidden");
}


export function closeContractModal() {
    appState.activeContractClientId = null;
    elements.contractOverlay.classList.add("hidden");
}


// Mostra/esconde o bloco de upload de PDF conforme o modelo selecionado tenha (ou não)
// texto original cadastrado, e atualiza a informação do PDF já anexado (se houver).
// Chamada quando o modal abre e sempre que o <select> de modelo muda.
export function updateContractPdfSection() {
    if (!elements.contractPdfUploadGroup) {
        return;
    }

    const templateId = elements.contractTemplateSelect.value;
    const template = CONTRACT_TEMPLATES[templateId];
    const needsPdf = !template || !template.hasOriginalText;

    elements.contractPdfUploadGroup.classList.toggle("hidden", !needsPdf);
    if (!needsPdf) {
        return;
    }

    const pdfTemplate = getContractPdfTemplate(templateId);
    if (elements.contractPdfInput) {
        elements.contractPdfInput.value = "";
    }

    if (pdfTemplate) {
        elements.contractPdfCurrentInfo.innerHTML = `📎 Modelo atual: <strong>${escapeHTML(pdfTemplate.fileName)}</strong> (${formatFileSize(pdfTemplate.fileSize)}) — anexado em ${new Date(pdfTemplate.updatedAt).toLocaleString("pt-BR")}.`;
        if (elements.contractPdfRemoveButton) {
            elements.contractPdfRemoveButton.classList.remove("hidden");
        }
    } else {
        elements.contractPdfCurrentInfo.textContent = "Nenhum PDF anexado ainda para este modelo. Envie o contrato original em PDF (válido para todos os clientes deste tipo).";
        if (elements.contractPdfRemoveButton) {
            elements.contractPdfRemoveButton.classList.add("hidden");
        }
    }
}


// Mantido com o nome anterior por compatibilidade com quem já ligou este handler ao
// evento "change" do seletor de modelo (ver main.js).
export function updateContractVariantVisibility() {
    updateContractPdfSection();
}


export async function handleContractPdfUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (!isAllowedPdf(file)) {
        alert("Envie um arquivo em PDF.");
        event.target.value = "";
        return;
    }

    const templateId = elements.contractTemplateSelect.value;

    try {
        await saveContractPdfTemplateFile(templateId, file);
    } catch (error) {
        alert("Não foi possível salvar o PDF enviado. Tente um arquivo menor.");
    }

    updateContractPdfSection();
}


export async function handleContractPdfRemove() {
    const templateId = elements.contractTemplateSelect.value;
    const label = getContractTypeLabel(templateId);

    if (!window.confirm(`Remover o PDF do modelo "${label}"? Isso afeta todos os clientes deste tipo de contrato.`)) {
        return;
    }

    await removeContractPdfTemplateFile(templateId);
    updateContractPdfSection();
}


export function generateAndPrintContract() {
    const clientId = appState.activeContractClientId;
    const client = appState.clients.find((item) => item.id === clientId);
    if (!client) {
        closeContractModal();
        return;
    }

    const templateId = elements.contractTemplateSelect.value;
    const template = CONTRACT_TEMPLATES[templateId];

    if (!template) {
        closeContractModal();
        return;
    }

    if (!template.hasOriginalText) {
        const pdfTemplate = getContractPdfTemplate(templateId);
        if (!pdfTemplate) {
            alert("Anexe o PDF original deste modelo de contrato antes de gerar e imprimir.");
            return;
        }

        // Abre o PDF exatamente como foi enviado (preserva 100% a formatação original,
        // inclusive múltiplas páginas). O visualizador de PDF do navegador tem seu
        // próprio botão de impressão.
        window.open(pdfTemplate.fileData, "_blank");
        closeContractModal();
        return;
    }

    const html = buildContractHtml(client, templateId);

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();

    closeContractModal();
}


function populateTemplateSelect() {
    elements.contractTemplateSelect.innerHTML = CONTRACT_TYPES
        .map((type) => `<option value="${type.id}">${escapeHTML(type.label)}</option>`)
        .join("");
}


function suggestTemplateId(client) {
    const benefit = (client.benefit || "").toLowerCase();

    const match = CONTRACT_TYPES.find(({ id }) => {
        const template = CONTRACT_TEMPLATES[id];
        return template && template.matches.some((candidate) => benefit.includes(candidate.toLowerCase()));
    });

    if (match) {
        return match.id;
    }

    return client.contractType && CONTRACT_TEMPLATES[client.contractType]
        ? client.contractType
        : CONTRACT_TYPES[0].id;
}


function getContractPdfTemplate(templateId) {
    return appState.contractPdfTemplates.find((item) => item.id === templateId) || null;
}


async function saveContractPdfTemplateFile(templateId, file) {
    const fileData = await fileToDataURL(file);
    const record = {
        id: templateId,
        fileName: file.name,
        fileSize: file.size,
        fileData,
        updatedAt: new Date().toISOString()
    };

    appState.contractPdfTemplates = [
        ...appState.contractPdfTemplates.filter((item) => item.id !== templateId),
        record
    ];

    await saveStorage(STORAGE_KEYS.contractPdfTemplates, appState.contractPdfTemplates);
    return record;
}


async function removeContractPdfTemplateFile(templateId) {
    appState.contractPdfTemplates = appState.contractPdfTemplates.filter((item) => item.id !== templateId);
    await saveStorage(STORAGE_KEYS.contractPdfTemplates, appState.contractPdfTemplates);
}


function buildOpeningParagraph(client) {
    const nome = client.name || "_______________________________";
    const nacionalidade = client.nationality || "_______________";
    const estadoCivil = client.maritalStatus || "_______________";
    const profissao = client.profession || "_______________";
    const rg = client.rg || "_______________";
    const cpf = client.document ? formatCpf(client.document) : "_______________";
    const endereco = client.address && client.address.street
        ? `${formatAddress(client.address)}${client.address.cep ? ` · CEP ${formatCep(client.address.cep)}` : ""}`
        : "_______________________________________________";

    return `
        <p>
            Por este instrumento particular, <strong>${escapeHTML(nome)}</strong>, ${escapeHTML(nacionalidade)},
            ${escapeHTML(estadoCivil)}, ${escapeHTML(profissao)}, portador (a) da carteira de identidade nº.:
            ${escapeHTML(rg)}, inscrito (a) no CPF sob nº.: ${escapeHTML(cpf)}, residente e domiciliado(a) em
            ${escapeHTML(endereco)}. Contrata <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira,
            casada, advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
            ${escapeHTML(OFFICE_ADDRESS)}.
        </p>
    `;
}


function buildSignatureBlocks(client, signatures) {
    const blocks = {
        contratada: `
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Drª DÉBORA CRISTINA DOS S. LOPES</div>
                <div class="signature-role">Contratada</div>
            </div>
        `,
        contratante: `
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">${escapeHTML(client.name || "")}</div>
                <div class="signature-role">Contratante</div>
            </div>
        `
    };

    return signatures.map((key) => blocks[key] || "").join("");
}


function buildContractHtml(client, templateId) {
    const template = CONTRACT_TEMPLATES[templateId] || CONTRACT_TEMPLATES.loas_idoso;
    const hoje = formatDate(todayISO());
    const generatedAt = new Date().toLocaleString("pt-BR");

    const bodyHtml = buildOpeningParagraph(client) + template.buildBody(client);
    const signaturesHtml = buildSignatureBlocks(client, template.signatures || ["contratada", "contratante"]);

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>Contrato — ${escapeHTML(client.name)}</title>
        <style>
            @page { margin: 20mm 18mm 22mm; }

            * { box-sizing: border-box; }

            html, * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
            }

            body {
                font-family: Georgia, "Times New Roman", serif;
                color: #1c2333;
                margin: 0;
                padding: 0 8px 40px;
                font-size: 0.94rem;
                line-height: 1.55;
            }

            .letterhead {
                text-align: center;
                margin-bottom: 26px;
            }

            .letterhead .mark {
                font-family: Georgia, serif;
                font-size: 2.1rem;
                font-style: italic;
                letter-spacing: 0.02em;
                color: #10203a;
                margin: 0;
            }

            .letterhead .subtitle {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 0.62rem;
                letter-spacing: 0.28em;
                text-transform: uppercase;
                color: #8a8f9a;
                margin: 2px 0 0;
            }

            .letterhead hr {
                width: 120px;
                border: none;
                border-top: 1px solid #d4af37;
                margin: 14px auto 0;
            }

            h1.title {
                text-align: center;
                font-size: 1.05rem;
                letter-spacing: 0.01em;
                text-decoration: underline;
                margin: 0 0 26px;
            }

            p { margin: 0 0 16px; text-align: justify; }

            .clause-label { font-weight: 700; }

            .signature-block {
                margin-top: 60px;
                text-align: center;
            }

            .signature-line {
                width: 320px;
                border-top: 1px solid #1c2333;
                margin: 46px auto 6px;
            }

            .signature-name {
                font-weight: 700;
            }

            .signature-role {
                font-size: 0.85rem;
                color: #475467;
            }

            .print-footer {
                margin-top: 50px;
                border-top: 1px solid #e4e7ec;
                padding-top: 8px;
                display: flex;
                justify-content: space-between;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 0.62rem;
                color: #8a93a6;
            }

            @media print {
                .print-footer { position: fixed; bottom: 6mm; left: 18mm; right: 18mm; }
            }
        </style>
        </head><body>

        <div class="letterhead">
            <p class="mark">Débora Lopes</p>
            <p class="subtitle">Advogada</p>
            <hr>
        </div>

        <h1 class="title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</h1>

        ${bodyHtml}

        <p style="text-align:center">Rio de Janeiro, ${escapeHTML(hoje)}.</p>

        ${signaturesHtml}

        <div class="print-footer">
            <span>Débora Lopes Advogada · OAB/RJ 162.559</span>
            <span>Gerado em ${generatedAt}</span>
        </div>

        </body></html>`;
}
