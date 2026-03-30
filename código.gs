// ===============================
// CONFIG
// ===============================

var SPREADSHEET_ID = "1cYJSUihp-olsTCX5jdk51sgSidbBtiHEHU7MKjcaucg";


// ===============================
// ROUTER PRINCIPAL
// ===============================
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : "login";
  
  try {
    var template = HtmlService.createTemplateFromFile(page);
    var output = template.evaluate();
    
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.setTitle("Travel Santur PDV");
    
    return output;
  } catch (err) {
    return HtmlService.createHtmlOutput("Erro no carregamento: " + err.message);
  }
}

// ===============================
// INCLUIR HTML, CSS E JS
// ===============================
function include(filename){
  // Usa o createTemplateFromFile para permitir o evaluate()
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}







// ===============================
// LOGIN
// ===============================



// 3. Função de Login Ajustada para sua Planilha
function login(user, password) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("FUNCIONARIOS");
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    // Coluna C (índice 2) = Usuario | Coluna D (índice 3) = Senha | Coluna H (índice 7) = Status
    if (
      data[i][2].toString() == user && 
      data[i][3].toString() == password && 
      data[i][7].toString().toUpperCase() == "SI"
    ) {
      return {
        success: true,
        id: data[i][0],
        nome: data[i][1],
        funcao: data[i][4] // FUNCION is column E (index 4)
      };
    }
  }
  return { success: false };
}





// ===============================
// DASHBOARD EMPRESA
// ===============================
function getDashboardEmpresa(usuarioStr, filtroDatas) {
  var usuario = null;
  if(usuarioStr) {
    try { usuario = JSON.parse(usuarioStr); } catch(e){}
  }

  // Define datas de início e fim. Padrão: Últimos 7 dias (Semana Atual)
  var hoje = new Date();
  var dtInicio = new Date(hoje);
  dtInicio.setDate(hoje.getDate() - 7);
  dtInicio.setHours(0,0,0,0);
  
  var dtFim = new Date(hoje);
  dtFim.setHours(23,59,59,999);

  if (filtroDatas && filtroDatas.inicio && filtroDatas.fim) {
    var rawInicio = new Date(filtroDatas.inicio + "T00:00:00");
    var rawFim = new Date(filtroDatas.fim + "T23:59:59");
    if (!isNaN(rawInicio.getTime()) && !isNaN(rawFim.getTime())) {
      dtInicio = rawInicio;
      dtFim = rawFim;
    }
  }

  // CORREÇÃO AQUI: Mudado de "Ventas" para "VENDAS"
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("VENDAS");
  var data = sheet.getDataRange().getValues();

  var totalPeriodo = 0;
  var lucroPeriodo = 0;
  var qtdVendasPeriodo = 0;

  var V = {}; // Vendedores
  var S = {}; // Servicos
  var M = {}; // Monedas
  var D = {}; // Dias

  for (var i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    
    // NOME (col 2), SERVIÇO (col 4), MOEDA (col 6), TOTAL EM ARS (col 10), LUCRO (col 12)
    var isMinhaVenda = usuario && usuario.nome === data[i][2];
    var isAdminOuGerente = usuario && (usuario.funcao === "ADMIN" || usuario.funcao === "GERENTE");

    // Filtrar por función (Se VENDEDOR, ele só vê os próprios resultados no dashboard. Senão, vê tudo)
    if (usuario && usuario.funcao === "VENDEDOR" && !isMinhaVenda) {
       continue;
    }

    var fecha = new Date(data[i][1]);
    
    // Ignorar vendas fora do período filtrado
    if (fecha < dtInicio || fecha > dtFim) {
      continue;
    }

    var total = Number(data[i][13] || 0); // Convertido a ARS no banco (Coluna N - Index 13)
    var lucro = Number(data[i][15] || 0); // Lucro (Coluna P - Index 15)
    
    var vendedor = String(data[i][2]);
    var serviço = String(data[i][4]);
    var moeda = String(data[i][6]);
    var dataStr = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "dd/MM/yyyy");

    totalPeriodo += total;
    lucroPeriodo += lucro;
    qtdVendasPeriodo++;

    // Acumular Vendedores
    if(!V[vendedor]) V[vendedor] = { nome: vendedor, total: 0 };
    V[vendedor].total += total;

    // Acumular Serviços
    if(!S[serviço]) S[serviço] = 0;
    S[serviço] += total;

    // Acumular Moedas
    if(!M[moeda]) M[moeda] = 0;
    M[moeda] += total;

    // Acumular Dias (para timeline)
    if(!D[dataStr]) D[dataStr] = 0;
    D[dataStr] += total;
  }

  var caixa = getUltimoSaldo();

  var resultServicios = Object.keys(S).map(function(k){ return [k, S[k]] });
  var resultMonedas = Object.keys(M).map(function(k){ return [k, M[k]] });
  var resultDias = Object.keys(D).map(function(k){ return [k, D[k]] });
  var resultVendedores = Object.keys(V).map(function(k){ return V[k] });

  // Ordernar Dias logicamente
  resultDias.sort(function(a, b) {
    var d1 = a[0].split("/"); var d2 = b[0].split("/");
    return new Date(d1[2], d1[1]-1, d1[0]) - new Date(d2[2], d2[1]-1, d2[0]);
  });

  return {
    totalPeriodo: totalPeriodo,
    lucroPeriodo: lucroPeriodo,
    qtdVendasPeriodo: qtdVendasPeriodo,
    vendedores: resultVendedores,
    servicios: resultServicios,
    monedas: resultMonedas,
    ventasPorDia: resultDias,
    cajaARS: caixa.ars,
    cajaUSD: caixa.usd,
    cajaBRL: caixa.brl
  };
}




