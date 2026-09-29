#!/usr/bin/env python3
"""Compare adapter behavior using identical contracts, no model calls."""
import argparse, json, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--before',required=True);p.add_argument('--output');a=p.parse_args()
result={}
for arm,repo,name in [('before',Path(a.before).resolve(),'ponytail'),('after',root,'prune')]:
 out=subprocess.run(['node',str(root/'benchmarks/adapters.cjs'),str(repo),name],capture_output=True,text=True,check=True)
 result[arm]=json.loads(out.stdout)
passed={arm:sum(row['pass'] for row in rows.values()) for arm,rows in result.items()}
report={'kind':'deterministic adapter contracts','passed':passed,'total':len(result['after']),'results':result}
text=json.dumps(report,indent=2)+'\n'
if a.output: Path(a.output).write_text(text)
print(text)
