// js/contract/kitAdministrativo.js
// Kit Administrativo: modelo único e reutilizável entre benefícios. Só o texto do pedido
// citado (tipoAcao) muda entre um benefício e outro — texto idêntico ao original.
//
// Documentos:
//   - Procuração Administrativa (junto ao INSS)
//   - Autorização Meu INSS
//   - Termo de Representação  [NOVO — ainda sem texto definitivo cadastrado, ver nota]
import { ESCRITORIO, clientFields, pendingDocument } from "./core.js";
import { escapeHTML } from "../utils.js";

export function docProcuracaoAdministrativa(tipoAcao) {
    return {
        title: "PROCURAÇÃO",
        subtitle: "Representação administrativa junto ao INSS",
        signatures: ["assinatura"],
        buildBody(client) {
            const f = clientFields(client);
            return `
                <p>Pelo presente instrumento de Procuração o (a) Sr.(a) <strong>${escapeHTML(f.nome)}</strong>,
                    ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                    portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
                    sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado na ${escapeHTML(f.endereco)}.</p>

                <p>Constitui como sua bastante procuradora <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>,
                    brasileira, casada, advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório
                    localizado na Av. Marechal Deodoro, nº 474, loja B, Jardim 25 de Agosto, Duque de
                    Caxias, RJ, para representá-lo junto à agência do INSS a fim de proceder com o
                    requerimento de <strong>${escapeHTML(tipoAcao)}</strong>, bem como
                    assuntos relativos ao supracitado requerimento.</p>
            `;
        }
    };
}

export function docAutorizacaoMeuInss(tipoAcao) {
    return {
        title: 'AUTORIZAÇÃO DE ACESSO AO SITE DO "MEU INSS"',
        subtitle: "Com senha já existente e/ou geração de senha",
        signatures: ["assinatura"],
        buildBody(client) {
            const f = clientFields(client);
            return `
                <p>Eu, <strong>${escapeHTML(f.nome)}</strong>, ${escapeHTML(f.nacionalidade)},
                    ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)}. Portador (a) da Cédula de
                    Identidade nº. ${escapeHTML(f.rg)}, inscrito (a) no CPF sob o nº. ${escapeHTML(f.cpf)},
                    residente e domiciliado na ${escapeHTML(f.endereco)}.</p>

                <p>Venho, por meio desta, neste ato, AUTORIZAR o ESCRITÓRIO DÉBORA LOPES, inscrita na
                    OAB/RJ 162.559, CPF n°097.475.827-24 na pessoa dos advogados subscritos na
                    documentação de representação administrativa e judicial.</p>

                <p>(X) UTILIZAREM A SENHA DO PORTAL "MEU INSS" indispensável para realização do meu
                    PEDIDO ADMINISTRATIVO DE: <strong>${escapeHTML(tipoAcao)}</strong> em face do INSTITUTO
                    NACIONAL DO SEGURO SOCIAL- INSS, dentre outras providências que se fizerem
                    necessárias junto ao INSS.</p>

                <p>Estou CIENTE que: NÃO PODEREI ALTERAR a referida senha, ATÉ O FINAL DO PROCESSO
                    ADMINISTRATIVO E/OU JUDICIAL, sem prévio aviso, e que na hipótese de alteração por
                    qualquer motivo que seja, deverá ser comunicado de imediato ao ESCRITÓRIO DÉBORA
                    LOPES, sob pena de inviabilizar todo o trabalho a ser realizado pelos advogados
                    contratados.</p>

                <p>Ressalta-se que a alteração da senha por parte do cliente, SEM PRÉVIO AVISO,
                    ISENTARÁ aos advogados ora constituídos, de qualquer problema ou impedimento para
                    cumprimento de suas obrigações, uma vez que, atualmente os pedidos são realizados
                    de forma eletrônica através do Portal "meu.inss.gov.br".</p>

                <p>Este termo de consentimento foi elaborado em conformidade com a Lei Geral de
                    Proteção de Dados Pessoais - LGPD. Consoante ao artigo 5º inciso XII da Lei
                    13.709, este documento viabiliza a manifestação livre, informada e inequívoca,
                    pela qual o titular/ responsável concorda com o tratamento de seus dados pessoais
                    e os dados do menor sob os seus cuidados, para a finalidade mencionada acima.</p>
            `;
        }
    };
}

// NOVO documento pedido no Kit Administrativo. Ainda não existe texto jurídico definitivo
// cadastrado no sistema — entra como rascunho pendente (mesmo padrão dos modelos
// "pending: true" já usados hoje) até que o texto final seja enviado.
export function docTermoRepresentacao() {
    return pendingDocument("Termo de Representação");
}

// Monta o Kit Administrativo completo (incluindo o novo Termo de Representação, ainda
// pendente) para um benefício (objeto de BENEFICIOS). Uso previsto para modelos NOVOS.
//
// IMPORTANTE: os modelos já existentes (Aposentadoria, Auxílio-Doença) continuam, em
// contract.js, chamando docProcuracaoAdministrativa()/docAutorizacaoMeuInss() diretamente,
// na mesma ordem de antes — sem o Termo de Representação — para manter o HTML impresso
// 100% idêntico ao original. Assim que o texto definitivo do Termo de Representação for
// cadastrado, basta trocar esses dois kits para usar buildKitAdministrativo() também.
export function buildKitAdministrativo(beneficioEntry) {
    return [
        docProcuracaoAdministrativa(beneficioEntry.tipoAcao),
        docAutorizacaoMeuInss(beneficioEntry.tipoAcao),
        docTermoRepresentacao()
    ];
}
