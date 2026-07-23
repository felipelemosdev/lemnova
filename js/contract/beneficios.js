// js/contract/beneficios.js
// Cadastro dos benefícios previdenciários: só os dados que realmente variam de um
// benefício para outro, consumidos pelos três módulos de documentos (contratoPrestacao,
// kitAdministrativo, kitJudicial).
//
// Campos:
//   beneficio       - nome do benefício/ação citado no Contrato de Prestação (LOAS) e
//                      disponível para qualquer texto que precise do nome "puro".
//   tipoAcao        - texto do pedido citado nos documentos do Kit Administrativo
//                      (Procuração Administrativa, Autorização Meu INSS, Termo de
//                      Representação) e, por padrão, também no Kit Judicial.
//   orgao           - órgão/instituição perante o qual o pedido é feito.
//   honorarioPadrao - chave de HONORARIOS (ver honorarios.js) sugerida como padrão para
//                      esse benefício na tela de geração do contrato. O usuário pode
//                      trocar antes de gerar; isso é só a sugestão inicial.
//
// NOTA DE FIDELIDADE — Auxílio-Doença é o único benefício em que o texto do pedido citado
// nos documentos administrativos ("Benefício por Incapacidade Temporária") é DIFERENTE do
// texto citado nos documentos do Kit Judicial ("AÇÃO DE CONCESSÃO DE BENEFÍCIO
// PREVIDENCIÁRIO") — isso já era assim no sistema original (tipoAcaoInss x tipoAcaoRpv) e
// foi mantido aqui via "tipoAcaoJudicial" para não alterar nenhum documento já emitido.
// Quando "tipoAcaoJudicial" não é informado, os módulos usam o mesmo valor de "tipoAcao".
export const BENEFICIOS = {
    aposentadoria: {
        beneficio: "Aposentadoria",
        tipoAcao: "APOSENTADORIA",
        orgao: "INSS",
        honorarioPadrao: "misto"
    },
    auxilio_doenca: {
        beneficio: "Auxílio-Doença",
        tipoAcao: "Benefício por Incapacidade Temporária",
        tipoAcaoJudicial: "AÇÃO DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO",
        orgao: "INSS",
        honorarioPadrao: "misto"
    },
    loas_idoso: {
        beneficio: "Benefício Assistencial ao Idoso",
        tipoAcao: "Benefício Assistencial ao Idoso",
        orgao: "INSS",
        honorarioPadrao: "salarios"
    },
    loas_deficiente: {
        beneficio: "Benefício Assistencial ao Portador de Deficiência",
        tipoAcao: "Benefício Assistencial ao Portador de Deficiência",
        orgao: "INSS",
        honorarioPadrao: "salarios"
    }
};

// Assinaturas do documento "Do Patrocínio Gratuito" — variam por kit, não por benefício
// isoladamente, então ficam fora de BENEFICIOS (que agora é só os 4 campos pedidos).
export const PATROCINIO_ASSINATURAS = {
    aposentadoria: ["debora_oab", "ciente"],
    auxilio_doenca: ["debora_oab", "assinatura"]
};

// Texto do pedido a usar no Kit Judicial (docProcuracaoAdJudicia, docContratoRpv): usa
// tipoAcaoJudicial quando cadastrado, senão cai para tipoAcao — preserva 100% o
// comportamento original (ver nota acima).
export function tipoAcaoJudicial(beneficioEntry) {
    return beneficioEntry.tipoAcaoJudicial || beneficioEntry.tipoAcao;
}