// ===============================
// DASHBOARD VENDEDORES
// ===============================

function getDashboardVendedores(){

// CORREÇÃO AQUI: Mudado de "Ventas" para "VENDAS"
var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("VENDAS");

var data = sheet.getDataRange().getValues();

var vendedores={};

for(var i=1;i<data.length;i++){

var nome = data[i][2];

var total = Number(data[i][13] || 0); // Coluna N (Total ARS)

var comissao = Number(data[i][17] || 0); // Coluna R (Comissao)

if(!vendedores[nome]){
vendedores[nome]={
total:0,
comissao:0
};
}

vendedores[nome].total += total;
vendedores[nome].comissao += comissao;

}

var result=[];

for(var v in vendedores){
result.push({
nome:v,
total:vendedores[v].total,
comissao:vendedores[v].comissao
});
}

return result;

}



// ===============================
// DASHBOARD DATA
// ===============================

function getDashboardData(usuarioStr, filtroDatas){

var empresa = getDashboardEmpresa(usuarioStr, filtroDatas);

return {

totalPeriodo:empresa.totalPeriodo,
lucroPeriodo:empresa.lucroPeriodo,
qtdVendasPeriodo:empresa.qtdVendasPeriodo,

cajaARS:empresa.cajaARS,
cajaUSD:empresa.cajaUSD,
cajaBRL:empresa.cajaBRL

};

}



// ===============================
// CLIENTES
// ===============================

function buscarClientes(texto){

var sheet =
SpreadsheetApp
.openById(SPREADSHEET_ID)
.getSheetByName("CLIENTES");

var data =
sheet.getDataRange().getValues();

var result=[];

for(var i=1;i<data.length;i++){

var nome =
String(data[i][1]).toLowerCase();

var doc =
String(data[i][4]).toLowerCase();

if(
nome.includes(texto.toLowerCase()) ||
doc.includes(texto.toLowerCase())
){

result.push({

id:data[i][0],
nome:data[i][1],
documento:data[i][4],
hotel:data[i][8]

});

}

}

return result;

}



// ===============================
// FUNCIONARIOS
// ===============================

