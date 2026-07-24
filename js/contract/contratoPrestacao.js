// js/contract/contratoPrestacao.js
// Contrato de Prestação de Serviços — a peça central de cada kit. Cada benefício
// mantém sua PRÓPRIA função de contrato porque o texto jurídico das cláusulas
// (quantidade de cláusulas, estrutura, e a fórmula de honorários) é genuinamente
// diferente entre "Aposentadoria" (7 cláusulas) e "Auxílio-Doença" (23 cláusulas,
// com hipóteses de honorários distintas para prazo determinado/indeterminado,
// invalidez e tutela de urgência). Unificar os dois num único template genérico
// alteraria cláusulas contratuais reais — por isso NÃO foram unificados aqui,
// conforme decidido: as duas funções abaixo mantêm o texto 100% original.
// "LOAS Idoso" e "LOAS Deficiente" TÊM o mesmo contrato, palavra por palavra, a
// menos do nome do benefício — por isso continuam unificados em
// buildContratoLoas(beneficio), como já era no sistema original.
//
// {{BENEFICIO}} / {{TIPO_ACAO}} / {{ORGAO}}: já eram parâmetros simples (nome do
// benefício citado, texto do pedido) — continuam vindo de BENEFICIOS
// (beneficios.js) e são passados como argumento onde o texto original já os
// tratava como um valor plugável (ex.: buildContratoLoas(beneficio)).
//
// {{HONORARIOS}}: NÃO foi transformado em variável dentro do texto das cláusulas
// de Aposentadoria/Auxílio-Doença, porque nos dois a cláusula de honorários é uma
// combinação de frases jurídicas específicas (ex.: "cinco parcelas... acrescidos
// de trinta por cento", ou as quatro alíneas do Auxílio-Doença) — trocar isso por
// uma variável genérica reescreveria a cláusula, o que foi explicitamente vetado.
// O objeto HONORARIOS (honorarios.js) continua existindo separadamente, para a
// tela de escolha (Percentual / Salários / Salários + Percentual) e para sugerir
// o padrão de cada benefício — sem reescrever nenhuma cláusula já cadastrada.
import { ESCRITORIO, clientFields } from "./core.js";
import { escapeHTML } from "../utils.js";

