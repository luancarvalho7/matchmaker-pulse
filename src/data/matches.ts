export type Match = {
  rank: number;
  companyName: string;
  booth: string;
  match: number;
  why: string;
  connectionTips: string[];
};

export const matches: Match[] = [
  {
    rank: 1,
    companyName: "TOTVS",
    booth: "N001",
    match: 8.9,
    why: "Empresa de software com forte público corporativo e base grande de relacionamento, o que favorece abordagem de educação financeira e conteúdo executivo para clientes e colaboradores.",
    connectionTips: [
      "Propor palestra curta sobre saúde financeira e produtividade para times e canais de clientes.",
      "Oferecer uma ação conjunta de educação financeira para colaboradores ou comunidade de parceiros.",
      "Conectar a proposta ao uso de dados e tomada de decisão, tema alinhado ao posicionamento de software e gestão.",
    ],
  },
  {
    rank: 2,
    companyName: "Soluções Digitais by Informa Markets",
    booth: "A103",
    match: 8.6,
    why: "É um hub de networking e conteúdo, com alta chance de abrir espaço para ativações, palestras e parcerias de visibilidade para uma empresa de educação financeira.",
    connectionTips: [
      "Perguntar sobre oportunidades de conteúdo no evento e programas de parceiros.",
      "Propor uma trilha de educação financeira para visitantes e expositores.",
      "Oferecer formato de workshop rápido com aplicação prática e captura de leads.",
    ],
  },
  {
    rank: 3,
    companyName: "Demonstrador Indústria 4.0",
    booth: "H004",
    match: 8.2,
    why: "Ambiente de demonstração e inovação, bom para conectar educação financeira com tecnologia, produtividade e decisões mais conscientes.",
    connectionTips: [
      "Abordar com uma proposta de conteúdo sobre decisões financeiras mais eficientes para empresários e gestores.",
      "Oferecer uma microtalk sobre organização financeira aplicada ao crescimento do negócio.",
      "Sugerir uma ação educativa com foco em planejamento, margem e investimento.",
    ],
  },
  {
    rank: 4,
    companyName: "ABIMAQ",
    booth: "H004",
    match: 8.1,
    why: "Entidade setorial com forte capacidade de articulação, networking e agenda de conteúdo, ideal para parcerias de educação empresarial e financeira.",
    connectionTips: [
      "Apresentar a empresa como parceira de conteúdo para associados e eventos regionais.",
      "Propor palestra sobre finanças pessoais e empresariais para industriais e empreendedores.",
      "Buscar indicação para contato com empresas interessadas em bem-estar financeiro dos colaboradores.",
    ],
  },
  {
    rank: 5,
    companyName: "FINEP",
    booth: "H004",
    match: 7.9,
    why: "Instituição associada a inovação e desenvolvimento, com aderência a conteúdos sobre planejamento financeiro, investimento e apoio ao crescimento de negócios.",
    connectionTips: [
      "Conectar a proposta a educação para empreendedores e empresas em crescimento.",
      "Oferecer conteúdo sobre capital, caixa e decisão de investimento.",
      "Perguntar sobre programas ou iniciativas de capacitação para o ecossistema.",
    ],
  },
  {
    rank: 6,
    companyName: "Embaixada dos E.U.A. - U.S. Comercial Service",
    booth: "L010",
    match: 7.7,
    why: "Articulador de negócios e networking internacional, pode ser porta de entrada para ações de educação financeira voltadas a empreendedorismo e expansão.",
    connectionTips: [
      "Abordar como iniciativa educativa para empresários e pequenos negócios.",
      "Propor conteúdo sobre gestão de risco, disciplina e decisão financeira.",
      "Buscar conexão com programas de capacitação e relacionamento internacional.",
    ],
  },
  {
    rank: 7,
    companyName: "ITA - ITALIAN TRADE AGENCY",
    booth: "A130",
    match: 7.6,
    why: "Entidade promotora de negócios e relacionamento internacional, boa para parcerias de conteúdo e networking com perfil empresarial.",
    connectionTips: [
      "Oferecer palestra sobre finanças e crescimento sustentável de empresas.",
      "Conectar a proposta com capacitação de empreendedores e executivos.",
      "Perguntar sobre agendas de eventos e espaços de conteúdo para parceiros.",
    ],
  },
  {
    rank: 8,
    companyName: "BMWE Infostand",
    booth: "F128i",
    match: 7.4,
    why: "Espaço de articulação e informação do ecossistema industrial, com potencial para abrir conversas sobre educação financeira para líderes e empreendedores.",
    connectionTips: [
      "Propor conteúdo curto e prático sobre saúde financeira e tomada de decisão.",
      "Oferecer uma ação educativa para público visitante e expositores.",
      "Explorar possibilidade de divulgação em canais de conteúdo do ecossistema.",
    ],
  },
  {
    rank: 9,
    companyName: "ABINFER",
    booth: "F190",
    match: 7.2,
    why: "Entidade setorial com foco em networking e capacitação, boa para abordar educação financeira voltada a gestores e empresários da indústria.",
    connectionTips: [
      "Apresentar a empresa como parceira de formação e bem-estar financeiro.",
      "Propor talk sobre organização financeira para empresas e profissionais.",
      "Perguntar sobre abertura para conteúdo patrocinado ou workshops.",
    ],
  },
  {
    rank: 10,
    companyName: "ABS",
    booth: "E206",
    match: 7,
    why: "Entidade ligada a treinamentos e disseminação de conhecimento, o que pode favorecer proposta de educação financeira como tema complementar para profissionais e empresas.",
    connectionTips: [
      "Conectar a abordagem a treinamento prático e aplicável.",
      "Propor palestra sobre disciplina financeira e gestão de risco.",
      "Buscar espaço em agendas de capacitação e eventos técnicos.",
    ],
  },
  {
    rank: 11,
    companyName: "ABICOR BINZEL",
    booth: "C162",
    match: 6.8,
    why: "Empresa industrial com potencial de relacionamento com clientes B2B e times técnicos, útil para propostas de educação financeira corporativa e para colaboradores.",
    connectionTips: [
      "Falar com foco em programa de educação financeira para equipe.",
      "Propor conteúdo sobre planejamento financeiro para profissionais da indústria.",
      "Abordar a relação entre produtividade, disciplina e decisões financeiras.",
    ],
  },
  {
    rank: 12,
    companyName: "Fronius",
    booth: "B150",
    match: 6.7,
    why: "Marca industrial forte e com perfil de relacionamento técnico, interessante para iniciativas de conteúdo e programas de educação financeira para colaboradores e parceiros.",
    connectionTips: [
      "Oferecer workshop para colaboradores sobre organização financeira pessoal.",
      "Propor conteúdo executivo sobre fluxo de caixa e decisões de investimento.",
      "Explorar ações de valor agregado para canais e parceiros.",
    ],
  },
  {
    rank: 13,
    companyName: "Lincoln Electric",
    booth: "F090",
    match: 6.6,
    why: "Empresa com grande base industrial e comercial, boa para programas de educação financeira interna ou para clientes por meio de conteúdo de valor.",
    connectionTips: [
      "Apresentar uma proposta de palestra para times comerciais e operacionais.",
      "Conectar finanças pessoais com metas e performance no trabalho.",
      "Oferecer um formato enxuto de workshop presencial no evento.",
    ],
  },
  {
    rank: 14,
    companyName: "ESAB",
    booth: "C100",
    match: 6.6,
    why: "Empresa de grande porte, com potencial para iniciativas de RH, desenvolvimento e relacionamento, o que favorece educação financeira como benefício ou conteúdo.",
    connectionTips: [
      "Abordar como programa de bem-estar financeiro para colaboradores.",
      "Propor conteúdo sobre inteligência financeira aplicada à vida real.",
      "Perguntar sobre áreas de RH, treinamento ou comunicação interna.",
    ],
  },
  {
    rank: 15,
    companyName: "WEG",
    booth: "H018",
    match: 6.5,
    why: "Empresa de grande porte e forte cultura industrial, com potencial para ações de educação financeira em programas internos, comunicação e relacionamento.",
    connectionTips: [
      "Levar uma proposta clara de workshop para colaboradores.",
      "Conectar educação financeira com metas, disciplina e longo prazo.",
      "Sugerir formato piloto com baixo esforço de implementação.",
    ],
  },
  {
    rank: 16,
    companyName: "Siemens",
    booth: "E078",
    match: 6.4,
    why: "Corporação com ambiente propício a iniciativas de desenvolvimento e bem-estar, em que educação financeira pode ser apresentada como valor para times e comunidade.",
    connectionTips: [
      "Abordar a proposta como programa de educação e bem-estar financeiro.",
      "Oferecer conteúdo para líderes, colaboradores ou trainees.",
      "Propor parceria em ação educativa com linguagem executiva e objetiva.",
    ],
  },
  {
    rank: 17,
    companyName: "ABB Robotics",
    booth: "E136",
    match: 6.3,
    why: "Marca global com grande interesse em inovação e relacionamento técnico; pode haver abertura para conteúdo corporativo sobre finanças e produtividade pessoal.",
    connectionTips: [
      "Apresentar a solução como conteúdo para equipes e parceiros.",
      "Propor workshop curto sobre finanças pessoais e metas.",
      "Relacionar disciplina financeira com performance e tomada de decisão.",
    ],
  },
  {
    rank: 18,
    companyName: "Fanuc",
    booth: "A050",
    match: 6.2,
    why: "Empresa de referência industrial, boa para explorar iniciativas com foco em educação financeira para colaboradores, canais ou comunidade do setor.",
    connectionTips: [
      "Oferecer um piloto de palestra ou workshop presencial.",
      "Falar em planejamento financeiro como ferramenta de estabilidade.",
      "Buscar contato com marketing, RH ou treinamento.",
    ],
  },
  {
    rank: 19,
    companyName: "Yaskawa",
    booth: "K010",
    match: 6.1,
    why: "Empresa industrial com perfil corporativo e presença em automação, o que permite abordar educação financeira como conteúdo de desenvolvimento humano e produtividade.",
    connectionTips: [
      "Propor conteúdo para colaboradores e líderes.",
      "Conectar educação financeira com organização, foco e constância.",
      "Apresentar uma iniciativa rápida, prática e de baixo atrito.",
    ],
  },
  {
    rank: 20,
    companyName: "Omron",
    booth: "A110",
    match: 6,
    why: "Empresa com forte presença em automação e transformação digital, podendo se interessar por conteúdos de educação financeira ligados a performance, disciplina e tomada de decisão.",
    connectionTips: [
      "Propor palestra objetiva para público interno ou parceiros.",
      "Relacionar finanças pessoais com comportamento e metas.",
      "Levar uma oferta de workshop com aplicação prática e linguagem simples.",
    ],
  },
];

export const bestMatch = matches[0];
export const featuredMatches = matches.slice(0, 3);
export const averageMatch = Number(
  (matches.reduce((total, item) => total + item.match, 0) / matches.length).toFixed(1),
);