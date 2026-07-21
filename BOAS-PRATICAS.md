# Boas práticas obrigatórias

Este arquivo é a fonte de verdade para implementação, revisão e manutenção deste projeto. Todas as alterações devem seguir estas regras. Antes de começar uma tarefa, este documento deve ser lido integralmente.

## 1. Organização e models

- Organizar o código por feature e por responsabilidade.
- Manter componentes focados em apresentação e interação.
- Manter estado compartilhado, comunicação HTTP e persistência em services.
- Colocar em `src/app/shared/models` os models compartilhados entre as features do painel e os contratos de conteúdo enviados à API.
- Manter models exclusivos de uma única feature dentro da própria feature.
- Manter somente uma interface, type, enum ou classe de model por arquivo.
- Usar arquivos e pastas em `kebab-case`.
- Não criar arquivos agregadores ou `barrel files` sem uma API pública realmente necessária.
- Não criar pastas preventivamente; cada pasta deve possuir uso real no escopo atual.

## 2. Formatação padrão Visual Studio

- Usar UTF-8, espaços e indentação de 2 espaços.
- Usar aspas simples e ponto e vírgula em TypeScript.
- Manter uma linha em branco entre grupos lógicos.
- Não usar o formato de um atributo HTML por linha.
- Manter na primeira linha do elemento quantos atributos forem legíveis.
- Quando for necessário quebrar a abertura de um elemento, indentar a continuação em 2 espaços.
- Manter `>` ou `/>` na mesma linha do último atributo; nunca deixar o fechamento da abertura isolado em uma linha.
- O EditorConfig e este guia são as fontes de verdade da formatação. O projeto não utiliza Prettier.

Exemplo obrigatório de template:

```html
<div class="public-site-about-portrait" role="img" aria-label="Espaço reservado para a foto de Lucas Camargo"
  i18n-aria-label>
  <span class="public-site-about-portrait-line" aria-hidden="true"></span>
  <span i18n>Foto de perfil</span>
</div>
```

## 3. Condições

- Usar guard clauses para pré-condições.
- Quando um `if` possuir uma única instrução, não usar chaves e colocar a instrução na linha seguinte, com mais 2 espaços de indentação.
- Nunca colocar a instrução de um `if` na mesma linha da condição.
- Usar chaves quando o bloco possuir mais de uma instrução.

Exemplo obrigatório:

```ts
if (this.isAutoRotationPaused() || this.isPointerInteractionPaused())
  return;
```

## 4. Angular

- Usar NgModules conforme a arquitetura atual do projeto.
- Usar seletor com prefixo `app`, template e SCSS externos e `ChangeDetectionStrategy.OnPush`.
- Preferir `input`, `output` e `model` baseados em signals em código novo.
- Usar `signal` para estado e `computed` somente para valores realmente derivados e consumidos.
- Atualizar arrays e objetos imutavelmente.
- Usar `@if`, `@for` com `track` estável e `@switch` nos templates.
- Marcar textos visíveis e estáticos com `i18n` e atributos traduzíveis com seus marcadores correspondentes.
- Não colocar URLs, comunicação HTTP ou persistência em componentes.
- Em operações HTTP de resposta única, usar `take(1)` e finalizar loading com `finalize`.

## 5. PrimeNG

- Antes de criar qualquer controle de interface, consultar a documentação oficial do PrimeNG.
- Usar o componente PrimeNG quando ele atender aos requisitos funcionais, visuais e de acessibilidade.
- Uma implementação própria exige uma limitação objetiva do PrimeNG documentada junto da feature.
- Importar somente o módulo PrimeNG realmente consumido pela feature.
- Não criar um módulo global que importe toda a biblioteca.
- Usar PrimeNG em modo `unstyled` ou com tokens compatíveis com a marca para preservar integralmente o brand kit.
- O acordeão horizontal do portfólio continua próprio porque o Accordion do PrimeNG não reproduz a interação horizontal exigida pela referência visual.

## 6. Qualidade e limpeza

- Não manter código morto, imports ou exports sem consumidor, dependências sem uso, configurações obsoletas ou placeholders vazios.
- Preservar assets oficiais da marca mesmo quando seu uso estiver planejado para uma etapa posterior.
- Criar abstrações e classes-base somente quando houver repetição real.
- Manter requests, responses e conteúdos serializados tipados.
- Criar testes para services, regras derivadas, componentes interativos e fluxos críticos.
- Usar exclusivamente Yarn como gerenciador de pacotes; não adicionar lockfiles ou comandos de npm e pnpm.
- Antes de concluir uma alteração, executar `yarn lint`, `yarn test` e `yarn build` ou `yarn run check`.

## 7. Identidade visual

- Seguir fielmente o brand kit e as referências do `SITE.pdf`.
- Usar a paleta, tipografia, proporções e versões aprovadas do logo.
- Não inclinar, reorganizar, contornar ou recolorir a marca fora das versões aprovadas.
- Usar imagens com cantos de 90 graus e evitar sombras ou bordas decorativas não previstas.
- Não usar emojis ou caracteres Unicode como ícones de interface. Usar PrimeIcons quando compatível ou ícones em CSS/SVG coerentes com a identidade visual.
- Validar toda alteração visual nas larguras de 320, 375, 390 e 430 pixels, sem rolagem horizontal, recortes ou sobreposições, incluindo as áreas seguras do iOS.
- Respeitar `prefers-reduced-motion` em animações e transições.
- Não substituir projetos, obras ou fotografias reais por trabalhos fictícios.

## 8. Conteúdo dinâmico e administração

- Tratar `SiteConfigV1` como contrato único entre site público, painel, API e armazenamento.
- Manter textos editoriais, mídias, SEO, navegação, ordem, visibilidade, tema permitido, categorias, projetos e galerias administráveis em runtime; não espalhar esse conteúdo como constantes em componentes.
- Usar a configuração local somente como fallback seguro e como bootstrap do primeiro rascunho.
- Versionar qualquer alteração incompatível do schema e preservar leitura segura de publicações anteriores.
- Não permitir HTML, CSS ou JavaScript arbitrários no conteúdo administrável.
- Validar o documento completo e suas relações tanto no frontend quanto na API antes de publicar.
- Exigir ETag em alterações de rascunho, publicação e rollback para impedir sobrescrita concorrente silenciosa.
- Registrar toda mutação administrativa com ator, ação, recurso, request ID, resultado e hashes ou ETags relevantes, sem registrar tokens ou o conteúdo integral.
- Manter buckets privados; credenciais R2 pertencem exclusivamente à API e nunca podem chegar ao Angular, ao Git ou aos logs.
- Proteger o painel e a API com IAP, autorização no backend, origem exata e defesa CSRF. Ocultar um controle na interface não substitui a autorização da API.
- Publicar releases e mídias em chaves imutáveis e trocar somente o manifest por escrita condicional, mantendo rollback verificável.
- Uma nova variação de conteúdo deve reutilizar o catálogo tipado existente quando possível. Um comportamento visual realmente novo exige implementação, teste e revisão de código.
