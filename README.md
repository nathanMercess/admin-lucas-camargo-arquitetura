# Admin Lucas Camargo Arquitetura

Painel administrativo Angular para edição, mídia, publicação e auditoria do conteúdo de Lucas Camargo Arquitetura.

## Projetos relacionados

- `../lucas-camargo-arquitetura`: site público e Worker de conteúdo.
- `../api-lucas-camargo-arquitetura`: API administrativa Fastify.

Este repositório não contém a API. Em desenvolvimento, `proxy.conf.json` encaminha `/api` para `http://127.0.0.1:8080`. Em produção, o painel e a API devem ser expostos na mesma origem, com roteamento de `/api/*` para o serviço da API, preservando IAP, CORS exato e proteção CSRF.

## Desenvolvimento

Inicie primeiro a API no projeto irmão e depois execute:

```powershell
yarn install --frozen-lockfile
yarn start
```

O painel abre em `http://localhost:4201`.

## Validação

```powershell
yarn run check
```

## Contrato de conteúdo

Os models e o fallback de `SiteConfigV1` ficam em `src/app/shared`. Eles são versionados neste repositório para que o painel compile e seja testado sem depender do checkout do site público. Alterações incompatíveis exigem uma nova versão do schema coordenada com o site e a API.

### Editor visual

O editor visual persiste seu estado no campo opcional `visualBuilder` do próprio `SiteConfigV1`; portanto, não cria um segundo fluxo de gravação nem contorna o versionamento do backend. O contrato esperado é:

```json
{
  "visualBuilder": {
    "enabled": true,
    "projectData": {},
    "html": "<main>...</main>",
    "css": ".classe { ... }"
  }
}
```

`projectData` é o documento editável do GrapesJS. Metadados exclusivos do admin — versão interna, nome da página e modelos pessoais — ficam na chave `__visualBuilderAdmin` desse objeto para preservar o contrato já aceito pela API e pelo app público. `html` e `css` são a projeção sanitizada usada nas prévias. A publicação continua enviando o `SiteConfigV1` completo pelo fluxo de releases existente, e a reversão continua usando o endpoint existente.

A superfície do editor é própria porque o PrimeNG não oferece um construtor visual de páginas. O PrimeNG continua responsável pelos controles, diálogos, seletores e feedbacks; o GrapesJS fornece apenas o motor de documento, seleção, camadas, arraste e histórico, carregado de forma lazy no módulo de conteúdo.

As regras obrigatórias de implementação estão em `BOAS-PRATICAS.md`.
