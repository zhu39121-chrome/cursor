const STORAGE_KEY = 'todo-list-items';

let todos = [];
let currentFilter = 'all';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const deadlineInput = document.getElementById('todo-deadline');
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const statsBar = document.getElementById('stats-bar');
const filters = document.getElementById('filters');
const footer = document.getElementById('footer');
const remainingCount = document.getElementById('remaining-count');
const completedCount = document.getElementById('completed-count');
const clearBtn = document.getElementById('clear-completed');

function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    todos = data ? JSON.parse(data) : [];
  } catch {
    todos = [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(iso) {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return `创建于 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `创建于 ${date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`;
}

function formatDeadline(iso) {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `今天 ${time}`;
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDeadlineStatus(deadlineAt, completed) {
  if (!deadlineAt || completed) return 'normal';
  const diff = new Date(deadlineAt) - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 24 * 60 * 60 * 1000) return 'soon';
  return 'normal';
}

function renderDeadline(todo) {
  if (!todo.deadlineAt) return '';
  const status = getDeadlineStatus(todo.deadlineAt, todo.completed);
  const label = status === 'overdue' ? '已逾期' : '截止';
  return `<span class="todo-deadline ${status}">${label} ${formatDeadline(todo.deadlineAt)}</span>`;
}

function getFilteredTodos() {
  switch (currentFilter) {
    case 'active':
      return todos.filter((t) => !t.completed);
    case 'completed':
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}

function updateUI() {
  const filtered = getFilteredTodos();
  const active = todos.filter((t) => !t.completed).length;
  const completed = todos.filter((t) => t.completed).length;
  const hasTodos = todos.length > 0;
  const showEmpty = !hasTodos || filtered.length === 0;

  emptyState.classList.toggle('hidden', !showEmpty);
  if (showEmpty && hasTodos) {
    emptyState.querySelector('p').textContent = '没有匹配的任务';
    emptyState.querySelector('span').textContent = '试试切换其他筛选条件';
  } else if (!hasTodos) {
    emptyState.querySelector('p').textContent = '还没有任务';
    emptyState.querySelector('span').textContent = '在上方输入框添加你的第一个待办吧';
  }

  statsBar.hidden = !hasTodos;
  filters.hidden = !hasTodos;
  footer.hidden = completed === 0;

  remainingCount.textContent = `${active} 项待完成`;
  completedCount.textContent = `${completed} 项已完成`;

  list.innerHTML = '';

  filtered.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;
    li.dataset.id = todo.id;

    li.innerHTML = `
      <label class="checkbox">
        <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-label="标记完成" />
        <span class="checkbox-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
      </label>
      <div class="todo-content">
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <div class="todo-meta">
          ${renderDeadline(todo)}
          <span class="todo-date">${formatDate(todo.createdAt)}</span>
        </div>
      </div>
      <button class="btn-delete" aria-label="删除任务">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    `;

    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addTodo(text, deadlineLocal) {
  const trimmed = text.trim();
  if (!trimmed) return;

  let deadlineAt = null;
  if (deadlineLocal) {
    const parsed = new Date(deadlineLocal);
    if (!Number.isNaN(parsed.getTime())) {
      deadlineAt = parsed.toISOString();
    }
  }

  todos.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: new Date().toISOString(),
    deadlineAt,
  });

  saveTodos();
  updateUI();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    updateUI();
  }
}

function deleteTodo(id) {
  const item = list.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    item.addEventListener('animationend', () => {
      todos = todos.filter((t) => t.id !== id);
      saveTodos();
      updateUI();
    }, { once: true });
  } else {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    updateUI();
  }
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  updateUI();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(input.value, deadlineInput.value);
  input.value = '';
  deadlineInput.value = '';
  input.focus();
});

list.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox') {
    const id = e.target.closest('.todo-item').dataset.id;
    toggleTodo(id);
  }
});

list.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.btn-delete');
  if (deleteBtn) {
    const id = deleteBtn.closest('.todo-item').dataset.id;
    deleteTodo(id);
  }
});

filters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  currentFilter = btn.dataset.filter;
  filters.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  updateUI();
});

clearBtn.addEventListener('click', clearCompleted);

loadTodos();
updateUI();
