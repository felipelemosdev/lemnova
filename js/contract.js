// js/contract.js
// Orquestrador dos "kits" de documentos de cada tipo de serviço, preenchidos com os
// dados do cliente, no timbre do escritório Débora Lopes Advogada, prontos para
// impressão em um único PDF/impressão.
//
// ARQUITETURA (pós-refatoração)
// ---------------------------------------------------------------------------
// A lógica de geração de documentos foi separada em três módulos independentes, todos
// dentro de js/contract/:
//
//   - contratoPrestacao.js  → o Contrato de Prestação de Serviços de cada benefício
//                             (Aposentadoria, Auxílio-Doença, LOAS) + a confirmação de
//                             honorários de RPV. Continua com cláusulas 100% fiéis ao
//                             texto original — ver nota de fidelidade no topo do arquivo.
//   - kitAdministrativo.js  → modelo único e reutilizável (Procuração Administrativa,
//                             Autorização Meu INSS, Termo de Representação), parametrizado
//                             só por tipoAcao/órgão.
//   - kitJudicial.js        → modelo único e reutilizável (Procuração Judicial, Termo de
//                             Concordância, Hipossuficiência, Patrocínio Gratuito,
//                             Renúncia, Ciência Contra Golpes), parametrizado só por
//                             tipoAcao.
//   - beneficios.js         → objeto BENEFICIOS (beneficio, tipoAcao, orgao,
//                             honorarioPadrao) — o cadastro central de cada benefício.
//   - honorarios.js         → objeto HONORARIOS (percentual / salários / salários +
//                             percentual) — as opções mostradas na tela de geração.
//   - core.js               → helpers compartilhados pelos três módulos acima (dados do
//                             escritório, formatação do cliente, blocos de assinatura).
//
// FLUXO DE GERAÇÃO: Benefício → Honorários → Contrato → Kit Administrativo → Kit
// Judicial. O benefício sugere a forma de honorários padrão (BENEFICIOS.<id>.honorarioPadrao),
// mas o usuário pode trocar no seletor de honorários antes de gerar — ver
// openContractModal()/refreshContractModalWarning() abaixo.
//
// FIDELIDADE DO HTML IMPRESSO — Aposentadoria e Auxílio-Doença continuam montando seus
// kits chamando as funções docXxx() individualmente, EXATAMENTE na mesma ordem de antes
// (contrato → RPV → concordância → procuração administrativa → autorização Meu INSS →
// procuração ad judicia → hipossuficiência → patrocínio → renúncia), sem os dois
// documentos novos (Termo de Representação / Ciência Contra Golpes), porque esses ainda
// não têm texto jurídico definitivo cadastrado — inclui-los mudaria o HTML gerado para
// esses dois kits. Assim que o texto chegar, os dois kits podem passar a usar
// buildKitAdministrativo()/buildKitJudicial() (disponíveis nos módulos correspondentes).
//
// PARA CADASTRAR/ATUALIZAR O TEXTO DEFINITIVO DE UM MODELO PENDENTE:
//   1. Encontre a entrada correspondente em CONTRACT_TEMPLATES (ex.: "trabalhista").
//   2. Troque "kit" pela lista real de documentos daquele serviço — reaproveitando
//      buildKitAdministrativo()/buildKitJudicial() sempre que os documentos de apoio
//      forem os mesmos já usados pelos outros benefícios.
//   3. Apague "pending: true" da entrada — o aviso de "modelo pendente" some sozinho.
// ---------------------------------------------------------------------------

import { appState } from "./state.js";
import { elements } from "./dom.js";
import { todayISO, formatDate, escapeHTML } from "./utils.js";

import { buildSignatureBlocks } from "./contract/core.js";
import { BENEFICIOS, PATROCINIO_ASSINATURAS, tipoAcaoJudicial } from "./contract/beneficios.js";
import { HONORARIOS, describeHonorarios } from "./contract/honorarios.js";
import {
    docContratoRpv,
    buildContratoAposentadoria,
    buildContratoAuxilioDoenca,
    buildContratoAuxilioAcidente,
    buildContratoPensaoMorte,
    buildContratoMajoracao,
    buildContratoMaternidade,
    buildContratoTrabalhista,
    buildContratoDoencaOcupacional,
    buildContratoConsumidor,
    buildContratoLoas
} from "./contract/contratoPrestacao.js";
import { docProcuracaoAdministrativa, docAutorizacaoMeuInss } from "./contract/kitAdministrativo.js";
import {
    docProcuracaoAdJudicia,
    docTermoConcordancia,
    docDeclaracaoHipossuficiencia,
    docPatrocinioGratuito,
    docTermoRenuncia
} from "./contract/kitJudicial.js";

