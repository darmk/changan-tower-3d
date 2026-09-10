"""Blender 4.2+ reproducible pagoda generator. --stage init|platform|floor1..7|crown|finish|all."""
from pathlib import Path
import sys, json, math, random, argparse
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/blender'))
from geometry import batch,box,beam,prism,ring,lathe,wall,arch_ring,empty,flush,MATERIALS
from materials import create_materials
CFG=json.loads((ROOT/'scripts/blender/config.json').read_text(encoding='utf-8'))
random.seed(CFG['seed'])

def init():
    # Create our own scene; leave the user's original scene and its objects intact.
    scene=bpy.data.scenes.new('DayanPagoda_Exhibition')
    bpy.context.window.scene=scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    scene.render.engine='CYCLES';scene.cycles.samples=32
    scene.world=bpy.data.worlds.new('PaperStudio');scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
    bg.inputs[0].default_value=(.78,.80,.84,1)
    bg.inputs[1].default_value=.55
    create_materials(ROOT)
    empty('DayanPagoda',evidence='Research visualization; dimensions and interiors approximate',units='metres',totalHeight=64.7)
    print('Created separate DayanPagoda scene with original PBR maps')

def root():return bpy.context.scene.objects['DayanPagoda']

def platform():
    p=empty('Platform',root(),componentType='platform',floor=0)
    b=batch('Platform_Brick','brick',p,componentType='platform')
    box(b,(0,0,2.05),(45.7,48.7,4.1))
    stone=batch('Platform_Stone','stone',p,componentType='platform')
    box(stone,(0,0,4.12),(46.05,49.05,.16))
    # Stone coping courses, paving grid, and discrete weathered edges.
    for z,w,d,h in [(.15,46.15,49.15,.3),(3.78,45.95,48.95,.14),(3.98,46.25,49.25,.12)]:box(stone,(0,0,z),(w,d,h))
    paving=batch('Platform_Paving','stone',p,componentType='platform')
    for i in range(-14,15):
        for j in range(-15,16):
            x=i*1.54;y=j*1.54
            if abs(x)<13.0 and abs(y)<13.0:continue
            box(paving,(x,y,4.225),(1.522,1.522,.05))
    # Broad southern stairs climb from forecourt to platform top.
    for k in range(24):
        tread=.32;rise=4.2/24;y=-24.5-(24-k)*tread
        box(stone,(0,y,(k+1)*rise/2),(5.4,tread+.025,(k+1)*rise))
    for sx in [-1,1]:
        beam(stone,(sx*3,-32.3,.28),(sx*3,-24.3,4.48),.4,.45)
    # Modest parapet reflects the platform boundary without inventing ornate balustrades.
    for angle in [0,math.pi/2,math.pi,math.pi*1.5]:
        half=22.7 if angle in [0,math.pi] else 24.2
        dep=24.2 if angle in [0,math.pi] else 22.7
        for a,c in ([(-half,-3.2),(3.2,half)] if angle==0 else [(-half,half)]):
            box(b,((a+c)/2,-dep,4.65),(c-a,.48,.85),angle)
            box(stone,((a+c)/2,-dep,5.09),(c-a+.04,.62,.12),angle)
        for x in [-half,half]:box(stone,(x,-dep,4.81),(.68,.68,1.15),angle)
    flush();print('Platform completed')

