import bpy, math, random, os
from mathutils import Vector

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
random.seed(23)

def material(name, color, roughness):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=roughness
    return m
red=material('Strawberry | coral red',(0.64,0.025,0.042),0.32)
red.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=0.055
green=material('Leaves | fresh green',(0.085,0.30,0.032),0.42)
lightgreen=material('Leaf veins',(0.22,0.43,0.06),0.48)
gold=material('Seeds | warm cream',(0.90,0.62,0.22),0.36)
ground=material('Backdrop | blush',(0.63,0.46,0.43),0.8)

def radius(t):
    return 0.98*math.sin(t)*(0.79+0.29*math.cos(t))
def surface(t,a):
    r=radius(t); return Vector((r*math.cos(a),r*math.sin(a),1.36+1.16*math.cos(t)))
def normal(t,a):
    d=0.0001; tangent=(surface(t+d,a)-surface(t-d,a)).normalized()
    az=Vector((-math.sin(a),math.cos(a),0))
    return tangent.cross(az).normalized()

# Staggered seed sites; the berry mesh has actual shallow dimples around them.
sites=[]
for row in range(12):
    t=0.42+row*0.205
    count=max(5,round(30*math.sin(t)*(0.79+0.29*math.cos(t))))
    for j in range(count):
        a=2*math.pi*(j+0.5*(row%2))/count+random.uniform(-0.025,0.025)
        tt=t+random.uniform(-0.018,0.018)
        sites.append((tt,a,surface(tt,a)))
verts=[]; faces=[]; rings=112; sides=160
for i in range(rings+1):
    t=0.0001+(math.pi-0.0002)*i/rings
    for j in range(sides):
        a=j*2*math.pi/sides; p=surface(t,a); n=normal(t,a)
        depth=0
        for tt,aa,q in sites:
            if abs(tt-t)<0.14:
                dist=(p-q).length
                if dist<0.10: depth+=0.025*math.exp(-(dist/0.046)**2)
        verts.append(p-n*depth)
for i in range(rings):
    for j in range(sides):
        a=i*sides+j; b=i*sides+(j+1)%sides
        faces.append((a,a+sides,b+sides,b))
mesh=bpy.data.meshes.new('Berry dimpled surface'); mesh.from_pydata(verts,[],faces); mesh.update()
berry=bpy.data.objects.new('Strawberry • fruit',mesh); bpy.context.collection.objects.link(berry); berry.data.materials.append(red)
for p in mesh.polygons:p.use_smooth=True

seed_objects=[]
for i,(t,a,p) in enumerate(sites):
    n=normal(t,a)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,location=p-n*0.009)
    obj=bpy.context.object; obj.name=f'Seed {i+1:03d}'
    obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=n.to_track_quat('Z','Y')
    obj.scale=(0.022,0.043,0.018); obj.data.materials.append(gold)
    for f in obj.data.polygons:f.use_smooth=True
    seed_objects.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in seed_objects:obj.select_set(True)
bpy.context.view_layer.objects.active=seed_objects[0]; bpy.ops.object.join(); bpy.context.object.name='Strawberry • seeds'

def curve(name, points, bevel, mat):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=bevel;data.bevel_resolution=3
    s=data.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat);return obj

for k in range(7):
    a=2*math.pi*k/7+0.25; length=random.uniform(0.77,0.96)
    vv=[]; ff=[]; mid=[]
    for i in range(17):
        u=i/16; r=0.05+length*u; width=0.225*math.sin(math.pi*u)**0.8
        z=2.49+0.18*math.sin(math.pi*u)-0.27*u*u
        mid.append((r*math.cos(a),r*math.sin(a),z+0.014))
        for j in range(5):
            v=(j-2)/2; w=width*v
            vv.append((r*math.cos(a)-w*math.sin(a),r*math.sin(a)+w*math.cos(a),z-0.07*abs(v)*math.sin(math.pi*u)))
    for i in range(16):
        for j in range(4):q=i*5+j;ff.append((q,q+5,q+6,q+1))
    me=bpy.data.meshes.new('Leaf');me.from_pydata(vv,[],ff);me.update()
    ob=bpy.data.objects.new(f'Strawberry • leaf {k+1}',me);bpy.context.collection.objects.link(ob);me.materials.append(green)
    for p in me.polygons:p.use_smooth=True
    mod=ob.modifiers.new('Soft leaf','SUBSURF');mod.levels=2
    mod=ob.modifiers.new('Leaf thickness','SOLIDIFY');mod.thickness=0.012
    curve(f'Leaf vein {k+1}',mid[::4],0.009,lightgreen)
curve('Strawberry • curved stem',[(0,0,2.47),(0.01,0,2.70),(0.10,0.025,2.85),(0.18,0.05,2.88)],0.065,green)

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0.17));bpy.context.object.name='Studio floor';bpy.context.object.data.materials.append(ground)
def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-6,3.8));cam=bpy.context.object;cam.name='Presentation camera';aim(cam,(0,0,1.53));cam.data.type='ORTHO';cam.data.ortho_scale=3.9;bpy.context.scene.camera=cam
for name,loc,power,size in [('Key',(-3,-4,6),650,4),('Fill',(4,-1,3),350,3),('Rim',(1,4,5),700,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;aim(l,(0,0,1.4))
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=True
sc.world.color=(0.25,0.25,0.25);sc.render.resolution_x=800;sc.render.resolution_y=800;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX';sc.render.image_settings.file_format='PNG';sc.render.filepath=os.path.join(OUT,'strawberry.png')
bpy.ops.object.select_all(action='DESELECT');berry.select_set(True);bpy.context.view_layer.objects.active=berry
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'strawberry.blend'))
bpy.ops.render.render(write_still=True)
print('STRAWBERRY_READY')
