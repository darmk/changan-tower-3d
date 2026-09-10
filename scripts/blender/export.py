"""Export only DayanPagoda hierarchy, baking evaluated modifiers through glTF export."""
import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def export(path='blender/dayan-pagoda-raw.glb'):
    root=bpy.context.scene.objects.get('DayanPagoda')
    if root is None:raise RuntimeError('DayanPagoda scene must be active')
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root,*root.children_recursive]:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(ROOT/path),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_extras=True,export_yup=True,export_tangents=True,export_cameras=False,export_lights=False,export_animations=False,export_materials='EXPORT')
    print('Exported',path)
if __name__=='__main__':export()

