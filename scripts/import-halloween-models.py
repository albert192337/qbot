"""Import user-authored GLBs; leave originals untouched.
Requires numpy, scipy, trimesh and pymeshlab (offline asset tooling only).
Usage: python scripts/import-halloween-models.py furniture.glb grass.glb
"""
import sys, tempfile, json
from pathlib import Path
import numpy as np
import trimesh
import pymeshlab as pm
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

ROOT = Path(__file__).resolve().parents[1]
PARTS = [(0,'candles',.5,5000),(1,'lantern',1.2,10000),
         (2,'fireplace',2.7,10000),(3,'pumpkins',2.1,5000),
         (4,'chandelier',1.9,10000),(5,'books',.65,5000),(6,'cauldron',1.35,10000)]

def labels(mesh):
    _, inverse = np.unique(np.round(mesh.vertices,6),axis=0,return_inverse=True)
    edges = inverse[mesh.faces[:,[0,1,1,2,2,0]]].reshape(-1,2)
    count, components = connected_components(coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),
        shape=(inverse.max()+1,inverse.max()+1)),directed=False)
    if count != 7:
        raise ValueError('Expected the approved seven-component furniture source; inspect a changed source before importing.')
    return components[inverse][mesh.faces[:,0]]

def optimize(src, dest, width, faces, scratch):
    src.export(str(scratch/'source.obj'))
    ms=pm.MeshSet();ms.load_new_mesh(str(scratch/'source.obj'))
    ms.apply_filter('meshing_remove_duplicate_vertices')
    ms.apply_filter('meshing_decimation_quadric_edge_collapse_with_texture',targetfacenum=faces,preservenormal=True,extratcoordw=1.0)
    result=ms.current_mesh()
    vertices=result.vertex_matrix()[result.face_matrix()].reshape(-1,3)
    lo,hi=vertices.min(0),vertices.max(0)
    vertices=(vertices-[(hi[0]+lo[0])/2,lo[1],(hi[2]+lo[2])/2])*(width/(hi[0]-lo[0]))
    material=src.visual.material.copy()
    material.baseColorTexture.thumbnail((1024,1024))
    material.normalTexture=None;material.metallicRoughnessTexture=None
    material.metallicFactor=0;material.roughnessFactor=.9
    mesh=trimesh.Trimesh(vertices=vertices,faces=np.arange(len(vertices)).reshape(-1,3),
        visual=trimesh.visual.TextureVisuals(uv=result.wedge_tex_coord_matrix(),material=material),process=False)
    unique,inverse=np.unique(vertices,axis=0,return_inverse=True)
    smooth=trimesh.Trimesh(vertices=unique,faces=inverse[mesh.faces],process=False)
    mesh.vertex_normals=smooth.vertex_normals[inverse]
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(mesh.export(file_type='glb',include_normals=True))
    return dict(id=dest.stem,faces=len(mesh.faces),size=mesh.extents.tolist(),bytes=dest.stat().st_size)

if __name__=='__main__':
    furniture=trimesh.load(sys.argv[1],force='mesh',process=False)
    components=labels(furniture)
    with tempfile.TemporaryDirectory(prefix='qbot-model-import-') as directory:
        scratch=Path(directory);report=[]
        for component,name,width,faces in PARTS:
            part=furniture.submesh([np.flatnonzero(components==component)],append=True)
            report.append(optimize(part,ROOT/f'app/src/renderer/tea3d/models/halloween-{name}.glb',width,faces,scratch))
        grass=trimesh.load(sys.argv[2],force='mesh',process=False)
        report.append(optimize(grass,ROOT/'app/src/renderer/garden/assets/models/grass-tile.glb',.98,6000,scratch))
    print(json.dumps(report,indent=2))
