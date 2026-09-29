#!/usr/bin/env python3
"""Isolated before/after agent edits; no API dependencies or credentials committed."""
import argparse, json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path
from cases import CASES
ROOT = Path(__file__).resolve().parents[2]

def grade_case(work, case):
    """A deterministic contract pass, not proof of overall code quality/security."""
    if 'node_check' in case:
        cmd = ['node', '-e', case['node_check']]
    else:
        cmd = [sys.executable, '-c', case['check']]
    env = {'PATH': os.environ.get('PATH',''), 'HOME': str(work), 'PYTHONDONTWRITEBYTECODE':'1', 'SYSTEMROOT':os.environ.get('SYSTEMROOT','')}
    try:
        p = subprocess.run(cmd, cwd=work, env=env, capture_output=True, text=True, timeout=10)
        return {'pass':p.returncode==0, 'reason':(p.stderr or p.stdout)[-1200:]}
    except (OSError, subprocess.TimeoutExpired) as e:
        return {'pass':False, 'reason':str(e), 'error':True}

def prepare(dest, skill):
    dest.mkdir(parents=True, exist_ok=False)
    (dest/'AGENTS.md').write_text(skill)
    lines=['Complete the following independent requests in the named subdirectories. Work only in this workspace. Use the instructions in AGENTS.md. Do not access any other project. Run appropriate local checks. Save a concise results.md listing what you did and commands actually run.']
    for name, case in CASES.items():
        work=dest/name; work.mkdir()
        for file, content in case['seed'].items(): (work/file).write_text(content)
        lines.append(f'\n{name}/: {case["prompt"]}')
    (dest/'REQUEST.md').write_text('\n'.join(lines)+'\n')
    return dest

def score(dest):
    result={name:grade_case(dest/name, case) for name,case in CASES.items()}
    # Prove the generated regression test detects the old bug, not just that it exists.
    work=dest/'regression'; test=work/'test_bounds.py'; source=work/'bounds.py'
    if test.exists() and source.exists():
        saved=source.read_text()
        try:
            shutil.rmtree(work/'__pycache__', ignore_errors=True)
            green=subprocess.run([sys.executable,'-B',str(test)],cwd=work,capture_output=True,timeout=10)
            source.write_text(CASES['regression']['seed']['bounds.py'])
            shutil.rmtree(work/'__pycache__', ignore_errors=True)
            red=subprocess.run([sys.executable,'-B',str(test)],cwd=work,capture_output=True,timeout=10)
            result['regression']['detects_original_bug']=green.returncode==0 and red.returncode!=0
            result['regression']['pass'] &= result['regression']['detects_original_bug']
        finally: source.write_text(saved)
    (dest/'scores.json').write_text(json.dumps(result,indent=2)+'\n')
    return result