export const CONTRACT_TEMPLATES = {
    aposentadoria: {
        id: "aposentadoria",
        label: "Aposentadoria",
        matches: ["Aposentadoria"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody: buildContratoAposentadoria
            },
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.aposentadoria)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.aposentadoria.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.aposentadoria.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.aposentadoria)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.aposentadoria),
            docTermoRenuncia()
        ]
    },

    auxilio_doenca: {
        id: "auxilio_doenca",
        label: "Auxílio-Doença",
        matches: ["Auxílio-Doença", "Auxilio-Doença", "Auxílio Doença"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Contrato completo — Auxílio-Doença e/ou Aposentadoria por Invalidez",
                signatures: ["contratante"],
                buildBody: buildContratoAuxilioDoenca
            },
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.auxilio_doenca)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.auxilio_doenca.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.auxilio_doenca.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.auxilio_doenca)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.auxilio_doenca),
            docTermoRenuncia()
        ]
    },

    auxilio_acidente: {
        id: "auxilio_acidente",
        label: "Auxílio-Acidente",
        matches: ["Auxílio-Acidente", "Auxilio-Acidente", "Acidente de Trabalho"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Contrato completo — Auxílio-Acidente",
                signatures: ["assinatura"],
                buildBody: buildContratoAuxilioAcidente
            },
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.auxilio_acidente)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.auxilio_acidente.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.auxilio_acidente.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.auxilio_acidente)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.auxilio_acidente, "ação de concessão de benefício previdenciário"),
            docTermoRenuncia()
        ]
    },

    // Doença Ocupacional: mesmo texto de cláusulas do Trabalhista (só o objeto
    // citado na Cláusula 1ª muda) — ver buildContratoDoencaOcupacional() em
    // contratoPrestacao.js. Inclui a Confirmação de Honorários (30% sobre RPV) e o
    // Termo de Renúncia — documentos originalmente usados só nos benefícios do
    // INSS/JEF, mas reaproveitados aqui a pedido da Dra. Débora.
    doenca_ocupacional: {
        id: "doenca_ocupacional",
        label: "Doença Ocupacional",
        matches: ["Doença Ocupacional", "Doenca Ocupacional"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Contrato completo — Doença Ocupacional",
                signatures: ["contratante"],
                buildBody: buildContratoDoencaOcupacional
            },
            docContratoRpv("Doença Ocupacional"),
            docProcuracaoAdJudicia("Ação de Doença Ocupacional"),
            docDeclaracaoHipossuficiencia("trabalhista"),
            docPatrocinioGratuito(["debora_oab", "ciente"], "AÇÃO DE DOENÇA OCUPACIONAL"),
            docTermoRenuncia()
        ]
    },

    pensao_morte: {
        id: "pensao_morte",
        label: "Pensão por Morte",
        matches: ["Pensão por Morte", "Pensao por Morte"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody: buildContratoPensaoMorte
            },
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.pensao_morte)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.pensao_morte.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.pensao_morte.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.pensao_morte)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.pensao_morte, "ação de Pensão por Morte"),
            docTermoRenuncia()
        ]
    },

    // Trabalhista não é um benefício do INSS: sem RPV, sem Termo de Concordância,
    // sem Autorização Meu INSS e sem Termo de Renúncia — nenhum desses documentos
    // existe no kit original deste contrato (ver nota de fidelidade em
    // contratoPrestacao.js). O tipoAcao "Ação Trabalhista" é passado direto, sem
    // entrada em BENEFICIOS, porque este não é um benefício previdenciário.
    trabalhista: {
        id: "trabalhista",
        label: "Trabalhista",
        matches: ["Trabalhista"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Contrato completo — Ação Trabalhista",
                signatures: ["contratante"],
                buildBody: buildContratoTrabalhista
            },
            docProcuracaoAdJudicia("Ação Trabalhista"),
            docDeclaracaoHipossuficiencia("trabalhista"),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.trabalhista, "AÇÃO TRABALHISTA")
        ]
    },

    maternidade: {
        id: "maternidade",
        label: "Maternidade",
        matches: ["Maternidade", "Salário-Maternidade", "Salario-Maternidade"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Contrato completo — Salário-Maternidade",
                signatures: ["contratante"],
                buildBody: buildContratoMaternidade
            },
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.maternidade)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.maternidade.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.maternidade.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.maternidade)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.maternidade, "ação de concessão de benefício previdenciário"),
            docTermoRenuncia()
        ]
    },

    majoracao: {
        id: "majoracao",
        label: "Majoração",
        matches: ["Majoração", "Majoracao"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody: buildContratoMajoracao
            },
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.majoracao)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.majoracao.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.majoracao.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.majoracao)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.majoracao, "AÇÃO DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO"),
            docTermoRenuncia()
        ]
    },

    loas_idoso: {
        id: "loas_idoso",
        label: "LOAS Idoso",
        matches: ["LOAS Idoso", "BPC Idoso"],
        kit: [
            buildContratoLoas(BENEFICIOS.loas_idoso.beneficio),
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.loas_idoso)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.loas_idoso.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.loas_idoso.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.loas_idoso)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.loas_idoso),
            docTermoRenuncia()
        ]
    },

    loas_deficiente: {
        id: "loas_deficiente",
        label: "LOAS Deficiente",
        matches: ["LOAS Deficiente", "BPC Deficiente"],
        kit: [
            buildContratoLoas(BENEFICIOS.loas_deficiente.beneficio),
            docContratoRpv(tipoAcaoJudicial(BENEFICIOS.loas_deficiente)),
            docTermoConcordancia(),
            docProcuracaoAdministrativa(BENEFICIOS.loas_deficiente.tipoAcao),
            docAutorizacaoMeuInss(BENEFICIOS.loas_deficiente.tipoAcao),
            docProcuracaoAdJudicia(tipoAcaoJudicial(BENEFICIOS.loas_deficiente)),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(PATROCINIO_ASSINATURAS.loas_deficiente),
            docTermoRenuncia()
        ]
    },

    consumidor: {
        id: "consumidor",
        label: "Consumidor",
        matches: ["Consumidor", "Direito do Consumidor"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody: buildContratoConsumidor
            },
            docProcuracaoAdJudicia("AÇÃO CONSUMIDOR"),
            docDeclaracaoHipossuficiencia(),
            docPatrocinioGratuito(["debora_oab", "assinatura"])
        ]
    }

    // Para cadastrar o kit definitivo de um modelo pendente, troque o "kit" da entrada
    // correspondente pela lista real de documentos (mesmo formato do "aposentadoria")
    // e remova a linha "pending: true".
};


