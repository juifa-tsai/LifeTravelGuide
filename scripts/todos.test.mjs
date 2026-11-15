import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const asUrl=js=>`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
const dataUrl=asUrl(compile('../src/data/todos.ts'));
const {parseTodoItems,initialTodoItems}=await import(asUrl(compile('../src/lib/todos.ts').replace("'../data/todos'",JSON.stringify(dataUrl))));
test('stored todo text preserves stable completion IDs and strips untrusted image metadata',()=>{
 const edited=initialTodoItems.map(item=>({...item,title:item.title+' 已編輯'}));
 edited.push({id:'todo-custom',title:'  新增事項  ',detail:'  第一行\n第二行  ',reference:{path:'https://untrusted.example/image.png'}});
 const parsed=parseTodoItems(edited);
 assert.deepEqual(parsed.slice(0,2).map(item=>item.id),initialTodoItems.map(item=>item.id));
 assert.deepEqual(parsed.at(-1),{id:'todo-custom',title:'新增事項',detail:'第一行\n第二行'});
 assert.deepEqual(parseTodoItems(JSON.parse(JSON.stringify(parsed))),parsed);
});
test('corrupt, duplicate or oversized todo records cannot replace a valid checklist',()=>{
 for(const value of [null,{},'invalid',[null],[{id:'bad',title:'   ',detail:''}],[{id:'../invalid',title:'事項',detail:''}],[{id:'test',title:'x'.repeat(121),detail:''}],[{id:'test',title:'事項',detail:'x'.repeat(501)}],[{id:'test',title:'事項',detail:null}],[initialTodoItems[0],initialTodoItems[0]]])assert.equal(parseTodoItems(value),null);
 assert.deepEqual(parseTodoItems([]),[]);
});
