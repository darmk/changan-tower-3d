"""Render shared camera definitions for thumbnails and final source-model proof."""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
scene=next(s for s in bpy.data.scenes if s.objects.get('DayanPagoda'))
bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.film_transparent=False
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs[0].default_value=(.72,.69,.63,1);bg.inputs[1].default_value=.6
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=90
scene.render.resolution_x=720;scene.render.resolution_y=720;scene.render.resolution_percentage=100
camera=scene.camera;camera.data.type='PERSP';camera.data.lens=42;camera.data.clip_end=1000
poses=json.loads((ROOT/'public/model/cameras.json').read_text())
lamp_data=bpy.data.lights.new('Interior_preview_fill','AREA');lamp_data.energy=450;lamp_data.shape='DISK';lamp_data.size=3
lamp=bpy.data.objects.new('Interior_preview_fill',lamp_data);scene.collection.objects.link(lamp)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if args:poses=[p for p in poses if p['key'] in args]
for p in poses:
    for obj in scene.objects:
        if obj.get('componentType')=='facade' and obj.get('facade')=='S':
            for child in obj.children_recursive:child.hide_render=bool(p.get('section'))
    pos=p['position'];target=p['target'];camera.location=(pos[0],-pos[2],pos[1])
    camera.rotation_euler=(Vector((target[0],-target[2],target[1]))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=35 if p.get('interior') else 42
    lamp.hide_render=not bool(p.get('interior'));lamp.location=camera.location;lamp.rotation_euler=camera.rotation_euler
    scene.render.filepath=str(ROOT/f"public/model/views/{p['key']}.jpg")
    bpy.ops.render.render(write_still=True)
    print('RENDERED',p['key'],flush=True)