export function openContractModal(clientId) {
    const client = appState.clients.find((item) => item.id === clientId);
    if (!client) {
        return;
    }

    appState.activeContractClientId = clientId;
    elements.contractModalSubtitle.textContent = `Cliente: ${client.name}. Escolha o modelo de contrato correspondente ao serviço prestado.`;

    populateTemplateSelect();
    const suggestedTemplateId = suggestTemplateId(client);
    elements.contractTemplateSelect.value = suggestedTemplateId;

    populateHonorariosSelect();
    if (elements.contractHonorariosSelect) {
        const beneficioEntry = BENEFICIOS[suggestedTemplateId];
        elements.contractHonorariosSelect.value = (beneficioEntry && beneficioEntry.honorarioPadrao) || "misto";
    }

    refreshContractModalWarning();

    elements.contractOverlay.classList.remove("hidden");
}


export function closeContractModal() {
    appState.activeContractClientId = null;
    elements.contractOverlay.classList.add("hidden");
}


// Fluxo: Benefício → Honorários. Ao trocar o modelo de contrato (benefício), sugere de
// novo a forma de honorários padrão daquele benefício — sem travar a escolha: o usuário
// ainda pode trocar livremente antes de gerar.
export function handleContractTemplateChange() {
    if (elements.contractHonorariosSelect) {
        const beneficioEntry = BENEFICIOS[elements.contractTemplateSelect.value];
        elements.contractHonorariosSelect.value = (beneficioEntry && beneficioEntry.honorarioPadrao) || "misto";
    }
    refreshContractModalWarning();
}


export function refreshContractModalWarning() {
    const client = appState.clients.find((item) => item.id === appState.activeContractClientId);
    if (!client) {
        return;
    }

    const template = CONTRACT_TEMPLATES[elements.contractTemplateSelect.value];
    const messages = [];

    if (template && template.pending) {
        messages.push(`O modelo "${template.label}" ainda não foi cadastrado com o texto definitivo — envie o Word/PDF completo para adicioná-lo com fidelidade ao original.`);
    }

    const missingFields = [
        !client.name && "nome",
        !client.nationality && "nacionalidade",
        !client.maritalStatus && "estado civil",
        !client.profession && "profissão",
        !client.rg && "RG",
        !client.document && "CPF",
        !(client.address && client.address.street) && "endereço"
    ].filter(Boolean);

    if (missingFields.length) {
        messages.push(`Dados incompletos no cadastro do cliente: ${missingFields.join(", ")} (sairão em branco no contrato).`);
    }

    if (messages.length) {
        elements.contractModalWarning.textContent = messages.join(" ");
        elements.contractModalWarning.classList.remove("hidden");
    } else {
        elements.contractModalWarning.textContent = "";
        elements.contractModalWarning.classList.add("hidden");
    }
}


export function generateAndPrintContract() {
    const clientId = appState.activeContractClientId;
    const client = appState.clients.find((item) => item.id === clientId);
    if (!client) {
        closeContractModal();
        return;
    }

    const templateId = elements.contractTemplateSelect.value;
    const html = buildKitHtml(client, templateId);

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();

    closeContractModal();
}


