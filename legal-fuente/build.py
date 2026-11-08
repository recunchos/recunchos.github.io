#!/usr/bin/env python3
"""Regenera el cuerpo público de los seis textos desde la fuente v2.1.5.

No traduce. El cuerpo queda en castellano, que es el maestro aprobado.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(__file__).resolve().parent / "v2.1.5"
OUT = {
    "aviso-legal.md": ROOT / "aviso-legal.html",
    "privacidad.md": ROOT / "privacidad.html",
    "cookies.md": ROOT / "cookies.html",
    "condiciones-de-uso.md": ROOT / "terminos.html",
    "declaracion-responsable.md": ROOT / "declaracion-responsable.html",
    "consentimiento-registro.md": ROOT / "consentimiento-registro.html",
}
TITLES = {
    "aviso-legal.md": "Aviso legal · Recunchos",
    "privacidad.md": "Política de privacidad · Recunchos",
    "cookies.md": "Política de cookies · Recunchos",
    "condiciones-de-uso.md": "Condiciones de uso · Recunchos",
    "declaracion-responsable.md": "Declaración responsable · Recunchos",
    "consentimiento-registro.md": "Consentimiento en el registro · Recunchos",
}
NOTICE_GL = (
    "Texto legal aprobado en castelán, versión v2.1.5, do 1 de novembro de 2026. "
    "É o mesmo contido en todos os idiomas da interface. Non hai tradución revisada: "
    "o que les aquí é o texto mestre en castelán."
)


def inline(text: str) -> str:
    escaped = html.escape(text, quote=False)

    def bold(match: re.Match[str]) -> str:
        return "<strong>" + match.group(1) + "</strong>"

    escaped = re.sub(r"\*\*(.+?)\*\*", bold, escaped)

    def link(match: re.Match[str]) -> str:
        raw = match.group(0)
        trail = ""
        while raw and raw[-1] in ".,);:":
            trail = raw[-1] + trail
            raw = raw[:-1]
        if "@" in raw:
            href = "mailto:" + raw
        elif raw.startswith("http://") or raw.startswith("https://"):
            href = raw
        else:
            href = "https://" + raw
        return f'<a href="{html.escape(href, quote=True)}">{raw}</a>{trail}'

    return re.sub(
        r"(?:https?://|www\.)[^\s<]+|[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}",
        link,
        escaped,
    )


def markdown_to_html(md: str) -> str:
    lines = md.replace("\r\n", "\n").strip("\n").split("\n")
    blocks: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("# "):
            blocks.append(f"<h1>{inline(line[2:].strip())}</h1>")
            i += 1
            continue
        if line.startswith("## "):
            blocks.append(f"<h2>{inline(line[3:].strip())}</h2>")
            i += 1
            continue
        if line.startswith("|"):
            rows: list[list[str]] = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
                    rows.append(cells)
                i += 1
            head, body = rows[0], rows[1:]
            thead = "<thead><tr>" + "".join(f"<th>{inline(cell)}</th>" for cell in head) + "</tr></thead>"
            tbody = "<tbody>" + "".join(
                "<tr>" + "".join(f"<td>{inline(cell)}</td>" for cell in row) + "</tr>" for row in body
            ) + "</tbody>"
            blocks.append(f"<table>{thead}{tbody}</table>")
            continue
        if line.startswith("- "):
            items: list[str] = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline(lines[i][2:].strip())}</li>")
                i += 1
            blocks.append("<ul>" + "".join(items) + "</ul>")
            continue
        para = [line.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].startswith(("#", "|", "- ")):
            para.append(lines[i].strip())
            i += 1
        blocks.append(f"<p>{inline(' '.join(para))}</p>")

    html_parts: list[str] = []
    section: list[str] = []

    def flush() -> None:
        if section:
            html_parts.append("<section>" + "".join(section) + "</section>")
            section.clear()

    for block in blocks:
        if block.startswith("<h2>"):
            flush()
            section.append(block)
        elif section:
            section.append(block)
        else:
            html_parts.append(block)
    flush()
    return "".join(html_parts)


SHELL = """<!doctype html>
<html lang="gl" data-legal-version="v2.1.5" data-legal-lang="es">
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self' https://fwfwfbtzarmwalfaxelh.supabase.co">
<script src="/frame-guard.js"></script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/img/favicon-512.png" sizes="512x512">
<link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png">
<title>{title}</title>
<link rel="stylesheet" href="/idioma.css">
<style>
  body {{ margin: 0; background: #F3F8FA; color: #13293D; font: 18px/1.5 Georgia, "Iowan Old Style", serif; }}
  main {{ max-width: 42rem; margin: 0 auto; padding: 1rem 1.25rem 4rem; }}
  h1 {{ font-weight: 600; font-size: 2rem; line-height: 1.15; margin: 0.4rem 0 0.2rem; }}
  h2 {{ font-size: 1.15rem; margin: 1.6rem 0 0.4rem; }}
  p {{ margin: 0.55rem 0; }}
  ul {{ padding-left: 1.2rem; }}
  li {{ margin: 0.35rem 0; }}
  table {{ width: 100%; border-collapse: collapse; font: 15px/1.4 system-ui, sans-serif; margin: 0.8rem 0; }}
  th, td {{ border: 1px solid #D3E1EA; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }}
  th {{ background: #E5F1F8; }}
  a {{ color: #1F5F8B; }}
  .brandmark {{ margin: 0 0 1rem; }}
  .brandmark img {{ display:block; width:min(208px, 100%); max-width:100%; height:auto; aspect-ratio:4 / 1; object-fit:contain; }}
  footer {{ margin-top: 2rem; font: 15px/1.45 system-ui, sans-serif; color: #4A6075; }}
  footer a.site-legal {{ color: #4A6075; font-size: .85rem; }}
</style>
<body>
<a class="skip" href="#contenido" data-i18n="skip">Saltar ao contido</a>
<header class="legal-bar">
  <a class="legal-bar__brand" href="/">Recunchos</a>
  <div data-lang-slot></div>
  <a href="/legal.html" data-i18n="nav.legal">Legal</a>
  <a href="/eliminar-cuenta.html" data-i18n="footer.delete">Eliminar conta</a>
</header>
<main id="contenido">
  <p class="brandmark"><img src="/img/logo-horizontal.png" width="208" height="52" alt="Recunchos"></p>
  <p class="legal-notice" data-i18n="legal.notice" role="note">{notice}</p>
  <div class="legal-master" data-legal-master lang="es">
    {body}
  </div>
  <footer>
    <p><a class="site-legal" href="/legal.html" data-i18n="nav.legal">Legal</a> · <a class="site-legal" href="/eliminar-cuenta.html" data-i18n="footer.delete">Eliminar conta</a></p>
    <p class="legal-master" data-legal-master lang="es">Contacto: <a href="mailto:holarecunchos@hotmail.com">holarecunchos@hotmail.com</a>. Fecha de publicación: 1 de noviembre de 2026.</p>
  </footer>
</main>
<script src="/i18n.js"></script>
<script src="/idioma.js"></script>
</body>
</html>
"""


def main() -> None:
    for name, dest in OUT.items():
        body = markdown_to_html((SRC / name).read_text(encoding="utf-8"))
        dest.write_text(
            SHELL.format(title=html.escape(TITLES[name]), notice=html.escape(NOTICE_GL), body=body),
            encoding="utf-8",
        )
        print(dest.name, dest.stat().st_size)


if __name__ == "__main__":
    main()
