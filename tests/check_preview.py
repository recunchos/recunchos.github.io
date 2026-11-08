#!/usr/bin/env python3
"""Comprueba la vista previa: maestro legal v2.1.5, idiomas parejos y /app/ intacta."""
from __future__ import annotations

import html
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def norm_md(src: str) -> str:
    src = src.replace("**", "")
    src = re.sub(r"^#{1,6}\s+", "", src, flags=re.M)
    src = re.sub(r"^-\s+", "", src, flags=re.M)
    src = re.sub(r"^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$", "", src, flags=re.M)
    src = re.sub(r"\s*\|\s*", " ", src)
    return re.sub(r"\s+", "", src)


def main() -> None:
    pairs = {
        "aviso-legal.md": "aviso-legal.html",
        "privacidad.md": "privacidad.html",
        "cookies.md": "cookies.html",
        "condiciones-de-uso.md": "terminos.html",
        "declaracion-responsable.md": "declaracion-responsable.html",
        "consentimiento-registro.md": "consentimiento-registro.html",
    }
    for md, page in pairs.items():
        src = (ROOT / "legal-fuente/v2.1.5" / md).read_text(encoding="utf-8")
        page_html = (ROOT / page).read_text(encoding="utf-8")
        assert "VERSIÓN v2.1.4" not in page_html, page
        assert "v2.1.5" in page_html, page
        assert "frame-guard.js" in page_html and "Content-Security-Policy" in page_html, page
        assert 'data-legal-lang="es"' in page_html and "legal.notice" in page_html, page
        master = re.search(
            r'class="legal-master" data-legal-master lang="es">(.*)</div>\s*<footer>',
            page_html,
            re.S,
        ).group(1)
        text = html.unescape(re.sub(r"<[^>]+>", "", master))
        assert norm_md(src) == re.sub(r"\s+", "", text), page

    signup = (ROOT / "crear-cuenta/index.html").read_text(encoding="utf-8")
    for sentence in (
        "Confirmo que tengo 18 años o más.",
        "He leído y acepto las Condiciones de uso.",
        "He leído la Política de privacidad.",
        "VERSIÓN v2.1.5 (Recunchos) — APROBADA por el titular el 01/11/2026",
    ):
        assert sentence in signup, sentence

    diff = subprocess.check_output(["git", "diff", "--name-only", "HEAD", "--", "app"], cwd=ROOT, text=True)
    assert diff.strip() == "", diff
    entry = (ROOT / "app/index.html").read_text(encoding="utf-8")
    assert "entry-9ae05494b31a92ab1cfe392448fff651.js" in entry

    bundled = (ROOT / "i18n.js").read_text(encoding="utf-8")
    assert bundled.startswith("window.RecunchosTextos=")
    for lang in ("gl", "es", "eu", "ca"):
        assert f'"{lang}":{{' in bundled or f'"{lang}":{{' in bundled.replace(" ", "")
    assert bundled.count('"legal.notice"') == 4
    assert "24 horas" not in (ROOT / "index.html").read_text(encoding="utf-8").lower()
    session = (ROOT / "sesion.js").read_text(encoding="utf-8")
    assert 'location.assign("/app' not in session
    assert "https://recunchos.github.io/confirmar/" in session
    assert "email_redirect_to: WEB_CONFIRM" in session
    assert "https://recunchos.github.io/app/" not in session
    for name in pairs.values():
        assert "Fecha de publicación" not in (ROOT / name).read_text(encoding="utf-8")
    note = (ROOT / "legal-fuente/sincronizacion-web.txt").read_text(encoding="utf-8")
    assert "fecha_sincronizacion_web: 2026-11-08" in note
    assert "no modifica el cuerpo ni la fecha de la v2.1.5" in note
    assert "v2.1.5" in note
    print("preview checks ok")


if __name__ == "__main__":
    main()
