import {useEffect, useState, type ReactNode} from 'react';
import {AlertTriangle, Compass, Droplets, Footprints, LogOut, Menu, PiggyBank, ShieldCheck, Undo2, Users, Wrench, X, ZapOff} from 'lucide-react';

// Troque pelo endereço de um vídeo de água corrente ou vestiário limpo. Vazio: fundo em degradê animado.
const VIDEO_URL = '';
const NAV = [['Como funciona', '#como'], ['Economia', '#economia'], ['Garantias', '#garantias'], ['Aplicativo', '#app'], ['Assessoria', '#assessoria']];
const PAD = 'px-6 md:px-12 lg:px-16';

function FadeIn({delay, duration = 1000, children}: {delay: number; duration?: number; children: ReactNode}) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t); }, [delay]);
  return <div className={`transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} style={{transitionDuration: `${duration}ms`}}>{children}</div>;
}

function AnimatedHeading({text, className}: {text: string; className: string}) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 200); return () => clearTimeout(t); }, []);
  return (
    <h1 className={className} style={{letterSpacing: '-0.04em'}} aria-label={text.replace('\n', ' ')}>
      {text.split('\n').map((line, li) => (
        <span key={li} className="block" aria-hidden="true">
          {line.split(' ').map((word, wi, ws) => {
            const at = ws.slice(0, wi).join(' ').length + (wi ? 1 : 0);
            return (
              <span key={wi} className="inline-block whitespace-nowrap">
                {[...(wi < ws.length - 1 ? word + ' ' : word)].map((ch, ci) => (
                  <span key={ci} className="inline-block" style={{opacity: on ? 1 : 0, transform: on ? 'translateX(0)' : 'translateX(-18px)',
                    transition: 'opacity 500ms, transform 500ms', transitionDelay: `${li * line.length * 30 + (at + ci) * 30}ms`}}>
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                ))}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

const Section = ({id, dark, eyebrow, title, children}: {id?: string; dark?: boolean; eyebrow: string; title: string; children: ReactNode}) => (
  <section id={id} className={`${PAD} py-20 ${dark ? 'bg-sanits-navy text-sanits-paper' : ''}`}>
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-medium uppercase tracking-widest text-sanits-sky">{eyebrow}</p>
      <h2 className="mb-10 mt-2 font-display text-3xl md:text-4xl" style={{letterSpacing: '-0.02em'}}>{title}</h2>
      {children}
    </div>
  </section>
);
const Card = ({icon: Icon, title, text}: {icon: typeof Droplets; title: string; text: string}) => (
  <div className="rounded-2xl bg-white p-6 shadow-sm">
    <Icon className="mb-4 h-7 w-7 text-sanits-sky" aria-hidden="true" />
    <h3 className="mb-2 font-display text-lg">{title}</h3>
    <p className="text-sanits-navy/75">{text}</p>
  </div>
);
const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

export default function App() {
  const [menu, setMenu] = useState(false);
  const [s, setS] = useState(10);
  const [b, setB] = useState(30);
  const [sent, setSent] = useState(false);
  const mes = ((27.6 * b * s * 26) / 1000) * 13.79;
  const inv = 2900 * s;
  const field = 'w-full rounded-lg border border-sanits-navy/20 bg-white px-4 py-3';

  return (
    <>
      <header className="relative flex min-h-screen flex-col overflow-hidden bg-sanits-navy text-white">
        {VIDEO_URL ? <video className="absolute inset-0 h-full w-full object-cover" src={VIDEO_URL} autoPlay loop muted playsInline /> : <div className="hero-bg absolute inset-0" />}
        <div className="absolute inset-0 bg-gradient-to-t from-sanits-navy/70 to-transparent" />
        <div className={`relative ${PAD} pt-6`}>
          <nav className="liquid-glass flex items-center justify-between rounded-xl px-4 py-2">
            <a href="#" className="font-display text-2xl font-semibold tracking-tight">Sanits</a>
            <div className="hidden gap-8 text-sm md:flex">{NAV.map(([t, h]) => <a key={h} href={h} className="transition-colors hover:text-sanits-sky">{t}</a>)}</div>
            <div className="flex items-center gap-2">
              <a href="#teste" className="rounded-lg bg-sanits-paper px-4 py-2 text-sm font-medium text-sanits-navy hover:bg-white sm:px-6">Agendar teste</a>
              <button className="p-2 md:hidden" onClick={() => setMenu(!menu)} aria-label="Abrir menu" aria-expanded={menu}>{menu ? <X /> : <Menu />}</button>
            </div>
          </nav>
          {menu && <div className="liquid-glass mt-2 flex flex-col gap-1 rounded-xl p-3 md:hidden">{NAV.map(([t, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="rounded-lg px-3 py-2">{t}</a>)}</div>}
        </div>
        <div className={`relative ${PAD} flex flex-1 flex-col justify-end pb-12 lg:pb-16`}>
          <div className="lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-end">
            <div>
              <AnimatedHeading text={'Economia consciente\npara quem empreende.'} className="mb-4 font-display text-4xl font-normal md:text-5xl lg:text-6xl xl:text-7xl" />
              <FadeIn delay={800}><p className="mb-5 max-w-xl text-base text-sanits-paper/80 md:text-lg">Água só quando há alguém usando. Infraestrutura robusta, manutenção garantida e um aplicativo que mostra cada litro e cada real.</p></FadeIn>
              <FadeIn delay={1200}>
                <div className="flex flex-wrap gap-4">
                  <a href="#teste" className="rounded-lg bg-sanits-blue px-8 py-3 font-medium text-white transition-colors hover:bg-sanits-sky">Agendar teste de 1 mês</a>
                  <a href="#economia" className="liquid-glass rounded-lg border border-white/20 px-8 py-3 font-medium text-white transition-colors hover:bg-sanits-paper hover:text-sanits-navy">Simular minha economia</a>
                </div>
              </FadeIn>
            </div>
            <div className="mt-8 flex items-end justify-start lg:mt-0 lg:justify-end">
              <FadeIn delay={1400}><div className="liquid-glass rounded-xl border border-white/20 px-6 py-3 text-lg font-light md:text-xl lg:text-2xl">Economia. Confiança. Assessoria.</div></FadeIn>
            </div>
          </div>
        </div>
      </header>

      <Section id="como" eyebrow="Como funciona" title="Três passos, nenhum registro para girar">
        <div className="grid gap-5 md:grid-cols-3">
          <Card icon={Footprints} title="Pisou, abriu" text="A placa de piso percebe a pessoa e libera a água na hora." />
          <Card icon={LogOut} title="Saiu, fechou" text="Ao sair da placa, a água corta após um atraso ajustável." />
          <Card icon={ZapOff} title="Falhou, fechou" text="Sem energia ou com defeito, a água não corre." />
        </div>
      </Section>

      <Section id="garantias" eyebrow="Nossos compromissos" title="O que a Sanits garante">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card icon={PiggyBank} title="Economia consciente" text="Menos água na conta, sem mudar o hábito de ninguém." />
          <Card icon={ShieldCheck} title="Infraestrutura robusta e confiável" text="Elétrica em 12 V vedada, piso antiderrapante, acessível a cadeira de rodas." />
          <Card icon={Wrench} title="Manutenção garantida por 3 anos" text="Visitas e peças sem custo adicional." />
          <Card icon={Compass} title="Planejamento simulado" text="Projetamos a economia do seu espaço antes de instalar." />
          <Card icon={Users} title="Assessoria personalizada" text="Mapeamos a demanda de cada cliente, ponto a ponto." />
          <Card icon={Undo2} title="Arrependimento garantido" text="1 mês para desistir, sem custo." />
        </div>
      </Section>

      <Section id="teste" dark eyebrow="Teste de 1 mês" title="Você decide com os seus números">
        <ol className="grid gap-6 md:grid-cols-4">
          {['Medimos o consumo atual.', 'Instalamos em parte dos chuveiros.', 'Medimos por 30 dias.', 'Você recebe o relatório com a economia e decide.'].map((t, i) => (
            <li key={i} className="border-t border-sanits-sky/50 pt-4"><span className="font-display text-3xl text-sanits-sky">{i + 1}</span><p className="mt-2 text-sanits-paper/85">{t}</p></li>
          ))}
        </ol>
        <p className="mt-8 text-sanits-paper/85">Se não valer a pena, retiramos sem custo.</p>
        <a href="#assessoria" className="mt-6 inline-block rounded-lg bg-sanits-blue px-8 py-3 font-medium text-white transition-colors hover:bg-sanits-sky">Agendar teste</a>
      </Section>

      <Section id="economia" eyebrow="Simulador" title="Quanto o seu espaço pode economizar">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {[['Chuveiros com placa', s, setS, 1, 40, 1], ['Banhos por chuveiro por dia', b, setB, 5, 120, 5]].map(([label, v, set, min, max, step]) => (
            <label key={label as string} className="mb-4 block last:mb-0">
              <span className="flex justify-between"><span>{label as string}</span><b className="tabular-nums">{v as number}</b></span>
              <input type="range" className="w-full accent-sanits-blue" min={min as number} max={max as number} step={step as number} value={v as number} onChange={(e) => (set as (n: number) => void)(+e.target.value)} />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[[brl(inv), 'investimento'], [brl(mes), 'economia por mês'], [`${(inv / mes).toLocaleString('pt-BR', {maximumFractionDigits: 1})} meses`, 'retorno'], [brl(mes * 36 - inv), 'saldo em 3 anos']].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white p-6 shadow-sm"><b className="block font-display text-3xl font-medium tabular-nums text-sanits-blue">{v}</b><span className="text-sm text-sanits-navy/70">{l}</span></div>
          ))}
        </div>
        <p className="mt-4 text-sm text-sanits-navy/70">Estimativa. O teste de 1 mês mede o valor real.</p>
      </Section>

      <Section id="app" eyebrow="Aplicativo" title="Plena consciência do que você consome e do que você gasta">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <p className="max-w-md text-lg text-sanits-navy/75">O aplicativo acompanha cada chuveiro: litros do dia, gasto do mês e um aviso quando o consumo foge do padrão. Os valores ao lado são um exemplo de tela.</p>
          <div className="mx-auto w-64 rounded-[2.2rem] bg-sanits-navy p-3 shadow-xl">
            <div className="rounded-[1.6rem] bg-sanits-paper p-4">
              <p className="font-display text-sm">Sanits</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white p-3"><b className="block font-display text-xl text-sanits-blue">1.840 L</b><span className="text-xs">hoje</span></div>
                <div className="rounded-xl bg-white p-3"><b className="block font-display text-xl text-sanits-blue">R$ 612</b><span className="text-xs">no mês</span></div>
              </div>
              <div className="mt-3 flex h-24 items-end gap-2 rounded-xl bg-white p-3" role="img" aria-label="Consumo por chuveiro; o quarto está acima do padrão">
                {[55, 70, 48, 100, 62, 58].map((h, i) => <i key={i} className={`flex-1 rounded-t ${i === 3 ? 'bg-sanits-navy' : 'bg-sanits-sky'}`} style={{height: `${h}%`}} />)}
              </div>
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-sanits-navy p-3 text-xs text-sanits-paper"><AlertTriangle className="h-4 w-4 shrink-0 text-sanits-sky" aria-hidden="true" />Chuveiro 4 acima do padrão</p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="assessoria" eyebrow="Assessoria" title="Uma análise feita para o seu espaço">
        <div className="grid gap-10 md:grid-cols-2">
          <p className="max-w-md text-lg text-sanits-navy/75">Conte como é o seu vestiário. Desenhamos a demanda ponto a ponto e mostramos a economia esperada antes de qualquer instalação.</p>
          <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            {[['Nome', 'text'], ['Empresa', 'text'], ['Cidade', 'text'], ['Número de chuveiros', 'number'], ['Telefone', 'tel']].map(([l, t]) => <input key={l} className={field} type={t} placeholder={l} aria-label={l} required />)}
            <button className="rounded-lg bg-sanits-blue px-8 py-3 font-medium text-white transition-colors hover:bg-sanits-sky">Quero minha análise</button>
            {sent && <p role="status" className="text-sm">Página de demonstração: o formulário ainda não envia os dados.</p>}
          </form>
        </div>
      </Section>

      <footer className={`${PAD} bg-sanits-navy py-12 text-sanits-paper`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div><p className="font-display text-2xl font-semibold">Sanits</p><p className="mt-1 text-sanits-paper/75">Sanits. Economia consciente para o empreendedor.</p></div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">{NAV.map(([t, h]) => <a key={h} href={h} className="hover:text-sanits-sky">{t}</a>)}</div>
        </div>
      </footer>
    </>
  );
}