def floor_build(level):
    f=CFG['floors'][level-1];z=f['z'];h=f['height'];w=f['width'];inside=f['inner']
    p=empty(f'Floor{level:02}',root(),floor=level,componentType='floor',baseZ=z,height=h,bays=f['bays'])
    for side,angle in [('S',0),('E',math.pi/2),('N',math.pi),('W',math.pi*1.5)]:
        fp=empty(f'Floor{level:02}_Facade{side}',p,facade=side,componentType='facade',floor=level)
        b=batch(fp.name+'_Wall','brick',fp,componentType='wall',floor=level,facade=side)
        openings=[(0,f['doorWidth'],f['doorHeight'],.0 if level==1 else .12)]
        if level==1 and side=='S':openings=[(-5.9,2.1,3.65,.0),*openings,(5.9,2.1,3.65,.0)]
        wall(b,f,angle,openings)
        detail=batch(fp.name+'_Brickwork','brick',fp,componentType='pilasters',floor=level,facade=side)
        top=z+h-1.08;face=-w/2
        # Flat pilasters, small capitals and two lintel bands, with true taper.
        for j in range(f['bays']+1):
            x=-w/2+.32+(w-.64)*j/f['bays']
            xb=x*(1-f['taper']/w)
            beam(detail,tuple_rot((x,face-.075,z+.25),angle),tuple_rot((xb,face+f['taper']/2-.075,top-.75),angle),.26,.24)
            box(detail,(xb,face+f['taper']/2-.1,top-.63),(.46,.38,.26),angle)
        for dz,th,dep in [(-.43,.19,.2),(-.15,.18,.26)]:
            box(detail,(0,face+f['taper']/2-.08,top+dz),(w-f['taper']+.15,dep,th),angle)
        for x,ww,dh,sill in openings:
            arch_ring(detail,x,face+.1,z+sill,ww,dh,angle)
            if level>1:
                iron=batch(fp.name+'_Guard','iron',fp,componentType='windowGuard',floor=level,facade=side)
                for t in [-.35,0,.35]:box(iron,(x+t*ww,face+.28,z+sill+.55),(.035,.045,.95),angle)
                box(iron,(x,face+.28,z+sill+1.04),(ww,.06,.055),angle)
        if level==1:
            s=batch(fp.name+'_StonePortal','stone',fp,componentType='portal',floor=1,facade=side)
            # Stone portal under outer brick relieving arch.
            for sx in [-1,1]:box(s,(sx*1.02,face+.10,z+1.38),(.22,.38,2.76),angle)
            box(s,(0,face+.08,z+2.84),(2.42,.42,.27),angle)
            box(s,(0,face+.10,z+.06),(2.35,.55,.12),angle)
        if level==1 and side=='S':
            for x in [-5.9,5.9]:
                # Close the blind niche, distinct from the central passage.
                box(b,(x,face+1.05,z+1.86),(2.35,.25,3.72))
                stele=batch(f'Stele_{"West" if x<0 else "East"}','stele',fp,componentType='stele',floor=1,evidence='Simplified stele form; inscription deliberately not fabricated')
                box(stele,(x,face+.42,z+.24),(1.54,.65,.48))
                poly=[(x-.55,z+.48),(x+.55,z+.48),(x+.47,z+2.68)]
                poly +=[(x+.47*math.cos(a),z+2.68+.47*math.sin(a)) for a in [i*math.pi/20 for i in range(1,21)]]
                prism(stele,poly,face+.30,face+.62)
                # Recessed framed field and a restrained border, no made-up text.
                for sx in [-1,1]:box(stele,(x+sx*.44,face+.282,z+1.53),(.035,.04,1.94))
                for zz in [z+.57,z+2.5]:box(stele,(x,face+.282,zz),(.91,.04,.035))
    # Corbelled eaves: square ring steps, two diamond-tooth courses and sloped coping.
    ep=empty(f'Floor{level:02}_Eaves',p,componentType='eaves',floor=level)
    e=batch(ep.name+'_Courses','eave',ep,componentType='eaves',floor=level)
    wt=w-f['taper'];base=z+h-1.08
    for j in range(5):ring(e,wt+.12+j*.22,wt+.12+j*.22,base+j*.11,base+(j+1)*.11,inside)
    for zz,extent in [(base+.18,wt+.58),(base+.41,wt+1.02)]:
        for angle in [0,math.pi/2,math.pi,math.pi*1.5]:
            count=int(extent/.31)
            for j in range(count):
                x=-extent/2+(j+.5)*extent/count
                # Rhomboid end faces, geometry in silhouette, mesh batched per level.
                prism(e,[(x-.13,zz+.07),(x,zz),(x+.13,zz+.07),(x,zz+.14)],-extent/2-.035,-extent/2+.22,angle)
    ring(e,wt+1.22,wt+.0,base+.56,z+h-.10,inside)
    ring(e,wt+1.3,wt+1.3,base+.5,base+.60,inside)
    # Fine coping brick seams on the sloping upper eave; actual geometry near the edge.
    for angle in [0,math.pi/2,math.pi,math.pi*1.5]:
        n=int((wt+.8)/.34)
        for j in range(n):
            x=-(wt+.8)/2+(j+.5)*(wt+.8)/n
            beam(e,tuple_rot((x,-(wt+1.22)/2,base+.61),angle),tuple_rot((x,-wt/2,z+h-.07),angle),.022,.025)
    interior(f,p)
    objects=flush()
    print('Floor',level,':',len(objects),'meshes,',sum(len(o.data.polygons) for o in objects),'faces')

def tuple_rot(p,angle):
    from geometry import transform
    return transform(p,angle)

def interior(f,p):
    level=f['level'];z=f['z'];h=f['height'];r=f['inner']/2
    ip=empty(f'Floor{level:02}_Interior',p,componentType='interior',floor=level,evidence='Approximate interior and stair route')
    b=batch(ip.name+'_Timber','wood',ip,componentType='interior',floor=level)
    # Platform is open along the east wall for the arriving staircase.
    if level==1:box(b,(0,0,z+.05),(r*2,r*2,.1))
    else:
        box(b,(-.65,0,z+.07),(r*2-1.3,r*2,.14))
        box(b,(r-.65,-r+.55,z+.07),(1.3,1.1,.14))
    for x in [-r+.16,r-.16]:
        box(b,(x,0,z-.1),(.2,r*2,.27))
    if level==7:
        box(b,(0,0,z+h-.2),(r*2,r*2,.17));return
    # Four perimeter flights per storey, with horizontal corner landings.
    # Last landing is on east/south corner, lining up with the next floor opening.
    q=r-.55;points=[(q,-q),( -q,-q),(-q,q),(q,q),(q,-q)]
    steps=12 if level==1 else 10
    for j in range(4):
        a=Vector((*points[j],z+j*h/4+.14));c=Vector((*points[j+1],z+(j+1)*h/4+.14))
        d=c-a;flat=Vector((d.x,d.y,0));angle=math.atan2(flat.y,flat.x)
        for k in range(steps):
            t=(k+.5)/steps;pos=a+d*t
            # Rise/top elevation advances monotonically, treads remain horizontal.
            box(b,tuple(pos),(flat.length/steps+.025,.94,.11),0) if abs(d.x)>0 else box(b,tuple(pos),(.94,flat.length/steps+.025,.11))
        normal=Vector((-flat.y,flat.x,0)).normalized()*.48
        for sign in [-1,1]:
            beam(b,a+normal*sign-Vector((0,0,.15)),c+normal*sign-Vector((0,0,.15)),.13,.19)
            beam(b,a+normal*sign+Vector((0,0,.95)),c+normal*sign+Vector((0,0,.95)),.075)
            for k in range(steps+1):
                pos=a+d*(k/steps)+normal*sign
                beam(b,pos,pos+Vector((0,0,.92)),.045)
        box(b,(c.x,c.y,c.z),(.98,.98,.12))

