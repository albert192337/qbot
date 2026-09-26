import bpy, math, json
from mathutils import Vector
from pathlib import Path
out=Path(__file__).parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r'C:\Users\beta\Downloads\strawberry 3d model.glb')
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in objs for c in o.bound_box]
lo=Vector(tuple(min(v[i] for v in points) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
center=(lo+hi)/2
size=max(hi-lo)
stats={'objects':len(objs),'vertices':sum(len(o.data.vertices) for o in objs),'triangles':sum(len(p.vertices)-2 for o in objs for p in o.data.polygons),'dimensions':list(hi-lo),'images':[{ 'name':im.name,'size':list(im.size)} for im in bpy.data.images]}
(out/'stats.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=20
scene.render.resolution_x=640
scene.render.resolution_y=640
scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('World')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.35,0.35,0.35,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.view_settings.view_transform='Standard'
for loc,power,scale in [((3,-4,5),450,4),((-4,1,3),250,3)]:
    bpy.ops.object.light_add(type='AREA', location=center+Vector(loc)*size)
    lamp=bpy.context.object
    lamp.data.energy=power*size*size
    lamp.data.shape='DISK'
    lamp.data.size=scale*size
    lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object
cam.data.type='ORTHO'
cam.data.ortho_scale=size*1.35
scene.camera=cam
for name,angle in [('front',0),('side',90),('back',180)]:
    a=math.radians(angle)
    cam.location=center+Vector((math.sin(a)*3,-math.cos(a)*3,.8))*size
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(out/(name+'.png'))
    bpy.ops.render.render(write_still=True)
# Flat base-color comparison to separate texture coloration from lighting/PBR.
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    nodes=mat.node_tree.nodes
    bs=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL'),None)
    if not bs or not output: continue
    em=nodes.new('ShaderNodeEmission')
    links=list(bs.inputs['Base Color'].links)
    if links: mat.node_tree.links.new(links[0].from_socket,em.inputs['Color'])
    else: em.inputs['Color'].default_value=bs.inputs['Base Color'].default_value
    mat.node_tree.links.new(em.outputs[0],output.inputs['Surface'])
cam.location=center+Vector((0,-3,.8))*size
cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(out/'basecolor.png')
bpy.ops.render.render(write_still=True)
