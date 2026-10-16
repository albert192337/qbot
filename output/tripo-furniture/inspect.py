import bpy, json
from pathlib import Path
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=r'C:/Users/liuchang06/Downloads/halloween room props 3d model.glb')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
rows=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH': continue
 coords=[o.matrix_world@v.co for v in o.data.vertices]
 lo=[min(v[i] for v in coords) for i in range(3)]; hi=[max(v[i] for v in coords) for i in range(3)]
 rows.append(dict(name=o.name,faces=len(o.data.polygons),lo=lo,hi=hi))
Path('output/tripo-furniture/components.json').write_text(json.dumps(rows,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(Path('output/tripo-furniture/split.blend').resolve()))
print('COMPONENTS',len(rows))
