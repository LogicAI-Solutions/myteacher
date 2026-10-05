# Publicação, busca e segurança

`cd frontend && npm run build` gera a apresentação completa em `dist/index.html`,
usando o mesmo componente React da página. `dist/app.html` é a entrada das demais
rotas e tem `noindex`. `npm run check:seo` verifica os arquivos gerados.
Publique a pasta `dist` inteira com o `nginx.conf` deste projeto; o Docker de
produção já faz isso. Não abra o HTML gerado diretamente via `file://`.

O domínio usado é `https://myteacherapp.com.br`, conforme a configuração de
produção existente. Ao mudar de domínio, atualize index.html, App.tsx, robots.txt,
sitemap.xml e o teste. O sitemap lista somente a apresentação pública.
`noindex` não substitui autenticação: dados privados precisam continuar protegidos
pela autorização da API.

Depois de publicar:

- Configure HTTPS e o redirecionamento HTTP → HTTPS no proxy que termina o TLS.
  Configure HSTS nesse proxy depois de validar o certificado e todos os acessos;
  este Nginx interno escuta HTTP em 5273 e não gerencia certificados.
- Redirecione `www.myteacherapp.com.br` para `myteacherapp.com.br` no proxy externo.
- Verifique a propriedade no Google Search Console, envie `/sitemap.xml` e use a
  inspeção da URL inicial para solicitar indexação. Não há garantia de posição.
- Confira os cabeçalhos na URL pública, inclusive em arquivos CSS/JS e erros.
  A CSP permite API apenas na mesma origem (`/api`); outro domínio de API exige
  revisão explícita de `connect-src`. Estilos inline são necessários para React/MUI.
- Valide login, Google OAuth, planos, checkout, portal e imagens após publicar.
- Use senhas fortes e únicas no banco e no pgAdmin, sem os valores padrão do
  Compose, e uma SECRET_KEY aleatória. Mantenha `.env` fora do Git e do diretório
  público. A porta de pgAdmin agora só é exposta no localhost do servidor.
- Mantenha dependências e servidor atualizados, backups testados e MFA nas contas
  de hospedagem/domínio. Os cabeçalhos adicionados não são uma auditoria da API,
  das permissões dos usuários, dos pagamentos ou da infraestrutura.

Referências: [Google: SEO com JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
e [OWASP: cabeçalhos HTTP](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).
