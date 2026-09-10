"""Finish source materials and scene packaging without touching the live user scene."""
import bpy,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
scene=next(s for s in bpy.data.scenes if s.objects.get('DayanPagoda'))
bpy.context.window.scene=scene
for image in bpy.data.images:
    if image.filepath and (ROOT/'blender/textures'/Path(image.filepath).name).is_file():
        image.filepath=str(ROOT/'blender/textures'/Path(image.filepath).name)
        image.reload();image.pack()
for obj in scene.objects:
    if obj.name=='Finial_Ceramic':
        for poly in obj.data.polygons:poly.use_smooth=len(poly.vertices)==4
for other in list(bpy.data.scenes):
    if other!=scene:bpy.data.scenes.remove(other)
scene.name='DayanPagoda_Exhibition'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/dayan-pagoda.blend'))
runpy.run_path(str(ROOT/'scripts/blender/export.py'),run_name='__main__')

