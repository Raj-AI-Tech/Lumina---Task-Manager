/* Simple Task & Project classes - IDs as strings for safe comparisons */
class Task {
  constructor(title, description, priority, dueDate, status, project = null) {
    this.id = String(Date.now() + Math.random()); // string id
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.dueDate = dueDate || null;
    this.status = status || 'pending';
    this.project = project || '';
    this.createdAt = new Date().toISOString();
  }
}

class Project {
  constructor(name, description) {
    this.id = String(Date.now() + Math.random());
    this.name = name;
    this.description = description || '';
    this.createdAt = new Date().toISOString();
  }
}

/* App */
class TaskManager {
  constructor() {
    this.tasks = [];
    this.projects = [];
    this.currentFilter = 'all';
    this.currentProject = null;
    this.editingTaskId = null;
    this.STORAGE_KEY = 'taskflow_data_v1';
    // init will be called after DOMContentLoaded by the script loader
  }

  init() {
    this.loadData();
    this.setupEventListeners();
    this.render();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : { tasks: [], projects: [] };
      this.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      this.projects = Array.isArray(data.projects) ? data.projects : [];

      // normalize older entries
      this.tasks = this.tasks.map(t => ({
        id: String(t.id || Date.now()),
        title: t.title || '',
        description: t.description || '',
        priority: t.priority || 'medium',
        dueDate: t.dueDate || null,
        status: t.status || 'pending',
        project: t.project || '',
        createdAt: t.createdAt || new Date().toISOString(),
      }));

      this.projects = this.projects.map(p => ({
        id: String(p.id || Date.now()),
        name: p.name || 'Untitled',
        description: p.description || '',
        createdAt: p.createdAt || new Date().toISOString(),
      }));

    } catch (err) {
      console.error('Failed to load data:', err);
      this.tasks = [];
      this.projects = [];
    }
  }

  saveData() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ tasks: this.tasks, projects: this.projects }));
    } catch (err) {
      console.error('Failed to save data:', err);
    }
  }

  setupEventListeners() {
    // guard DOM
    const taskForm = document.getElementById('taskForm');
    const projectForm = document.getElementById('projectForm');
    const searchInput = document.getElementById('searchInput');
    const tasksGrid = document.getElementById('tasksGrid');

    if (taskForm) {
      taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveTask();
      });
    }

    if (projectForm) {
      projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProject();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.search(e.target.value);
      });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const filter = e.currentTarget.dataset.filter;
        this.filterTasks(filter);
      });
    });

    // Event delegation for task actions - robust for dynamic content
    if (tasksGrid) {
      tasksGrid.addEventListener('click', (e) => {
        const toggle = e.target.closest('.btn-toggle');
        const edit = e.target.closest('.btn-edit');
        const del = e.target.closest('.btn-delete');

        if (toggle) {
          e.stopPropagation();
          const id = toggle.dataset.id;
          this.advanceTaskStatus(id);
          return;
        }

        if (edit) {
          e.stopPropagation();
          const id = edit.dataset.id;
          this.showTaskModal(id);
          return;
        }

        if (del) {
          e.stopPropagation();
          const id = del.dataset.id;
          this.deleteTask(id);
          return;
        }
      });
    }

    // modal close buttons (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.matches('.close-btn')) {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('active');
        this.editingTaskId = null;
      }

      // click outside modal content to close
      if (e.target.matches('.modal')) {
        e.target.classList.remove('active');
        this.editingTaskId = null;
      }
    });
  }

  showTaskModal(taskId = null) {
    this.editingTaskId = taskId;
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');

    if (!modal || !title) return;

    if (taskId) {
      const task = this.tasks.find(t => String(t.id) === String(taskId));
      if (task) {
        title.textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority || 'medium';
        document.getElementById('taskStatus').value = task.status || 'pending';
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskProject').value = task.project || '';
      }
    } else {
      title.textContent = 'Create New Task';
      const form = document.getElementById('taskForm');
      if (form) form.reset();
    }

    this.updateProjectDropdown();
    modal.classList.add('active');
  }

  showProjectModal() {
    const form = document.getElementById('projectForm');
    if (form) form.reset();
    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    this.editingTaskId = null;
  }

  saveTask() {
    const titleEl = document.getElementById('taskTitle');
    if (!titleEl) return;
    const title = titleEl.value.trim();
    const description = (document.getElementById('taskDescription')?.value || '').trim();
    const priority = document.getElementById('taskPriority')?.value || 'medium';
    const status = document.getElementById('taskStatus')?.value || 'pending';
    const dueDate = document.getElementById('taskDueDate')?.value || null;
    const project = document.getElementById('taskProject')?.value || '';

    if (!title) {
      alert('Please enter a task title');
      return;
    }

    if (this.editingTaskId) {
      const task = this.tasks.find(t => String(t.id) === String(this.editingTaskId));
      if (task) {
        task.title = title;
        task.description = description;
        task.priority = priority;
        task.status = status;
        task.dueDate = dueDate || null;
        task.project = project || '';
      }
    } else {
      const task = new Task(title, description, priority, dueDate || null, status, project || '');
      this.tasks.push(task);
    }

    this.saveData();
    this.render();
    this.closeModal('taskModal');
  }

  saveProject() {
    const name = (document.getElementById('projectName')?.value || '').trim();
    const description = (document.getElementById('projectDescription')?.value || '').trim();

    if (!name) {
      alert('Please enter a project name');
      return;
    }

    const project = new Project(name, description);
    this.projects.push(project);
    this.saveData();
    this.renderProjects();
    this.closeModal('projectModal');
  }

  deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    this.tasks = this.tasks.filter(t => String(t.id) !== String(id));
    this.saveData();
    this.render();
  }

  deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project? Tasks will keep their project cleared.')) return;
    this.projects = this.projects.filter(p => String(p.id) !== String(id));
    this.tasks.forEach(task => {
      if (String(task.project) === String(id)) task.project = '';
    });
    this.saveData();
    this.render();
  }

  filterTasks(filter) {
    this.currentFilter = filter;
    this.currentProject = null;
    this.render();
  }

  filterByProject(projectId) {
    this.currentProject = String(projectId);
    this.currentFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const first = document.querySelectorAll('.filter-btn')[0];
    if (first) first.classList.add('active');
    this.render();
  }

  search(query) {
    const q = (query || '').trim();
    if (!q) return this.render();
    const filtered = this.tasks.filter(task =>
      (task.title || '').toLowerCase().includes(q.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(q.toLowerCase())
    );
    this.renderTasks(filtered);
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    if (this.currentProject) {
      filtered = filtered.filter(t => String(t.project) === String(this.currentProject));
    }

    if (this.currentFilter === 'all') {
      // do nothing
    } else if (['pending', 'in-progress', 'completed'].includes(this.currentFilter)) {
      filtered = filtered.filter(t => t.status === this.currentFilter);
    } else if (['high', 'medium', 'low'].includes(this.currentFilter)) {
      filtered = filtered.filter(t => t.priority === this.currentFilter);
    }

    // newest first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filtered;
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
    const pending = this.tasks.filter(t => t.status === 'pending').length;

    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    setText('totalTasks', total);
    setText('completedTasks', completed);
    setText('inProgressTasks', inProgress);
    setText('pendingTasks', pending);
  }

  formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString();
  }

  updateProjectDropdown() {
    const sel = document.getElementById('taskProject');
    if (!sel) return;
    sel.innerHTML = '<option value="">No Project</option>';
    this.projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  renderProjects() {
    const container = document.getElementById('projectList');
    if (!container) return;
    if (!this.projects.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No projects yet</div></div>';
      return;
    }

    const html = this.projects.map(p => {
      const activeClass = this.currentProject && String(this.currentProject) === String(p.id) ? 'active' : '';
      return `
        <div class="project-item ${activeClass}" data-id="${p.id}">
          <div style="flex:1">${p.name}</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="icon-btn btn-edit-project" data-id="${p.id}" title="Edit project">✏️</button>
            <button class="icon-btn btn-delete-project" data-id="${p.id}" title="Delete project">🗑️</button>
          </div>
        </div>`;
    }).join('');
    container.innerHTML = html;

    // attach click handlers
    container.querySelectorAll('.project-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // ignore clicks on inner buttons
        if (e.target.closest('.btn-delete-project') || e.target.closest('.btn-edit-project')) return;
        const id = el.dataset.id;
        this.filterByProject(id);
      });
    });

    // delete project buttons
    container.querySelectorAll('.btn-delete-project').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        this.deleteProject(id);
      });
    });

    // edit project - simple rename prompt
    container.querySelectorAll('.btn-edit-project').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        const project = this.projects.find(p => String(p.id) === String(id));
        if (!project) return;
        const newName = prompt('Rename project:', project.name);
        if (newName && newName.trim()) {
          project.name = newName.trim();
          this.saveData();
          this.render();
        }
      });
    });

    this.updateProjectDropdown();
  }

  advanceTaskStatus(id) {
    const t = this.tasks.find(x => String(x.id) === String(id));
    if (!t) return;
    const order = ['pending', 'in-progress', 'completed'];
    const idx = order.indexOf(t.status);
    const next = order[(idx + 1) % order.length];
    t.status = next;
    this.saveData();
    this.render();
  }

  renderTasks(tasks = null) {
    const grid = document.getElementById('tasksGrid');
    if (!grid) return;
    const tasksToRender = tasks || this.getFilteredTasks();

    if (!tasksToRender.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">No tasks found</div>
          <div class="empty-state-sub">Create a new task to get started.</div>
        </div>`;
      return;
    }

    const html = tasksToRender.map(t => {
      const priorityClass = t.priority === 'high' ? 'priority-high' : t.priority === 'medium' ? 'priority-medium' : 'priority-low';
      const statusClass = t.status === 'completed' ? 'completed' : t.status === 'in-progress' ? 'in-progress' : '';
      const projectName = this.projects.find(p => String(p.id) === String(t.project))?.name || '';
      return `
        <div class="task-card ${priorityClass}" data-id="${t.id}">
          <div class="task-header">
            <div>
              <div class="task-title">${t.title}</div>
              ${t.description ? `<div class="task-description">${t.description}</div>` : ''}
              <div class="task-meta">
                <div class="task-badge priority-badge ${t.priority === 'medium' ? 'medium' : ''}">${t.priority}</div>
                <div class="task-badge status-badge ${statusClass}">${t.status}</div>
                ${t.dueDate ? `<div class="task-badge">Due: ${this.formatDate(t.dueDate)}</div>` : ''}
                ${projectName ? `<div class="task-badge">Project: ${projectName}</div>` : ''}
                <div class="task-badge">Created: ${this.formatDate(t.createdAt)}</div>
              </div>
            </div>
            <div class="task-actions">
              <button class="icon-btn btn-toggle" data-id="${t.id}" title="Advance status">▶️</button>
              <button class="icon-btn btn-edit" data-id="${t.id}" title="Edit">✏️</button>
              <button class="icon-btn btn-delete" data-id="${t.id}" title="Delete">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.innerHTML = html;

    // Also attach per-button listeners as a robust fallback (in case delegation missed something)
    grid.querySelectorAll('.btn-toggle').forEach(b => {
      b.removeEventListener('click', () => {});
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        this.advanceTaskStatus(id);
      });
    });

    grid.querySelectorAll('.btn-edit').forEach(b => {
      b.removeEventListener('click', () => {});
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        this.showTaskModal(id);
      });
    });

    grid.querySelectorAll('.btn-delete').forEach(b => {
      b.removeEventListener('click', () => {});
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.id;
        this.deleteTask(id);
      });
    });
  }

  render() {
    this.renderProjects();
    this.renderTasks();
    this.updateStats();
  }

  // debug helper
  dump() {
    console.log('tasks:', this.tasks);
    console.log('projects:', this.projects);
    console.log('currentFilter:', this.currentFilter, 'currentProject:', this.currentProject);
  }
}

// instantiate global app after DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TaskManager();
  window.app.init();
});