function getFuncionarios(wb){

var spreadsheet = wb || SpreadsheetApp.openById(SPREADSHEET_ID);
var sheet = spreadsheet.getSheetByName("FUNCIONARIOS");

var data =
sheet.getDataRange().getValues();

var result=[];

for(var i=1;i<data.length;i++){

result.push({

id:data[i][0],
nome:data[i][1],
funcao:data[i][4],     // E (Funcion)
telefone:data[i][6],   // G (Telefone)
email:data[i][8],      // I (Email)
comissao:data[i][9],   // J (Comissao %)
ativo:data[i][7],      // H (Ativo)
salario:data[i][10]    // K (Salario)

});

}

return result;

}



// ===============================
// SERVICOS
// ===============================

function buscarServicos(texto){

var sheet =
SpreadsheetApp
.openById(SPREADSHEET_ID)
.getSheetByName("SERVICOS");

var data =
sheet.getDataRange().getValues();

var result=[];

for(var i=1;i<data.length;i++){

var nome =
String(data[i][1]).toLowerCase();

if(nome.includes(texto.toLowerCase())){

result.push({

id:data[i][0],
nome:data[i][1],
precoAdulto:data[i][4],
precoCrianca:data[i][5],
precoBebe:data[i][6],
moeda:data[i][7],
custo:data[i][8]

});

}

}

return result;

}


/**
 * =======================================================================================
 * @function guardarVenta
 * @description Rota principal acionada pelo Frontend ("Guardar Venda") para processar o Carrinho Múltiplo.
 * Esta função recebe a Array de serviços, re-valida todos os preços consultando a aba "SERVICOS" e "FUNCIONARIOS"
 * (para evitar interceptações maliciosas via 'Inspect Element' do navegador) e depois insere múltiplas 
 * linhas na planilha "Ventas". Os descontos globais da compra são descontados nativamente da primeira linha.
 * Ao fim, salva apenas 1 registro somado na aba "Caja" da contabilidade.
 * 
 * @param {Object} d - O Objeto recebido do Frontend (contém d.carrinho[], d.moeda, d.desconto, etc).
 * @param {Object} usuario - O objeto do LocalStorage atestando qual operador enviou a requisição.
 * @returns {boolean} Retorna 'true' para confirmar a inserção bem-sucedida.
 * =======================================================================================
 */