export function docContratoRpv(tipoAcao) {
    return {
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
                    Contrata <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
                    advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                    ${escapeHTML(ESCRITORIO.escritorioEndereco)}.
                </p>

                <p>Pelo presente, venho confirmar nossos entendimentos verbais no sentido do
                    patrocínio de requerimento de <strong>${escapeHTML(tipoAcao)}</strong> no importe 30% a
                    título de honorários a ser calculado com base nos atrasados de RPV a ser expedido
                    pelo juízo em separado, conforme art. 18 da Resolução nº. 405/2016 CJF.</p>

                <p>Estando V.Sa. de acordo com os termos do presente, é favor manifestar-se
                    expressamente, apondo o seu ciente no lugar indicado.</p>
            `;
        }
    };
}

export function buildContratoAposentadoria(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
            Contrata <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
            ${escapeHTML(ESCRITORIO.escritorioEndereco)}.
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

export function buildContratoAuxilioDoenca(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, o Sr. <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            Portador da Cédula de Identidade nº. ${escapeHTML(f.rg)}, inscrito no CPF sob o nº.
            ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
        </p>

        <p>Contrata a <strong>${escapeHTML(ESCRITORIO.advogadoNome)},</strong> brasileira, casada,
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

// ---------------------------------------------------------------------------
// AUXÍLIO-ACIDENTE — modelo "completo" (23 cláusulas), praticamente idêntico ao
// de Auxílio-Doença (mesmas obrigações, custas, vencimento antecipado, rescisão,
// disposições gerais, acesso aos dados e foro) — só o objeto (Cláusula Primeira)
// e os honorários (Cláusula Quinta) são diferentes. Mantido como função própria,
// e não unificado com buildContratoAuxilioDoenca, pelo mesmo motivo já registrado
// no topo deste arquivo: são cláusulas contratuais reais e distintas.
//
// NOTA: a alínea (a) da Cláusula Quinta, no documento original enviado, cita
// "benefício de auxílio doença" (não "auxílio-acidente") — texto preservado
// fielmente aqui porque é o que consta no documento aprovado; vale confirmar
// com a Dra. Débora se é mesmo intencional ou um erro de digitação herdado do
// modelo de Auxílio-Doença antes de usar este contrato com clientes.
export function buildContratoAuxilioAcidente(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, o Sr(a). <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            Portador da Cédula de Identidade nº. ${escapeHTML(f.rg)}, inscrito no CPF sob o nº.
            ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
        </p>

        <p>Contrata a <strong>${escapeHTML(ESCRITORIO.advogadoNome)},</strong> brasileira, casada,
            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
            ${escapeHTML(ESCRITORIO.escritorioEndereco)}.</p>

        <h3 class="section-header">DO OBJETO</h3>

        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
            <strong>REQUERIMENTO DE AUXÍLIO-ACIDENTE</strong>, em sede administrativo e/ou judicial,
            até o trâmite final do processo.</p>

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
            justificações administrativas que forem solicitadas pelo Contratado.</p>
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

        <p class="lettered">a) No importe de 5 salários benefícios e 30% (trinta por cento)
            sobre o proveito econômico do processo a título de atrasados sendo concedido em
            administrativamente e/ou RPV-Precatório, em se tratando de benefício de auxílio
            doença concedido em prazo indeterminado.</p>
        <p class="lettered">c) Em sendo concedido em esfera judicial os honorários serão no
            importe de 6 salários benefícios e 30% (trinta por cento) sobre o proveito
            econômico do processo a título de atrasados sendo concedido em administrativamente
            e/ou RPV-Precatório.</p>
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

        <p><span class="clause-label">Cláusula Sétima:</span> Às custas e demais despesas
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
            contrato pelo Contratante, sem justa causa, fica estabelecido que este será
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
            confidenciais e deverão ser mantidas em absoluto sigilo por ambas. Sobretudo no
            que tange aos trabalhos técnico-jurídicos desenvolvidos pelos Contratados a
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

// ---------------------------------------------------------------------------
// PENSÃO POR MORTE — mesmo "modelo simples" de 7 cláusulas de Aposentadoria/LOAS,
// mas com duas diferenças de texto: a Cláusula Segunda NÃO tem o adicional de
// "trinta por cento sob os atrasados", e a multa do Parágrafo Primeiro da
// Cláusula Quinta é de 20% (não 40%). Ambas preservadas fielmente do original.
export function buildContratoPensaoMorte(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            portador (a) da carteira de identidade nº.: ${escapeHTML(f.rg)}, inscrito (a) no CPF
            sob nº.: ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
            Contrata <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
            ${escapeHTML(ESCRITORIO.escritorioEndereco)}.
        </p>

        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
            <strong>REQUERIMENTO DE PENSÃO POR MORTE.</strong></p>

        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios serão
            devidos em esfera administrativa o importe de cinco parcelas integrais do
            benefício.</p>

        <p><span class="clause-label">Parágrafo Primeiro:</span> Em sede judicial serão
            devidos o importe de seis parcelas integrais do valor do benefício.</p>

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
            de multa de 20% (vinte por cento) da quantia ajustada pelos serviços ora
            contratados.</p>

        <p><span class="clause-label">Parágrafo segundo:</span> Caberá a referida multa
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

// ---------------------------------------------------------------------------
// MAJORAÇÃO DE 25% — mesmo "modelo simples" de 7 cláusulas, honorários fixados
// em 1 salário mínimo (não em parcelas do benefício nem percentual), e multa de
// rescisão também em salário mínimo (não percentual). Preservado fielmente.
export function buildContratoMajoracao(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, o Sr(a). <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            Portador da Cédula de Identidade nº. ${escapeHTML(f.rg)}, inscrito no CPF sob o nº.
            ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)},
            contrata <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
            ${escapeHTML(ESCRITORIO.escritorioEndereco)}.
        </p>

        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
            <strong>REQUERIMENTO DE MAJORAÇÃO DE 25% SOBRE O BENEFÍCIO PREVIDENCIÁRIO.</strong></p>

        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios serão
            devidos no importe de um salário mínimo vigente à época da concessão do
            benefício.</p>

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
            de multa de um salário mínimo.</p>

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

// ---------------------------------------------------------------------------
// SALÁRIO-MATERNIDADE — modelo "completo", mas mais enxuto que o de
// Auxílio-Doença/Auxílio-Acidente (15 cláusulas, sem "DO VENCIMENTO
// ANTECIPADO" nem a retenção automática de honorários — cláusulas próprias e
// diferentes, por isso mantido em função separada, não unificado).
export function buildContratoMaternidade(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, o Sr(a). <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            Portador da Cédula de Identidade nº. ${escapeHTML(f.rg)}, inscrito no CPF sob o nº.
            ${escapeHTML(f.cpf)}, residente e domiciliado(a) na ${escapeHTML(f.endereco)}.
        </p>

        <p>Contrata a <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
            advogada, inscrita na OAB/RJ sob o nº. 162.559 com escritório localizado na
            ${escapeHTML(ESCRITORIO.escritorioEndereco)}.</p>

        <h3 class="section-header">DO OBJETO</h3>

        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
            <strong>REQUERIMENTO DE SALÁRIO MATERNIDADE</strong> em sede administrativa e/ou
            judicial, até o trâmite final do processo.</p>

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
        <p class="lettered">c) Comparecer em todas as audiências, justificações judiciais ou
            justificações administrativas que forem solicitadas pelo Contratado;</p>
        <p class="lettered">d) Notificar o Contratado de qualquer alteração contributiva,
            como: desligamento do emprego, novo emprego, modificação nas contribuições como
            contribuinte individual, recebimento de qualquer benefício previdenciário, etc.;
            notificar o Contratado caso ocorra acidente de trabalho e de percurso;</p>

        <p><span class="clause-label">Cláusula Quarta:</span> O Contratante autoriza o
            Contratado a efetuar o reagendamento ou redistribuição do processo administrativo
            ou da ação judicial caso haja necessidade, conforme entendimento do Contratado.</p>

        <h3 class="section-header">DOS HONORÁRIOS ADVOCATÍCIOS</h3>

        <p><span class="clause-label">Cláusula Quinta:</span> Em remuneração aos serviços
            prestados pelo Contratado, fica o Contratante obrigado, de forma irrevogável e
            irretratável, e irrepetível ao pagamento de honorários advocatícios em favor do
            contratado, da seguinte forma:</p>

        <p>No importe de 30% (trinta por cento) sobre o proveito econômico do processo.</p>

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

        <p><span class="clause-label">Parágrafo Quarto:</span> As partes estabelecem que
            havendo atraso no pagamento dos honorários, haverá a correção monetária, juros de
            mora na proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte
            por cento). Podendo a contratada executar o presente título.</p>

        <h3 class="section-header">CUSTAS E DESPESAS</h3>

        <p><span class="clause-label">Cláusula Sexta:</span> Todas as despesas efetuadas pelo
            Contratado, caso necessário, ligadas direta ou indiretamente com o processo,
            incluindo-se fotocópias, emolumentos, viagens, custas, entre outros encargos
            relativos ao processo, ficarão a cargo do Contratante, desde que devidamente
            comprovadas.</p>

        <p><span class="clause-label">Cláusula Sétima:</span> As custas e demais despesas
            judiciais ou extrajudiciais correrão por conta exclusiva do Contratante, que será
            a única responsável pelas consequências do não pagamento das mesmas nas épocas
            oportunas;</p>

        <h3 class="section-header">RESCISÃO CONTRATUAL</h3>

        <p><span class="clause-label">Cláusula Oitava:</span> O Contrato poderá ser rescindido
            por qualquer das partes, a qualquer momento, mediante prévia notificação por
            escrito: em caso de substabelecimento sem reserva de poderes, renúncia do mandato
            outorgado ou descumprimento do contrato.</p>

        <p><span class="clause-label">Parágrafo primeiro:</span> Na rescisão por parte do
            contratante serão devidas as despesas até a data da rescisão do contrato; além de
            multa de 15% a ser calculada sobre o crédito que teria direito a ser recebido pelo
            contratante.</p>

        <p><span class="clause-label">Parágrafo segundo:</span> No caso da ação vir a ser
            julgada improcedente ou extinta por culpa exclusiva do contratante, como por
            exemplo, falta em ato administrativo ou judicial, a não entrega de documentos
            solicitados dentro do prazo estabelecido e outros caberá ao contratado à cobrança
            de honorários no importe de 15% do valor do crédito que teria direito a ser
            recebido pelo contratante.</p>

        <h3 class="section-header">DISPOSIÇÕES GERAIS</h3>

        <p><span class="clause-label">Cláusula Nona:</span> Pelo pactuado neste contrato
            obrigam-se os Contratantes e seus sucessores (as).</p>

        <p><span class="clause-label">Cláusula Décima:</span> Fica acertado entre as partes
            que as informações prestadas entre as mesmas serão consideradas confidenciais e
            deverão ser mantidas em absoluto sigilo por ambas. Sobretudo no que tange aos
            trabalhos técnico-jurídicos desenvolvidos pelos Contratados a Contratante deverá
            reservar sigilo perante terceiros, inclusive do teor do presente contrato. A
            obrigação de confidencialidade disposta nesta cláusula perdurará mesmo após o
            término, rescisão ou extinção do presente contrato;</p>

        <p><span class="clause-label">Parágrafo único:</span> A confidencialidade e o sigilo
            poderão ser violados desde que haja autorização pela outra parte por escrito.</p>

        <p><span class="clause-label">Cláusula Décima Primeira:</span> Caso figurar mais de um
            Contratante no presente contrato, estes serão devedores solidários um dos outros
            (CC, art. 275).</p>

        <p><span class="clause-label">Cláusula Décima Segunda:</span> O presente contrato não
            tem caráter personalíssimo, podendo o Contratado ser representado por outro (s)
            advogado (s) em qualquer ato processual.</p>

        <p><span class="clause-label">Cláusula Décima Terceira:</span> O Contratante se
            compromete a fornecer informações verdadeiras e precisas ao Contratado, sob as
            penas da lei de responsabilidade civil (art.186 do Código Civil) e criminal (art.
            299 do Código Penal) em caso de informações falsas ou omitidas.</p>

        <h3 class="section-header">DO ACESSO AOS DADOS</h3>

        <p><span class="clause-label">Cláusula Décima Quarta:</span> O contratante autoriza o
            contratado a ter acesso e utilizar os dados pessoais fornecidos para fins
            relacionados ao cumprimento do objeto contratado, de acordo com a Lei de Proteção
            de Dados (Lei 13.709/2018). O contratante declara que os dados fornecidos são
            verdadeiros e estão atualizados, e assume a responsabilidade pela veracidade das
            informações prestadas.</p>

        <h3 class="section-header">DO FORO</h3>

        <p><span class="clause-label">Cláusula Décima Quinta:</span> Estipulam o Foro da
            comarca de Duque de Caxias/RJ, para dirimir litígios decorrentes do presente
            contrato.</p>

        <p>E, por estarem assim contratados assinam o presente contrato em duas vias de igual
            teor. Rubricando todas as páginas do presente contrato.</p>
    `;
}

// ---------------------------------------------------------------------------
// TRABALHISTA — único contrato do sistema que não é sobre um benefício do INSS.
// Honorários calculados sobre o valor da condenação/acordo (não sobre parcelas
// de benefício), com regras específicas para hipótese de pensão vitalícia. Sem
// RPV, sem Termo de Concordância, sem Autorização Meu INSS e sem Termo de
// Renúncia — nenhum desses documentos existe no kit original deste contrato.
//
// NOTA: os arquivos enviados para "Doença Ocupacional" e "Trabalhista" têm o
// MESMO texto de cláusulas (honorários, custas, rescisão etc.) — só o objeto
// citado na Cláusula Primeira muda de um caso para o outro. Por isso os dois
// reaproveitam esta mesma função, parametrizada pelo "objeto" — ver
// buildContratoDoencaOcupacional() logo abaixo.
export function buildContratoTrabalhista(client, objeto = "TRABALHISTA") {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, o Sr(a). <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            portador(a) da Cédula de Identidade nº ${escapeHTML(f.rg)}, inscrito(a) no CPF sob o
            nº. ${escapeHTML(f.cpf)}, residente e domiciliado(a) ${escapeHTML(f.endereco)}.
        </p>

        <p>Contrata a Dra. <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, inscrita na
            OAB/RJ 162.559 com escritório na ${escapeHTML(ESCRITORIO.escritorioEndereco)}.</p>

        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, com as
            seguintes medidas judiciais e/ou extrajudiciais: <strong>${escapeHTML(objeto)}</strong>.</p>

        <p><span class="clause-label">Cláusula Segunda dos Honorários:</span> HONORÁRIOS –
            FORMA DE PAGAMENTO: A título de remuneração (honorários advocatícios) pela
            RECLAMAÇÃO TRABALHISTA, os contratados receberão do contratante, o valor
            correspondente a:</p>

        <p><span class="clause-label">Parágrafo Primeiro:</span> 30% (trinta por cento) do
            valor total da condenação que serão pagos de uma única vez no final da Reclamação
            Trabalhista proposta, ou o mesmo percentual do número de parcelas de eventual
            acordo formalizado em juízo OU FORA DELE, se for o caso, tudo após o efetivo
            recebimento. O valor incidirá em todas as verbas alcançadas pela sentença e pelo
            acordo, inclusive Seguro-desemprego e levantamento do FGTS, contribuições
            previdenciárias etc.</p>

        <p><span class="clause-label">Parágrafo Segundo:</span> Havendo condenação a título de
            (Pensão Vitalícia) e o pensionamento ocorrer com inclusão na folha de pagamento
            mensal do CONTRATANTE e condenação também em outras parcelas indenizatórias ou
            salariais, os honorários advocatícios, ora contratados, serão descontados,
            integralmente, sobre o valor a ser pago com os valores a serem recebidos a título
            dos valores atrasados, bem como da integralidade a ser recebida em Danos Morais e
            outros a serem concedidos no processo, permanecendo, nesta hipótese, o
            pensionamento mensal, livre de honorários contratuais em favor do CONTRATANTE,
            desde que o valor total das parcelas indenizatórias ou salariais suporte o
            pagamento integral dos honorários contratuais ora avençados.</p>

        <p><span class="clause-label">Parágrafo Terceiro:</span> As partes concordam que na
            hipótese do valor da condenação em parcelas indenizatórias ou salariais não
            suporte o valor integral dos honorários contratuais, ora acordado, a diferença
            será descontada no valor do pensionamento mensal, na razão de 30% (trinta por
            cento) até que se alcance o valor total a título dos honorários contratuais
            devidos referente à presente contratação, atualizados com juros e correção
            monetária.</p>

        <p><span class="clause-label">Parágrafo Quarto:</span> As partes concordam que, na
            hipótese de condenação exclusivamente a título de pensionamento, caso o pagamento
            seja realizado em uma única parcela, os honorários advocatícios contratados serão
            integralmente descontados sobre o valor recebido. Por outro lado, se o pagamento
            ocorrer de forma mensal, com inclusão do pensionamento na folha de pagamento do
            Contratante, os honorários serão quitados em parcelas sucessivas, deduzidas
            mensalmente dos valores recebidos, até que se alcance o valor total devido a
            título de honorários contratuais. O montante será atualizado com juros e correção
            monetária, conforme índices legais, até a sua completa quitação.</p>

        <p><span class="clause-label">Cláusula Terceira:</span> As partes estabelecem que
            havendo atraso no pagamento dos honorários, serão cobrados juros de mora na
            proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte por
            cento).</p>

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
            de multa de 40% (quarenta por cento) a ser calculada sobre o crédito que teria
            direito a ser recebido pelo contratante.</p>

        <p><span class="clause-label">Parágrafo segundo:</span> No caso da ação vir a ser
            julgada improcedente ou extinta por culpa exclusiva do contratante, como por
            exemplo, falta em audiência, falta a perícias médicas, deixar de entregar
            documentos solicitados dentro do prazo estabelecido para atendimento de despachos
            e outros, caberá ao contratado a cobrança de honorários no importe de R$ 2.000,00
            (dois mil reais).</p>

        <p><span class="clause-label">Cláusula Sexta:</span> O Contratante fica obrigado a,
            sempre que houver mudança de endereço, telefone ou e-mail, comunicar imediatamente
            ao Contratado.</p>

        <p><span class="clause-label">Cláusula Sétima:</span> O presente contrato não tem
            caráter personalíssimo, podendo o Contratado ser representado por outro(s)
            advogado(s) em qualquer ato processual.</p>

        <p>Por estarem justos certos e contratados assinam o presente instrumento, elegendo o
            foro de Duque de Caxias/RJ, para dirimir quaisquer dúvidas provenientes deste
            contrato.</p>
    `;
}

// DOENÇA OCUPACIONAL — mesmo texto de cláusulas do contrato Trabalhista (honorários
// sobre condenação/acordo, regras de pensão vitalícia, custas, rescisão etc., todas
// idênticas no arquivo original), só muda o objeto citado na Cláusula Primeira. Ação de
// doença ocupacional contra o empregador tramita como Reclamação Trabalhista, por isso o
// restante do texto permanece o mesmo.
export function buildContratoDoencaOcupacional(client) {
    return buildContratoTrabalhista(client, "DOENÇA OCUPACIONAL");
}

// ---------------------------------------------------------------------------
// CONSUMIDOR — mesmo "modelo simples" de 7 cláusulas, mas com duas diferenças
// importantes: a Cláusula Primeira (objeto) fica em branco no documento
// original — cada caso de consumidor é diferente — e a multa de rescisão do
// Parágrafo Primeiro da Cláusula Quinta é um valor fixo (R$ 450,00), não um
// percentual. Preservado fielmente: o campo do objeto sai em branco, para
// preenchimento manual conforme a medida judicial/extrajudicial de cada caso.
export function buildContratoConsumidor(client) {
    const f = clientFields(client);
    return `
        <p>
            Por este instrumento particular, o Sr(a) <strong>${escapeHTML(f.nome)}</strong>,
            ${escapeHTML(f.nacionalidade)}, ${escapeHTML(f.estadoCivil)}, ${escapeHTML(f.profissao)},
            inscrito(a) no CPF sob o nº ${escapeHTML(f.cpf)}, portador(a) da Carteira de
            Identidade nº ${escapeHTML(f.rg)}, residente e domiciliado(a) na
            ${escapeHTML(f.endereco)}.
        </p>

        <p>Contrata <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
            advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
            ${escapeHTML(ESCRITORIO.escritorioEndereco)}.</p>

        <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
            objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, com as
            seguintes medidas judiciais e/ou extrajudicial:
            ________________________________________________.</p>

        <p><span class="clause-label">Cláusula Segunda:</span> Os honorários advocatícios
            serão de 30% (trinta por cento) do valor total que a parte contratante vier a
            receber decorrente deste contrato, independentemente de ser judicial ou
            extrajudicial.</p>

        <p><span class="clause-label">Cláusula Terceira:</span> As partes estabelecem que
            havendo atraso no pagamento dos honorários, serão cobrados juros de mora na
            proporção de 1% (um por cento) ao mês, acrescidos de multa de 20% (vinte por
            cento).</p>

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
            do pagamento dos honorários no importe de R$ 450,00 (quatrocentos e cinquenta
            reais).</p>

        <p><span class="clause-label">Parágrafo segundo:</span> Caberá a referida multa
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

export function buildContratoLoas(beneficio) {
    return {
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
                    Contrata <strong>${escapeHTML(ESCRITORIO.advogadoNome)}</strong>, brasileira, casada,
                    advogada, inscrita na OAB/RJ sob o nº. 162.559, com escritório localizado na
                    ${escapeHTML(ESCRITORIO.escritorioEndereco)}.
                </p>

                <p><span class="clause-label">Cláusula Primeira:</span> O presente contrato tem como
                    objeto a Prestação de Serviços de Assessoria Jurídica ao Contratante, no
                    REQUERIMENTO DE LOAS – <strong>${escapeHTML(beneficio)}</strong>.</p>

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
    };
}
