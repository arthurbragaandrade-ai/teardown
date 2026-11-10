// Placa de pressão para chuveiro: o modelo, em unidades reais (m, s, L, kg, R$). Sem three.js aqui.
// Conceito de projeto escolar: nada foi medido. Todo valor é premissa e pode ser mudado na página.

// Placa sobreposta. NBR 9050: desnível de até 5 mm dispensa tratamento; de 5 a 20 mm pede rampa de no máximo 1:2.
export const PLATE = {
  size: 0.8, // lado da área ativa
  frameH: 0.014, // altura do quadro com borda em rampa
  ramp: 0.028, // largura da rampa: 14 mm a 1:2
  topH: 0.018, // altura total em repouso (até 20 mm); o tampo fica 4 mm acima do quadro (até 5 mm)
  travel: 0.002, // curso do tampo sob carga
  top: 0.74, // lado do tampo
  threshold: 5, // kg: aciona com criança ou com usuário sentado em cadeira de banho
  volts: 12, // extrabaixa tensão
};
export const PERSON_KG = 75;
export const EXITS = 2; // saídas da placa por banho: para se ensaboar e ao terminar

// Tarifa: Cuiabá (Águas Cuiabá, regulada pela Cuiabá Regula), categoria comercial, valor citado pela imprensa em
// fev/2026. A parcela de esgoto e o investimento por ponto são premissas.
export const DEF = {Q: 12, T: 8, soap: 30, delay: 3, baths: 30, showers: 10, days: 26, agua: 7.66, esgoto: 80, price: 1500};

/** As fases de um banho em segundos; `on` diz se a pessoa está sobre a placa. */
export function phases(p) {
  const T = p.T * 60;
  const soap = (T * p.soap) / 100;
  const wet = T - soap;
  return [
    {name: 'Molhar', dur: wet * 0.4, on: true},
    {name: 'Ensaboar, fora da placa', dur: soap, on: false},
    {name: 'Enxaguar', dur: wet * 0.6, on: true},
  ];
}

/** Litros por banho: registro comum aberto o banho todo; placa aberta só com alguém sobre ela, mais o atraso de corte. */
export function bath(p) {
  const comum = p.Q * p.T;
  const placa = Math.min(comum, p.Q * (p.T * (1 - p.soap / 100) + (EXITS * p.delay) / 60));
  return {comum, placa, saved: comum - placa, pct: 1 - placa / comum};
}

/** Economia mensal: litros poupados x banhos x chuveiros x dias x (tarifa de água + esgoto). */
export function money(p) {
  const b = bath(p);
  const m3 = (b.saved * p.baths * p.showers * p.days) / 1000;
  const rsM3 = p.agua * (1 + p.esgoto / 100);
  const mes = m3 * rsM3;
  const invest = p.price * p.showers;
  return {...b, m3, rsM3, mes, ano: mes * 12, invest, payback: mes > 0 ? invest / mes : Infinity};
}
