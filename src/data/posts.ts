export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
  source: { name: string; url: string };
  cover: string;
  opinion: string;
  body: string[];
  featured?: boolean;
};

export const posts: Post[] = [
  {
    slug: "selic-pressao-fiscal-decisao-copom",
    title: "Copom mantém Selic em alta: o que isso significa para a sua carteira",
    excerpt:
      "Banco Central sinaliza juros restritivos por mais tempo diante da pressão fiscal. Veja o impacto nas classes de ativos e o que ajustar agora.",
    category: "Política Monetária",
    date: "2026-05-06",
    readingTime: "6 min",
    source: { name: "Valor Econômico", url: "https://valor.globo.com" },
    cover:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1600&q=80",
    opinion:
      "O recado do Copom é direto: enquanto não houver convergência fiscal crível, a curva longa não cede. Para quem investe pensando em 5–10 anos, faz sentido travar prêmios reais elevados em NTN-B intermediárias e evitar duration excessiva. Bolsa segue como oportunidade tática, não estrutural.",
    body: [
      "A decisão veio como o mercado precificava, mas o tom do comunicado endureceu novamente. O Banco Central reforçou que o cenário fiscal continua sendo o principal vetor de risco para a desinflação.",
      "Na prática, isso significa que ativos prefixados curtos seguem atrativos, mas exigem cautela na ponta longa. O investidor de longo prazo encontra hoje uma janela rara de juros reais elevados em títulos atrelados à inflação.",
      "Para a renda variável, a leitura é mista: setores ligados a consumo doméstico devem permanecer pressionados, enquanto exportadoras e dividendeiras de qualidade tendem a oferecer melhor relação risco/retorno.",
    ],
    featured: true,
  },
  {
    slug: "dolar-acima-de-6-cenario-externo",
    title: "Dólar volta a flertar com R$ 6: o que está por trás do movimento",
    excerpt:
      "Combinação de Treasuries em alta, prêmio de risco doméstico e fluxo cambial negativo explica o repique recente. Estratégias de proteção em foco.",
    category: "Câmbio",
    date: "2026-05-05",
    readingTime: "5 min",
    source: { name: "Bloomberg Línea", url: "https://www.bloomberglinea.com" },
    cover:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1600&q=80",
    opinion:
      "Não é hora de zerar exposição internacional — é hora de tê-la com método. Carteiras bem montadas já deveriam ter entre 15% e 25% em ativos dolarizados. Quem ainda não tem, deve construir essa posição gradualmente, sem tentar acertar o timing perfeito.",
    body: [
      "O movimento de alta do dólar combina dois vetores: a reprecificação dos juros americanos e a percepção de risco fiscal doméstico que volta a piorar.",
      "Investidores institucionais têm reduzido posição comprada em real, e o fluxo cambial acumulado no ano já é negativo em mais de US$ 10 bilhões.",
      "Diversificação geográfica deixou de ser luxo: é parte estrutural de qualquer carteira pensada para preservar poder de compra.",
    ],
  },
  {
    slug: "ipca-surpresa-baixista-servicos",
    title: "IPCA surpreende para baixo, mas serviços ainda preocupam",
    excerpt:
      "Inflação corrente desacelera, mas núcleo de serviços resiste. Entenda o que isso muda no balanço de riscos do BC.",
    category: "Inflação",
    date: "2026-05-04",
    readingTime: "4 min",
    source: { name: "Folha de S.Paulo", url: "https://www.folha.uol.com.br" },
    cover:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
    opinion:
      "A surpresa baixista é bem-vinda, mas não muda o jogo. Enquanto serviços rodarem acima de 5%, a meta de inflação segue distante. Para o investidor: nada de euforia com prefixados longos.",
    body: [
      "O índice cheio veio abaixo do consenso, puxado por alimentos e bens industriais. Mas o núcleo, métrica que o Banco Central acompanha de perto, ainda mostra resistência.",
      "Serviços subjacentes, em especial, seguem rodando em patamar incompatível com a meta.",
      "Conclusão prática: ainda é cedo para apostar em corte de juros no curto prazo.",
    ],
  },
  {
    slug: "bolsa-americana-resultados-tecnologia",
    title: "Big techs entregam resultados sólidos e sustentam o S&P 500",
    excerpt:
      "Temporada de balanços nos EUA reforça resiliência das empresas de tecnologia. Reflexos para o investidor brasileiro com exposição global.",
    category: "Mercado Global",
    date: "2026-05-03",
    readingTime: "5 min",
    source: { name: "Financial Times", url: "https://www.ft.com" },
    cover:
      "https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=1600&q=80",
    opinion:
      "Concentração no S&P 500 é fato, não opinião. Por isso defendo combinar exposição ao índice com fatores de qualidade e dividendos globais — equilíbrio é o que sustenta retornos no longo prazo.",
    body: [
      "Os balanços do trimestre confirmaram a tese de que a inteligência artificial deixou de ser narrativa e virou linha de receita.",
      "Margens operacionais seguem em patamares historicamente altos, sustentando múltiplos esticados.",
      "Para quem investe via ETFs globais, o recado é manter disciplina: aportes regulares, sem tentar vencer o índice.",
    ],
  },
  {
    slug: "reforma-tributaria-impacto-investidor",
    title: "Reforma tributária: o que muda na tributação de investimentos",
    excerpt:
      "Texto em discussão no Congresso pode redesenhar tributação de fundos, dividendos e ativos isentos. Pontos de atenção para a carteira.",
    category: "Regulação",
    date: "2026-05-02",
    readingTime: "7 min",
    source: { name: "Estadão", url: "https://www.estadao.com.br" },
    cover:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
    opinion:
      "Reformas tributárias mudam o jogo, mas raramente do dia para a noite. O movimento certo agora é mapear exposição a ativos isentos e simular cenários — não reagir no susto.",
    body: [
      "O projeto em discussão prevê mudanças relevantes na tributação de fundos exclusivos e ativos hoje isentos como LCIs e LCAs.",
      "A proposta cria também um regime de tributação de dividendos que, se aprovado, altera a equação de retorno de carteiras de renda variável.",
      "Recomendo revisar a alocação com calma e simular o impacto líquido por classe antes de qualquer movimento brusco.",
    ],
  },
  {
    slug: "renda-fixa-credito-privado-momento",
    title: "Crédito privado: spreads ainda compensam o risco?",
    excerpt:
      "Após o ciclo de fechamento de spreads, a relação risco-retorno em debêntures e CRIs exige seletividade redobrada.",
    category: "Renda Fixa",
    date: "2026-05-01",
    readingTime: "6 min",
    source: { name: "InfoMoney", url: "https://www.infomoney.com.br" },
    cover:
      "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1600&q=80",
    opinion:
      "Crédito privado não é commodity. A diferença entre escolher bem e escolher mal pode comer dois ou três pontos de retorno por ano. Diligência sobre o emissor e prazos compatíveis com o perfil são inegociáveis.",
    body: [
      "Os spreads de crédito de alta qualidade voltaram a níveis comprimidos, exigindo critério para selecionar emissores.",
      "Fundos de crédito high yield voltaram a oferecer prêmios interessantes, mas com risco de liquidez relevante.",
      "A pergunta correta não é 'crédito sim ou não', mas sim 'qual crédito, em qual prazo, em qual veículo'.",
    ],
  },
];

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
