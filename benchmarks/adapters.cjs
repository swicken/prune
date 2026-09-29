// Behavioral contracts shared by regression tests and the before/after comparison.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

async function probe(root, name) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-contract-'));
  const env = { ...process.env, HOME: temp, USERPROFILE: temp, XDG_CONFIG_HOME: temp, CLAUDE_CONFIG_DIR: path.join(temp, 'custom') };
  for (const key of ['PLUGIN_DATA', 'PRUNE_DEFAULT_MODE', 'PONYTAIL_DEFAULT_MODE']) delete env[key];
  Object.assign(process.env, env);
  for (const key of ['PLUGIN_DATA', 'PRUNE_DEFAULT_MODE', 'PONYTAIL_DEFAULT_MODE']) delete process.env[key];
  const config = require(path.join(root, 'hooks', name + '-config.js'));
  const builder = require(path.join(root, 'hooks', name + '-instructions.js'));
  const configPath = config.getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const out = {};
  const check = async (label, fn) => {
    try { await fn(); out[label] = { pass: true }; }
    catch (e) { out[label] = { pass: false, reason: e.message.slice(0, 250) }; }
  };
  const hook = (file, input = '', overrides = {}) => spawnSync(process.execPath, [path.join(root, 'hooks', name + '-' + file + '.js')], { env: { ...env, ...overrides }, input, encoding: 'utf8', timeout: 5000 });
  try {
    await check('default saves and reloads', () => {
      fs.writeFileSync(configPath, '{}'); config.writeDefaultMode('lite'); assert.equal(config.getDefaultMode(), 'lite');
    });
    await check('default preserves other fields', () => {
      fs.writeFileSync(configPath, '{"other":{"keep":true}}'); config.writeDefaultMode('ultra'); assert.deepEqual(JSON.parse(fs.readFileSync(configPath)).other, {keep:true});
    });
    await check('malformed config preserved', () => {
      fs.writeFileSync(configPath, '{broken'); assert.throws(() => config.writeDefaultMode('full')); assert.equal(fs.readFileSync(configPath,'utf8'), '{broken');
    });
    await check('non-object config preserved', () => {
      fs.writeFileSync(configPath, '[]'); assert.throws(() => config.writeDefaultMode('full')); assert.equal(fs.readFileSync(configPath,'utf8'), '[]');
    });
    await check('BOM config accepted', () => {
      fs.writeFileSync(configPath, '\uFEFF{"defaultMode":"lite"}'); assert.equal(config.getDefaultMode(), 'lite');
    });
    await check('review rejected as default', () => {
      fs.writeFileSync(configPath, '{}'); assert.equal(config.writeDefaultMode('review'), null); assert.equal(config.getDefaultMode(), 'full');
    });
    await check('plain mode-labelled rule retained', () => {
      assert.match(builder.filterSkillBodyForMode('- Full: preserve this general rule\n- full: "worked example"','lite'), /general rule/);
    });
    await check('Claude config override honored', () => {
      const p=hook('activate','',{ [name.toUpperCase()+'_DEFAULT_MODE']:'full' }); assert.equal(p.status,0); assert.equal(fs.readFileSync(path.join(env.CLAUDE_CONFIG_DIR,'.'+name+'-active'),'utf8'),'full');
    });
    await check('Claude subagent context structured', () => {
      fs.mkdirSync(path.join(temp,'.claude'),{recursive:true}); fs.writeFileSync(path.join(temp,'.claude','.'+name+'-active'),'full');
      fs.mkdirSync(env.CLAUDE_CONFIG_DIR,{recursive:true}); fs.writeFileSync(path.join(env.CLAUDE_CONFIG_DIR,'.'+name+'-active'),'full');
      const p=hook('subagent');assert.equal(p.status,0);assert.equal(JSON.parse(p.stdout).hookSpecificOutput.hookEventName,'SubagentStart');
    });
    await check('Codex hook schema retained', () => {
      const p=hook('activate','',{PLUGIN_DATA:path.join(temp,'plugin'),[name.toUpperCase()+'_DEFAULT_MODE']:'ultra'}); assert.equal(p.status,0); const d=JSON.parse(p.stdout); assert.equal(d.systemMessage,name.toUpperCase()+':ULTRA'); assert.equal(d.hookSpecificOutput.hookEventName,'SessionStart');
    });
    await check('fallback carries reuse and requested explanation', () => {
      const text=builder.getFallbackInstructions('full'); assert.match(text,/Look before you write|already.*codebase/);assert.match(text,/requested reports|Requested reports|explanation.*asked|Explanation.*asked/);
    });
    const mod=await import(pathToFileURL(path.join(root,'pi-extension','index.js')).href);
    await check('Pi bare command reports status', () => assert.deepEqual(mod['parse'+(name==='prune'?'Prune':'Ponytail')+'Command']('','off'),{type:'status'}));
    const events={}; const commands={}; const pi={on:(n,f)=>events[n]=f,registerCommand:(n,c)=>commands[n]=c,appendEntry:()=>{},sendUserMessage:()=>{}};
    mod.default(pi);
    fs.writeFileSync(configPath,'{"defaultMode":"full"}');await events.session_start({},{});
    await check('Pi mention leaves mode active', async () => {await events.input({text:'Add a normal mode toggle'});assert.ok(await events.before_agent_start({systemPrompt:'base'}));});
    await events.session_start({},{});
    await check('Pi missing event handled', async () => {const r=await events.before_agent_start(undefined); assert.ok(r.systemPrompt);assert.ok(!r.systemPrompt.startsWith('undefined'));});
    await check('Pi failed save reported', async () => {
      fs.writeFileSync(configPath,'{broken'); const notices=[]; await commands[name].handler('default lite',{ui:{notify:(t,k)=>notices.push(k)}});assert.ok(notices.includes('error'));assert.equal(fs.readFileSync(configPath,'utf8'),'{broken');
    });
    await check('default save failure reported by hook', () => {
      fs.writeFileSync(configPath,'{broken');const p=hook('mode-tracker',JSON.stringify({prompt:'/'+name+' default lite'}));assert.equal(p.status,0);assert.match(p.stdout,/NOT SAVED/);assert.equal(fs.readFileSync(configPath,'utf8'),'{broken');
    });
    return out;
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
}
module.exports = probe;
if (require.main === module) probe(path.resolve(process.argv[2]),process.argv[3]).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
