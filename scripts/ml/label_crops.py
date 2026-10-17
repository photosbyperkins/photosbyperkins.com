"""Extracts helmet/head crops and generates a single-key HTML labeling UI (`data/labeling/index.html`).

Usage:
  npm run ml:extract-crops
  python scripts/ml/label_crops.py --limit 1200

Prepares the human-in-the-loop labeling dataset for YOLOv11-s helmet cover fine-tuning
and the 300-photo evaluation benchmark (`data/ml_labels.sqlite`).
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2  # noqa: E402

from ml import photos as ph  # noqa: E402
from ml.export_sidecars import load_jersey_overrides  # noqa: E402
from ml.scheduler import load_bgr  # noqa: E402
from ml.stages.numbers import extract_jersey_crops, recognize_jersey_crop_cv  # noqa: E402
from ml.stages.roles import (  # noqa: E402
    classify_helmet_and_torso_cv,
    extract_helmet_crop,
    extract_role_crop,
)
from ml.stages.teams import extract_torso_crop  # noqa: E402

DEFAULT_OUT_DIR = Path('data') / 'labeling'
DEFAULT_CACHE_DB = Path('data') / 'ml_cache.sqlite'


def generate_labeling_html(crops_manifest: list[dict[str, Any]]) -> str:
    manifest_json = json.dumps(crops_manifest)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Derby Role & Helmet Crop Labeler — Photos by Perkins</title>
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 20px; background: #0b0d11; color: #f3f4f6;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column; align-items: center; min-height: 100vh;
  }}
  header {{
    max-width: 1280px; width: 100%; display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
  }}
  .card {{
    background: #14171f; border: 1px solid #232834; border-radius: 14px;
    padding: 20px; max-width: 1280px; width: 100%;
    display: grid; grid-template-columns: 290px 1fr 350px; gap: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }}
  @media (max-width: 1100px) {{
    .card {{ grid-template-columns: 290px 1fr; }}
    .controls-panel {{ grid-column: 1 / -1; }}
  }}
  @media (max-width: 720px) {{
    .card {{ grid-template-columns: 1fr; }}
  }}
  .panel-title {{
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    color: #9ca3af; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;
  }}
  .crop-box {{
    width: 290px; height: 290px; background: #060709; border-radius: 8px;
    border: 1px solid #282f3d; display: flex; align-items: center; justify-content: center;
    overflow: hidden; position: relative;
  }}
  .crop-box--helmet {{
    height: 155px; margin-top: 8px;
  }}
  .crop-box img {{ width: 100%; height: 100%; object-fit: contain; }}
  .context-box {{
    background: #060709; border-radius: 8px; border: 1px solid #282f3d;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    position: relative; min-height: 360px; max-height: 560px;
  }}
  .full-img-wrapper {{
    position: relative; display: inline-block; line-height: 0; max-height: 540px; max-width: 100%;
  }}
  .full-img-wrapper img {{
    max-height: 540px; max-width: 100%; height: auto; width: auto;
    object-fit: contain; border-radius: 4px; display: block; cursor: zoom-in;
  }}
  .crop-highlight {{
    position: absolute; border: 2px solid #f59e0b;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.9), inset 0 0 8px rgba(245, 158, 11, 0.35);
    border-radius: 3px; pointer-events: none; transition: all 0.15s ease;
  }}
  .helmet-highlight {{
    position: absolute; border: 1.5px dotted #fde047;
    border-radius: 3px; pointer-events: none; transition: all 0.15s ease;
  }}
  .subject-highlight {{
    position: absolute; border: 1px dashed rgba(56, 189, 248, 0.75);
    box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
    border-radius: 4px; pointer-events: none; transition: all 0.15s ease;
  }}
  .context-badge {{
    position: absolute; bottom: 8px; left: 8px; font-size: 11px;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); padding: 4px 8px;
    border-radius: 4px; color: #d1d5db; pointer-events: none; border: 1px solid rgba(255,255,255,0.1);
  }}
  .keys {{ display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }}
  button {{
    background: #1e232e; color: #fff; border: 1px solid #333a4a; border-radius: 8px;
    padding: 10px 14px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: left;
    display: flex; align-items: center; transition: all 0.15s ease;
  }}
  button:hover {{ border-color: #f59e0b; background: #282f3e; }}
  button.active {{ border-color: #f59e0b; background: #3b2f15; color: #fbbf24; }}
  .btn-row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }}
  .kbd {{
    display: inline-block; background: #0c0e12; border: 1px solid #4b5563;
    border-radius: 4px; padding: 2px 7px; margin-right: 8px; font-family: monospace; font-size: 12px;
  }}
  .meta {{ font-size: 13px; color: #9ca3af; line-height: 1.5; }}
  .meta-block {{ background: #0d0f14; border: 1px solid #1f242e; border-radius: 8px; padding: 12px; margin-top: 10px; }}
  .team-pill {{
    display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px;
    border-radius: 6px; background: #1a1e27; border: 1px solid #2e3544; font-size: 12px; margin: 2px 4px 2px 0;
  }}
  .team-dot {{ width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.4); }}
  /* Modal / Fullscreen Lightbox */
  .modal {{
    display: none; position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.92); backdrop-filter: blur(8px);
    align-items: center; justify-content: center; padding: 20px;
  }}
  .modal.open {{ display: flex; }}
  .modal-content {{ position: relative; max-width: 95vw; max-height: 95vh; display: flex; flex-direction: column; align-items: center; }}
  .modal-img-wrap {{ position: relative; display: inline-block; line-height: 0; }}
  .modal-img-wrap img {{ max-width: 92vw; max-height: 88vh; object-fit: contain; border-radius: 6px; }}
  .modal-close {{
    position: absolute; top: -40px; right: 0; background: #222; color: #fff;
    border: 1px solid #444; border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer;
  }}
</style>
</head>
<body>
  <header>
    <div>
      <h2 style="margin:0 0 4px 0">🛼 Helmet Cover &amp; Skater Role Labeler</h2>
      <div class="meta" id="progress-text">0 / 0 labeled</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="toggleBoxes()"><span class="kbd">B</span>Toggle Box</button>
      <button onclick="toggleRawOriginal()" id="btn-orig" style="display:none;"><span class="kbd">H</span>Full Raw Original</button>
      <button onclick="exportLabels()">💾 Export labels.json (E)</button>
    </div>
  </header>

  <div class="card">
    <!-- Left Column: Role Crop (Helmet + Upper Torso) & Helmet Detail Zoom -->
    <div>
      <div class="panel-title">
        <span>Role Crop (Helmet + Torso)</span>
        <span id="crop-ratio-badge" style="color:#f59e0b"></span>
      </div>
      <div class="crop-box">
        <img id="crop-img" alt="Helmet and upper torso role crop" />
      </div>
      <div class="panel-title" style="margin-top:10px;margin-bottom:4px;">
        <span>Helmet Shell Zoom (3.0×)</span>
      </div>
      <div class="crop-box crop-box--helmet">
        <img id="helmet-img" alt="Expanded helmet shell zoom" />
      </div>
      <div class="meta-block" style="margin-top:10px;">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">AUTO-SUGGESTION</div>
        <div id="suggested-role" style="font-weight:700;font-size:14px;color:#f3f4f6;">—</div>
        <div id="suggested-conf" style="font-size:12px;color:#6b7280;margin-top:2px;"></div>
      </div>
    </div>

    <!-- Center Column: Uncropped Context Photo -->
    <div>
      <div class="panel-title">
        <span>Uncropped Context Photo</span>
        <span style="font-weight:normal;text-transform:none;color:#6b7280;">Click photo or press <span class="kbd">F</span> to expand</span>
      </div>
      <div class="context-box" onclick="openModal()">
        <div class="full-img-wrapper" id="full-img-wrapper">
          <img id="full-img" alt="Uncropped context photo" />
          <div id="crop-highlight" class="crop-highlight" title="Role Crop (Helmet + Upper Torso)"></div>
          <div id="helmet-highlight" class="helmet-highlight" title="Helmet Shell Region"></div>
          <div id="subject-highlight" class="subject-highlight" title="Skater Detection"></div>
          <div class="context-badge" id="context-badge">Amber = Role Crop (Helmet + Torso) · Click to expand</div>
        </div>
      </div>
    </div>

    <!-- Right Column: Metadata & Single-Key Controls -->
    <div class="controls-panel">
      <div class="panel-title">Assignment &amp; Controls</div>
      <div class="meta-block">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">EVENT &amp; TEAMS</div>
        <div id="item-event" style="font-weight:600;color:#f3f4f6;font-size:13px;margin-bottom:6px;"></div>
        <div id="item-teams"></div>
        <div id="item-status" style="margin-top:8px;font-size:12px;"></div>
      </div>

      <div class="keys">
        <button id="btn-jammer" onclick="setLabel('jammer')"><span class="kbd">1</span>★ Jammer (Star Cover)</button>
        <button id="btn-pivot" onclick="setLabel('pivot')"><span class="kbd">2</span>⚡ Pivot (Stripe Cover)</button>
        <button id="btn-blocker" onclick="setLabel('blocker')"><span class="kbd">3</span>🛡️ Blocker (Plain Helmet + Jersey)</button>
        <button id="btn-ref" onclick="setLabel('ref')"><span class="kbd">4</span>🦓 Referee (Zebra Stripes / Official)</button>
        <button id="btn-spectator" onclick="setLabel('spectator')"><span class="kbd">5</span>🧢 Spectator / Coach (Sideline / Crowd)</button>
        <button id="btn-skip" onclick="setLabel('skip')"><span class="kbd">Space</span>⏭️ Skip / Unclear</button>
      </div>

      <div class="btn-row">
        <button onclick="prevItem()"><span class="kbd">←</span>Prev</button>
        <button onclick="nextItem()"><span class="kbd">→</span>Next</button>
      </div>
    </div>
  </div>

  <!-- Fullscreen Modal -->
  <div id="modal" class="modal" onclick="closeModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">✕ Close (Esc / F)</button>
      <div class="modal-img-wrap">
        <img id="modal-img" alt="Fullscreen uncropped photo" />
        <div id="modal-crop-highlight" class="crop-highlight"></div>
        <div id="modal-helmet-highlight" class="helmet-highlight"></div>
        <div id="modal-subject-highlight" class="subject-highlight"></div>
      </div>
    </div>
  </div>

<script>
const ITEMS = {manifest_json};
let idx = 0;
let showBoxes = true;
let preferRawOriginal = false;
const labels = JSON.parse(localStorage.getItem('derby_role_labels_v1') || '{{}}');

function positionHighlight(el, box) {{
  if (!el || !box) {{
    if (el) el.style.display = 'none';
    return;
  }}
  if (!showBoxes) {{
    el.style.display = 'none';
    return;
  }}
  el.style.display = 'block';
  const left = Math.max(0, (box.x - box.w / 2.0) * 100);
  const top = Math.max(0, (box.y - box.h / 2.0) * 100);
  const width = Math.min(100 - left, box.w * 100);
  const height = Math.min(100 - top, box.h * 100);
  el.style.left = `${{left.toFixed(2)}}%`;
  el.style.top = `${{top.toFixed(2)}}%`;
  el.style.width = `${{width.toFixed(2)}}%`;
  el.style.height = `${{height.toFixed(2)}}%`;
}}

function render() {{
  if (!ITEMS.length) {{
    document.getElementById('progress-text').textContent = 'No crops found.';
    return;
  }}
  const item = ITEMS[idx];
  document.getElementById('crop-img').src = item.cropUrl;
  document.getElementById('helmet-img').src = item.helmetCropUrl || item.cropUrl;

  const fullImg = document.getElementById('full-img');
  const targetSrc = (preferRawOriginal && item.originalUrl) ? item.originalUrl : (item.fullUrl || item.cropUrl);
  fullImg.src = targetSrc;
  document.getElementById('modal-img').src = targetSrc;

  // Toggle raw button visibility
  const btnOrig = document.getElementById('btn-orig');
  if (item.originalUrl) {{
    btnOrig.style.display = 'inline-flex';
    btnOrig.classList.toggle('active', preferRawOriginal);
  }} else {{
    btnOrig.style.display = 'none';
  }}

  // Positioning highlights
  positionHighlight(document.getElementById('crop-highlight'), item.box);
  positionHighlight(document.getElementById('helmet-highlight'), item.helmetBox);
  positionHighlight(document.getElementById('subject-highlight'), item.subjectBox);
  positionHighlight(document.getElementById('modal-crop-highlight'), item.box);
  positionHighlight(document.getElementById('modal-helmet-highlight'), item.helmetBox);
  positionHighlight(document.getElementById('modal-subject-highlight'), item.subjectBox);

  const current = labels[item.thumb] || item.suggestedRole || 'unlabeled';
  const labeledCount = Object.keys(labels).length;
  document.getElementById('progress-text').textContent =
    `Crop ${{idx + 1}} of ${{ITEMS.length}} · ${{labeledCount}} labeled (${{Math.round((labeledCount / ITEMS.length) * 100)}}%)`;

  // Auto suggestion
  const roleNameMap = {{
    jammer: '★ Jammer',
    pivot: '⚡ Pivot',
    blocker: '🛡️ Blocker',
    ref: '🦓 Referee',
    spectator: '🧢 Spectator / Coach',
  }};
  document.getElementById('suggested-role').textContent = roleNameMap[item.suggestedRole] || item.suggestedRole || 'None';
  document.getElementById('suggested-conf').textContent = item.suggestedConf ? `Confidence: ${{(item.suggestedConf * 100).toFixed(1)}}%` : '';

  // Event info
  document.getElementById('item-event').textContent = `${{item.year}} · ${{item.eventName || 'Bout'}}`;
  
  // Teams pills
  const teamsEl = document.getElementById('item-teams');
  if (Array.isArray(item.teams) && item.teams.length > 0) {{
    teamsEl.innerHTML = item.teams.map(t => {{
      const color = t.jerseyColorHex || '#4b5563';
      return `<span class="team-pill"><span class="team-dot" style="background:${{color}}"></span>${{t.name || 'Team'}}</span>`;
    }}).join('');
  }} else {{
    teamsEl.innerHTML = '<span style="color:#6b7280;font-size:12px;">No team colors registered</span>';
  }}

  // Current status
  const isAssigned = Boolean(labels[item.thumb]);
  document.getElementById('item-status').innerHTML =
    `<strong>Assigned:</strong> <span style="color:${{isAssigned ? '#10b981' : '#f59e0b'}};font-weight:700">${{current.toUpperCase()}}</span>` +
    (item.isJuniorBout ? ' · <span style="color:#ec4899">👶 Junior Bout</span>' : '');

  // Active button state
  ['jammer', 'pivot', 'blocker', 'ref', 'spectator', 'skip'].forEach(r => {{
    const btn = document.getElementById(`btn-${{r}}`);
    if (btn) btn.classList.toggle('active', current === r);
  }});
}}

function setLabel(role) {{
  if (!ITEMS.length) return;
  labels[ITEMS[idx].thumb] = role;
  localStorage.setItem('derby_role_labels_v1', JSON.stringify(labels));
  if (idx < ITEMS.length - 1) idx++;
  render();
}}

function prevItem() {{
  if (idx > 0) {{ idx--; render(); }}
}}

function nextItem() {{
  if (idx < ITEMS.length - 1) {{ idx++; render(); }}
}}

function toggleBoxes() {{
  showBoxes = !showBoxes;
  render();
}}

function toggleRawOriginal() {{
  preferRawOriginal = !preferRawOriginal;
  render();
}}

function openModal() {{
  document.getElementById('modal').classList.add('open');
}}

function closeModal() {{
  document.getElementById('modal').classList.remove('open');
}}

function toggleModal() {{
  const modal = document.getElementById('modal');
  if (modal.classList.contains('open')) closeModal();
  else openModal();
}}

function exportLabels() {{
  const blob = new Blob([JSON.stringify(labels, null, 2)], {{ type: 'application/json' }});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'helmet_role_labels.json';
  a.click();
}}

window.addEventListener('keydown', (e) => {{
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === '1') setLabel('jammer');
  else if (e.key === '2') setLabel('pivot');
  else if (e.key === '3') setLabel('blocker');
  else if (e.key === '4') setLabel('ref');
  else if (e.key === '5') setLabel('spectator');
  else if (e.key === ' ') {{ e.preventDefault(); setLabel('skip'); }}
  else if (e.key === 'ArrowLeft') prevItem();
  else if (e.key === 'ArrowRight') nextItem();
  else if (e.key.toLowerCase() === 'f') toggleModal();
  else if (e.key.toLowerCase() === 'b') toggleBoxes();
  else if (e.key.toLowerCase() === 'h') toggleRawOriginal();
  else if (e.key.toLowerCase() === 'e') exportLabels();
  else if (e.key === 'Escape') closeModal();
}});

render();
</script>
</body>
</html>
"""