function guardarVenta(d, usuario, isTest){
  // 1. LOCK PARA EVITAR CONCORRÊNCIA E DOUBLE-CLICK
  var lock = LockService.getScriptLock();
  
  // Tenta adquirir o Lock em até 10 segundos
  if (!lock.tryLock(10000)) { 
    throw new Error("El sistema está procesando otra venta. Intente nuevamente en unos segundos.");
  }

  try {
    if(!usuario || !verificarPermissao(usuario.funcao, "crear")){
      throw new Error("Usuario no autenticado o sin permiso.");
    }

    var carrinho = d.carrinho;
    if (!carrinho || carrinho.length === 0) {
      throw new Error("El carrito está vacío.");
    }
    
    // 2. OTIMIZAÇÃO: Abrir a planilha apenas 1 vez para todo o processo
    var wb = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = wb.getSheetByName("VENDAS"); // Requer aba 'VENDAS'
    
    var idTransacao = Utilities.getUuid(); 
    
    // Passar `wb` evita I/O duplicado no banco
    var servicosDB = getServicos(wb);
    var funcionariosDB = getFuncionarios(wb);
    
    var funcReal = funcionariosDB.find(function(f) { return f.nome === usuario.nome; });
    var rawComissao = funcReal ? String(funcReal.comissao).replace('%', '').replace(',', '.') : "0";
    var comissao_percent = Number(rawComissao) || 0; 
    
    var totalBrutoOriginalTodaVenda = 0;
    var custoTotalTodaVenda = 0;

    // 1º Ciclo: Validar todos os itens e somar totais brutos para cálculo futuro
    for (var i = 0; i < carrinho.length; i++) {
        var item = carrinho[i];
        
        var qtdAdulto = Number(item.adultos) || 0;
        var qtdCrianca = Number(item.criancas) || 0;
        var qtdBebe = Number(item.bebes) || 0;
        
        var itemTotalQuantidade = qtdAdulto + qtdCrianca + qtdBebe;
        if(itemTotalQuantidade <= 0) throw new Error("La cantidad debe ser mayor a 0 para el servicio " + item.servico);
        
        var servicoReal = servicosDB.find(function(s) { return s.nome === item.servico; });
        if (!servicoReal) throw new Error("Servicio no encontrado en BD: " + item.servico);
        
        var valAdulto = Number(servicoReal.precoAdulto) || 0;
        var valCrianca = Number(servicoReal.precoCrianca) || 0;
        var valBebe = Number(servicoReal.precoBebe) || 0;
        
        var custo_unitario = Number(servicoReal.custo) || 0;
        
        // O item agora tem seu total original gerado a partir de faixas etárias reais
        var totalItemOriginal = (qtdAdulto * valAdulto) + (qtdCrianca * valCrianca) + (qtdBebe * valBebe);
        var custoTotalItem = itemTotalQuantidade * custo_unitario;
        
        item._total_bruto_calculado = totalItemOriginal;
        item._custo_unitario_real = custo_unitario;
        item._quantidade = itemTotalQuantidade;
        
        totalBrutoOriginalTodaVenda += totalItemOriginal;
        custoTotalTodaVenda += custoTotalItem;
    }
    
    // Câmbio puxado Dinamicamente do banco!
    var cambioGeral = getTaxaCambio(d.moeda, wb);

    var descontoGlobal = 0;
    if (usuario.funcao === "ADMIN" || usuario.funcao === "GERENTE" || usuario.funcao === "CO") {
      if (d.desconto && Number(d.desconto) > 0) {
        descontoGlobal = Number(d.desconto); 
        if (!isTest) {
          registrarAuditoria(wb, usuario.nome, "DESCONTO APLICADO", "Concedeu desconto total de " + descontoGlobal + " na venda.", idTransacao);
        }
      }
      if (d.usar_cambio_manual && Number(d.taxa_manual) > 0) {
        cambioGeral = Number(d.taxa_manual); 
        if (!isTest) {
          registrarAuditoria(wb, usuario.nome, "CAMBIO FORÇADO", "Utilizou Câmbio Manual de " + cambioGeral + " (" + d.moeda + ") ao invés da taxa na Aba.", idTransacao);
        }
      }
    }

    // Previne expurgos de desconto maiores que a venda em si
    if (descontoGlobal > totalBrutoOriginalTodaVenda) descontoGlobal = totalBrutoOriginalTodaVenda;
    
    var totalFinalPago = totalBrutoOriginalTodaVenda - descontoGlobal; 
    var descontoRestante = descontoGlobal; 

    // 2º Ciclo: Inserir Linhas na Aba Ventas (Uma linha por serviço)
    for (var i = 0; i < carrinho.length; i++) {
      var item = carrinho[i];
      
      var totalItemOriginal = item._total_bruto_calculado;
      var custoTotalItem = item._quantidade * item._custo_unitario_real;
      
      var descontoNesteItem = 0;
      if (descontoRestante > 0) {
        if (descontoRestante >= totalItemOriginal) {
          descontoNesteItem = totalItemOriginal;
          descontoRestante -= totalItemOriginal;
        } else {
          descontoNesteItem = descontoRestante;
          descontoRestante = 0;
        }
      }
      
      var totalCobradoItem = totalItemOriginal - descontoNesteItem;
      var lucroDesteItem = totalCobradoItem - custoTotalItem;
      var comissaoDesteItem = totalCobradoItem * (comissao_percent / 100);
      var totalARS_Item = totalCobradoItem * cambioGeral;

      if (!isTest) {
        sheet.appendRow([
          idTransacao,          // A (0) ID VENDA
          new Date(),           // B (1) DATA
          usuario.nome,         // C (2) FUNCIONARIO
          d.cliente_id,         // D (3) CLIENTE
          item.servico,         // E (4) SERVICO
          Number(item.adultos), // F (5) ADULTOS
          Number(item.criancas),// G (6) CRIANCAS
          Number(item.bebes),   // H (7) BEBES
          item._quantidade,     // I (8) QUANTIDADE
          d.moeda,              // J (9) MOEDA
          (totalItemOriginal / item._quantidade), // K (10) VALOR UNITARIO PONDERADO
          totalCobradoItem,     // L (11) VALOR TOTAL C/ DESCONTO
          cambioGeral,          // M (12) CAMBIO
          totalARS_Item,        // N (13) TOTAL ARS
          custoTotalItem,       // O (14) CUSTO TOTAL
          lucroDesteItem,       // P (15) LUCRO
          usuario.nome,         // Q (16) RESPONSAVEL DE VENDA
          comissaoDesteItem,    // R (17) COMISSAO
          d.forma_pagamento,    // S (18) FORMA PAGAMENTO
          d.status              // T (19) STATUS
        ]);
      }
    }

    // 3. Registra Caixa aglutinado usando a mesma Instância `wb`
    if (!isTest) {
      registrarMovimiento({
          tipo: "ENTRADA",
          descripcion: "Venta Múltiple (" + carrinho.length + " serviços) ID: " + idTransacao.substring(0,8),
          valor: totalFinalPago,
          moneda: d.moeda
      }, wb);
    } else {
      // Devolve relatório financeiro detalhado para os Assertions de QA
      return {
        success: true,
        idSimulado: idTransacao,
        totalFinalPago: totalFinalPago,
        lucroAproximado: (totalFinalPago - custoTotalTodaVenda),
        comissaoPercentAplicada: comissao_percent,
        cambioAplicado: cambioGeral
      };
    }

    return idTransacao;
    
  } catch (err) {
    throw new Error(err.message);
  } finally {
    // 4. OBRIGATÓRIO: Destranca a porta
    lock.releaseLock();
  }
}




