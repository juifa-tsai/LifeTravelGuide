import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import { todoTasks } from '../data/todos';
import type { TodoItem } from '../lib/todos';

type Editor = { id:string | null; title:string; detail:string };
export function TodoPage({ items,completed,onToggle,onSave }:{items:TodoItem[];completed:Record<string,boolean>;onToggle:(id:string,checked:boolean)=>void;onSave:(item:TodoItem)=>void}) {
  const [editor,setEditor] = useState<Editor | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const lastTap = useRef<{id:string;time:number} | null>(null);
  const count = items.filter(task=>completed[task.id] === true).length;
  function edit(task:TodoItem) { lastTap.current = null; setEditor({...task}); }
  function tap(event:MouseEvent<HTMLElement>,task:TodoItem) {
    if (editor) return;
    if ((event.target as Element).closest('a,label,input,button,form')) {lastTap.current=null;return;}
    if (lastTap.current?.id === task.id && event.timeStamp-lastTap.current.time <= 400) edit(task);
    else lastTap.current = {id:task.id,time:event.timeStamp};
  }
  function save(event:FormEvent) {
    event.preventDefault();
    if (!editor) return;
    if (!editor.title.trim()) { input.current?.setCustomValidity('請填寫待辦事項。'); input.current?.reportValidity(); return; }
    onSave({id:editor.id || `todo-${crypto.randomUUID()}`,title:editor.title.trim(),detail:editor.detail.trim()});
    setEditor(null);
  }
  function editorForm() {
    if (!editor) return null;
    return <form className="todo-editor" aria-label={editor.id ? '編輯待辦' : '新增待辦'} onSubmit={save} onKeyDown={event=>{if (event.key === 'Escape') {event.preventDefault();setEditor(null);}}}>
      <div><label htmlFor="todo-title-input">事項</label><input id="todo-title-input" ref={input} autoFocus required maxLength={120} value={editor.title} onChange={event=>{event.target.setCustomValidity('');setEditor({...editor,title:event.target.value});}} /></div>
      <div><label htmlFor="todo-detail-input">備註</label><textarea id="todo-detail-input" rows={2} maxLength={500} value={editor.detail} onChange={event=>setEditor({...editor,detail:event.target.value})} /></div>
      <div className="todo-editor-actions"><button type="submit" className="button">儲存</button><button type="button" className="text-action" onClick={()=>setEditor(null)}>取消</button></div>
    </form>;
  }
  return <>
    <header className="page-heading"><div className="page-title-row"><h1>待辦事項</h1><span className="small muted" aria-live="polite">{count} / {items.length} 完成</span></div></header>
    <section className="todo-list" aria-label="待辦清單">{items.map(task=>{
      const reference = todoTasks.find(original=>original.id === task.id)?.reference;
      const editing = editor?.id === task.id;
      return <article className={`todo-card ${completed[task.id] === true ? 'is-complete' : ''} ${editing ? 'is-editing' : ''}`} key={task.id} tabIndex={editing ? undefined : 0} aria-label={task.title} aria-keyshortcuts="Enter" onClick={event=>tap(event,task)} onKeyDown={event=>{if (event.target === event.currentTarget && event.key === 'Enter') {event.preventDefault();edit(task);}}}>
        {editing ? editorForm() : <>
          <label className="todo-completion"><input type="checkbox" aria-label={`${task.title}${task.detail ? ` ${task.detail}` : ''}`} checked={completed[task.id] === true} onChange={event=>onToggle(task.id,event.target.checked)} /></label>
          <div className="todo-copy"><span className="todo-title">{task.title}</span>{task.detail && <span className="todo-detail">{task.detail}</span>}</div>
          {reference && <a className="todo-reference" href={`${import.meta.env.BASE_URL}${reference.path}`} target="_blank" rel="noopener noreferrer" aria-label="放大爽潤 PREMIUM 商品照片"><img src={`${import.meta.env.BASE_URL}${reference.path}`} alt={reference.alt} width="56" height="75" /></a>}
        </>}
      </article>;
    })}{editor?.id === null && <article className="todo-card is-editing">{editorForm()}</article>}{!editor && <button type="button" className="todo-add" aria-label="新增待辦" onClick={()=>{lastTap.current=null;setEditor({id:null,title:'',detail:''});}}><Plus size={24} aria-hidden="true" /></button>}</section>
  </>;
}
