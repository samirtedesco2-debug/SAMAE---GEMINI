import pandas as pd
import json
import os
import re

NOME_PASTA = "Monitoramento Diário dos Reservatórios"

def encontrar_pasta_raiz():
    diretorio_atual = os.getcwd()
    for item in os.listdir(diretorio_atual):
        if os.path.isdir(item) and "monitoramento" in item.lower():
            return os.path.join(diretorio_atual, item)
    return os.path.join(diretorio_atual, NOME_PASTA)

PASTA_PLANILHAS = encontrar_pasta_raiz()

def carregar_dados_existentes():
    """Lê o dados.js mantendo o histórico por datas."""
    if not os.path.exists("dados.js"):
        return {"datasDisponiveis": [], "historico": {}}
    
    try:
        with open("dados.js", "r", encoding="utf-8") as f:
            conteudo = f.read()
            if "window.bancoDeDados =" in conteudo:
                str_obj = conteudo.split("window.bancoDeDados =", 1)[1].strip().rstrip(";")
                str_obj = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)\s*:', r'\1"\2":', str_obj)
                str_obj = str_obj.replace("'", '"')
                dados = json.loads(str_obj)
                # Garante estrutura legada se necessário
                if "historico" not in dados:
                    return {"datasDisponiveis": [], "historico": {}}
                return dados
    except Exception:
        pass
    
    return {"datasDisponiveis": [], "historico": {}}

def parse_num(v, is_level=True):
    if pd.isna(v) or str(v).strip() in ['-', 'nan', '']:
        return None
    try:
        val = float(str(v).replace('%', '').replace(',', '.').strip())
        if is_level and 0 < val <= 1.0:
            val = val * 100
        return round(val, 1)
    except:
        return None

def extrair_data_do_nome(nome_arquivo):
    padrao = r'(\d{1,2})[-_\./](\d{1,2})(?:[-_\./](\d{2,4}))?'
    match = re.search(padrao, nome_arquivo)
    if match:
        dia = match.group(1).zfill(2)
        mes = match.group(2).zfill(2)
        ano = match.group(3) if match.group(3) else "2026"
        if len(ano) == 2:
            ano = f"20{ano}"
        return f"{dia}/{mes}/{ano}"
    return None

def processar_pasta_planilhas():
    banco = carregar_dados_existentes()
    horarios = ["00:15", "01:15", "02:15", "03:15", "04:15", "05:15"]

    if not os.path.exists(PASTA_PLANILHAS):
        print(f"❌ Pasta de monitoramento não encontrada em:\n   {PASTA_PLANILHAS}")
        return

    arquivos_excel = []
    for raiz, _, arquivos in os.walk(PASTA_PLANILHAS):
        for arq in arquivos:
            ext = os.path.splitext(arq)[1].lower()
            if ext in ['.xlsx', '.xls', '.xlsm'] and not arq.startswith('~$'):
                arquivos_excel.append(os.path.join(raiz, arq))

    if not arquivos_excel:
        print("⚠️ Nenhum arquivo Excel foi encontrado.")
        return

    print(f"🔍 Processando {len(arquivos_excel)} planilha(s)...\n")

    for caminho_excel in arquivos_excel:
        nome_arquivo = os.path.basename(caminho_excel)
        data_planilha = extrair_data_do_nome(nome_arquivo)
        
        if not data_planilha:
            print(f"⚠️ Não foi possível identificar a data em: {nome_arquivo}. Ignorando.")
            continue

        print(f"📂 Processando data {data_planilha} ({nome_arquivo})...")

        try:
            df = pd.read_excel(caminho_excel, sheet_name=0)
        except Exception as e:
            print(f"   ⚠️ Erro ao ler {nome_arquivo}: {e}\n")
            continue

        reservatorios_dia = {}

        for r in range(2, min(24, len(df))):
            grupo = str(df.iloc[r, 0]).strip()
            nome = str(df.iloc[r, 1]).strip()

            if not nome or nome == 'nan':
                continue

            niveis = []
            vazoes = []

            for c in range(8, 20, 2):
                if c + 1 < len(df.columns):
                    n = parse_num(df.iloc[r, c], is_level=True)
                    v = parse_num(df.iloc[r, c+1], is_level=False)
                    niveis.append(n)
                    vazoes.append(v)

            niveis_validos = [x for x in niveis if x is not None]
            vazoes_validas = [x for x in vazoes if x is not None]

            nivel_atual = niveis_validos[-1] if niveis_validos else None
            nivel_min = min(niveis_validos) if niveis_validos else None
            nivel_max = max(niveis_validos) if niveis_validos else None

            vazao_atual = vazoes_validas[-1] if vazoes_validas else None
            vazao_min = min(vazoes_validas) if vazoes_validas else None
            vazao_max = max(vazoes_validas) if vazoes_validas else None
            vazao_media = round(sum(vazoes_validas)/len(vazoes_validas), 1) if vazoes_validas else None

            status = "Normal"
            if nivel_atual is not None:
                if nivel_atual < 40:
                    status = "Crítico"
                elif nivel_atual < 60:
                    status = "Atenção"
            else:
                status = "Sem Dados"

            reservatorios_dia[nome] = {
                "nome": nome,
                "grupo": grupo,
                "kpis": {
                    "nivelAtual": f"{nivel_atual}%" if nivel_atual is not None else "N/A",
                    "nivelMin": f"{nivel_min}%" if nivel_min is not None else "N/A",
                    "nivelMax": f"{nivel_max}%" if nivel_max is not None else "N/A",
                    "vazaoAtual": f"{vazao_atual} L/s" if vazao_atual is not None else "N/A",
                    "vazaoMin": f"{vazao_min} L/s" if vazao_min is not None else "N/A",
                    "vazaoMax": f"{vazao_max} L/s" if vazao_max is not None else "N/A",
                    "vazaoMedia": f"{vazao_media} L/s" if vazao_media is not None else "N/A",
                    "status": status
                },
                "leituras": {
                    "nivel": niveis,
                    "vazao": vazoes
                }
            }

        # Armazena os dados sob a chave da data
        banco["historico"][data_planilha] = {
            "ultimaAtualizacao": f"{data_planilha} 05:15",
            "horarios": horarios,
            "reservatorios": reservatorios_dia
        }

        if data_planilha not in banco["datasDisponiveis"]:
            banco["datasDisponiveis"].append(data_planilha)

    # Ordena as datas disponíveis
    banco["datasDisponiveis"].sort(key=lambda x: [int(i) for i in x.split('/')[::-1]])

    conteudo_js = f"window.bancoDeDados = {json.dumps(banco, indent=2, ensure_ascii=False)};\n"
    with open("dados.js", "w", encoding="utf-8") as f:
        f.write(conteudo_js)

    print("\n🎉 Sucesso! O arquivo 'dados.js' agora armazena todo o histórico por datas.")

if __name__ == "__main__":
    processar_pasta_planilhas()