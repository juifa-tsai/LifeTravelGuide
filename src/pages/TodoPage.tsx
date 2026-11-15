import { todoTasks } from '../data/todos';

export function TodoPage({ completed,onToggle }:{completed:Record<string,boolean>;onToggle:(id:string,checked:boolean)=>void}) {
  const count = todoTasks.filter(task=>completed[task.id] === true).length;
  return <>
    <header className="page-heading"><div className="page-title-row"><h1>待辦事項</h1><span className="small muted" aria-live="polite">{count} / {todoTasks.length} 完成</span></div></header>
    <section className="todo-list" aria-label="待辦清單">{todoTasks.map(task=><article className={`todo-card ${completed[task.id] === true ? 'is-complete' : ''}`} key={task.id}><label className="todo-row">
      <input type="checkbox" checked={completed[task.id] === true} onChange={event=>onToggle(task.id,event.target.checked)} />
      <span className="todo-copy"><span className="todo-title">{task.title}</span>{task.detail && <span className="todo-detail">{task.detail}</span>}</span>
    </label>{task.reference && <a className="todo-reference" href={`${import.meta.env.BASE_URL}${task.reference.path}`} target="_blank" rel="noopener noreferrer" aria-label="放大爽潤 PREMIUM 商品照片"><img src={`${import.meta.env.BASE_URL}${task.reference.path}`} alt={task.reference.alt} width="56" height="75" /></a>}</article>)}</section>
  </>;
}