// ===============================
// CAJA
// ===============================

function getUltimoSaldo(wb){

var spreadsheet = wb || SpreadsheetApp.openById(SPREADSHEET_ID);
var sheet = spreadsheet.getSheetByName("CAJA");

var data =
sheet.getDataRange().getValues();

var saldo={ars:0,usd:0,brl:0};

for(var i=1;i<data.length;i++){

var moneda=data[i][4];
var saldoFila=Number(data[i][7]||0);

if(moneda=="ARS") saldo.ars=saldoFila;
if(moneda=="USD") saldo.usd=saldoFila;
if(moneda=="BRL") saldo.brl=saldoFila;

}

return saldo;

}



function registrarMovimiento(d, wb){

var spreadsheet = wb || SpreadsheetApp.openById(SPREADSHEET_ID);
var sheet = spreadsheet.getSheetByName("CAJA");

var saldo = getUltimoSaldo(spreadsheet);

var valor =
Number(d.valor);

var nuevoSaldo=0;

if(d.tipo=="ENTRADA"){

if(d.moneda=="ARS") nuevoSaldo=saldo.ars+valor;
if(d.moneda=="USD") nuevoSaldo=saldo.usd+valor;
if(d.moneda=="BRL") nuevoSaldo=saldo.brl+valor;

}

if(d.tipo=="SALIDA"){

if(d.moneda=="ARS") nuevoSaldo=saldo.ars-valor;
if(d.moneda=="USD") nuevoSaldo=saldo.usd-valor;
if(d.moneda=="BRL") nuevoSaldo=saldo.brl-valor;

}

sheet.appendRow([

Utilities.getUuid(),
new Date(),
d.tipo,
d.descripcion,
d.moneda,
d.tipo=="ENTRADA"?valor:"",
d.tipo=="SALIDA"?valor:"",
nuevoSaldo

]);

}







// _________________PERMISOS_____________________

function verificarPermissao(usuarioFuncao, acao){

var permisos = {

ADMIN:["crear","editar","eliminar","ver"],
GERENTE:["crear","editar","ver"],
VENDEDOR:["crear","ver"],
CAJA:["crear","ver"]

};

return permisos[usuarioFuncao] &&
permisos[usuarioFuncao].includes(acao);

}

