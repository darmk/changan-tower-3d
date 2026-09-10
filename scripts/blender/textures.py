"""Original deterministic PBR maps; run with Python + numpy + Pillow before Blender.
No third-party photographs are embedded. All scales are in metres.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'blender/textures'
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(652)

def field(size, cells, strength=1):
    a = RNG.random((cells, cells)).astype('float32')
    return np.asarray(Image.fromarray(a).resize((size,size), Image.Resampling.BICUBIC)) * strength

def save(name, color, height, rough, normal_strength=3):
    n = color.shape[0]
    Image.fromarray(np.uint8(np.clip(color,0,1)*255)).save(OUT/f'{name}-color.jpg',quality=94,subsampling=0)
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*normal_strength
    dy=(np.roll(height,-1,0)-np.roll(height,1,0))*normal_strength
    normal=np.stack([-dx,dy,np.ones_like(height)],-1)
    normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    Image.fromarray(np.uint8((normal*.5+.5)*255)).save(OUT/f'{name}-normal.png')
    orm=np.stack([np.clip(.78+height*.22,0,1),np.clip(rough,0,1),np.zeros((n,n))],-1)
    Image.fromarray(np.uint8(orm*255)).save(OUT/f'{name}-orm.png')

def bricks():
    n=2048
    y,x=np.mgrid[0:n,0:n]/n
    row=np.floor(y*16).astype(int)
    col=np.floor(x*8+(row%2)*.5).astype(int)%8
    fx=(x*8+(row%2)*.5)%1; fy=(y*16)%1
    edge=np.minimum(np.minimum(fx,1-fx)*256,np.minimum(fy,1-fy)*128)
    noise=field(n,300)
    mortar=np.clip((edge-2.2-noise*1.9)/3,0,1)
    variation=RNG.uniform(-.035,.035,(16,8))[row,col]
    broad=field(n,8)-.5; medium=field(n,100)-.5
    grain=RNG.normal(0,.008,(n,n))
    v=variation+broad*.026+medium*.026+grain
    color=np.array([.63,.535,.421])[None,None,:]+v[:,:,None]*np.array([1,.94,.83])
    grout=np.array([.465,.424,.356])[None,None,:]+medium[:,:,None]*.025
    color=color*mortar[:,:,None]+grout*(1-mortar[:,:,None])
    pores=np.clip((field(n,700)-.7)*3,0,.4)
    h=mortar*.5+medium*.025-pores*.06
    save('brick',color,h,np.clip(.9+medium*.12,0,1),2.2)
    # Darker, cooler bricks used on the corbelled eaves and crown.
    save('eave',color*np.array([.76,.79,.81]),h,np.clip(.9+medium*.1,0,1),2.2)

def stone():
    n=1024; noise=field(n,160)-.5; broad=field(n,9)-.5
    h=noise*.12+broad*.05
    color=np.array([.54,.52,.46])+((noise*.14+broad*.07)[:,:,None])
    save('stone',color,h,np.ones((n,n))*.89,3)
    color2=np.array([.285,.277,.248])+noise[:,:,None]*.1
    save('stele',color2,h,np.ones((n,n))*.8,2)

def wood():
    n=1024; y,x=np.mgrid[0:n,0:n]/n
    grain=np.sin(x*430+np.sin(y*12)*2+field(n,8)*4)*.016
    broad=field(n,30)-.5
    color=np.array([.31,.19,.11])+(grain+broad*.08)[:,:,None]
    save('wood',color,grain+broad*.035,np.ones((n,n))*.69,3)

def weather():
    # Transparent, original mineral stains. Repeated sparingly with varied UV offset.
    n=1024; y,x=np.mgrid[0:n,0:n]/n
    a=np.maximum(0,field(n,9)-.43)*.42
    a*=np.clip((y-.4)*2.5,0,1)
    rgb=np.full((n,n,4),0,dtype=np.uint8);rgb[:,:,:3]=[75,66,48];rgb[:,:,3]=np.uint8(a*255)
    Image.fromarray(rgb).save(OUT/'weather.png')

if __name__=='__main__':
    bricks();stone();wood();weather();print('Generated 16 original PBR texture maps:',OUT)

