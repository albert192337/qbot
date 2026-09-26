"""Isolated local-model experiment; never controls QBot or reads user data."""
import argparse
import json
import os
import random
import time
import platform
import importlib.metadata
from pathlib import Path

REACTIONS = {
    'none': '不做即时反应', 'surprised': '吃惊一下', 'nod': '轻轻点头',
    'cheer': '开心欢呼', 'sad': '短暂难过', 'wave': '挥手打招呼',
    'blush': '害羞一下', 'comfort': '温柔安慰', 'laugh': '笑一下',
    'angry': '生气跺脚', 'yawn': '打哈欠', 'wink': '眨眼示意',
    'clap': '鼓掌', 'confused': '疑惑歪头', 'bow': '鞠躬致谢', 'shiver': '害怕发抖',
}
BEHAVIORS = {
    'keep': '保持当前姿态', 'lie_sad': '郁闷趴着', 'dance': '开心跳舞',
    'quiet': '安静坐着陪伴', 'sleep': '躺下睡觉', 'read': '坐着看书',
    'look_friend': '安静看向同伴', 'listen_music': '随音乐轻轻摇摆',
    'walk': '慢慢散步', 'stretch': '做舒展运动', 'look_sky': '坐着看天空',
    'tea': '坐着喝茶', 'think': '托腮思考', 'guard': '站着守候',
    'play': '独自玩玩具', 'hide': '躲在角落',
}
# Expected sets are fixed before inference. Synthetic probe, not a production benchmark.
CASES = [
    ('bad_news', '你是情绪明显的小动物。刚得知期待的旅行取消了，先震惊，然后低落地趴一会儿。', ['surprised'], ['lie_sad']),
    ('good_news', '你是活泼角色。主人突然宣布中奖，先惊喜一下，随后开心跳舞庆祝。', ['surprised','cheer'], ['dance']),
    ('quiet_pet', '你是内敛寡言但关心主人的角色。主人正在专注写作，轻轻摸了你一下，适合简短回应后安静陪着。', ['nod'], ['quiet','keep']),
    ('sad_user', '主人说今天很难过，希望你陪着。你温柔体贴，应先安慰，然后安静陪伴。', ['comfort'], ['quiet']),
    ('sleepy', '已到睡觉时间，你很困，眼睛睁不开，想打个哈欠后睡觉。', ['yawn'], ['sleep']),
    ('music', '主人开始播放喜欢的轻快歌曲，你很高兴，想先笑一下，然后随音乐轻轻摇摆。', ['laugh'], ['listen_music']),
    ('no_change', '你正在安静坐着陪主人。没有新事件，主人没有互动，当前姿态合适，不需要反应或改变。', ['none'], ['keep']),
    ('friend_arrives', '你性格安静。一位好朋友刚来到身边，先挥手欢迎，再安静看向同伴。', ['wave'], ['look_friend']),
]

def options(pool, expected, count, seed):
    rng = random.Random(seed)
    chosen = list(expected)
    rest = [k for k in pool if k not in chosen]
    rng.shuffle(rest)
    chosen += rest[:count-len(chosen)]
    rng.shuffle(chosen)
    return {k: pool[k] for k in chosen}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='.local/laya-eval/model')
    ap.add_argument('--output', default='output/laya-pet-eval')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    os.environ['USE_TF'] = '0'
    import torch
    import laya
    import psutil
    torch.set_num_threads(2)
    torch.set_num_interop_threads(1)
    dest = Path(args.output)
    dest.mkdir(parents=True, exist_ok=True)
    if (dest/'results.jsonl').exists():
        raise SystemExit('Choose a fresh --output directory; existing results are preserved.')
    start = time.perf_counter()
    agent = laya.load(str(Path(args.model).resolve()), device='cpu')
    load_seconds = time.perf_counter()-start
    print(json.dumps({'loaded_seconds': load_seconds, 'config':agent.cfg}), flush=True)
    rows = []
    plans = []
    for count in (4,8,16):
        for index,(name,state,want_r,want_b) in enumerate(CASES):
            r = options(REACTIONS,want_r,count,100+index)
            b = options(BEHAVIORS,want_b,count,200+index)
            for order in ('original','reversed'):
                plans.append((count,name,state,want_r,want_b,dict(reversed(list(r.items()))) if order=='reversed' else r,dict(reversed(list(b.items()))) if order=='reversed' else b,order))
    (dest/'cases.json').write_text(json.dumps(plans,ensure_ascii=False,indent=2),encoding='utf-8')
    for count,name,state,want_r,want_b,r,b,order in plans[:args.limit or None]:
        row={'count':count,'case':name,'order':order,'state':state,'expected_reaction':want_r,'expected_behavior':want_b,'reaction_options':r,'behavior_options':b}
        started=time.perf_counter()
        try:
            first=agent.predict(state, {'reaction':{'type':'choice','instructions':'选择桌宠现在做的一次短暂反应，只选即时动作。','criteria':r}},max_len=2048,head_max_len=1024)
            reaction=first['answers']['reaction']['choice']
            second=agent.predict(state+'\n已选择的即时反应：'+r[reaction]+'。此动作播完后，再进入持续行为。', {'behavior':{'type':'choice','instructions':'选择短暂反应结束后的持续行为，保持情绪和情境连贯。','criteria':b}},max_len=2048,head_max_len=1024)
            behavior=second['answers']['behavior']['choice']
            row.update(reaction=reaction,behavior=behavior,reaction_ok=reaction in want_r,behavior_ok=behavior in want_b,pair_ok=reaction in want_r and behavior in want_b,raw_reaction=first,raw_behavior=second)
        except Exception as exc:
            row.update(error=repr(exc),pair_ok=False,reaction_ok=False,behavior_ok=False)
        row['seconds']=time.perf_counter()-started
        row['rss_mb']=psutil.Process().memory_info().rss/2**20
        rows.append(row)
        with (dest/'results.jsonl').open('a',encoding='utf-8') as f: f.write(json.dumps(row,ensure_ascii=False,default=str)+'\n')
        print(json.dumps({k:row.get(k) for k in ['count','case','order','reaction','behavior','pair_ok','seconds','rss_mb','error']},ensure_ascii=False),flush=True)
    summary={'load_seconds':load_seconds,'torch':torch.__version__,'libraries':{k:importlib.metadata.version(k) for k in ['laya','transformers','safetensors','psutil']},'platform':platform.platform(),'threads':2,'model_path':args.model,'config':agent.cfg,'synthetic_cases':True,'groups':{}}
    for n in (4,8,16):
        group=[r for r in rows if r['count']==n]
        if not group: continue
        times=sorted(r['seconds'] for r in group)
        original={r['case']:r for r in group if r['order']=='original'}
        reversed_rows=[r for r in group if r['order']=='reversed' and r['case'] in original]
        changed=sum((r.get('reaction'),r.get('behavior'))!=(original[r['case']].get('reaction'),original[r['case']].get('behavior')) for r in reversed_rows)
        summary['groups'][str(n)]={'pairs':len(group),'reaction_correct':sum(r['reaction_ok'] for r in group),'behavior_correct':sum(r['behavior_ok'] for r in group),'both_correct':sum(r['pair_ok'] for r in group),'median_pair_seconds':times[len(times)//2],'max_pair_seconds':max(times),'max_rss_mb':max(r['rss_mb'] for r in group),'errors':sum('error' in r for r in group),'order_comparisons':len(reversed_rows),'order_changed_pairs':changed}
    (dest/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False,default=str),flush=True)

if __name__=='__main__': main()
