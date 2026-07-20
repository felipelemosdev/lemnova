// js/contract.js
// Geração dos "kits" de documentos de cada tipo de serviço (contrato de honorários,
// procurações, termos, declarações etc.), preenchidos com os dados do cliente, no timbre
// do escritório Débora Lopes Advogada, prontos para impressão em um único PDF/impressão.
//
// COMO FUNCIONA O SISTEMA DE MODELOS (CONTRACT_TEMPLATES)
// ---------------------------------------------------------------------------
// Cada tipo de serviço tem um "modelo" próprio dentro do objeto CONTRACT_TEMPLATES logo
// abaixo. Um modelo define:
//   - id: chave interna (usada no <select> do popup)
//   - label: texto mostrado no seletor do popup
//   - matches: valores do campo "Tipo de contrato / serviço" do cliente que sugerem esse
//              modelo automaticamente ao abrir o popup (usa "contém", não precisa ser exato)
//   - pending: true enquanto NENHUM texto definitivo foi cadastrado ainda — mostra um
//              rascunho genérico de aviso no lugar dos documentos reais
//   - kit: array com CADA documento que compõe esse serviço (contrato, procuração, termo
//          de concordância etc.). Cada item do kit tem:
//            - title: título do documento (cabeçalho impresso)
//            - subtitle: legenda opcional abaixo do título
//            - signatures: quais linhas de assinatura aparecem no rodapé desse documento
//                          específico — ver SIGNATURE_BLOCKS mais abaixo pelas opções
//            - buildBody(client): retorna o HTML do corpo daquele documento (a introdução
//                          com os dados do cliente também é responsabilidade de cada
//                          documento, já que cada um tem uma abertura diferente — use o
//                          helper clientFields(client) para pegar os dados já formatados)
//   Ao gerar, TODOS os documentos do kit saem numa única impressão, cada um em sua
//   própria página, na ordem em que aparecem no array.
//
// PARA CADASTRAR/ATUALIZAR O TEXTO DEFINITIVO DE UM MODELO:
//   1. Encontre a entrada correspondente em CONTRACT_TEMPLATES (ex.: "trabalhista").
//   2. Troque "kit" pela lista real de documentos daquele serviço, seguindo o mesmo
//      formato do modelo "aposentadoria" abaixo (que já está com o texto definitivo).
//   3. Apague "pending: true" da entrada — o aviso de "modelo pendente" some sozinho.
// ---------------------------------------------------------------------------

import { appState } from "./state.js";
import { elements } from "./dom.js";
import { formatCpf, formatCep, formatAddress, todayISO, formatDate, escapeHTML } from "./utils.js";

const OFFICE_ADDRESS = "Av. Marechal Deodoro, nº 474, loja B, Jd. 25 de Agosto, Duque de Caxias/RJ";

// Retorna os dados do cliente já formatados e prontos para uso nos textos, com
// travessões de preenchimento manual quando o campo não foi cadastrado.
function clientFields(client) {
    return {
        nome: client.name || "_______________________________",
        nacionalidade: client.nationality || "_______________",
        estadoCivil: client.maritalStatus || "_______________",
        profissao: client.profession || "_______________",
        rg: client.rg || "_______________",
        cpf: client.document ? formatCpf(client.document) : "_______________",
        endereco: client.address && client.address.street
            ? `${formatAddress(client.address)}${client.address.cep ? ` · CEP ${formatCep(client.address.cep)}` : ""}`
            : "_______________________________________________"
    };
}

const SIGNATURE_BLOCKS = {
    contratada: () => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">Drª DÉBORA CRISTINA DOS S. LOPES</div>
            <div class="signature-role">Contratada</div>
        </div>
    `,
    contratante: (client) => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHTML(client.name || "")}</div>
            <div class="signature-role">Contratante</div>
        </div>
    `,
    assinatura: (client) => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHTML(client.name || "")}</div>
            <div class="signature-role">Assinatura</div>
        </div>
    `,
    debora_oab: () => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">DÉBORA CRISTINA DOS SANTOS LOPES</div>
            <div class="signature-role">OAB/RJ 162.559</div>
        </div>
    `,
    ciente: (client) => `
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">${escapeHTML(client.name || "")}</div>
            <div class="signature-role">Ciente</div>
        </div>
    `
};

function buildSignatureBlocks(client, signatures) {
    return (signatures || []).map((key) => (SIGNATURE_BLOCKS[key] ? SIGNATURE_BLOCKS[key](client) : "")).join("");
}

function pendingKit(label) {
    return [{
        title: label,
        signatures: ["assinatura"],
        buildBody: () => `
            <p style="text-align:center;border:1px dashed #c8ccd6;border-radius:6px;padding:18px;color:#667085">
                <strong>Modelo "${escapeHTML(label)}" ainda não cadastrado.</strong><br>
                Envie o Word/PDF completo (todas as páginas) deste kit de documentos para que
                seja cadastrado com fidelidade total ao original. Este rascunho não deve ser
                usado com clientes.
            </p>
        `
    }];
}

