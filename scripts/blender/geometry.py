"""Direct mesh construction inside Blender, grouped by semantic component and material."""
import bpy, math, random
from mathutils import Vector

GROUPS={}
MATERIALS={}

class MeshBatch:
    def __init__(self,name,material,parent,meta):
        self.name=name;self.material=material;self.parent=parent;self.meta=meta
        self.vertices=[];self.faces=[]
    def add(self,vertices,faces):
        offset=len(self.vertices);self.vertices.extend(vertices)
        self.faces.extend([tuple(i+offset for i in f) for f in faces])
    def finish(self):
        m=bpy.data.meshes.new(self.name)
        m.from_pydata(self.vertices,[],self.faces);m.update()
        o=bpy.data.objects.new(self.name,m);bpy.context.scene.collection.objects.link(o)
        o.parent=self.parent;o.data.materials.append(MATERIALS[self.material])
        for k,v in self.meta.items():o[k]=v
        uv=m.uv_layers.new(name='UVMap')
        scale=(3.2,1.6) if self.material in ['brick','eave'] else (2,2)
        for p in m.polygons:
            axis=max(range(3),key=lambda i:abs(p.normal[i]))
            for li in p.loop_indices:
                co=m.vertices[m.loops[li].vertex_index].co
                if axis==2:u,v=co.x,co.y
                elif axis==1:u,v=co.x,co.z
                else:u,v=co.y,co.z
                uv.data[li].uv=(u/scale[0],v/scale[1])
        return o

def batch(name,material,parent,**meta):
    key=(name,material)
    if key not in GROUPS:GROUPS[key]=MeshBatch(name,material,parent,meta)
    return GROUPS[key]

def transform(p,angle):
    x,y,z=p;c=math.cos(angle);s=math.sin(angle)
    return (x*c-y*s,x*s+y*c,z)

def box(b,center,size,angle=0):
    x,y,z=center;w,d,h=size
    vv=[(x+sx*w/2,y+sy*d/2,z+sz*h/2) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    b.add([transform(p,angle) for p in vv],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def prism(b,poly,front,back,angle=0):
    # poly is CCW in X/Z; outward front is -Y.
    n=len(poly);v=[transform((x,y,z),angle) for y in [front,back] for x,z in poly]
    b.add(v,[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])

def beam(b,a,c,width,depth=None):
    d=Vector(c)-Vector(a); q=Vector((0,0,1)).rotation_difference(d.normalized())
    w=width/2;t=(depth or width)/2;h=d.length/2;mid=(Vector(a)+Vector(c))/2
    v=[tuple(q@Vector((x*w,y*t,z*h))+mid) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    b.add(v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def lathe(b,profile,segments=64):
    v=[(r*math.cos(i*math.tau/segments),r*math.sin(i*math.tau/segments),z) for r,z in profile for i in range(segments)]
    f=[]
    for j in range(len(profile)-1):
        for i in range(segments):
            k=j*segments+i;n=j*segments+(i+1)%segments;f.append((k,n,n+segments,k+segments))
    f.extend([tuple(range(segments-1,-1,-1)),tuple(range((len(profile)-1)*segments,len(profile)*segments))])
    b.add(v,f)

def ring(b,w0,w1,z0,z1,inner=0):
    a=w0/2;c=w1/2
    v=[(-a,-a,z0),(a,-a,z0),(a,a,z0),(-a,a,z0),(-c,-c,z1),(c,-c,z1),(c,c,z1),(-c,c,z1)]
    if not inner:
        b.add(v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    else:
        r=inner/2;v += [(-r,-r,z0),(r,-r,z0),(r,r,z0),(-r,r,z0),(-r,-r,z1),(r,-r,z1),(r,r,z1),(-r,r,z1)]
        f=[]
        for i in range(4):
            n=(i+1)%4;f.extend([(i,n,n+4,i+4),(i+8,i+12,n+12,n+8),(i+4,n+4,n+12,i+12),(i,i+8,n+8,n)])
        b.add(v,f)

def wall(b,floor,angle,openings):
    z=floor['z'];h=floor['height']-1.08;half=floor['width']/2;inside=floor['inner']/2
    taper=floor['taper']/2
    def face_depth(t):return -half+taper*(t-z)/h
    # Fill polygons around apertures. Outer X is scaled with the facade taper.
    def piece(poly):
        n=len(poly);front=[];back=[]
        for u,t in poly:
            front.append(transform((u*(1-taper/half*(t-z)/h),face_depth(t),t),angle))
            # Miter only at wall ends; preserve doorway width and deep tunnel.
            core=1.3
            ui=u if abs(u)<=core else math.copysign(core+(abs(u)-core)*(inside-core)/(half-core),u)
            back.append(transform((ui,-inside,t),angle))
        b.add(front+back,[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
    edges=[-half]+[v for x,w,dh,sill in openings for v in [x-w/2,x+w/2]]+[half]
    for k in range(0,len(edges)-1,2):
        x1,x2=edges[k:k+2];piece([(x1,z),(x2,z),(x2,z+h),(x1,z+h)])
    for x,w,dh,sill in openings:
        r=w/2;spring=z+sill+dh-r
        if sill:piece([(x-r,z),(x+r,z),(x+r,z+sill),(x-r,z+sill)])
        # Arch is a strip of convex quad volumes: no fragile concave ngon triangulation.
        for i in range(32):
            a=math.pi-i*math.pi/32;c=math.pi-(i+1)*math.pi/32
            u1=x+math.cos(a)*r;u2=x+math.cos(c)*r
            z1=spring+math.sin(a)*r;z2=spring+math.sin(c)*r
            piece([(u1,z1),(u2,z2),(u2,z+h),(u1,z+h)])

def arch_ring(b,x,y,z,w,dh,angle=0):
    r=w/2;spring=z+dh-r;th=.23
    for i in range(25):
        a=i*math.pi/25+.004;c=(i+1)*math.pi/25-.004
        p=[(x+math.cos(a)*r,spring+math.sin(a)*r),(x+math.cos(a)*(r+th),spring+math.sin(a)*(r+th)),(x+math.cos(c)*(r+th),spring+math.sin(c)*(r+th)),(x+math.cos(c)*r,spring+math.sin(c)*r)]
        prism(b,p,y-.04,y+.14,angle)
    for sx in [-1,1]:
        for k in range(max(1,int((dh-r)/.18))):
            zz=z+(k+.5)*.18
            box(b,(x+sx*(r+th/2),y,zz),(th,.22,.17),angle)

def empty(name,parent=None,**meta):
    o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.parent=parent
    for k,v in meta.items():o[k]=v
    return o

def flush():
    result=[b.finish() for b in GROUPS.values()];GROUPS.clear();return result
