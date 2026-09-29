"""Small behavioral contracts. Prompts/seeds are visible; grading is separate."""
CASES = {
'reuse': {
 'prompt': 'Implement page_slug(title) in feature.py. Match the existing canonical slug behavior; leave utils.py unchanged.',
 'seed': {'utils.py': 'def slugify(text):\n    return "-".join(text.strip().lower().split())\n', 'feature.py': 'def page_slug(title):\n    raise NotImplementedError\n'},
 'check': 'import feature; assert feature.page_slug(" A   B ") == "a-b"; import utils, importlib; utils.slugify=lambda _: "canonical"; importlib.reload(feature); assert feature.page_slug("x") == "canonical"'},
'sibling': {
 'prompt': 'A negative transfer amount increases the sender balance. Fix it in bank.py; both web_transfer and api_transfer must reject negative amounts before mutation.',
 'seed': {'bank.py': 'def transfer(balances, amount):\n    balances[0] -= amount\n    balances[1] += amount\n\ndef web_transfer(b, n):\n    transfer(b, n)\n\ndef api_transfer(b, n):\n    transfer(b, n)\n'},
 'check': 'import bank\nfor f in [bank.web_transfer,bank.api_transfer]:\n b=[10,0]\n try: f(b,-1)\n except ValueError: pass\n else: raise AssertionError("negative accepted")\n assert b==[10,0]\n f(b,3); assert b==[7,3]'},
'shared-decision': {
 'prompt': 'These three modules repeat the same company tax rule. Remove real duplication with one canonical tax helper while preserving tax(amount) in each module.',
 'seed': {p: 'def tax(amount):\n    return round(amount * 0.2, 2)\n' for p in ['cart.py','invoice.py','quote.py']},
 'check': 'import cart,invoice,quote; assert [m.tax(12) for m in [cart,invoice,quote]]==[2.4,2.4,2.4]'},
'independent': {
 'prompt': 'Review policies.py for duplication. The three caps are independent business policies whose owners change them separately. Write review.md; do not modify policies.py.',
 'seed': {'policies.py':'def shipping_cap(n): return min(n, 10)\ndef refund_cap(n): return min(n, 10)\ndef promotion_cap(n): return min(n, 10)\n'},
 'check': 'from pathlib import Path; assert Path("policies.py").read_text()=="def shipping_cap(n): return min(n, 10)\\ndef refund_cap(n): return min(n, 10)\\ndef promotion_cap(n): return min(n, 10)\\n"; assert Path("review.md").is_file()'},
'preserve': {
 'prompt': 'Simplify compute.py if useful. Preserve single-pass consumption, exceptions, output, and logging behavior; do not alter error messages.',
 'seed': {'compute.py':'def total(values, log):\n    result = 0\n    for value in values:\n        if value < 0:\n            raise ValueError("negative value")\n        log.append(value)\n        result += value\n    return result\n'},
 'check': 'from compute import total\nlog=[]; assert total(iter([1,2,3]),log)==6; assert log==[1,2,3]\nlog=[]\ntry: total(iter([1,-1,3]),log)\nexcept ValueError as e: assert str(e)=="negative value"\nelse: raise AssertionError("missing rejection")\nassert log==[1]'},
'compatibility': {
 'prompt': 'Implement groupByStatus(rows) exported from groups.cjs for the stated Node 18 runtime. Avoid a new dependency. Preserve the input.',
 'seed': {'package.json':'{"engines":{"node":"18.x"}}\n','groups.cjs':'module.exports.groupByStatus = () => { throw new Error("TODO") };\n'},
 'node_check': 'delete Object.groupBy; const {groupByStatus}=require("./groups.cjs"); const rows=[{status:"__proto__"},{status:"ok"},{status:"ok"}]; const g=groupByStatus(rows); if(g.ok.length!==2 || !Object.prototype.hasOwnProperty.call(g,"__proto__") || g["__proto__"].length!==1 || rows.length!==3) throw Error("bad groups");'},
'orphan': {
 'prompt': 'Replace the private doubling helper with direct multiplication in double_value. Remove anything this change makes unused; leave the unrelated public legacy_format function unchanged.',
 'seed': {'clean.py':'def _double(n): return n * 2\n\ndef double_value(n): return _double(n)\n\ndef legacy_format(n): return f"legacy:{n}"\n'},
 'check': 'import clean; assert clean.double_value(4)==8; assert clean.legacy_format(4)=="legacy:4"; assert not hasattr(clean,"_double")'},
'regression': {
 'prompt': 'Fix bounds.py: inclusive_between must include both endpoints. Leave a runnable regression check in test_bounds.py and run it.',
 'seed': {'bounds.py':'def inclusive_between(n, low, high):\n    return low < n < high\n'},
 'check': 'from bounds import inclusive_between as f; assert f(0,0,3); assert f(3,0,3); assert not f(-1,0,3); assert not f(4,0,3)\nfrom pathlib import Path; assert Path("test_bounds.py").is_file()'},
'complete': {
 'prompt': 'Implement seconds(text) in duration.py: nonnegative integer h/m/s chunks, such as 1h30m -> 5400; reject empty input, unmatched characters, and negative values with ValueError. Leave a runnable check and run it.',
 'seed': {'duration.py':'def seconds(text):\n    raise NotImplementedError\n'},
 'check': 'from duration import seconds; assert seconds("1h30m")==5400; assert seconds("0s")==0; assert seconds("2m3s")==123\nfor text in ["", "1hgarbage", "-1s"]:\n try: seconds(text)\n except ValueError: pass\n else: raise AssertionError(text)'},
'hypothesis': {
 'prompt': 'Fix average.py: mean returns 0 for a one-shot iterator even though it works for lists. Trace the cause, preserve empty-input ValueError, leave and run a regression check.',
 'seed': {'average.py':'def mean(values):\n    count = sum(1 for _ in values)\n    if not count: raise ValueError("empty")\n    return sum(values) / count\n'},
 'check': 'from average import mean; assert mean(iter([2,4]))==3; assert mean([2,4])==3\ntry: mean(iter([]))\nexcept ValueError as e: assert str(e)=="empty"\nelse: raise AssertionError("empty accepted")'},
'explanation': {
 'prompt': 'Review choices.py and write explanation.md explaining three concrete tradeoffs of using a native HTML date input: implementation size, presentation flexibility, and date/time semantics. Do not change choices.py.',
 'seed': {'choices.py':'DATE_INPUT = \'<input type="date">\'\n'},
 'check': 'from pathlib import Path; assert Path("choices.py").read_text()=="DATE_INPUT = \'<input type=\\"date\\">\'\\n"; assert len(Path("explanation.md").read_text().split())>=45'},
'debt': {
 'prompt': 'Inspect the marked compromises in source.py. Write debt.json as a list of objects with line, ceiling, and trigger (null when absent). Include real compromises, exclude strings and ordinary explanatory comments. Change no source code.',
 'seed': {'source.py':'# prune: global lock, per-account locks if throughput matters\n# prune: builtin sorted handles this\nEXAMPLE = "# prune: example only"\n# prune: quadratic scan over records\n'},
 'check': 'import json; from pathlib import Path; d=json.loads(Path("debt.json").read_text()); assert {x["line"] for x in d}=={1,4}; assert next(x for x in d if x["line"]==4)["trigger"] is None'},
}
