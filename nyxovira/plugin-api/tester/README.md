# nyxovira-plugin-test

The official conformance tester exercises one real work and one real chapter. It does not mark a plugin valid merely because a request was queued.

```bash
npm install
node test-plugin.js ../examples/simple-html https://your-authorized-source.invalid/work/slug
```

Use a real URL supported by the plugin, not the reserved example URL. Results are written to `test-output/` by default:

- `work.json`
- `chapter-plan.json`
- `chapter-001/chapter.json` for a novel, or every downloaded page for image content
- `report.json`

Exit code `0` and `PLUGIN_VALID` mean that the tester resolved a work, preserved the exact selected chapter ID, resolved content, downloaded or serialized the complete selected chapter, saved every output, and reopened the saved files. Network, login, access, HTTP, decryption, parser, or empty-output failures return `PLUGIN_INVALID` and a nonzero exit code.

Options: `--output <directory>`, `--chapter-id <exact-id>`, and `--headed`.
