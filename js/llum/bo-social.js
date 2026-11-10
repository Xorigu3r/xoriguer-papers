// Bo social elèctric (RD 897/2017): qui hi té dret, quin descompte i quant es pot estalviar.
// Funcions pures (es proven amb node --test). Els valors surten de data/llum-AAAA.json → boSocial.

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * entrada: { adults, menors, ingressos, familiaNombrosa, pensionistes, imv, especial, potencia, consumAnual, preuEnergia }
 * Retorna la categoria ('sever' | 'vulnerable' | 'no' | 'potencia'), els llindars i l'estalvi aproximat.
 */
export function avaluaBoSocial(entrada, dades, avui = new Date()) {
  const bs = dades.boSocial;
  const adults = Math.max(1, Math.round(Number(entrada.adults) || 1));
  const menors = Math.max(0, Math.round(Number(entrada.menors) || 0));
  const ingressos = Number(entrada.ingressos);
  const teIngressos = Number.isFinite(ingressos) && String(entrada.ingressos ?? '').trim() !== '';
  const ip = bs.iprem14;
  const m = bs.multiplicador;

  // Via general: 1,5 IPREM + 0,3 per adult addicional + 0,5 per menor (+1 en circumstàncies especials)
  const multiplicador = r2(m.base + m.adultAddicional * (adults - 1) + m.menor * menors + (entrada.especial ? m.circumstanciaEspecial : 0));
  const llindar = r2(multiplicador * ip);
  const llindarSever = r2(llindar * bs.severPartDelLlindar);

  const vies = [];
  if (teIngressos) {
    if (ingressos <= llindarSever) vies.push({ via: 'renda', categoria: 'sever' });
    else if (ingressos <= llindar) vies.push({ via: 'renda', categoria: 'vulnerable' });
  }
  if (entrada.familiaNombrosa) vies.push({ via: 'familiaNombrosa', categoria: teIngressos && ingressos <= bs.familiaNombrosaSever * ip ? 'sever' : 'vulnerable' });
  if (entrada.pensionistes) vies.push({ via: 'pensionistes', categoria: teIngressos && ingressos <= bs.pensionistesSever * ip ? 'sever' : 'vulnerable' });
  if (entrada.imv) vies.push({ via: 'imv', categoria: teIngressos && ingressos <= llindarSever ? 'sever' : 'vulnerable' });

  const ordre = { sever: 2, vulnerable: 1 };
  const millor = vies.sort((a, b) => ordre[b.categoria] - ordre[a.categoria])[0];
  let categoria = millor?.categoria ?? 'no';
  const potencia = Number(entrada.potencia) || null;
  if (categoria !== 'no' && potencia != null && potencia > bs.potenciaMaxKW) categoria = 'potencia';

  // Límit de kWh amb descompte: el més favorable dels que encaixen
  const persones = adults + menors;
  const L = bs.limitsKWh;
  const candidats = [persones <= 2 ? L.fins2persones : persones === 3 ? L.tresPersones : persones === 4 ? L.quatrePersones : L.cincOMes];
  if (entrada.pensionistes) candidats.push(L.tresPersones);
  if (persones === 3 && menors >= 2) candidats.push(L.quatrePersones);
  if (persones === 4 && menors >= 3) candidats.push(L.cincOMes);
  if (entrada.familiaNombrosa) candidats.push(L.cincOMes);
  const limitKWh = Math.max(...candidats);

  // Percentatge de descompte vigent avui (els del 2026 són extraordinaris)
  const dia = avui.toISOString().slice(0, 10);
  const periode = (bs.descomptes ?? []).find((p) => dia >= p.des && dia <= p.fins);
  const pct = periode ?? bs.descompteOrdinari;
  const descompte = categoria === 'sever' ? pct.sever : categoria === 'vulnerable' ? pct.vulnerable : null;

  // Estalvi aproximat a l'any amb el PVPC: el descompte s'aplica a tota la potència i a l'energia fins al límit
  let estalvi = null;
  if (descompte != null) {
    const kW = potencia ?? 3.45;
    const preuPotAny = dades.peatges.potencia.P1 + dades.carrecs.potencia.P1 + bs.margeComercialitzacioPVPC
      + dades.peatges.potencia.P2 + dades.carrecs.potencia.P2;
    const terPotencia = kW * preuPotAny;
    const consum = Number(entrada.consumAnual) || limitKWh;
    const preuEnergia = Number(entrada.preuEnergia) || 0.13;
    const kWhAmbDescompte = Math.min(consum, limitKWh);
    const base = terPotencia + kWhAmbDescompte * preuEnergia;
    const senseImpostos = base * descompte / 100;
    const iee = 1 + (dades.periodesFiscals.at(-1).impostElectric / 100);
    const iva = 1 + (dades.periodesFiscals.at(-1).iva / 100);
    estalvi = { kW, consum, preuEnergia, kWhAmbDescompte, terPotencia: r2(terPotencia), base: r2(base), senseImpostos: r2(senseImpostos), ambImpostos: r2(senseImpostos * iee * iva) };
  }

  return {
    categoria, via: millor?.via ?? null, adults, menors, ingressos: teIngressos ? ingressos : null,
    multiplicador, llindar, llindarSever, iprem: ip, limitKWh, descompte,
    descomptePeriode: periode ?? null, descompteOrdinari: bs.descompteOrdinari, estalvi,
  };
}
