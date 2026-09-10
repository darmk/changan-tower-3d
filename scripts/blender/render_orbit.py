"""Render a short Blender orbit sequence for the project README."""
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
scene = next(s for s in bpy.data.scenes if s.objects.get('DayanPagoda'))
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_x = 520
scene.render.resolution_y = 520
scene.render.resolution_percentage = 100

background = next(node for node in scene.world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs[0].default_value = (.72, .69, .63, 1)
background.inputs[1].default_value = .6

camera = scene.camera
camera.data.type = 'PERSP'
camera.data.lens = 42
camera.data.clip_end = 1000
target = Vector((0, 0, 30))
frames_dir = ROOT / 'docs/qa/.orbit-frames'
frames_dir.mkdir(parents=True, exist_ok=True)

for frame in range(16):
    angle = math.radians(-38 + frame * 360 / 16)
    camera.location = Vector((142 * math.sin(angle), -142 * math.cos(angle), 74))
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(frames_dir / f'{frame:02}.png')
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED_ORBIT_FRAME {frame + 1}/16', flush=True)
