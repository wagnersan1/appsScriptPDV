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

function getDashboardData(){

var empresa =
getDashboardEmpresa();

return {

totalHoy:empresa.totalHoje,
totalMes:empresa.totalMes,
lucroTotal:empresa.totalLucro,

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

function getFuncionarios(){

var sheet =
SpreadsheetApp
.openById(SPREADSHEET_ID)
.getSheetByName("FUNCIONARIOS");

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
function guardarVenta(d, usuario){
  // 1. SEGURANÇA: Verifica se o usuário tem permissão
  if(!usuario || !verificarPermissao(usuario.funcao, "crear")){
    throw new Error("Usuario no autenticado o sin permiso.");
  }

  var carrinho = d.carrinho;
  if (!carrinho || carrinho.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Ventas");
  var idTransacao = Utilities.getUuid(); // Um único ID agrupa todas as linhas da mesma Venda
  
  // Buscar bases de dados reais
  var servicosDB = getServicos();
  var funcionariosDB = getFuncionarios();
  var funcReal = funcionariosDB.find(function(f) { return f.nome === usuario.nome; });
  var comissao_percent = funcReal ? (Number(funcReal.comissao) || 0) : 0; 
  
  var totalBrutoOriginalTodaVenda = 0;
  var custoTotalTodaVenda = 0;

  // 1º Ciclo: Validar todos os itens e somar totais brutos para cálculo futuro
  for (var i = 0; i < carrinho.length; i++) {
    var item = carrinho[i];
    var quantidade = Number(item.adultos) + Number(item.criancas) + Number(item.bebes);
    if(quantidade <= 0) throw new Error("La cantidad debe ser mayor a 0 para el servicio " + item.servico);
    
    var servicoReal = servicosDB.find(function(s) { return s.nome === item.servico; });
    if (!servicoReal) throw new Error("Servicio no encontrado en BD: " + item.servico);
    
    var valor_unitario = Number(servicoReal.precoAdulto) || 0;
    var custo_unitario = Number(servicoReal.custo) || 0;
    
    item._valor_unitario_real = valor_unitario;
    item._custo_unitario_real = custo_unitario;
    item._quantidade = quantidade;
    
    var totalItem = quantidade * valor_unitario;
    var custoItem = quantidade * custo_unitario;
    
    totalBrutoOriginalTodaVenda += totalItem;
    custoTotalTodaVenda += custoItem;
  }
  
  // 2. PRIVILÉGIOS DE GERÊNCIA (CO, ADMIN E GERENTE) - Desconto Global
  var descontoGlobal = 0;
  var cambioGeral = d.moeda === 'USD' ? 1200 : (d.moeda === 'BRL' ? 240 : 1);

  if (usuario.funcao === "ADMIN" || usuario.funcao === "GERENTE" || usuario.funcao === "CO") {
    if (d.desconto && Number(d.desconto) > 0) {
      descontoGlobal = Number(d.desconto); 
    }
    if (d.usar_cambio_manual && Number(d.taxa_manual) > 0) {
      cambioGeral = Number(d.taxa_manual); 
    }
  }

  // Previne expurgos de desconto maiores que a venda em si
  if (descontoGlobal > totalBrutoOriginalTodaVenda) descontoGlobal = totalBrutoOriginalTodaVenda;
  
  var totalFinalPago = totalBrutoOriginalTodaVenda - descontoGlobal; // O real final
  var descontoRestante = descontoGlobal; // Vamos descontar nas linhas progressivamente

  // 2º Ciclo: Inserir Linhas na Aba Ventas (Uma linha por serviço)
  for (var i = 0; i < carrinho.length; i++) {
    var item = carrinho[i];
    
    var totalItemOriginal = item._quantidade * item._valor_unitario_real;
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
      item._valor_unitario_real, // K (10) VALOR UNITARIO
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

  // 3. Registra Caixa aglutinado
  registrarMovimiento({
    tipo: "ENTRADA",
    descripcion: "Venta Múltiple (" + carrinho.length + " serviços) ID: " + idTransacao.substring(0,8),
    valor: totalFinalPago,
    moneda: d.moeda
  });

  return idTransacao;
}



// ===============================
// CAJA
// ===============================

function getUltimoSaldo(){

var sheet =
SpreadsheetApp
.openById(SPREADSHEET_ID)
.getSheetByName("CAJA");

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



function registrarMovimiento(d){

var sheet =
SpreadsheetApp
.openById(SPREADSHEET_ID)
.getSheetByName("CAJA");

var saldo =
getUltimoSaldo();

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
function getServicos() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("SERVICOS");
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
      moeda: data[i][7],       // MOEDA
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
