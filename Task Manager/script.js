
class Task {
	constructor(title, description, priority, dueDate, status, project = null) {
		this.id = String(Date.now() + Math.random()); 
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

class TaskManager {
	constructor() {
		this.tasks = [];
		this.projects = [];
		this.currentFilter = 'all';
		this.currentProject = null;
		this.editingTaskId = null;
		this.STORAGE_KEY = 'taskflow_data_v1';
		this.init();
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
		
		document.getElementById('taskForm').addEventListener('submit', (e) => {
			e.preventDefault();
			this.saveTask();
		});

		
		document.getElementById('projectForm').addEventListener('submit', (e) => {
			e.preventDefault();
			this.saveProject();
		});

	
		document.getElementById('searchInput').addEventListener('input', (e) => {
			this.search(e.target.value);
		});

		
		document.querySelectorAll('.filter-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
				e.currentTarget.classList.add('active');
				const filter = e.currentTarget.dataset.filter;
				this.filterTasks(filter);
			});
		});
	}

	showTaskModal(taskId = null) {
		this.editingTaskId = taskId;
		const modal = document.getElementById('taskModal');
		const title = document.getElementById('taskModalTitle');

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
			document.getElementById('taskForm').reset();
		}

		this.updateProjectDropdown();
		modal.classList.add('active');
	}

	showProjectModal() {
		document.getElementById('projectForm').reset();
		document.getElementById('projectModal').classList.add('active');
	}

	closeModal(modalId) {
		document.getElementById(modalId).classList.remove('active');
		this.editingTaskId = null;
	}

	saveTask() {
		const title = document.getElementById('taskTitle').value.trim();
		const description = document.getElementById('taskDescription').value.trim();
		const priority = document.getElementById('taskPriority').value;
		const status = document.getElementById('taskStatus').value;
		const dueDate = document.getElementById('taskDueDate').value;
		const project = document.getElementById('taskProject').value;

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
		const name = document.getElementById('projectName').value.trim();
		const description = document.getElementById('projectDescription').value.trim();

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
		document.querySelectorAll('.filter-btn')[0].classList.add('active');
		this.render();
	}

	search(query) {
		const filtered = this.tasks.filter(task =>
			(task.title || '').toLowerCase().includes(query.toLowerCase()) ||
			(task.description || '').toLowerCase().includes(query.toLowerCase())
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

		
		filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		return filtered;
	}

	updateStats() {
		const total = this.tasks.length;
		const completed = this.tasks.filter(t => t.status === 'completed').length;
		const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
		const pending = this.tasks.filter(t => t.status === 'pending').length;

		document.getElementById('totalTasks').textContent = total;
		document.getElementById('completedTasks').textContent = completed;
		document.getElementById('inProgressTasks').textContent = inProgress;
		document.getElementById('pendingTasks').textContent = pending;
	}

	formatDate(d) {
		if (!d) return '';
		const dt = new Date(d);
		if (isNaN(dt)) return d;
		return dt.toLocaleDateString();
	}

	updateProjectDropdown() {
		const sel = document.getElementById('taskProject');
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

		
		container.querySelectorAll('.project-item').forEach(el => {
			el.addEventListener('click', (e) => {
				
				if (e.target.closest('.btn-delete-project') || e.target.closest('.btn-edit-project')) return;
				const id = el.dataset.id;
				this.filterByProject(id);
			});
		});

		
		container.querySelectorAll('.btn-delete-project').forEach(b => {
			b.addEventListener('click', (e) => {
				e.stopPropagation();
				const id = b.dataset.id;
				this.deleteProject(id);
			});
		});

		
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

	renderTasks(tasks = null) {
		const grid = document.getElementById('tasksGrid');
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

		
		
		grid.querySelectorAll('.btn-toggle').forEach(b => {
			b.addEventListener('click', (e) => {
				e.stopPropagation();
				const id = b.dataset.id;
				const t = this.tasks.find(x => String(x.id) === String(id));
				if (!t) return;
				const order = ['pending', 'in-progress', 'completed'];
				const idx = order.indexOf(t.status);
				const next = order[(idx + 1) % order.length];
				t.status = next;
				this.saveData();
				this.render();
			});
		});

		
		grid.querySelectorAll('.btn-edit').forEach(b => {
			b.addEventListener('click', (e) => {
				e.stopPropagation();
				const id = b.dataset.id;
				this.showTaskModal(id);
			});
		});

	
		grid.querySelectorAll('.btn-delete').forEach(b => {
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
}


window.app = new TaskManager();