def extract_crops(
    photos_file: Path = Path(ph.PHOTOS_FILE),
    out_dir: Path = DEFAULT_OUT_DIR,
    limit: int = 1200,
) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    crops_dir = out_dir / 'crops'
    crops_dir.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, Any]] = []
    if photos_file.exists():
        data = json.loads(photos_file.read_text(encoding='utf-8'))
        items = ph.collect(data)
        for i, (thumb, it) in enumerate(items.items()):
            if len(manifest) >= limit:
                break
            thumb_path = Path(it['thumb_path'])
            if not thumb_path.exists():
                continue
            img = load_bgr(str(thumb_path))
            if img is None:
                continue
            p0 = it['photos'][0] if it['photos'] else {}
            faces = p0.get('faces') or []
            subjects = p0.get('subjects') or []
            if not faces and not subjects:
                continue

            primary_face = faces[0] if faces else None
            primary_subj = subjects[0] if subjects else None
            role_crop, role_box = extract_role_crop(img, primary_face, primary_subj)
            helmet_crop, helmet_box = extract_helmet_crop(img, primary_face, primary_subj)
            torso_crop = extract_torso_crop(img, primary_subj, primary_face)
            role, conf = classify_helmet_and_torso_cv(helmet_crop, torso_crop, has_subject=True)

            crop_filename = f'crop_{i:05d}.jpg'
            crop_path = crops_dir / crop_filename
            cv2.imwrite(str(crop_path), role_crop)

            helmet_filename = f'helmet_{i:05d}.jpg'
            helmet_path = crops_dir / helmet_filename
            cv2.imwrite(str(helmet_path), helmet_crop)

            source_raw = it.get('source')
            source_path = Path(source_raw) if source_raw else None
            orig_url = (
                os.path.relpath(source_path, out_dir).replace('\\', '/')
                if source_path and source_path.exists()
                else None
            )
            full_url = os.path.relpath(thumb_path, out_dir).replace('\\', '/')

            manifest.append(
                {
                    'thumb': thumb,
                    'cropUrl': f'crops/{crop_filename}',
                    'helmetCropUrl': f'crops/{helmet_filename}',
                    'fullUrl': full_url,
                    'originalUrl': orig_url,
                    'year': it.get('year', ''),
                    'eventName': it.get('event_name', ''),
                    'teams': it.get('teams') or [],
                    'isJuniorBout': it.get('is_junior_bout', False),
                    'box': role_box,
                    'helmetBox': helmet_box,
                    'subjectBox': primary_subj,
                    'suggestedRole': role,
                    'suggestedConf': conf,
                }
            )

    (out_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    (out_dir / 'index.html').write_text(generate_labeling_html(manifest), encoding='utf-8')
    return {'extracted': len(manifest), 'html_path': str(out_dir / 'index.html')}


def generate_numbers_labeling_html(
    numbers_manifest: list[dict[str, Any]],
    initial_overrides: dict[str, list[str]] | None = None,
) -> str:
    manifest_json = json.dumps(numbers_manifest)
    overrides_json = json.dumps(initial_overrides or {})
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Jersey # OCR Inspector &amp; Override Labeler — Photos by Perkins</title>
<style>
  :root {{ color-scheme: dark; }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 20px; background: #0b0d11; color: #f3f4f6;
    font-family: system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column; align-items: center; min-height: 100vh;
  }}
  header {{
    max-width: 1280px; width: 100%; display: flex; justify-content: space-between;
    align-items: center; margin-bottom: 12px; gap: 12px; flex-wrap: wrap;
  }}
  .filter-bar {{
    max-width: 1280px; width: 100%; display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;
  }}
  .filter-btn {{
    padding: 6px 12px; font-size: 12px; border-radius: 999px; background: #161a23;
    border: 1px solid #2b3242; color: #cbd5e1; cursor: pointer;
  }}
  .filter-btn.active {{
    background: #3b2f15; border-color: #f59e0b; color: #fbbf24; font-weight: 700;
  }}
  .card {{
    background: #14171f; border: 1px solid #232834; border-radius: 14px;
    padding: 20px; max-width: 1280px; width: 100%;
    display: grid; grid-template-columns: 290px 1fr 360px; gap: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }}
  @media (max-width: 1100px) {{
    .card {{ grid-template-columns: 290px 1fr; }}
    .controls-panel {{ grid-column: 1 / -1; }}
  }}
  @media (max-width: 720px) {{
    .card {{ grid-template-columns: 1fr; }}
  }}
  .panel-title {{
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    color: #9ca3af; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;
  }}
  .crop-box {{
    width: 290px; height: 260px; background: #060709; border-radius: 8px;
    border: 1px solid #282f3d; display: flex; align-items: center; justify-content: center;
    overflow: hidden; position: relative;
  }}
  .crop-box img {{ width: 100%; height: 100%; object-fit: contain; }}
  .context-box {{
    background: #060709; border-radius: 8px; border: 1px solid #282f3d;
    display: flex; align-items: center; justify-content: center; overflow: hidden;
    position: relative; min-height: 360px; max-height: 560px;
  }}
  .full-img-wrapper {{
    position: relative; display: inline-block; line-height: 0; max-height: 540px; max-width: 100%;
  }}
  .full-img-wrapper img {{
    max-height: 540px; max-width: 100%; height: auto; width: auto;
    object-fit: contain; border-radius: 4px; display: block; cursor: zoom-in;
  }}
  .crop-highlight {{
    position: absolute; border: 2px solid #f59e0b;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.9), inset 0 0 8px rgba(245, 158, 11, 0.35);
    border-radius: 3px; pointer-events: none; transition: all 0.15s ease;
  }}
  .subject-highlight {{
    position: absolute; border: 1px dashed rgba(56, 189, 248, 0.75);
    box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
    border-radius: 4px; pointer-events: none; transition: all 0.15s ease;
  }}
  .context-badge {{
    position: absolute; bottom: 8px; left: 8px; font-size: 11px;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); padding: 4px 8px;
    border-radius: 4px; color: #d1d5db; pointer-events: none; border: 1px solid rgba(255,255,255,0.1);
  }}
  .keys {{ display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }}
  button {{
    background: #1e232e; color: #fff; border: 1px solid #333a4a; border-radius: 8px;
    padding: 10px 14px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: left;
    display: flex; align-items: center; transition: all 0.15s ease;
  }}
  button:hover {{ border-color: #f59e0b; background: #282f3e; }}
  button.active-confirm {{ border-color: #10b981; background: #0f2922; color: #34d399; }}
  button.active-partial {{ border-color: #f59e0b; background: #3b2a10; color: #fbbf24; }}
  button.active-reject {{ border-color: #ef4444; background: #2d1418; color: #f87171; }}
  .btn-row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }}
  .kbd {{
    display: inline-block; background: #0c0e12; border: 1px solid #4b5563;
    border-radius: 4px; padding: 2px 7px; margin-right: 8px; font-family: monospace; font-size: 12px;
  }}
  .meta {{ font-size: 13px; color: #9ca3af; line-height: 1.5; }}
  .meta-block {{ background: #0d0f14; border: 1px solid #1f242e; border-radius: 8px; padding: 12px; margin-top: 10px; }}
  .team-pill {{
    display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px;
    border-radius: 6px; background: #1a1e27; border: 1px solid #2e3544; font-size: 12px; margin: 2px 4px 2px 0;
  }}
  .team-dot {{ width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.4); }}
  .num-input-wrap {{ display: flex; gap: 8px; margin-top: 8px; }}
  .num-input {{
    flex: 1; background: #0b0d11; color: #fff; border: 1px solid #374151;
    border-radius: 8px; padding: 10px 12px; font-size: 15px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
  }}
  .num-input:focus {{ outline: none; border-color: #f59e0b; }}
  .modal {{
    display: none; position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.92); backdrop-filter: blur(8px);
    align-items: center; justify-content: center; padding: 20px;
  }}
  .modal.open {{ display: flex; }}
  .modal-content {{ position: relative; max-width: 95vw; max-height: 95vh; display: flex; flex-direction: column; align-items: center; }}
  .modal-img-wrap {{ position: relative; display: inline-block; line-height: 0; }}
  .modal-img-wrap img {{ max-width: 92vw; max-height: 88vh; object-fit: contain; border-radius: 6px; }}
  .modal-close {{
    position: absolute; top: -40px; right: 0; background: #222; color: #fff;
    border: 1px solid #444; border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer;
  }}
</style>
</head>
<body>
  <header>
    <div>
      <h2 style="margin:0 0 4px 0">#️⃣ Jersey Number OCR Inspector &amp; Override Labeler</h2>
      <div class="meta" id="progress-text">0 / 0 reviewed</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button onclick="toggleBoxes()"><span class="kbd">B</span>Toggle Box</button>
      <button onclick="toggleRawOriginal()" id="btn-orig" style="display:none;"><span class="kbd">H</span>Full Raw Original</button>
      <button onclick="exportOverrides()">💾 Export jersey_overrides.json (S)</button>
    </div>
  </header>

  <div class="filter-bar">
    <button class="filter-btn active" id="flt-all" onclick="setFilter('all')">All Detections</button>
    <button class="filter-btn" id="flt-emitted" onclick="setFilter('emitted')">Emitted (≥85%)</button>
    <button class="filter-btn" id="flt-candidate" onclick="setFilter('candidate')">Borderline (72–85%)</button>
    <button class="filter-btn" id="flt-unreviewed" onclick="setFilter('unreviewed')">Needs Review</button>
    <button class="filter-btn" id="flt-partial" onclick="setFilter('partial')">Partial # (?)</button>
    <button class="filter-btn" id="flt-overridden" onclick="setFilter('overridden')">Reviewed / Overridden</button>
  </div>

  <div class="card">
    <!-- Left Column: Jersey Torso Crop & OCR Telemetry -->
    <div>
      <div class="panel-title">
        <span>Jersey / Torso OCR Crop</span>
        <span id="tier-badge" style="color:#f59e0b"></span>
      </div>
      <div class="crop-box">
        <img id="crop-img" alt="Jersey torso OCR crop" />
      </div>
      <div class="meta-block" style="margin-top:10px;">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">OCR DETECTED NUMBER(S)</div>
        <div id="detected-number" style="font-weight:800;font-size:22px;color:#fbbf24;letter-spacing:0.03em;">—</div>
        <div id="detected-conf" style="font-size:12px;color:#9ca3af;margin-top:2px;"></div>
        <div id="detected-role" style="font-size:12px;color:#6b7280;margin-top:4px;"></div>
      </div>
    </div>

    <!-- Center Column: Uncropped Context Photo -->
    <div>
      <div class="panel-title">
        <span>Uncropped Context Photo</span>
        <span style="font-weight:normal;text-transform:none;color:#6b7280;">Click photo or press <span class="kbd">F</span> to expand</span>
      </div>
      <div class="context-box" onclick="openModal()">
        <div class="full-img-wrapper" id="full-img-wrapper">
          <img id="full-img" alt="Uncropped context photo" />
          <div id="crop-highlight" class="crop-highlight" title="Jersey OCR Crop Box"></div>
          <div id="subject-highlight" class="subject-highlight" title="Skater Detection"></div>
          <div class="context-badge">Amber = OCR Torso Crop · Cyan = Skater · Click to zoom</div>
        </div>
      </div>
    </div>

    <!-- Right Column: Verification & Manual Override Controls -->
    <div class="controls-panel">
      <div class="panel-title">Verify or Override Jersey #</div>
      <div class="meta-block">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">EVENT &amp; TEAMS</div>
        <div id="item-event" style="font-weight:600;color:#f3f4f6;font-size:13px;margin-bottom:6px;"></div>
        <div id="item-teams"></div>
        <div id="item-status" style="margin-top:8px;font-size:12px;"></div>
      </div>

      <div class="keys">
        <button id="btn-confirm" onclick="confirmDetected()">
          <span class="kbd">Y</span>✅ Confirm Detected #
        </button>
        <button id="btn-partial" onclick="markPartialNumber()">
          <span class="kbd">P</span>◑ Partial # (1+ Digits Unreadable)
        </button>
        <button id="btn-reject" onclick="rejectDetected()">
          <span class="kbd">X</span>❌ Reject (False Positive / No #)
        </button>
      </div>

      <div class="meta-block" style="margin-top:10px;">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">
          MANUAL OVERRIDE / PARTIAL # (<span class="kbd">E</span> to focus)
        </div>
        <div class="num-input-wrap">
          <input
            id="custom-num-input"
            class="num-input"
            type="text"
            placeholder="e.g. 428, 42?, ?51, 7?"
            aria-label="Manual jersey number override"
          />
          <button onclick="saveCustomNumber()" style="white-space:nowrap;">Save</button>
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:6px;">
          Tip: If you know the full number (e.g. <code>428</code>), enter <code>428</code>. If 1+ digits are unreadable even by eye, press <span class="kbd">P</span> or use <code>?</code> (e.g. <code>42?</code>, <code>?51</code>, <code>7?</code>).
        </div>
      </div>

      <div class="btn-row">
        <button onclick="prevItem()"><span class="kbd">←</span>Prev</button>
        <button onclick="nextItem()"><span class="kbd">→</span>Next</button>
      </div>
    </div>
  </div>

  <!-- Fullscreen Modal -->
  <div id="modal" class="modal" onclick="closeModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">✕ Close (Esc / F)</button>
      <div class="modal-img-wrap">
        <img id="modal-img" alt="Fullscreen uncropped photo" />
        <div id="modal-crop-highlight" class="crop-highlight"></div>
        <div id="modal-subject-highlight" class="subject-highlight"></div>
      </div>
    </div>
  </div>

<script>
const ALL_ITEMS = {manifest_json};
const INITIAL_OVERRIDES = {overrides_json};
const STORAGE_KEY = 'derby_jersey_overrides_v1';
const savedLocal = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{{}}');
const overrides = Object.assign({{}}, INITIAL_OVERRIDES, savedLocal);

let currentFilter = 'all';
let filteredItems = ALL_ITEMS.slice();
let idx = 0;
let showBoxes = true;
let preferRawOriginal = false;

function persistOverrides() {{
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}}

function isPartialOverrideValue(ovVal) {{
  if (!ovVal) return false;
  const list = Array.isArray(ovVal) ? ovVal : [String(ovVal)];
  return list.some(v => String(v).includes('?'));
}}

function applyFilter() {{
  filteredItems = ALL_ITEMS.filter(item => {{
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, item.thumb);
    if (currentFilter === 'emitted') return item.tier === 'emitted';
    if (currentFilter === 'candidate') return item.tier === 'candidate';
    if (currentFilter === 'unreviewed') return !hasOverride;
    if (currentFilter === 'partial') return hasOverride && isPartialOverrideValue(overrides[item.thumb]);
    if (currentFilter === 'overridden') return hasOverride;
    return true;
  }});
  if (idx >= filteredItems.length) idx = Math.max(0, filteredItems.length - 1);
  ['all', 'emitted', 'candidate', 'unreviewed', 'partial', 'overridden'].forEach(f => {{
    const el = document.getElementById(`flt-${{f}}`);
    if (el) el.classList.toggle('active', currentFilter === f);
  }});
  render();
}}

function setFilter(flt) {{
  currentFilter = flt;
  idx = 0;
  applyFilter();
}}

function positionHighlight(el, box) {{
  if (!el || !box || !showBoxes) {{
    if (el) el.style.display = 'none';
    return;
  }}
  el.style.display = 'block';
  const left = Math.max(0, (box.x - box.w / 2.0) * 100);
  const top = Math.max(0, (box.y - box.h / 2.0) * 100);
  const width = Math.min(100 - left, box.w * 100);
  const height = Math.min(100 - top, box.h * 100);
  el.style.left = `${{left.toFixed(2)}}%`;
  el.style.top = `${{top.toFixed(2)}}%`;
  el.style.width = `${{width.toFixed(2)}}%`;
  el.style.height = `${{height.toFixed(2)}}%`;
}}

function render() {{
  const reviewedCount = Object.keys(overrides).length;
  if (!filteredItems.length) {{
    document.getElementById('progress-text').textContent =
      `0 matching in current filter · ${{reviewedCount}} / ${{ALL_ITEMS.length}} total reviewed`;
    return;
  }}
  const item = filteredItems[idx];
  document.getElementById('crop-img').src = item.cropUrl;

  const targetSrc = (preferRawOriginal && item.originalUrl) ? item.originalUrl : (item.fullUrl || item.cropUrl);
  document.getElementById('full-img').src = targetSrc;
  document.getElementById('modal-img').src = targetSrc;

  const btnOrig = document.getElementById('btn-orig');
  if (item.originalUrl) {{
    btnOrig.style.display = 'inline-flex';
    btnOrig.classList.toggle('active', preferRawOriginal);
  }} else {{
    btnOrig.style.display = 'none';
  }}

  positionHighlight(document.getElementById('crop-highlight'), item.box);
  positionHighlight(document.getElementById('subject-highlight'), item.subjectBox);
  positionHighlight(document.getElementById('modal-crop-highlight'), item.box);
  positionHighlight(document.getElementById('modal-subject-highlight'), item.subjectBox);

  document.getElementById('progress-text').textContent =
    `Item ${{idx + 1}} of ${{filteredItems.length}} (${{currentFilter}}) · ${{reviewedCount}} / ${{ALL_ITEMS.length}} reviewed`;

  document.getElementById('tier-badge').textContent =
    item.tier === 'emitted' ? 'EMITTED ≥85%' : 'CANDIDATE 72–85%';

  const autoNums = (item.detectedNumbers && item.detectedNumbers.length)
    ? item.detectedNumbers.map(n => `#${{n}}`).join(', ')
    : 'None';
  document.getElementById('detected-number').textContent = autoNums;
  document.getElementById('detected-conf').textContent =
    item.maxConf ? `Confidence: ${{(item.maxConf * 100).toFixed(1)}}%` : '';
  document.getElementById('detected-role').textContent =
    `Role: ${{(item.role || 'unknown').toUpperCase()}}`;

  document.getElementById('item-event').textContent = `${{item.year}} · ${{item.eventName || 'Bout'}}`;
  const teamsEl = document.getElementById('item-teams');
  if (Array.isArray(item.teams) && item.teams.length > 0) {{
    teamsEl.innerHTML = item.teams.map(t => {{
      const color = t.jerseyColorHex || '#4b5563';
      return `<span class="team-pill"><span class="team-dot" style="background:${{color}}"></span>${{t.name || 'Team'}}</span>`;
    }}).join('');
  }} else {{
    teamsEl.innerHTML = '<span style="color:#6b7280;font-size:12px;">No team colors registered</span>';
  }}

  const hasOverride = Object.prototype.hasOwnProperty.call(overrides, item.thumb);
  const ovVal = overrides[item.thumb];
  const inputEl = document.getElementById('custom-num-input');

  let statusHtml = '';
  let isConfirmed = false;
  let isPartial = false;
  let isRejected = false;
  if (!hasOverride) {{
    statusHtml = '<span style="color:#9ca3af">Unreviewed (using auto OCR)</span>';
    inputEl.value = (item.detectedNumbers || []).join(', ');
  }} else if (Array.isArray(ovVal) && ovVal.length === 0) {{
    statusHtml = '<span style="color:#ef4444;font-weight:700">❌ REJECTED (False positive suppressed)</span>';
    inputEl.value = '';
    isRejected = true;
  }} else {{
    const list = Array.isArray(ovVal) ? ovVal : [String(ovVal)];
    isPartial = list.some(v => String(v).includes('?'));
    if (isPartial) {{
      statusHtml = `<span style="color:#f59e0b;font-weight:700">◑ PARTIAL #: #${{list.join(', #')}} (1+ digits unreadable)</span>`;
    }} else {{
      statusHtml = `<span style="color:#10b981;font-weight:700">✅ VERIFIED: #${{list.join(', #')}}</span>`;
      isConfirmed = true;
    }}
    inputEl.value = list.join(', ');
  }}
  document.getElementById('item-status').innerHTML = `<strong>Status:</strong> ${{statusHtml}}`;
  document.getElementById('btn-confirm').classList.toggle('active-confirm', isConfirmed);
  document.getElementById('btn-partial').classList.toggle('active-partial', isPartial);
  document.getElementById('btn-reject').classList.toggle('active-reject', isRejected);
}}

function confirmDetected() {{
  if (!filteredItems.length) return;
  const item = filteredItems[idx];
  overrides[item.thumb] = (item.detectedNumbers || []).map(s => String(s).replace(/\\?+/g, '').trim()).filter(Boolean);
  persistOverrides();
  if (idx < filteredItems.length - 1) idx++;
  render();
}}

function markPartialNumber() {{
  if (!filteredItems.length) return;
  const item = filteredItems[idx];
  const inputEl = document.getElementById('custom-num-input');
  const raw = inputEl.value.trim();
  const baseTokens = raw
    ? raw.split(/[,;\\s]+/).map(s => s.replace(/^#/, '').replace(/[*~_]+/g, '?').trim().toUpperCase()).filter(Boolean)
    : (item.detectedNumbers || []).map(s => String(s).trim().toUpperCase()).filter(Boolean);
  if (!baseTokens.length) {{
    inputEl.focus();
    inputEl.placeholder = 'Type visible digit(s), e.g. 42? or ?7';
    return;
  }}
  const partialTokens = baseTokens.map(tok => tok.includes('?') ? tok : `${{tok}}?`);
  overrides[item.thumb] = partialTokens;
  persistOverrides();
  if (idx < filteredItems.length - 1) idx++;
  render();
}}

function rejectDetected() {{
  if (!filteredItems.length) return;
  const item = filteredItems[idx];
  overrides[item.thumb] = [];
  persistOverrides();
  if (idx < filteredItems.length - 1) idx++;
  render();
}}

function saveCustomNumber() {{
  if (!filteredItems.length) return;
  const item = filteredItems[idx];
  const raw = document.getElementById('custom-num-input').value.trim();
  if (!raw) {{
    overrides[item.thumb] = [];
  }} else {{
    const nums = raw
      .split(/[,;\\s]+/)
      .map(s => s.replace(/^#/, '').replace(/[*~_]+/g, '?').replace(/\\?+/g, '?').trim().toUpperCase())
      .filter(Boolean);
    overrides[item.thumb] = nums;
  }}
  persistOverrides();
  if (idx < filteredItems.length - 1) idx++;
  render();
}}

function prevItem() {{
  if (idx > 0) {{ idx--; render(); }}
}}

function nextItem() {{
  if (idx < filteredItems.length - 1) {{ idx++; render(); }}
}}

function toggleBoxes() {{
  showBoxes = !showBoxes;
  render();
}}

function toggleRawOriginal() {{
  preferRawOriginal = !preferRawOriginal;
  render();
}}

function openModal() {{
  document.getElementById('modal').classList.add('open');
}}

function closeModal() {{
  document.getElementById('modal').classList.remove('open');
}}

function toggleModal() {{
  const modal = document.getElementById('modal');
  if (modal.classList.contains('open')) closeModal();
  else openModal();
}}

function exportOverrides() {{
  const blob = new Blob([JSON.stringify(overrides, null, 2)], {{ type: 'application/json' }});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jersey_overrides.json';
  a.click();
}}

document.getElementById('custom-num-input').addEventListener('keydown', (e) => {{
  if (e.key === 'Enter') {{
    e.preventDefault();
    e.stopPropagation();
    saveCustomNumber();
    e.target.blur();
  }} else if (e.key === 'Escape') {{
    e.target.blur();
  }}
}});

window.addEventListener('keydown', (e) => {{
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key.toLowerCase() === 'y' || e.key === 'Enter') {{ e.preventDefault(); confirmDetected(); }}
  else if (e.key.toLowerCase() === 'p') {{ e.preventDefault(); markPartialNumber(); }}
  else if (e.key.toLowerCase() === 'x' || e.key === 'Delete' || e.key === 'Backspace') {{ e.preventDefault(); rejectDetected(); }}
  else if (e.key.toLowerCase() === 'e') {{
    e.preventDefault();
    const inp = document.getElementById('custom-num-input');
    inp.focus();
    inp.select();
  }}
  else if (e.key === 'ArrowLeft') prevItem();
  else if (e.key === 'ArrowRight') nextItem();
  else if (e.key.toLowerCase() === 'f') toggleModal();
  else if (e.key.toLowerCase() === 'b') toggleBoxes();
  else if (e.key.toLowerCase() === 'h') toggleRawOriginal();
  else if (e.key.toLowerCase() === 's') exportOverrides();
  else if (e.key === 'Escape') closeModal();
}});

applyFilter();
</script>
</body>
</html>
"""


def _norm_box_list_to_dict(box: Any) -> dict[str, float] | None:
    if isinstance(box, dict) and all(k in box for k in ('x', 'y', 'w', 'h')):
        return {
            'x': float(box['x']),
            'y': float(box['y']),
            'w': float(box['w']),
            'h': float(box['h']),
        }
    if isinstance(box, (list, tuple)) and len(box) == 4:
        return {
            'x': float(box[0]),
            'y': float(box[1]),
            'w': float(box[2]),
            'h': float(box[3]),
        }
    return None


def extract_number_crops(
    photos_file: Path = Path(ph.PHOTOS_FILE),
    out_dir: Path = DEFAULT_OUT_DIR,
    cache_db: Path = DEFAULT_CACHE_DB,
    limit: int = 1200,
    include_non_skaters: bool = False,
) -> dict[str, Any]:
    """Extracts jersey torso crops for OCR-detected & borderline candidate photos (`data/labeling/numbers.html`)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    crops_dir = out_dir / 'crops'
    crops_dir.mkdir(parents=True, exist_ok=True)

    cached_numbers_by_path: dict[str, dict[str, Any]] = {}
    cached_roles_by_path: dict[str, dict[str, Any]] = {}
    if cache_db.exists():
        try:
            con = sqlite3.connect(str(cache_db))
            for m_path, stage_name, payload_str in con.execute(
                "SELECT m.path, r.stage, r.payload FROM hash_memo m "
                "JOIN results r ON r.content_hash = m.sha256 "
                "WHERE r.stage IN ('numbers', 'roles') "
                "ORDER BY r.created_at ASC"
            ):
                norm_p = os.path.normpath(str(m_path))
                if stage_name == 'numbers':
                    cached_numbers_by_path[norm_p] = json.loads(payload_str)
                elif stage_name == 'roles':
                    cached_roles_by_path[norm_p] = json.loads(payload_str)
            con.close()
        except Exception:
            pass

    existing_overrides = load_jersey_overrides()
    manifest: list[dict[str, Any]] = []

    if photos_file.exists():
        data = json.loads(photos_file.read_text(encoding='utf-8'))
        items = ph.collect(data)
        for i, (thumb, it) in enumerate(items.items()):
            if len(manifest) >= limit:
                break
            norm_thumb_path = os.path.normpath(str(it['thumb_path']))
            role_payload = cached_roles_by_path.get(norm_thumb_path) or {}
            role = str(role_payload.get('role') or '')
            if not include_non_skaters and role == 'spectator' and thumb not in existing_overrides:
                continue

            num_payload = cached_numbers_by_path.get(norm_thumb_path)
            thumb_path = Path(it['thumb_path'])
            if not thumb_path.exists():
                continue

            p0 = it['photos'][0] if it['photos'] else {}
            subjects = p0.get('subjects') or []
            primary_subj = subjects[0] if subjects else None

            emitted_entries = (num_payload or {}).get('numbers') or []
            cand_entries = (num_payload or {}).get('candidates') or []

            # Fallback to live CV OCR if cache DB wasn't populated for this item
            if num_payload is None:
                img_tmp = load_bgr(str(thumb_path))
                if img_tmp is not None:
                    for subj_idx, crop_img, norm_box in extract_jersey_crops(img_tmp, subjects, max_subjects=3):
                        rec = recognize_jersey_crop_cv(crop_img)
                        if rec is not None:
                            n_str, n_conf = rec
                            entry = {
                                'num': n_str,
                                'conf': n_conf,
                                'box': norm_box,
                                'subjectIdx': subj_idx,
                            }
                            if n_conf >= 0.85:
                                emitted_entries.append(entry)
                            elif n_conf >= 0.72:
                                cand_entries.append(entry)

            all_entries = list(emitted_entries) + list(cand_entries)
            if not all_entries and thumb not in existing_overrides:
                continue

            img = load_bgr(str(thumb_path))
            if img is None:
                continue

            best_entry = max(all_entries, key=lambda e: float(e.get('conf', 0.0))) if all_entries else {}
            box_dict = _norm_box_list_to_dict(best_entry.get('box'))
            ih, iw = img.shape[:2]
            if box_dict:
                cx, cy, bw, bh = box_dict['x'], box_dict['y'], box_dict['w'], box_dict['h']
                x1 = max(0, min(iw - 4, int(round((cx - bw / 2.0) * iw))))
                x2 = max(x1 + 4, min(iw, int(round((cx + bw / 2.0) * iw))))
                y1 = max(0, min(ih - 4, int(round((cy - bh / 2.0) * ih))))
                y2 = max(y1 + 4, min(ih, int(round((cy + bh / 2.0) * ih))))
                jersey_crop = img[y1:y2, x1:x2]
            else:
                j_crops = extract_jersey_crops(img, subjects, max_subjects=1)
                jersey_crop = j_crops[0][1] if j_crops else img
                box_dict = _norm_box_list_to_dict(j_crops[0][2]) if j_crops else None

            crop_filename = f'jersey_{i:05d}.jpg'
            crop_path = crops_dir / crop_filename
            cv2.imwrite(str(crop_path), jersey_crop)

            source_raw = it.get('source')
            source_path = Path(source_raw) if source_raw else None
            orig_url = (
                os.path.relpath(source_path, out_dir).replace('\\', '/')
                if source_path and source_path.exists()
                else None
            )
            full_url = os.path.relpath(thumb_path, out_dir).replace('\\', '/')

            detected_nums: list[str] = []
            for e in all_entries:
                n_val = str(e.get('num') or '').strip().upper()
                if n_val and n_val not in detected_nums:
                    detected_nums.append(n_val)

            max_conf = max((float(e.get('conf', 0.0)) for e in all_entries), default=0.0)
            tier = 'emitted' if emitted_entries else 'candidate'

            manifest.append(
                {
                    'thumb': thumb,
                    'cropUrl': f'crops/{crop_filename}',
                    'fullUrl': full_url,
                    'originalUrl': orig_url,
                    'year': it.get('year', ''),
                    'eventName': it.get('event_name', ''),
                    'teams': it.get('teams') or [],
                    'isJuniorBout': it.get('is_junior_bout', False),
                    'box': box_dict,
                    'subjectBox': primary_subj,
                    'role': role or 'skater',
                    'detectedNumbers': detected_nums,
                    'maxConf': round(max_conf, 4),
                    'tier': tier,
                }
            )

    (out_dir / 'numbers_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    html_out = out_dir / 'numbers.html'
    html_out.write_text(generate_numbers_labeling_html(manifest, existing_overrides), encoding='utf-8')
    return {'extracted': len(manifest), 'html_path': str(html_out)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, default=1200)
    parser.add_argument('--out', default=str(DEFAULT_OUT_DIR))
    parser.add_argument(
        '--numbers',
        action='store_true',
        help='Generate the Jersey # OCR Inspector & Override Labeler (data/labeling/numbers.html)',
    )
    parser.add_argument(
        '--include-non-skaters',
        action='store_true',
        help='Include ref/spectator detections when running with --numbers',
    )
    args = parser.parse_args(argv)
    if args.numbers:
        res = extract_number_crops(
            out_dir=Path(args.out),
            limit=args.limit,
            include_non_skaters=args.include_non_skaters,
        )
        print(f"Extracted {res['extracted']} jersey OCR crops -> {res['html_path']}")
    else:
        res = extract_crops(out_dir=Path(args.out), limit=args.limit)
        print(f"Extracted {res['extracted']} helmet crops -> {res['html_path']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