export const CONTRACT_TEMPLATES = {
    aposentadoria: {
        id: "aposentadoria",
        label: "Aposentadoria",
        matches: ["Aposentadoria"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>
                            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
                            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
                            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
                            Contrata <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.
                        </p>

                        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
                            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
                            <strong>REQUERIMENTO APOSENTADORIA.</strong></p>

                        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios serão
                            devidos em esfera administrativa o importe de cinco parcelas integrais do
                            benefício, acrescidos de trinta por cento sob os atrasados.</p>

                        <p><span class="clause-label">Parágrafo Primeiro:</span> Em sede judicial serão
                            devidos o importe de seis parcelas integrais do valor do benefício, acrescidos de
                            trinta por cento sob os atrasados.</p>

                        <p><span class="clause-label">Cláusula Terceira:</span> As partes estabelecem que
                            havendo atraso no pagamento dos honorários, serão cobrados juros de mora na
                            proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte por
                            cento). A quitação do contrato terá seu início no primeiro pagamento de benefício
                            pelo contratante junto ao banco.</p>

                        <p><span class="clause-label">Cláusula Quarta:</span> Todas as despesas efetuadas pelo
                            CONTRATADO, ligadas direta ou indiretamente com o processo, incluindo-se
                            fotocópias, emolumentos, viagens, custas, entre outros encargos relativos ao
                            processo, ficarão a cargo do CONTRATANTE, desde que devidamente comprovadas.</p>

                        <p><span class="clause-label">Cláusula Quinta:</span> O contrato poderá ser rescindido
                            por qualquer das partes, no curso de sua execução, mediante prévia notificação por
                            escrito; em caso de substabelecimento sem reserva de poderes; renúncia do mandato
                            outorgado; ou descumprimento do contrato.</p>

                        <p><span class="clause-label">Parágrafo primeiro:</span> no caso de rescisão por parte
                            do contratante serão devidas as despesas até a data da rescisão do contrato; além
                            de multa de 40% (quarenta por cento) da quantia ajustada pelos serviços ora
                            contratados.</p>

                        <p><span class="clause-label">Parágrafo segundo:</span> Caberá ainda a referida multa
                            estipulada no parágrafo anterior no caso da ação vir a ser julgada improcedente ou
                            extinta por culpa exclusiva do contratante, como por exemplo, falta em audiência,
                            falta a perícias médicas, deixar de entregar documentos solicitados dentro do
                            prazo estabelecido para atendimento de despachos e outros.</p>

                        <p><span class="clause-label">Cláusula Sexta:</span> O Contratante fica obrigado a,
                            sempre que houver mudança de endereço, telefone ou e-mail, comunicar imediatamente
                            ao Contratado.</p>

                        <p><span class="clause-label">Cláusula Sétima:</span> O presente contrato não tem
                            caráter personalíssimo, podendo o Contratado ser representado por outro(s)
                            advogado(s) em qualquer ato processual.</p>

                        <p>Por estarem justos certos e contratados assinamos o presente instrumento, elegendo
                            o foro de Duque de Caxias/RJ, para dirimir quaisquer dúvidas provenientes deste
                            contrato.</p>
                    `;
                }
            },
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Confirmação de honorários sobre atrasados de RPV",
                signatures: ["contratante"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>
                            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
                            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
                            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
                            Contrata <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.
                        </p>

                        <p>Pelo presente, venho confirmar nossos entendimentos verbais no sentido do
                            patrocínio de requerimento de <strong>APOSENTADORIA</strong> no importe 30% a
                            título de honorários a ser calculado com base nos atrasados de RPV a ser expedido
                            pelo juízo em separado, conforme art. 18 da Resolução nº. 405/2016 CJF.</p>

                        <p>Estando V.Sa. de acordo com os termos do presente, é favor manifestar-se
                            expressamente, apondo o seu ciente no lugar indicado.</p>
                    `;
                }
            },
            {
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
            },
            {
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

                        <p>Constitui como sua bastante procuradora <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>,
                            brasileira, casada, advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório
                            localizado na Av. Marechal Deodoro, nº 474, loja B, Jardim 25 de Agosto, Duque de
                            Caxias, RJ, para representá-lo junto à agência do INSS a fim de proceder com o
                            requerimento de <strong>APOSENTADORIA</strong>, bem como assuntos relativos ao
                            supracitado requerimento.</p>
                    `;
                }
            },
            {
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
                            PEDIDO ADMINISTRATIVO DE: <strong>APOSENTADORIA</strong> em face do INSTITUTO
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
            },
            {
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

                        <p><strong>OUTORGADA: DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.</p>

                        <p><span class="clause-label">PODERES:</span> Os poderes das cláusulas "ad-judicia et
                            Extra, para o foro em geral, conforme estabelecido no art.105, CPC, e os especiais
                            para receber citação, renunciar, desistir, confessar, reconhecer a procedência do
                            pedido, transigir, retirar documentos em repartições públicas, firmar compromisso,
                            receber, dar quitação, firmar acordos, dar declarações, receber parcelas de
                            acordo, receber alvarás e tudo o mais que necessário for ao fiel cumprimento do
                            presente mandato, inclusive substabelecer no todo ou em parte os poderes ora
                            recebidos, com ou sem reserva da mesma, especialmente para propor
                            <strong>APOSENTADORIA</strong> contra quem de direito.</p>
                    `;
                }
            },
            {
                title: "DECLARAÇÃO DE HIPOSSUFICIÊNCIA",
                signatures: ["assinatura"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>Sr.(a) <strong>${escapeHTML(f.nome)}</strong>, ${escapeHTML(f.nacionalidade)},
                            ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)}, portador(a) da carteira de
                            identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF sob nº.: ${escapeHTML(f.cpf)},
                            residente e domiciliado na ${escapeHTML(f.endereco)}.</p>

                        <p>DECLARA para fins de prova junto ao Juízo Federal, que não possui condições de
                            arcar com o ônus processual, estando nas exatas condições da Lei nº 1060/50, e
                            art. 98 CPC, carecendo, pois, dos benefícios da <strong>GRATUIDADE DE JUSTIÇA</strong>.</p>
                    `;
                }
            },
            {
                title: "DO PATROCÍNIO GRATUITO",
                signatures: ["debora_oab", "ciente"],
                buildBody() {
                    return `
                        <p><strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada, advogada,
                            inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}, DECLARAM, para os fins de direito, que não está
                            cobrando honorários advocatícios na ação previdenciária antecipadamente.</p>
                    `;
                }
            },
            {
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
            }
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
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>
                            Por este instrumento particular, o Sr. <strong>${escapeHTML(f.nome)}</strong>,
                            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                            Portador da Cédula de Identidade nº. ${escapeHTML(f.rg)}, inscrito no CPF sob o nº.
                            ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
                        </p>

                        <p>Contrata a <strong>DÉBORA CRISTINA DOS SANTOS LOPES,</strong> brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            Avenida Marechal Deodoro, nº 474, loja B, Jd. 25 de Agosto, Duque de Caxias/RJ.</p>

                        <h3 class="section-header">DO OBJETO</h3>

                        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
                            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
                            <strong>REQUERIMENTO DE AUXILIO DOENÇA e/ou APOSENTADORIA POR IVALIDEZ</strong>, em
                            sede administrativo e/ou judicial, até o trâmite final do processo.</p>

                        <h3 class="section-header">DAS OBRIGAÇÕES</h3>

                        <p><span class="clause-label">Cláusula Segunda:</span> O Contratado se compromete a
                            aplicar todo seu conhecimento jurídico e empenho a fim de obter o melhor resultado
                            possível.</p>

                        <p><span class="clause-label">Cláusula Terceira:</span> Contratante, visando o melhor
                            resultado possível do processo previdenciário, se compromete a:</p>

                        <p class="lettered">a) Fornecer todas as informações e documentações necessárias ao
                            deslinde processual, conforme requerido pela contratada;</p>
                        <p class="lettered">b) Manter seus dados atualizados perante o Contratado, tendo a
                            obrigação de informar imediatamente, toda e qualquer alteração de endereço,
                            telefone ou e-mail;</p>
                        <p class="lettered">d) Comparecer em todas as audiências, justificações judiciais ou
                            justificações administrativas que forem solicitadas pelo Contratado;</p>
                        <p class="lettered">e) Notificar o Contratado de qualquer alteração contributiva,
                            como: desligamento do emprego, novo emprego, modificação nas contribuições como
                            contribuinte individual, recebimento de qualquer benefício previdenciário, etc.;</p>
                        <p class="lettered">f) Notificar o Contratado caso ocorra acidente de trabalho e de
                            percurso;</p>

                        <p><span class="clause-label">Cláusula Quarta:</span> O Contratante autoriza o
                            Contratado a efetuar o reagendamento ou redistribuição da ação judicial caso haja
                            necessidade, conforme entendimento do Contratado.</p>

                        <h3 class="section-header">DOS HONORÁRIOS ADVOCATÍCIOS</h3>

                        <p><span class="clause-label">Cláusula Quinta:</span> Em remuneração aos serviços
                            prestados pelo Contratado, fica o Contratante obrigado, de forma irrevogável e
                            irretratável, e irrepetível ao pagamento de honorários advocatícios em favor do
                            contratado, da seguinte forma:</p>

                        <p class="lettered">a) No importe de 4 salários benefícios e 30% (trinta por cento)
                            sobre o proveito econômico do processo a título de atrasados sendo concedido em
                            administrativamente e/ou RPV- Precatório, em se tratando de benefício de auxílio
                            doença concedido em prazo indeterminado.</p>
                        <p class="lettered">b) Em se tratando de benefício de auxílio doença concedido com
                            prazo determinado os honorários se torna exigível pelo importe de 30% (trinta por
                            cento) do proveito econômico do processo.</p>
                        <p class="lettered">c) Em sendo concedido aposentadoria por invalidez será exigível
                            os honorários no importe de 6 salários benefícios e 30% (trinta por cento) sobre o
                            proveito econômico do processo a título de atrasados sendo concedido em
                            administrativamente e/ou RPV- Precatório.</p>
                        <p class="lettered">d) 30% (trinta por cento) do valor do benefício caso seja fixado
                            em tutela de urgência, pagamento que perdurará enquanto perdurar o recebimento por
                            tutela de Urgência (liminar), não eximindo o pagamento dos honorários conforme
                            alíneas anteriores.</p>

                        <p><span class="clause-label">Parágrafo Primeiro:</span> O contratante concorda com o
                            destaque dos honorários contratuais sobre o total do RPV ou Precatório.</p>

                        <p><span class="clause-label">Parágrafo Segundo:</span> Não havendo o destaque dos
                            honorários advocatícios em RPV ou Precatório pelo judiciário, fica estipulado que
                            o Contratante comparecerá em conjunto com o Contratado na agência bancária para
                            levantamento do alvará e no mesmo ato o Contratado fará a transferência do
                            percentual ora estipulado nesse instrumento contratual para a conta bancária que o
                            contratado indicar ou optar pelo saque imediato.</p>

                        <p><span class="clause-label">Parágrafo Terceiro:</span> Os honorários incluídos na
                            condenação por arbitramento ou sucumbência pertencem ao Contratado, sem qualquer
                            redução dos honorários contratuais.</p>

                        <p><span class="clause-label">Parágrafo Quarto:</span> Os honorários recebidos
                            enquanto perdurar o recebimento de benefícios por liminar em tutela de urgência
                            são irrepetíveis, isto é, não serão devolvidos em nenhuma hipótese.</p>

                        <p><span class="clause-label">Parágrafo Quinto:</span> As partes estabelecem que
                            havendo atraso no pagamento dos honorários, haverá a correção monetária, juros de
                            mora na proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte
                            por cento).</p>

                        <h3 class="section-header">CUSTAS E DESPESAS</h3>

                        <p><span class="clause-label">Cláusula Sexta:</span> Todas as despesas efetuadas pelo
                            Contratado, ligadas direta ou indiretamente com o processo, incluindo-se
                            fotocópias, emolumentos, viagens, custas, entre outros encargos relativos ao
                            processo, ficarão a cargo do Contratante, desde que devidamente comprovadas.</p>

                        <p><span class="clause-label">Cláusula Sétima:</span> À custa e demais despesas
                            judiciais ou extrajudiciais correrão por conta exclusiva do Contratante, que será
                            a única responsável pelas consequências do não pagamento das mesmas nas épocas
                            oportunas;</p>

                        <h3 class="section-header">DO VENCIMENTO ANTECIPADO</h3>

                        <p><span class="clause-label">Cláusula Oitava:</span> O valor total dos honorários
                            poderá ser considerado (a critério do Contratado) automaticamente vencido e
                            imediatamente exigível, sendo passível de execução, sem prévia notificação ou
                            interpelação judicial, e resguardado o direito aos honorários de sucumbência,
                            acrescido de encargos contratuais.</p>

                        <p class="lettered">a) Se houver composição amigável realizada por qualquer uma das
                            partes litigantes sem anuência do Contratado;</p>
                        <p class="lettered">b) Quando não forem pagos os honorários nas datas estabelecidas,
                            sejam integrais, sejam parcelados;</p>
                        <p class="lettered">c) No caso do não prosseguimento da ação por qualquer
                            circunstância;</p>
                        <p class="lettered">d) Se for cassado o mandato sem culpa do Contratado.</p>

                        <p><span class="clause-label">Cláusula Nona:</span> Fica o Contratado autorizado desde
                            já a fazer a retenção de seus honorários quando do recebimento de valores devidos
                            ao Contratante, advindos de êxito da demanda, ainda que parcial.</p>

                        <h3 class="section-header">RESCISÃO CONTRATUAL</h3>

                        <p><span class="clause-label">Cláusula Décima:</span> Faculta-se aos Contratados
                            considerarem rescindido o presente contrato — mediante comunicação prévia — e, por
                            tal motivo, vencidos e imediatamente exigíveis os honorários previstos no
                            contrato, como se a Contratante fosse vencedora na ação:</p>

                        <p class="lettered">a) na hipótese da Contratante vir a fazer acordo com a parte
                            adversa sem o concurso e anuência expressa dos Contratados;</p>
                        <p class="lettered">b) na hipótese da Contratante deixar de cumprir quaisquer das
                            obrigações previstas neste contrato e não remediar o descumprimento dentro de (03)
                            três dias, contados da data que lhe seja dado ciência (por qualquer forma),
                            ressalvado o previsto no item (v) abaixo;</p>
                        <p class="lettered">c) em razão de a Contratante deixar de realizar algum pagamento
                            devido aos Contratados por prazo superior a 30 (trinta) dias, sem qualquer
                            comunicação.</p>
                        <p class="lettered">d) caso a Contratante resolva não prosseguir por motivos pessoais
                            ou que independam da vontade, ou mesmo contratando novo(s) advogado(a) para a(s)
                            causa(s) aludida(s) neste contrato, deduzindo-se, na hipótese, os valores
                            eventualmente pagos.</p>

                        <p><span class="clause-label">Cláusula Décima Primeira:</span> Em caso de rescisão do
                            contrato pelo Contratante, sem justa causa, fica estabelecido que este seja
                            responsável pelo pagamento dos serviços já prestados pelo advogado, até a data da
                            rescisão, proporcionalmente ao período contratado, bem como pelo pagamento das
                            despesas e encargos já efetuados, inclusive os relativos a eventual contratação de
                            terceiros.</p>

                        <p><span class="clause-label">Cláusula Décima Segunda:</span> Em caso de rescisão do
                            contrato pelo advogado, por justa causa, fica estabelecido que o cliente não terá
                            direito a qualquer reembolso ou restituição dos valores já pagos, e ficará
                            responsável pelo pagamento das despesas e encargos já efetuados, inclusive os
                            relativos a eventual contratação de terceiros.</p>

                        <p><span class="clause-label">Cláusula Décima Terceira:</span> A justa causa para
                            rescisão do contrato pelo advogado inclui, mas não se limita, ao não pagamento dos
                            valores devidos pelo cliente, à inobservância das obrigações assumidas pelo
                            cliente, à falta de boa-fé, à conduta ilícita ou imoral, ou à divulgação de
                            informações confidenciais sem autorização.</p>

                        <p><span class="clause-label">Cláusula Décima Quarta:</span> A inobservância por parte
                            da Contratante, de qualquer cláusula deste instrumento acarretará a rescisão deste
                            contrato, independente de notificações e avisos, ficando sujeito aos honorários
                            pactuados, bem como, pagar multa no valor de 30% (trinta por cento) do valor total
                            dos honorários acordados, se não acordado, será sobre o valor do proveito
                            econômico, na sua ausência sobre o valor da causa, sem prejuízo das demais
                            indenizações devidas ao advogado em razão da rescisão contratual;</p>

                        <p><span class="clause-label">Cláusula Décima Quinta:</span> Em caso de rescisão
                            contratual requerida pela Contratante, por meio de revogação de mandado ou
                            substabelecimento, a mesma será obrigada a pagar além dos honorários pactuados
                            <u>uma multa de R$ 2.000,00, (dois mil reais)</u>.</p>

                        <p><span class="clause-label">Cláusula Décima Sexta:</span> Em caso de desistência da
                            ação, expressa ou tácita, será devido ao contratado:</p>

                        <p class="lettered">a) O valor de R$ 2.000,00, (dois mil reais), se a desistência for
                            antes do ajuizamento da demanda;</p>
                        <p class="lettered">b) O valor integral dos honorários advocatícios, se a desistência
                            for após o ajuizamento da demanda ou substituição de procurador por revogação do
                            mandado;</p>

                        <p><span class="clause-label">Parágrafo Único:</span> A ausência do Contratante em
                            audiências será considerada desistência do processo.</p>

                        <h3 class="section-header">DISPOSIÇÕES GERAIS</h3>

                        <p><span class="clause-label">Cláusula Décima Sétima:</span> Pelo pactuado neste
                            contrato obrigam-se os Contratantes e seus sucessores (as).</p>

                        <p><span class="clause-label">Cláusula Décima Oitava:</span> Fica acertado entre as
                            partes que as informações prestadas entre as mesmas serão consideradas
                            confidenciais e deverão ser mantido em absoluto sigilo por ambas. Sobretudo no que
                            tange aos trabalhos técnico-jurídicos desenvolvidos pelos Contratados a
                            Contratante deverá reservar sigilo perante terceiros, inclusive do teor do
                            presente contrato. A obrigação de confidencialidade disposta nesta cláusula
                            perdurará mesmo após o término, rescisão ou extinção do presente contrato;</p>

                        <p><span class="clause-label">Parágrafo único.</span> A confidencialidade e o sigilo
                            poderão ser violados desde que haja autorização pela outra parte por escrito.</p>

                        <p><span class="clause-label">Cláusula Décima Nona:</span> Caso figurar mais de um
                            Contratante no presente contrato, estes serão devedores solidários um dos outros
                            (CC, art. 275).</p>

                        <p><span class="clause-label">Cláusula Vigésima:</span> O presente contrato não tem
                            caráter personalíssimo, podendo o Contratado ser representado por outro(s)
                            advogado(s) em qualquer ato processual.</p>

                        <p><span class="clause-label">Cláusula Vigésima Primeira:</span> O Contratante se
                            compromete a fornecer informações verdadeiras e precisas ao Contratado, sob as
                            penas da lei de responsabilidade civil (art. 186 do Código Civil) e criminal (art.
                            299 do Código Penal) em caso de informações falsas ou omitidas.</p>

                        <h3 class="section-header">DO ACESSO AOS DADOS</h3>

                        <p><span class="clause-label">Cláusula Vigésima Segunda:</span> O contratante autoriza
                            o contratado a ter acesso e utilizar os dados pessoais fornecidos para fins
                            relacionados ao cumprimento do objeto contratado, de acordo com a Lei de Proteção
                            de Dados (Lei 13.709/2018). O contratante declara que os dados fornecidos são
                            verdadeiros e estão atualizados, e assume a responsabilidade pela veracidade das
                            informações prestadas.</p>

                        <h3 class="section-header">DO FORO</h3>

                        <p><span class="clause-label">Cláusula Vigésima Terceira:</span> Estipulam o Foro da
                            comarca de Duque de Caxias/RJ, para dirimir litígios decorrentes do presente
                            contrato.</p>

                        <p>E, por estarem assim contratados assinam o presente contrato em duas vias de igual
                            teor.</p>
                    `;
                }
            },
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                subtitle: "Confirmação de honorários sobre atrasados de RPV",
                signatures: ["contratante"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>
                            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
                            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
                            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
                            Contrata <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.
                        </p>

                        <p>Pelo presente, venho confirmar nossos entendimentos verbais no sentido do
                            patrocínio de requerimento de <strong>AÇÃO DE CONCESSÃO DE BENEFÍCIO
                            PREVIDENCIÁRIO</strong> no importe 30% a título de honorários a ser calculado com
                            base nos atrasados de RPV a ser expedido pelo juízo em separado, conforme art. 18
                            da Resolução nº. 405/2016 CJF.</p>

                        <p>Estando V.Sa. de acordo com os termos do presente, é favor manifestar-se
                            expressamente, apondo o seu ciente no lugar indicado.</p>
                    `;
                }
            },
            {
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
            },
            {
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

                        <p>Constitui como sua bastante procuradora <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>,
                            brasileira, casada, advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório
                            localizado na Av. Marechal Deodoro, nº 474, loja B, Jardim 25 de Agosto, Duque de
                            Caxias, RJ, para representá-lo junto à agência do INSS a fim de proceder com o
                            requerimento de <strong>Benefício por Incapacidade Temporária</strong>, bem como
                            assuntos relativos ao supracitado requerimento.</p>
                    `;
                }
            },
            {
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
                            PEDIDO ADMINISTRATIVO DE: <strong>Benefício por Incapacidade Temporária</strong> em
                            face do INSTITUTO NACIONAL DO SEGURO SOCIAL- INSS, dentre outras providências que
                            se fizerem necessárias junto ao INSS.</p>

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
            },
            {
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

                        <p><strong>OUTORGADA: DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.</p>

                        <p><span class="clause-label">PODERES:</span> Os poderes das cláusulas "ad-judicia et
                            Extra, para o foro em geral, conforme estabelecido no art.105, CPC, e os especiais
                            para receber citação, renunciar, desistir, confessar, reconhecer a procedência do
                            pedido, transigir, retirar documentos em repartições públicas, firmar compromisso,
                            receber, dar quitação, firmar acordos, dar declarações, receber parcelas de
                            acordo, receber alvarás e tudo o mais que necessário for ao fiel cumprimento do
                            presente mandato, inclusive substabelecer no todo ou em parte os poderes ora
                            recebidos, com ou sem reserva da mesma, especialmente para propor
                            <strong>AÇÃO DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO</strong> contra quem de
                            direito.</p>
                    `;
                }
            },
            {
                title: "DECLARAÇÃO DE HIPOSSUFICIÊNCIA",
                signatures: ["assinatura"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>Sr.(a) <strong>${escapeHTML(f.nome)}</strong>, ${escapeHTML(f.nacionalidade)},
                            ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)}, portador(a) da carteira de
                            identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF sob nº.: ${escapeHTML(f.cpf)},
                            residente e domiciliado na ${escapeHTML(f.endereco)}.</p>

                        <p>DECLARA para fins de prova junto ao Juízo Federal, que não possui condições de
                            arcar com o ônus processual, estando nas exatas condições da Lei nº 1060/50, e
                            art. 98 CPC, carecendo, pois, dos benefícios da <strong>GRATUIDADE DE JUSTIÇA</strong>.</p>
                    `;
                }
            },
            {
                title: "DO PATROCÍNIO GRATUITO",
                signatures: ["debora_oab", "assinatura"],
                buildBody() {
                    return `
                        <p><strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada, advogada,
                            inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}, DECLARAM, para os fins de direito, que não está
                            cobrando honorários advocatícios na ação previdenciária antecipadamente.</p>
                    `;
                }
            },
            {
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
            }
        ]
    },

    auxilio_acidente: {
        id: "auxilio_acidente",
        label: "Auxílio-Acidente",
        matches: ["Auxílio-Acidente", "Auxilio-Acidente", "Acidente de Trabalho"],
        pending: true,
        kit: pendingKit("Auxílio-Acidente")
    },

    doenca_ocupacional: {
        id: "doenca_ocupacional",
        label: "Doença Ocupacional",
        matches: ["Doença Ocupacional", "Doenca Ocupacional"],
        pending: true,
        kit: pendingKit("Doença Ocupacional")
    },

    pensao_morte: {
        id: "pensao_morte",
        label: "Pensão por Morte",
        matches: ["Pensão por Morte", "Pensao por Morte"],
        pending: true,
        kit: pendingKit("Pensão por Morte")
    },

    trabalhista: {
        id: "trabalhista",
        label: "Trabalhista",
        matches: ["Trabalhista"],
        pending: true,
        kit: pendingKit("Trabalhista")
    },

    maternidade: {
        id: "maternidade",
        label: "Maternidade",
        matches: ["Maternidade", "Salário-Maternidade", "Salario-Maternidade"],
        pending: true,
        kit: pendingKit("Maternidade")
    },

    majoracao: {
        id: "majoracao",
        label: "Majoração",
        matches: ["Majoração", "Majoracao"],
        pending: true,
        kit: pendingKit("Majoração")
    },

    loas_idoso: {
        id: "loas_idoso",
        label: "LOAS Idoso",
        matches: ["LOAS Idoso", "BPC Idoso"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>
                            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
                            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
                            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
                            Contrata <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.
                        </p>

                        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
                            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
                            REQUERIMENTO DE LOAS – <strong>Benefício Assistencial ao Idoso</strong>.</p>

                        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios serão
                            devidos em esfera administrativa o importe de cinco parcelas integrais do
                            benefício, acrescidos de trinta por cento sob os atrasados.</p>

                        <p><span class="clause-label">Parágrafo Primeiro:</span> Em sede judicial serão
                            devidos o importe de seis parcelas integrais do valor do benefício, acrescidos de
                            trinta por cento sob os atrasados.</p>

                        <p><span class="clause-label">Cláusula Terceira:</span> As partes estabelecem que
                            havendo atraso no pagamento dos honorários, serão cobrados juros de mora na
                            proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte por
                            cento). A quitação do contrato terá seu início no primeiro pagamento de benefício
                            pelo contratante junto ao banco.</p>

                        <p><span class="clause-label">Cláusula Quarta:</span> Todas as despesas efetuadas pelo
                            CONTRATADO, ligadas direta ou indiretamente com o processo, incluindo-se
                            fotocópias, emolumentos, viagens, custas, entre outros encargos relativos ao
                            processo, ficarão a cargo do CONTRATANTE, desde que devidamente comprovadas.</p>

                        <p><span class="clause-label">Cláusula Quinta:</span> O contrato poderá ser rescindido
                            por qualquer das partes, no curso de sua execução, mediante prévia notificação por
                            escrito; em caso de substabelecimento sem reserva de poderes; renúncia do mandato
                            outorgado; ou descumprimento do contrato.</p>

                        <p><span class="clause-label">Parágrafo primeiro:</span> no caso de rescisão por parte
                            do contratante serão devidas as despesas até a data da rescisão do contrato; além
                            de multa de 40% (quarenta por cento) da quantia ajustada pelos serviços ora
                            contratados.</p>

                        <p><span class="clause-label">Parágrafo segundo:</span> Caberá ainda a referida multa
                            estipulada no parágrafo anterior no caso da ação vir a ser julgada improcedente ou
                            extinta por culpa exclusiva do contratante, como por exemplo, falta em audiência,
                            falta a perícias médicas, deixar de entregar documentos solicitados dentro do
                            prazo estabelecido para atendimento de despachos e outros.</p>

                        <p><span class="clause-label">Cláusula Sexta:</span> O Contratante fica obrigado a,
                            sempre que houver mudança de endereço, telefone ou e-mail, comunicar imediatamente
                            ao Contratado.</p>

                        <p><span class="clause-label">Cláusula Sétima:</span> O presente contrato não tem
                            caráter personalíssimo, podendo o Contratado ser representado por outro(s)
                            advogado(s) em qualquer ato processual.</p>

                        <p>Por estarem justos certos e contratados assinamos o presente instrumento, elegendo
                            o foro de Duque de Caxias/RJ, para dirimir quaisquer dúvidas provenientes deste
                            contrato.</p>
                    `;
                }
            }
        ]
    },

    loas_deficiente: {
        id: "loas_deficiente",
        label: "LOAS Deficiente",
        matches: ["LOAS Deficiente", "BPC Deficiente"],
        kit: [
            {
                title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS",
                signatures: ["contratada", "contratante"],
                buildBody(client) {
                    const f = clientFields(client);
                    return `
                        <p>
                            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
                            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
                            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
                            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
                            Contrata <strong>DÉBORA CRISTINA DOS SANTOS LOPES</strong>, brasileira, casada,
                            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                            ${escapeHTML(OFFICE_ADDRESS)}.
                        </p>

                        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
                            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
                            REQUERIMENTO DE LOAS – <strong>Benefício Assistencial ao Portador de Deficiência</strong>.</p>

                        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios serão
                            devidos em esfera administrativa o importe de cinco parcelas integrais do
                            benefício, acrescidos de trinta por cento sob os atrasados.</p>

                        <p><span class="clause-label">Parágrafo Primeiro:</span> Em sede judicial serão
                            devidos o importe de seis parcelas integrais do valor do benefício, acrescidos de
                            trinta por cento sob os atrasados.</p>

                        <p><span class="clause-label">Cláusula Terceira:</span> As partes estabelecem que
                            havendo atraso no pagamento dos honorários, serão cobrados juros de mora na
                            proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte por
                            cento). A quitação do contrato terá seu início no primeiro pagamento de benefício
                            pelo contratante junto ao banco.</p>

                        <p><span class="clause-label">Cláusula Quarta:</span> Todas as despesas efetuadas pelo
                            CONTRATADO, ligadas direta ou indiretamente com o processo, incluindo-se
                            fotocópias, emolumentos, viagens, custas, entre outros encargos relativos ao
                            processo, ficarão a cargo do CONTRATANTE, desde que devidamente comprovadas.</p>

                        <p><span class="clause-label">Cláusula Quinta:</span> O contrato poderá ser rescindido
                            por qualquer das partes, no curso de sua execução, mediante prévia notificação por
                            escrito; em caso de substabelecimento sem reserva de poderes; renúncia do mandato
                            outorgado; ou descumprimento do contrato.</p>

                        <p><span class="clause-label">Parágrafo primeiro:</span> no caso de rescisão por parte
                            do contratante serão devidas as despesas até a data da rescisão do contrato; além
                            de multa de 40% (quarenta por cento) da quantia ajustada pelos serviços ora
                            contratados.</p>

                        <p><span class="clause-label">Parágrafo segundo:</span> Caberá ainda a referida multa
                            estipulada no parágrafo anterior no caso da ação vir a ser julgada improcedente ou
                            extinta por culpa exclusiva do contratante, como por exemplo, falta em audiência,
                            falta a perícias médicas, deixar de entregar documentos solicitados dentro do
                            prazo estabelecido para atendimento de despachos e outros.</p>

                        <p><span class="clause-label">Cláusula Sexta:</span> O Contratante fica obrigado a,
                            sempre que houver mudança de endereço, telefone ou e-mail, comunicar imediatamente
                            ao Contratado.</p>

                        <p><span class="clause-label">Cláusula Sétima:</span> O presente contrato não tem
                            caráter personalíssimo, podendo o Contratado ser representado por outro(s)
                            advogado(s) em qualquer ato processual.</p>

                        <p>Por estarem justos certos e contratados assinamos o presente instrumento, elegendo
                            o foro de Duque de Caxias/RJ, para dirimir quaisquer dúvidas provenientes deste
                            contrato.</p>
                    `;
                }
            }
        ]
    },

    consumidor: {
        id: "consumidor",
        label: "Consumidor",
        matches: ["Consumidor", "Direito do Consumidor"],
        pending: true,
        kit: pendingKit("Consumidor")
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
    elements.contractTemplateSelect.value = suggestTemplateId(client);
    refreshContractModalWarning();

    elements.contractOverlay.classList.remove("hidden");
}


export function closeContractModal() {
    appState.activeContractClientId = null;
    elements.contractOverlay.classList.add("hidden");
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