function populateTemplateSelect() {
    elements.contractTemplateSelect.innerHTML = Object.values(CONTRACT_TEMPLATES)
        .map((template) => {
            const suffix = template.pending ? " (pendente)" : ` · ${template.kit.length} documento(s)`;
            return `<option value="${template.id}">${escapeHTML(template.label)}${suffix}</option>`;
        })
        .join("");
}


// Popula o seletor de honorários (Percentual / Salários / Salários + Percentual). Só
// mostra as opções — a sugestão de qual vem marcada por padrão acontece em
// openContractModal()/handleContractTemplateChange(), a partir de
// BENEFICIOS.<id>.honorarioPadrao. Puramente informativo: não altera o texto das
// cláusulas já cadastradas (ver nota de fidelidade em contratoPrestacao.js).
function populateHonorariosSelect() {
    if (!elements.contractHonorariosSelect) return;
    elements.contractHonorariosSelect.innerHTML = Object.values(HONORARIOS)
        .map((opcao) => `<option value="${opcao.id}">${escapeHTML(opcao.label)} — ${escapeHTML(describeHonorarios(opcao.id))}</option>`)
        .join("");
}


function suggestTemplateId(client) {
    const benefit = (client.benefit || "").toLowerCase();

    const match = Object.values(CONTRACT_TEMPLATES).find((template) => (
        template.matches.some((candidate) => benefit.includes(candidate.toLowerCase()))
    ));

    return match ? match.id : "loas_idoso";
}


function buildDocumentPage(doc, client, hoje) {
    const bodyHtml = doc.buildBody(client);
    const signaturesHtml = buildSignatureBlocks(client, doc.signatures || ["assinatura"]);

    return `
        <section class="doc-page">
            <div class="letterhead">
                <p class="mark">Débora Lopes</p>
                <p class="subtitle">Advogada</p>
                <hr>
            </div>

            <h1 class="title">${escapeHTML(doc.title)}</h1>
            ${doc.subtitle ? `<h2 class="subtitle-type">${escapeHTML(doc.subtitle)}</h2>` : ""}

            ${bodyHtml}

            <p style="text-align:center">Rio de Janeiro, ${escapeHTML(hoje)}.</p>

            ${signaturesHtml}
        </section>
    `;
}


function buildKitHtml(client, templateId) {
    const template = CONTRACT_TEMPLATES[templateId] || CONTRACT_TEMPLATES.loas_idoso;
    const hoje = formatDate(todayISO());
    const generatedAt = new Date().toLocaleString("pt-BR");

    const pagesHtml = template.kit.map((doc) => buildDocumentPage(doc, client, hoje)).join("");

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>${escapeHTML(template.label)} — ${escapeHTML(client.name)}</title>
        <style>
            @page { margin: 1.27cm; }

            * { box-sizing: border-box; }

            html, * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
            }

            body {
                font-family: Aptos, "Aptos Narrow", Calibri, Arial, sans-serif;
                color: #1c2333;
                margin: 0;
                padding: 0 8px 40px;
                font-size: 11pt;
                line-height: 1.55;
            }

            .doc-page + .doc-page {
                page-break-before: always;
                margin-top: 30px;
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
                margin: 0 0 6px;
            }

            h2.subtitle-type {
                text-align: center;
                font-size: 0.78rem;
                font-weight: 400;
                color: #8a93a6;
                letter-spacing: 0.03em;
                margin: 0 0 26px;
            }

            p { margin: 0 0 16px; text-align: justify; }

            .clause-label { font-weight: 700; }

            .section-header {
                font-size: 0.88rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                margin: 26px 0 12px;
                padding-bottom: 4px;
                border-bottom: 1px solid #e4e7ec;
            }

            p.lettered {
                margin: 0 0 10px;
                padding-left: 18px;
            }

            .signature-block {
                margin-top: 55px;
                text-align: center;
            }

            .signature-line {
                width: 320px;
                border-top: 1px solid #1c2333;
                margin: 42px auto 6px;
            }

            .signature-name {
                font-weight: 700;
            }

            .signature-role {
                font-size: 0.85rem;
                color: #475467;
            }

            .print-footer {
                margin-top: 40px;
                border-top: 1px solid #e4e7ec;
                padding-top: 8px;
                display: flex;
                justify-content: space-between;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 0.62rem;
                color: #8a93a6;
            }
        </style>
        </head><body>

        ${pagesHtml}

        <div class="print-footer">
            <span>Débora Lopes Advogada · OAB/RJ 162.559</span>
            <span>${escapeHTML(template.label)} · ${template.kit.length} documento(s) · Gerado em ${generatedAt}</span>
        </div>

        </body></html>`;
}
