// js/contract/kitJudicial.js
// Kit Judicial: modelo único e reutilizável entre benefícios. Só o texto do pedido citado
// (tipoAcao) muda entre um benefício e outro — texto idêntico ao original.
//
// Documentos:
//   - Procuração Judicial (ad judicia et extra)
//   - Termo de Concordância
//   - Hipossuficiência
//   - Patrocínio Gratuito
//   - Renúncia
//   - Ciência Contra Golpes  [NOVO — ainda sem texto definitivo cadastrado, ver nota]
import { ESCRITORIO, clientFields, pendingDocument } from "./core.js";
import { escapeHTML } from "../utils.js";

// OBS: o trecho final ("...especialmente para propor <ação/benefício>...") usa o MESMO
// texto do pedido que a confirmação de honorários de RPV (docContratoRpv, em
// contratoPrestacao.js) — por isso ambos recebem o mesmo parâmetro tipoAcao.
export function docProcuracaoAdJudicia(tipoAcao) {
    return {
        title: "PROCURAÇÃO",
        subtitle: "Poderes ad judicia et extra",
        signatures: ["assinatura"],
        buildBody(client) {
            const f = clientFields(client);
            return `
                <p><strong>OUTORGANTE:</strong> ${escapeHTML(f.nome)}, ${escapeHTML(f.nacionalidade)},
                    ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)}, portador (a) da carteira
                    de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF sob nº.: ${escapeHTML(f.cpf)},
                    residente e domiciliado na ${escapeHTML(f.endereco)}.</p>

                <p><strong>OUTORGADA: ${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
                    advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                    ${escapeHTML(ESCRITORIO.escritorioEndereco)}.</p>

                <p><span class="clause-label">PODERES:</span> Os poderes das cláusulas "ad-judicia et
                    Extra, para o foro em geral, conforme estabelecido no art.105, CPC, e os especiais
                    para receber citação, renunciar, desistir, confessar, reconhecer a procedência do
                    pedido, transigir, retirar documentos em repartições públicas, firmar compromisso,
                    receber, dar quitação, firmar acordos, dar declarações, receber parcelas de
                    acordo, receber alvarás e tudo o mais que necessário for ao fiel cumprimento do
                    presente mandato, inclusive substabelecer no todo ou em parte os poderes ora
                    recebidos, com ou sem reserva da mesma, especialmente para propor
                    <strong>${escapeHTML(tipoAcao)}</strong> contra quem de
                    direito.</p>
            `;
        }
    };
}

export function docTermoConcordancia() {
    return {
        title: "TERMO DE CONCORDÂNCIA",
        signatures: ["debora_oab", "ciente"],
        buildBody(client) {
            const f = clientFields(client);
            return `
                <p>Eu, <strong>${escapeHTML(f.nome)}</strong>, portador da carteira de identidade nº
                    ${escapeHTML(f.rg)}, cadastrado sob o n° no CPF ${escapeHTML(f.cpf)}. Neste ato
                    afirmo não ter efetuado nenhum pagamento ou adiantamento de honorários contratuais
                    e que concordo com o destaque dos honorários em todos os termos do contrato
                    assinado.</p>
            `;
        }
    };
}

export function docDeclaracaoHipossuficiencia(juizo = "Federal") {
    return {
        title: "DECLARAÇÃO DE HIPOSSUFICIÊNCIA",
        signatures: ["assinatura"],
        buildBody(client) {
            const f = clientFields(client);
            return `
                <p>Sr.(a) <strong>${escapeHTML(f.nome)}</strong>, ${escapeHTML(f.nacionalidade)},
                    ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)}, portador(a) da carteira de
                    identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF sob nº.: ${escapeHTML(f.cpf)},
                    residente e domiciliado na ${escapeHTML(f.endereco)}.</p>

                <p>DECLARA para fins de prova junto ao Juízo ${escapeHTML(juizo)}, que não possui condições de
                    arcar com o ônus processual, estando nas exatas condições da Lei nº 1060/50, e
                    art. 98 CPC, carecendo, pois, dos benefícios da <strong>GRATUIDADE DE JUSTIÇA</strong>.</p>
            `;
        }
    };
}

export function docTermoRenuncia() {
    return {
        title: "TERMO DE RENÚNCIA",
        signatures: ["assinatura"],
        buildBody(client) {
            const f = clientFields(client);
            return `
                <p>Eu, <strong>${escapeHTML(f.nome)}</strong>, Brasileiro (a), ${escapeHTML(f.estadoCivil)},
                    ${escapeHTML(f.profissao)}, portador da carteira de identidade nº.: ${escapeHTML(f.rg)},
                    inscrito no CPF sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado na
                    ${escapeHTML(f.endereco)}.</p>

                <p>Venho por meio desta, <strong>RENUNCIAR</strong> ao valor de meu crédito que exceder
                    a 60 salários mínimos, procedimento necessário para o devido ajuizamento e
                    prosseguimento de meu pleito perante o Juizado Especial Federal.</p>

                <p>Por ser verdade firmo o presente.</p>
            `;
        }
    };
}

// Único documento cujo texto é sempre igual, mas as assinaturas mudam conforme o kit
// (ver PATROCINIO_ASSINATURAS em beneficios.js) — mantido fiel ao original.
export function docPatrocinioGratuito(signatures, assunto = "ação previdenciária") {
    return {
        title: "DO PATROCÍNIO GRATUITO",
        signatures,
        buildBody() {
            return `
                <p><strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada, advogada,
                    inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                    ${escapeHTML(ESCRITORIO.escritorioEndereco)}, DECLARAM, para os fins de direito, que não está
                    cobrando honorários advocatícios na ${escapeHTML(assunto)} antecipadamente.</p>
            `;
        }
    };
}

// NOVO documento pedido no Kit Judicial. Ainda não existe texto jurídico definitivo
// cadastrado no sistema — entra como rascunho pendente (mesmo padrão dos modelos
// "pending: true" já usados hoje) até que o texto final seja enviado.
export function docCienciaContraGolpes() {
    return pendingDocument("Ciência Contra Golpes");
}

// Monta o Kit Judicial completo (incluindo a nova Ciência Contra Golpes, ainda pendente)
// para um benefício. Uso previsto para modelos NOVOS.
//
// IMPORTANTE: os modelos já existentes (Aposentadoria, Auxílio-Doença) continuam, em
// contract.js, chamando as funções docXxx() diretamente, na mesma ordem de antes — sem a
// Ciência Contra Golpes — para manter o HTML impresso 100% idêntico ao original. Assim que
// o texto definitivo for cadastrado, basta trocar esses kits para usar
// buildKitJudicial() também.
export function buildKitJudicial(beneficioEntry, patrocinioAssinaturas) {
    return [
        docProcuracaoAdJudicia(beneficioEntry.tipoAcaoJudicial || beneficioEntry.tipoAcao),
        docTermoConcordancia(),
        docDeclaracaoHipossuficiencia(),
        docPatrocinioGratuito(patrocinioAssinaturas),
        docTermoRenuncia(),
        docCienciaContraGolpes()
    ];
}
