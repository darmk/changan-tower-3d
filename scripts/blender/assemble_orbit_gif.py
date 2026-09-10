"""Assemble Blender orbit PNG frames into the optimized README animation."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
frames_dir = ROOT / 'docs/qa/.orbit-frames'
paths = sorted(frames_dir.glob('*.png'))
if len(paths) != 16:
    raise SystemExit(f'Expected 16 orbit frames, found {len(paths)}')

frames = [Image.open(path).convert('P', palette=Image.Palette.ADAPTIVE, colors=128) for path in paths]
output = ROOT / 'docs/qa/dayan-pagoda-orbit.gif'
frames[0].save(output, save_all=True, append_images=frames[1:], duration=115, loop=0, optimize=True, disposal=2)
print(output)
