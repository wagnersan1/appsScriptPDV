# patch_getVentas.ps1
$gsFile = "c:\Users\Wagner Santana\Desktop\appsScriptPDV\c�digo.gs"
$gsFile2 = [System.IO.Path]::Combine("c:\Users\Wagner Santana\Desktop\appsScriptPDV", "c`u{00F3}digo.gs")

# Try to find the actual file
$files = Get-ChildItem "c:\Users\Wagner Santana\Desktop\appsScriptPDV" -Filter "*.gs" | Where-Object { $_.Name -match "digo" }
if ($files) {
    $gsFile3 = $files[0].FullName
    Write-Host "Arquivo encontrado: $gsFile3"
    $content = [System.IO.File]::ReadAllText($gsFile3, [System.Text.Encoding]::UTF8)
    Write-Host "Total bytes: $($content.Length)"
    
    if ($content -match 'function getVentas\(\)') {
        Write-Host "Funcao getVentas() simples encontrada!"
    } else {
        Write-Host "Funcao NAO encontrada pelo regex simples"
    }
    
    $newFunc = @'
// ===============================
// LISTA HISTORICA DE VENTAS (getVentas)
// ===============================
/**
 * Retorna o historico de vendas com todos os campos da aba VENDAS.
 * - Filtro de periodo via filtros.inicio / filtros.fim ("YYYY-MM-DD")
 * - Role-based: VENDEDOR e CO enxergam apenas suas proprias vendas.
 * @param {Object} filtros     { inicio: "YYYY-MM-DD", fim: "YYYY-MM-DD" }
 * @param {string} usuarioStr  JSON string do objeto usuario do localStorage
 */
function getVentas(filtros, usuarioStr) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("VENDAS");
  if (!sheet) return [];

  var usuario = null;
  try { usuario = JSON.parse(usuarioStr || "null"); } catch(e) {}

  var tz = Session.getScriptTimeZone();

  var dtInicio = null, dtFim = null;
  if (filtros && filtros.inicio) {
    var p = filtros.inicio.split("-");
    dtInicio = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 0, 0, 0);
  }
  if (filtros && filtros.fim) {
    var p2 = filtros.fim.split("-");
    dtFim = new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]), 23, 59, 59);
  }

  var funcao = usuario ? String(usuario.funcao || "").toUpperCase() : "";
  var isVendedor = (funcao === "VENDEDOR" || funcao === "CO");

  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = data.length - 1; i > 0; i--) {
    if (!data[i][1]) continue;
    var rowDate = data[i][1] instanceof Date ? data[i][1] : new Date(data[i][1]);
    if (dtInicio && rowDate < dtInicio) continue;
    if (dtFim    && rowDate > dtFim)    continue;
    if (isVendedor && data[i][2] !== usuario.nome) continue;

    var fecha = data[i][1] instanceof Date
                ? Utilities.formatDate(data[i][1], tz, "dd/MM/yyyy HH:mm")
                : String(data[i][1]);

    result.push({
      id:          data[i][0],
      fecha:       fecha,
      funcionario: data[i][2],
      cliente:     data[i][3],
      servico:     data[i][4],
      adultos:     data[i][5],
      criancas:    data[i][6],
      bebes:       data[i][7],
      quantidade:  data[i][8],
      moeda:       data[i][9],
      valorUnit:   data[i][10],
      total:       data[i][11],
      cambio:      data[i][12],
      totalARS:    data[i][13],
      custo:       data[i][14],
      lucro:       data[i][15],
      responsavel: data[i][16],
      comissao:    data[i][17],
      pagamento:   data[i][18],
      status:      data[i][19]
    });

    if (result.length >= 500) break;
  }

  return result;
}
'@

    # Replace using line-based approach: find start line and end of function
    $lines = $content -split "`r`n"
    $startLine = -1
    $endLine = -1
    $depth = 0
    $inFunc = $false

    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '// LISTA HIST') {
            $startLine = $i - 1  # include the separator line before
            if ($startLine -lt 0) { $startLine = 0 }
        }
        if ($startLine -ge 0 -and $lines[$i] -match 'function getVentas\(\)') {
            $inFunc = $true
        }
        if ($inFunc) {
            $depth += ($lines[$i].ToCharArray() | Where-Object { $_ -eq '{' }).Count
            $depth -= ($lines[$i].ToCharArray() | Where-Object { $_ -eq '}' }).Count
            if ($depth -eq 0 -and $startLine -ge 0) {
                $endLine = $i
                break
            }
        }
    }

    Write-Host "Start line: $startLine, End line: $endLine"

    if ($startLine -ge 0 -and $endLine -ge 0) {
        $before = $lines[0..($startLine - 1)] -join "`r`n"
        $after  = $lines[($endLine + 1)..($lines.Length - 1)] -join "`r`n"
        $newContent = $before + "`r`n" + $newFunc + "`r`n" + $after
        [System.IO.File]::WriteAllText($gsFile3, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "SUCESSO! getVentas substituida (linhas $startLine a $endLine)."
    } else {
        Write-Host "ERRO: Nao foi possivel localizar o bloco da funcao."
    }
} else {
    Write-Host "ARQUIVO .gs NAO ENCONTRADO no diretorio."
    Get-ChildItem "c:\Users\Wagner Santana\Desktop\appsScriptPDV" | Select-Object Name
}
