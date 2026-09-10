# Laboratório de Plugins Nyxovira

O laboratório abre uma interface web local e testa um plugin ZIP contra uma obra e um capítulo reais. Ele não marca o plugin como válido apenas porque uma tarefa foi enfileirada.

## Abrir no Windows

Dê dois cliques em `iniciar-laboratorio.cmd` ou execute:

```powershell
npm install
npm run web
```

A interface abre em `http://127.0.0.1:4173/`. O servidor aceita somente conexões locais.

## Fluxo para uma IA

1. Crie o plugin e compacte `plugin.json` e os arquivos usados pelo manifesto.
2. Abra o laboratório.
3. Envie o ZIP e informe a URL real da obra.
4. Execute o diagnóstico e copie o JSON do relatório.
5. Corrija o plugin até receber `PLUGIN_VALID` sem etapas `FAIL`.

Uma automação também pode enviar o ZIP diretamente:

```text
POST http://127.0.0.1:4173/api/test?workUrl=https%3A%2F%2Fsite.example%2Fobra%2Fslug
Content-Type: application/zip

<bytes do ZIP>
```

## Limites e exclusão

- Um capítulo completo por execução.
- No máximo 24 páginas e 24 MiB de conteúdo do capítulo.
- ZIP de até 8 MiB, 128 entradas, 16 MiB expandido e 4 MiB por arquivo.
- Tempo máximo de 90 segundos.
- URLs locais, privadas, protocolos não HTTP e credenciais embutidas são bloqueados.
- Caminhos absolutos, `..` e links simbólicos no ZIP são rejeitados.
- O plugin e toda a saída são criados em uma pasta aleatória do diretório temporário.
- A resposta somente é enviada depois da tentativa de exclusão dessa pasta.
- Não são usados banco de dados, cookies persistentes, `localStorage` ou catálogo.

`temporaryFilesDeleted: true` e `sessionStored: false` confirmam a limpeza. Se a exclusão falhar, o resultado é alterado para `PLUGIN_INVALID`.

## Testador por linha de comando

O modo anterior continua disponível:

```powershell
node test-plugin.js ..\examples\simple-html https://site-autorizado.example/obra/slug
```

Use `--output`, `--chapter-id`, `--headed`, `--max-pages` e `--max-bytes` quando necessário. O modo de linha de comando mantém a saída solicitada; a exclusão automática pertence ao laboratório web.

## Verificação do próprio laboratório

```powershell
npm test
npm audit
```

O autoteste cria um site, um plugin e um ZIP descartáveis, envia o ZIP pela API web, exige `PLUGIN_VALID` e confirma que a sessão foi apagada.
