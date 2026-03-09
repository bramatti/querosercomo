// 1. INSIRA SEUS LINKS AQUI (Mantenha as aspas)
const URL_CSV_RANKING = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhgC_Q8VEwc3lVK4z6qi5q3j6DqczvYpr3WV8eD1H2M8SnT9nzVzFWqwy2D9u8jHvBvbFKey_RNXdH/pub?gid=1357595805&single=true&output=csv';
const URL_CSV_PROJECAO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhgC_Q8VEwc3lVK4z6qi5q3j6DqczvYpr3WV8eD1H2M8SnT9nzVzFWqwy2D9u8jHvBvbFKey_RNXdH/pub?gid=154223185&single=true&output=csv';

// Variáveis para guardar os dados da planilha
let dadosRanking = [];
let dadosProjecaoBrasil = {}; 

const selectCountry = document.getElementById('country-select');
const btnCalcular = document.getElementById('btn-calcular');
const divResultado = document.getElementById('resultado');

// Função auxiliar para ler as linhas do CSV corretamente
function quebrarLinhaCSV(linha) {
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    return linha.split(regex).map(item => item.replace(/(^"|"$)/g, '').trim());
}

// Função principal que baixa os dados do Google Sheets
async function carregarDados() {
    try {
        // --- BAIXANDO O RANKING ATUAL ---
        const resRanking = await fetch(URL_CSV_RANKING);
        const textoRanking = await resRanking.text();
        const linhasRanking = textoRanking.split('\n').filter(linha => linha.trim() !== '');

        // Pula a primeira linha (cabeçalho) e lê o resto
        for (let i = 1; i < linhasRanking.length; i++) {
            const [pais, idh] = quebrarLinhaCSV(linhasRanking[i]);
            if (pais && idh) {
                // Troca vírgula por ponto (caso o Excel use padrão BR) e transforma em número
                dadosRanking.push({ pais: pais, idh: parseFloat(idh.replace(',', '.')) });
            }
        }

        // Preenche o menu Dropdown em ordem alfabética
        selectCountry.innerHTML = '<option value="">Selecione um país...</option>';
        dadosRanking.sort((a, b) => a.pais.localeCompare(b.pais)).forEach(item => {
            if (item.pais.toLowerCase() !== 'brasil') { // Tira o Brasil da lista de opções
                const option = document.createElement('option');
                option.value = item.idh;
                option.textContent = item.pais;
                selectCountry.appendChild(option);
            }
        });

        // --- BAIXANDO A PROJEÇÃO DO BRASIL ---
        const resProjecao = await fetch(URL_CSV_PROJECAO);
        const textoProjecao = await resProjecao.text();
        const linhasProjecao = textoProjecao.split('\n').filter(linha => linha.trim() !== '');

        const cabecalhosProjecao = quebrarLinhaCSV(linhasProjecao[0]); // ["País", "2023", "2024", ...]

        // Procura a linha que tem a palavra "Brasil"
        let linhaBrasil = null;
        for (let i = 1; i < linhasProjecao.length; i++) {
            const colunas = quebrarLinhaCSV(linhasProjecao[i]);
            if (colunas[0].toLowerCase() === 'brasil') {
                linhaBrasil = colunas;
                break;
            }
        }

        // Se achou o Brasil, guarda as projeções por ano
        if (linhaBrasil) {
            for (let j = 1; j < cabecalhosProjecao.length; j++) {
                const ano = cabecalhosProjecao[j];
                const idhProjetado = parseFloat(linhaBrasil[j].replace(',', '.'));
                dadosProjecaoBrasil[ano] = idhProjetado;
            }
            btnCalcular.disabled = false; // Libera o botão!
        } else {
            alert("Não encontrei a linha do 'Brasil' na aba de projeções.");
        }

    } catch (error) {
        console.error("Erro:", error);
        selectCountry.innerHTML = '<option value="">Erro ao conectar com a planilha.</option>';
    }
}

// O que acontece quando o botão "Calcular" é clicado
btnCalcular.addEventListener('click', () => {
    const idhAlvo = parseFloat(selectCountry.value);
    const paisAlvo = selectCountry.options[selectCountry.selectedIndex].text;

    if (!idhAlvo) {
        alert("Por favor, selecione um país primeiro.");
        return;
    }

    const idhBrasilBase = dadosProjecaoBrasil["2023"]; // Pega o IDH base do Brasil

    // Caso 1: O Brasil já é melhor ou igual ao país escolhido
    if (idhBrasilBase >= idhAlvo) {
        divResultado.innerHTML = `O Brasil (IDH atual: <strong>${idhBrasilBase.toFixed(3)}</strong>) já possui um nível igual ou superior ao de <strong>${paisAlvo}</strong> (IDH: <strong>${idhAlvo.toFixed(3)}</strong>).`;
        divResultado.classList.remove('hidden');
        return;
    }

    let anoAlcancado = null;
    let anosNecessarios = 0;

    // Vasculha as projeções ano a ano até o IDH do Brasil passar o IDH alvo
    const anosProjetados = Object.keys(dadosProjecaoBrasil).sort();
    
    for (const ano of anosProjetados) {
        if (dadosProjecaoBrasil[ano] >= idhAlvo) {
            anoAlcancado = ano;
            break;
        }
    }

    // Calcula os anos e exibe o resultado
    if (anoAlcancado) {
        const anoAtual = new Date().getFullYear(); // Ex: 2026
        anosNecessarios = anoAlcancado - anoAtual;
        
        let textoTempo = anosNecessarios > 0 
            ? `Isso ocorrerá daqui a <strong>${anosNecessarios} anos</strong>.` 
            : `Isso acontecerá muito em breve!`;

        divResultado.innerHTML = `
            O IDH de <strong>${paisAlvo}</strong> é <strong>${idhAlvo.toFixed(3)}</strong>.<br><br>
            Segundo a projeção, o Brasil alcançará esse nível no ano de <strong>${anoAlcancado}</strong>.<br><br>
            ${textoTempo}
        `;
    } else {
        // Caso 2: O Brasil não alcança o país nem em 2050
        divResultado.innerHTML = `
            O IDH de <strong>${paisAlvo}</strong> é <strong>${idhAlvo.toFixed(3)}</strong>.<br><br>
            Infelizmente, de acordo com as projeções até 2050, o Brasil ainda não terá alcançado esse patamar de desenvolvimento.
        `;
    }

    divResultado.classList.remove('hidden');
});

// Dá a partida no código assim que a página carrega
carregarDados();