// _________________proteger guardar venta___________________________




// ===============================
// FUNÇÃO BUSCAR SERVIÇOS
// ===============================
function getServicos(wb) {
  var spreadsheet = wb || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName("SERVICOS");
  var data = sheet.getDataRange().getValues();
  var lista = [];

  // Começa no i=1 para pular o cabeçalho
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] == "") continue; // Pula se o nome do serviço estiver vazio

    lista.push({
      id: data[i][0],          // ID_SERVICO
      nome: data[i][1],        // NOME_SERVICO
      descricao: data[i][2],   // DESCRICION
      categoria: data[i][3],   // CATEGORIA
      precoAdulto: data[i][4], // PRECO_VENDA_ADULTO
      precoCrianca: data[i][5],// PRECO_VENDA_CRIAZA
      precoBebe: data[i][6],   // INCLUIR O BEBÊ (índice 6)
      moeda: data[i][7],       // MOEDA
      custo: data[i][8],       // INCLUIR O CUSTO (índice 8)
      fornecedor: data[i][9],  // FORNECEDOR
      ativo: data[i][12]       // ATIVO
    });
  }
  return lista;
}



// ===============================
// FUNÇÃO BUSCAR FORNECEDORES
// ===============================
function getFornecedores() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("FORNECEDORES");
  var data = sheet.getDataRange().getValues();
  var lista = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][1]) continue; // Pula se o nome estiver vazio

    lista.push({
      id: data[i][0],             // ID_FORN
      nome: data[i][1],           // NOME
      representante: data[i][2],  // REPRESENTANTE_COMECIAL
      telefone: data[i][3],       // TELEFONE
      email: data[i][4],          // EMAIL
      servico: data[i][5]         // SERVICO
    });
  }
  return lista;
}

// Função para salvar novo fornecedor (opcional)
function salvarFornecedor(dados) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("FORNECEDORES");
  sheet.appendRow([
    dados.id,
    dados.nome,
    dados.representante,
    dados.telefone,
    dados.email,
    dados.servico
  ]);
  return "Fornecedor salvo com sucesso!";
}

// ===============================
// FUNÇÃO PARA BUSCAR CÂMBIO
// ===============================
function getTaxaCambio(moedaDesejada, wb) {
  if (moedaDesejada === "ARS" || !moedaDesejada) return 1;

  var spreadsheet = wb || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName("CAMBIO");
  
  if (!sheet) {
    if (moedaDesejada === "USD") return 1200; 
    if (moedaDesejada === "BRL") return 240;
    return 1;
  }
  
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var moedaPlanilha = data[i][0] ? data[i][0].toString().toUpperCase() : "";
    var taxa = Number(data[i][1]) || 0;
    
    if (moedaPlanilha === moedaDesejada.toUpperCase()) {
      return taxa;
    }
  }
  
  // Taxa de segurança caso a moeda não esteja na aba
  if (moedaDesejada === "USD") return 1200; 
  if (moedaDesejada === "BRL") return 240;
  
  return 1;
}

// ===============================
// AUDITORIA (LOG DE ATIVIDADES SENSÍVEIS)
// ===============================
function registrarAuditoria(wb, usuarioNome, acao, detalhes, idReferencia) {
  try {
    var spreadsheet = wb || SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName("AUDITORIA_LOG");
    
    // So procede se a Aba AUDITORIA_LOG existir na sua planilha
    if (sheet) {
      sheet.appendRow([
        new Date(),       // A: DATA do Fato
        usuarioNome,      // B: QUEM Vendeu (Responsavel)
        acao,             // C: O QUE FEZ (DESCONTO, CAMBIO MANUAL, CANCELAMENTO...)
        detalhes,         // D: DESCRIÇÃO E VALORES
        idReferencia      // E: ID DA VENDA RELACIONADA
      ]);
    }
  } catch (e) {
    // Falhas do bot de auditoria não devem travar a venda do cliente
    console.error("Erro interno no registro de auditoria: " + e.message);
  }
}