def crown():
    p=empty('Crown',root(),componentType='crown',floor=7)
    b=batch('Crown_Masonry','eave',p,componentType='crown',floor=7)
    # Brick pyramidal cap with a concave profile; smooth profile represented by brick courses.
    z=55.6;steps=40
    def width(t):return 3.2+9.4*(1-t)**1.9
    for j in range(steps):
        t=j/steps;s=(j+1)/steps
        ring(b,width(t),width(s),z+t*4.5,z+s*4.5,0)
    # Corner ridge strips are continuous over the cap profile.
    for sx,sy in [(-1,-1),(1,-1),(1,1),(-1,1)]:
        for j in range(steps):
            t=j/steps;s=(j+1)/steps
            beam(b,(sx*width(t)/2,sy*width(t)/2,z+t*4.5+.04),(sx*width(s)/2,sy*width(s)/2,z+s*4.5+.04),.11)
    fin=batch('Finial_Ceramic','finial',p,componentType='finial',floor=7)
    profile=[(1.30,60.1),(1.34,60.25),(.91,60.44),(.75,60.6),(.85,60.85),(.96,61.15),(.88,61.52),(.55,61.86),(.44,62.02),(.67,62.22),(.73,62.52),(.56,62.86),(.35,63.02),(.48,63.2),(.50,63.43),(.36,63.64),(.22,63.79),(.29,63.95),(.23,64.15),(.12,64.38),(.015,64.7)]
    lathe(fin,profile,80)
    flush();print('Crown and finial completed')

def studio():
    from mathutils import Vector
    p=empty('Studio')
    for name,loc,energy,size in [('Key',(35,-55,90),140000,40),('Fill',(-45,-15,50),65000,32),('Rim',(15,35,65),85000,25)]:
        l=bpy.data.lights.new(name,'AREA');l.energy=energy;l.shape='DISK';l.size=size
        o=bpy.data.objects.new(name,l);bpy.context.scene.collection.objects.link(o);o.parent=p;o.location=loc;o.rotation_euler=(Vector((0,0,26))-o.location).to_track_quat('-Z','Y').to_euler()
    ca=bpy.data.cameras.new('Overview');o=bpy.data.objects.new('Overview',ca);bpy.context.scene.collection.objects.link(o);o.parent=p;o.location=(91,-129,82)
    o.rotation_euler=(Vector((0,0,29))-o.location).to_track_quat('-Z','Y').to_euler();ca.type='ORTHO';ca.ortho_scale=83
    bpy.context.scene.camera=o
    scene=bpy.context.scene;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.film_transparent=True
    scene.view_settings.view_transform='AgX'
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=105;area.spaces.active.region_3d.view_location=(0,0,30)
            area.spaces.active.region_3d.view_rotation=o.rotation_euler.to_quaternion()
            area.spaces.active.clip_end=1000
            area.spaces.active.shading.type='MATERIAL'

def finish():
    studio()
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            # Tiny bevels improve close-up edges without changing architectural silhouette.
            if 'Wall' in obj.name or 'StonePortal' in obj.name or 'Stele_' in obj.name:
                mod=obj.modifiers.new('Edge softening 12mm','BEVEL');mod.width=.012;mod.segments=2
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/dayan-pagoda.blend'))
    print('Saved editable source',ROOT/'blender/dayan-pagoda.blend')

def run(stage):
    if stage=='init':init();return
    if not MATERIALS:
        for name in ['brick','eave','stone','stele','wood']:MATERIALS[name]=bpy.data.materials.get('PBR_'+name)
        for name in ['finial','iron','cut']:MATERIALS[name]=bpy.data.materials.get(name)
    if stage=='platform':platform()
    elif stage.startswith('floor'):floor_build(int(stage[5:]))
    elif stage=='crown':crown()
    elif stage=='finish':finish()
    elif stage=='all':
        init();platform()
        for n in range(1,8):floor_build(n)
        crown();finish()

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser();parser.add_argument('--stage',default='all')
    run(parser.parse_args(args).stage)
