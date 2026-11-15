import { todoTasks } from '../data/todos';

export interface TodoItem { id:string; title:string; detail:string }
export const initialTodoItems:TodoItem[] = todoTasks.map(({id,title,detail})=>({id,title,detail:detail || ''}));

export function parseTodoItems(value:unknown):TodoItem[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  const result:TodoItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,80}$/.test(item.id) || ids.has(item.id)
      || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120
      || typeof item.detail !== 'string' || item.detail.length > 500) return null;
    ids.add(item.id);
    result.push({id:item.id,title:item.title.trim(),detail:item.detail.trim()});
  }
  return result;
}
