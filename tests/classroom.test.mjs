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
  const element = () => ({hidden:false, disabled:false, textContent:'', style:{}, dataset:{}, children:[],
    classList:{add(){},remove(){},toggle(){}}, setAttribute(){}, addEventListener(){}, focus(){},
    prepend(){}, append(child){this.children.push(child)}, replaceChildren(){this.children=[]},
    querySelector(){return element()}});
  const get = id => { if(!nodes.has(id)) nodes.set(id,element()); return nodes.get(id); };
  const context = vm.createContext({
    document:{getElementById:get, querySelector:get,querySelectorAll:()=>[],addEventListener(){}, createElement:element},
    window:{}, localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    Audio:class { play(){return Promise.resolve()} }, Image:class {},
    matchMedia:()=>({matches:true}), clearInterval(){},clearTimeout(){},setTimeout:callback=>{callback();return 1},setInterval:()=>1,
    requestAnimationFrame:callback=>callback(), console
  });
  for (const file of ['script.js','spain.js','departure.js','philippines.js','homonhon.js','intro.js','session.js']) vm.runInContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
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
    assert.match(g.run('activeLines.at(-1).text'), /Two balanghais/);
    assert.equal(g.run('activeLines.at(-1).homonhonBackdrop'), 'native-boat');
    await g.run('continueSavedGame()');
    assert.equal(g.run('storyLocation'), 'homonhon');
    assert.equal(g.run('manuelSprite.hidden'), true);
  }
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
