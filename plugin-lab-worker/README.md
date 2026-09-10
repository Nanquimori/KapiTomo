# Nyxovira Plugin Lab Worker

Backend hospedado do [Laboratório Web de Plugins](../nyxovira/plugin-api/tester/).

- Recebe somente ZIP de até 2 MiB e uma URL pública HTTP(S).
- Inspeciona caminhos, tamanhos, executáveis e APIs de exfiltração bloqueadas.
- Carrega a página e as APIs por um proxy HTTPS temporário; `download_target.js` é executado em um iframe isolado no navegador do próprio visitante.
- O navegador do próprio visitante executa o teste; o backend apenas valida, busca e retransmite dados temporários.
- Escolhe o primeiro capítulo automaticamente e limita quadrinhos a 24 páginas/24 MiB.
- Não possui KV, R2, D1 ou qualquer outro binding persistente.
- O Worker não conserva ZIP, manifesto, script ou conteúdo depois de responder.

O segredo `LAB_TOKEN_SECRET` assina sessões efêmeras de 15 minutos e impede que o proxy seja usado fora dos domínios declarados pelo plugin.

O endpoint público é `https://nyxovira-plugin-lab.nanquimori-kapitomo.workers.dev`.
