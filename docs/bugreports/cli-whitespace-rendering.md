Title: CLI renderer collapses spaces and strips special whitespace in Russian text

Summary
- In the Codex CLI interactive chat, Russian text that contains a mix of regular spaces and special whitespace (NBSP U+00A0, thin spaces U+202F, figure U+2007, etc.) and/or zero‑width characters (U+200B/FEFF) is displayed with missing or collapsed spaces. The source text and clipboard contain correct spaces; the issue appears only in the CLI renderer layer.

Environment
- App: codex-cli 0.27.0
- OS: Windows (PowerShell / Windows Terminal)
- Reproducible with Russian voice input and regular pasted text

Minimal Repro
1) Paste or send this exact string (note the literal sequences of code points shown):

```
Снимок\u00A0экрана 2025-08-31 120334
```

2) Or use a local file path with spaces to observe rendering differences:

```
"F:\\Users\\localadm\\Downloads\\Снимок\u00A0экрана 2025-08-31 120334.jpg"
```

Observed
- In the chat view, some spaces are removed or collapsed; visual output shows words glued together.
- Copying the same text into Notepad or another terminal preserves spaces.

Expected
- CLI should preserve visible whitespace in message bodies (including regular U+0020 and NBSP U+00A0) and should not drop zero-width characters unless explicitly requested.
- Repeated spaces should not be collapsed in rendered view unless a specific “normalize” mode is enabled.

Notes
- Internal tests show the clipboard and input contain correct spaces; only the chat renderer collapses/normalizes. This points to the output layer (Markdown/HTML/VT rendering) rather than input.

Suggested Fixes
- Render message bodies with a whitespace-preserving mode (equivalent to CSS `white-space: pre-wrap`).
- Avoid replacing NBSP/thin/figure spaces or stripping U+200B/FEFF during sanitization, or make that behavior opt-in.
- Optionally add a `--plain/--raw/--no-markup` flag to disable all formatting/normalization for debugging and exact text review.

Attachments
- Screenshot path (local): F:\\Users\\localadm\\Downloads\\Снимокэкрана 2025-08-31 120334.jpg

