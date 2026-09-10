# Nyxovira Plugin Lab Worker

Backend hospedado do [Laboratório Web de Plugins](../nyxovira/plugin-api/tester/).

- Recebe somente ZIP de até 2 MiB e uma URL pública HTTP(S).
- Inspeciona caminhos, tamanhos, executáveis e APIs de exfiltração bloqueadas.
- Executa `download_target.js` em uma sessão isolada do Cloudflare Browser Run.
- Escolhe o primeiro capítulo automaticamente e limita quadrinhos a 24 páginas/24 MiB.
- Não possui KV, R2, D1 ou qualquer outro binding persistente.
- Fecha o navegador e libera ZIP, manifesto, script e conteúdo antes de responder.

O endpoint público é `https://nyxovira-plugin-lab.nanquimori-kapitomo.workers.dev`.
