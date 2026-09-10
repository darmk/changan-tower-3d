import bpy
from geometry import MATERIALS

def create_materials(root):
    folder=root/'blender/textures'
    for name in ['brick','eave','stone','stele','wood']:
        m=bpy.data.materials.new('PBR_'+name);m.use_nodes=True
        n=m.node_tree.nodes;links=m.node_tree.links;bs=next(node for node in n if node.type=='BSDF_PRINCIPLED')
        bs.inputs['Roughness'].default_value=.9
        for kind in ['color','normal','orm']:
            p=folder/f'{name}-{kind}.{ "jpg" if kind=="color" else "png"}'
            im=bpy.data.images.load(str(p),check_existing=True)
            if kind!='color':im.colorspace_settings.name='Non-Color'
            im.pack();t=n.new('ShaderNodeTexImage');t.image=im;t.label=kind
            if kind=='color':links.new(t.outputs['Color'],bs.inputs['Base Color'])
            elif kind=='normal':
                nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65
                links.new(t.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
            else:
                sep=n.new('ShaderNodeSeparateColor');links.new(t.outputs['Color'],sep.inputs[0]);links.new(sep.outputs['Green'],bs.inputs['Roughness']);links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
                # glTF-recognized AO group.
                tree=bpy.data.node_groups.get('glTF Material Output') or bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
                if not tree.interface.items_tree:tree.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
                group=n.new('ShaderNodeGroup');group.node_tree=tree;links.new(sep.outputs['Red'],group.inputs['Occlusion'])
        MATERIALS[name]=m
    for name,color,rough,metal in [('finial',(.24,.145,.075,1),.52,.1),('iron',(.075,.068,.051,1),.55,.6),('cut',(.28,.17,.10,1),.95,0)]:
        m=bpy.data.materials.new(name);m.use_nodes=True;bs=next(node for node in m.node_tree.nodes if node.type=='BSDF_PRINCIPLED')
        bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
        MATERIALS[name]=m

