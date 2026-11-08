import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { tally } from '../vote-core.js';

test('tally resolves plurality, ties, zero votes, and invalid votes', () => {
  assert.deepEqual(tally({options: ['A','B','C'], votes: {a: 1,b: 1,c: 0,d: 2}}), {counts:[1,2,1],total:4,leaders:[1]});
  assert.deepEqual(tally({options: ['A','B','C'], votes: {a:0,b:2}}).leaders, [0,2]);
  assert.deepEqual(tally({options: ['A','B','C']}).leaders, [0,1,2]);
  assert.equal(tally({options: ['A','B','C'], votes:{a:99,b:'1',c:-1,d:0}}).total, 1);
});

function game() {
  const nodes = new Map();
  const storage = new Map();
  const element = () => ({hidden:false, disabled:false, textContent:'', innerHTML:'', value:'', style:{}, dataset:{}, children:[],
    classList:{add(){},remove(){},toggle(){}}, setAttribute(){}, removeAttribute(){}, addEventListener(){}, focus(){}, click(){},
    prepend(child){this.children.unshift(child)}, append(child){this.children.push(child)}, replaceChildren(...children){this.children=children},
    querySelector(){return element()}, querySelectorAll(){return []}, closest(){return null}, showModal(){}, close(){}});
  const get = id => { if(!nodes.has(id)) nodes.set(id,element()); return nodes.get(id); };
  const context = vm.createContext({
    document:{getElementById:get, querySelector:get,querySelectorAll:()=>[],addEventListener(){}, createElement:element, body:element(), documentElement:element()},
    window:{addEventListener(){}, voice:{play(){},stop(){}}}, localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    Audio:class { constructor(){this.volume=0;this.paused=true;this.currentTime=0;} play(){this.paused=false;return Promise.resolve()} pause(){this.paused=true} addEventListener(){} }, Image:class {},
    matchMedia:()=>({matches:true}), clearInterval(){},clearTimeout(){},setTimeout:callback=>{callback();return 1},setInterval:()=>1,
    requestAnimationFrame:callback=>callback(), console
  });
  for (const file of ['engine.js','story.js']) vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
  return {run:code=>vm.runInContext(code,context), storage};
}

test('each of the three choices joins the same common sequence and saves branch', () => {
  for(let index=0;index<3;index++) {
    const g=game();
    g.run(`storyLocation='spain'; activeLines=spainOpening; openingIndex=2; choiceSelectionOpen=true; selectSpainChoice(${index});`);
    assert.equal(g.run('activeLines.length'),10);
    assert.equal(g.run('activeLines[4].text'),'(Magellan continues explaining the political and economic advantages of the voyage.)');
    const save=JSON.parse(g.storage.get('pigafetta-save'));
    assert.equal(save.location,'spain');
    assert.equal(save.lines[0].text,g.run(`spainChoices[${index}].lines[0].text`));
  }
});

test('Continue restores the saved line and selected branch', async () => {
  const g=game();
  g.run("storyLocation='spain'; activeLines=spainOpening; openingIndex=2; choiceSelectionOpen=true; selectSpainChoice(2); openingIndex=5; saveProgress(); activeLines=palaceLines; storyLocation='portugal'; openingIndex=0;");
  await g.run('continueSavedGame()');
  assert.equal(g.run('storyLocation'),'spain');
  assert.equal(g.run('openingIndex'),5);
  assert.match(g.run('activeLines[0].text'),/Portugal has long enjoyed/);
});

test('choice checkpoints save and restore without falling into narration', async () => {
  const g=game();
  g.run("storyLocation='spain'; activeLines=spainOpening; openingIndex=2; saveProgress();");
  await g.run('continueSavedGame()');
  assert.equal(g.run('activeLines[openingIndex].choice'),true);
});

test('all Homonhon paths join the native encounter and restore the island scene', async () => {
  for (let index = 0; index < 3; index++) {
    const g = game();
    g.run(`storyLocation='homonhon'; activeLines=homonhonOpening; openingIndex=2; choiceSelectionOpen=true; selectSpainChoice(${index});`);
    assert.equal(g.run('currentChoiceSet().id'), 'II-01');
    assert.equal(g.run('activeLines.at(-1).direction'), true);
    assert.equal(g.run('activeLines.at(-1).text'), '(The two parties continue exchanging gifts.)');
    assert.equal(g.run('activeLines.at(-1).homonhonBackdrop'), 'native-boat');
    await g.run('continueSavedGame()');
    assert.equal(g.run('storyLocation'), 'homonhon');
    assert.equal(g.run('manuelSprite.hidden'), true);
  }
});