def selftest():
    good={
      'reuse':{'feature.py':'import utils\ndef page_slug(title): return utils.slugify(title)\n'},
      'sibling':{'bank.py':'def transfer(b,a):\n if a<0: raise ValueError("negative")\n b[0]-=a; b[1]+=a\nweb_transfer=transfer\napi_transfer=transfer\n'},
      'shared-decision':{}, 'independent':{'review.md':'Independent policies: retain separate rules.'},
      'preserve':{},
      'compatibility':{'groups.cjs':'exports.groupByStatus=rows=>{const out=Object.create(null);for(const r of rows)(out[r.status]??=[]).push(r);return out;};'},
      'orphan':{'clean.py':'def double_value(n): return n*2\ndef legacy_format(n): return f"legacy:{n}"\n'},
      'regression':{'bounds.py':'def inclusive_between(n,l,h): return l<=n<=h\n','test_bounds.py':'from bounds import inclusive_between\nassert inclusive_between(0,0,3)\nassert inclusive_between(3,0,3)\n'},
      'complete':{'duration.py':'import re\ndef seconds(t):\n if not re.fullmatch(r"(?:[0-9]+[hms])+",t): raise ValueError("invalid")\n return sum(int(n)*{"h":3600,"m":60,"s":1}[u] for n,u in re.findall(r"([0-9]+)([hms])",t))\n'},
      'hypothesis':{'average.py':'def mean(v):\n v=list(v)\n if not v: raise ValueError("empty")\n return sum(v)/len(v)\n'},
      'explanation':{'explanation.md':'A native date input removes implementation work and dependencies. Browser controls limit presentation flexibility because appearance varies across operating systems. Its value is a calendar date, not an instant or timezone-aware timestamp, so conversion needs an explicit date/time contract. Existing browser behavior reduces maintenance but does not eliminate domain decisions.'},
      'debt':{'debt.json':json.dumps([{'line':1,'ceiling':'global lock','trigger':'throughput matters'},{'line':4,'ceiling':'quadratic scan','trigger':None}])},
    }
    with tempfile.TemporaryDirectory(prefix='prune-graders-') as tmp:
        dest=prepare(Path(tmp)/'good','')
        for name, files in good.items():
            for file, text in files.items(): (dest/name/file).write_text(text)
        results=score(dest)
        assert all(x['pass'] for x in results.values()), results
        # Imported aliases are valid reuse; copying the implementation is not.
        (dest/'reuse/feature.py').write_text('from utils import slugify\ndef page_slug(title): return slugify(title)\n')
        assert grade_case(dest/'reuse',CASES['reuse'])['pass']
        (dest/'reuse/feature.py').write_text('def page_slug(title): return "-".join(title.strip().lower().split())\n')
        shutil.rmtree(dest/'reuse/__pycache__',ignore_errors=True)
        assert not grade_case(dest/'reuse',CASES['reuse'])['pass']
        # An empty implementation must never earn a pass, even in report cases.
        for name, case in CASES.items():
            work=Path(tmp)/('empty-'+name); work.mkdir()
            assert not grade_case(work,case)['pass'], name
        (dest/'complete/duration.py').write_text('def seconds(text): return 0\n')
        assert not grade_case(dest/'complete',CASES['complete'])['pass']
        print('12 good references pass; 12 empty submissions and an under-delivering stub fail.')


def live(dest, skill):
    prepare(dest,skill)
    codex=shutil.which('codex')
    if not codex: raise RuntimeError('codex CLI missing')
    auth=Path(os.environ.get('CODEX_HOME',Path.home()/'.codex'))/'auth.json'
    with tempfile.TemporaryDirectory(prefix='prune-eval-home-') as tmp:
        home=Path(tmp)
        if not auth.exists(): raise RuntimeError('Codex login missing; run codex login outside the benchmark')
        shutil.copyfile(auth,home/'auth.json'); (home/'auth.json').chmod(0o600)
        env=dict(os.environ,CODEX_HOME=tmp)
        cmd=[codex,'exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-s','workspace-write','-C',str(dest),'--json','Read REQUEST.md and complete the requests.']
        started=time.monotonic()
        with (dest/'events.jsonl').open('w') as out,(dest/'stderr.txt').open('w') as err:
            p=subprocess.run(cmd,env=env,stdout=out,stderr=err,timeout=900)
        metadata={'exit_code':p.returncode,'seconds':round(time.monotonic()-started,2),'command':cmd}
        (dest/'execution.json').write_text(json.dumps(metadata,indent=2)+'\n')
        if p.returncode: raise RuntimeError('Agent failed; inspect '+str(dest/'stderr.txt'))
    return score(dest)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--selftest',action='store_true');ap.add_argument('--prepare');ap.add_argument('--score');ap.add_argument('--live');ap.add_argument('--skill',default=str(ROOT/'skills/prune/SKILL.md'));a=ap.parse_args()
    if a.selftest: selftest()
    elif a.score: print(json.dumps(score(Path(a.score)),indent=2))
    elif a.prepare: prepare(Path(a.prepare),Path(a.skill).read_text())
    elif a.live: print(json.dumps(live(Path(a.live),Path(a.skill).read_text()),indent=2))
    else: ap.error('choose --selftest, --prepare, --score or --live')