test('all four choice sets keep three concise, verb-led options in vote order', () => {
  const g = game();
  const expected = [
    ['spain', 'I-02', 'How should Magellan persuade Spain?', [
      'Overstate confidence in the western passage.', "Explain the voyage's practical benefits.", "Appeal to Spain's ambition against Portugal."
    ]],
    ['homonhon', 'II-01', 'What should the crew do?', [
      'Rest on the island with the crew.', 'Move to another island for supplies.', 'Scout the island before landing the crew.'
    ]],
    ['limasawa', 'II-02', 'How should Magellan approach Easter Mass?', [
      'Respect local beliefs without inviting them.', 'Invite the rulers to Easter Mass.', 'Explain the Mass before inviting the rulers.'
    ]],
    ['cebu', 'II-03', "How should Magellan respond to Cebu's ruler?", [
      'Defy the Rajah and promise military aid.', 'Pay tribute and prioritize trade.', 'Build an alliance without promising military aid.'
    ]]
  ];
  const actionVerbs = new Set(['overstate','explain','appeal','rest','move','scout','respect','invite','defy','pay','build']);
  for (const [location, id, question, labels] of expected) {
    g.run(`storyLocation=${JSON.stringify(location)}`);
    const set = JSON.parse(JSON.stringify(g.run('currentChoiceSet()')));
    assert.equal(set.id, id);
    assert.equal(set.question, question);
    assert.ok(set.question.trim().split(/\s+/).length <= 8);
    assert.equal(set.choices.length, 3);
    assert.deepEqual(set.choices.map(choice => choice.label), labels);
    for (const choice of set.choices) {
      assert.ok(choice.label.trim().split(/\s+/).length <= 10, choice.label);
      assert.ok(actionVerbs.has(choice.label.trim().split(/\s+/)[0].toLowerCase()), choice.label);
    }
    assert.ok(set.choices.every(choice => Array.isArray(choice.lines)));
  }
  const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
  const voteValidation = rules.rules.rooms['$code'].rounds['$round'].votes['$uid']['.validate'];
  assert.match(voteValidation, /newData\.val\(\) === 0/);
  assert.match(voteValidation, /newData\.val\(\) === 1/);
  assert.match(voteValidation, /newData\.val\(\) === 2/);
});

test('all four choice branches survive save and Continue', async () => {
  const cases = [
    ['spain', 'spainOpening', 2, 1],
    ['homonhon', 'homonhonOpening', 2, 0],
    ['limasawa', 'limasawaOpening', 1, 2],
    ['cebu', 'cebuOpening', 1, 1]
  ];
  for (const [location, opening, checkpoint, selected] of cases) {
    const g = game();
    g.run(`storyLocation=${JSON.stringify(location)}; activeLines=${opening}; openingIndex=${checkpoint}; choiceSelectionOpen=true; selectSpainChoice(${selected});`);
    const branchLine = g.run('activeLines[0].text');
    await g.run('continueSavedGame()');
    assert.equal(g.run('storyLocation'), location);
    assert.equal(g.run('activeLines[0].text'), branchLine);
    assert.equal(g.run('openingIndex'), 0);
  }
});

test('host, audience, and tie-break choices keep their shared order for every round', () => {
  const story = fs.readFileSync(new URL('../story.js', import.meta.url), 'utf8');
  const classroom = fs.readFileSync(new URL('../classroom.js', import.meta.url), 'utf8');
  const audience = fs.readFileSync(new URL('../audience.js', import.meta.url), 'utf8');
  assert.match(classroom, /pendingChoice\.choices\.forEach\(\(choice, index\)/);
  assert.match(classroom, /round\?\.status === "tie" && tally\(round\)\.leaders\.includes\(index\)/);
  assert.match(audience, /round\.options\.forEach\(\(label, index\)/);
  assert.match(classroom, /const options = choices\.map\(choice => choice\.label\)/);
  const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.match(css, /\.story-choices button[^\n]*"Redaction 35"/);
  assert.match(css, /\.audience-page \.audience-choice \{[\s\S]*?font: 22px\/1\.4 "Redaction 35"/);
  assert.match(css, /@media\(max-width:600px\)[^\n]*audience-choice/);
  const g = game();
  for (const location of ['spain', 'homonhon', 'limasawa', 'cebu']) {
    g.run(`storyLocation=${JSON.stringify(location)}`);
    const set = JSON.parse(JSON.stringify(g.run('currentChoiceSet()')));
    const tie = tally({ options: set.choices.map(choice => choice.label), votes: { a: 0, b: 1 } });
    assert.deepEqual(tie.leaders, [0, 1]);
    assert.equal(tie.counts.length, 3);
    assert.deepEqual(set.choices.map((_, index) => tie.leaders.includes(index)), [true, true, false]);
  }
  assert.match(story, /choicePanel\.setAttribute\("aria-label", "How should Magellan persuade Spain\?"\)/);
});

test('preparations and departure checkpoints restore their scene and cast', async () => {
  for (const location of ['preparations', 'departure']) {
    const g = game();
    g.run(`storyLocation='${location}'; activeLines=${location === 'preparations' ? 'preparationLines' : 'departureLines'}; openingIndex=1; saveProgress(); storyLocation='portugal';`);
    await g.run('continueSavedGame()');
    assert.equal(g.run('storyLocation'), location);
    assert.equal(g.run('openingIndex'), 1);
    assert.match(g.run('manuelSprite.style.backgroundImage'), location === 'preparations' ? /rui-expressions/ : /pigafetta-expressions/);
  }
});
