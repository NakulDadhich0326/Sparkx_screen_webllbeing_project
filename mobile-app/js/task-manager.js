/**
 * SPARKX Daily Task Organizer
 * Implements PDF Page 2: "Helps users organize daily tasks"
 * Connects tasks directly with study intervals & Pomodoro focus sessions.
 */

class TaskManager {
  constructor(onSelectTaskForFocus) {
    this.onSelectTask = onSelectTaskForFocus;
    this.tasks = [];
    this.container = document.getElementById('taskListContainer');

    this._bindForm();
    this.loadTasks();
  }

  _bindForm() {
    const form = document.getElementById('addTaskForm');
    const input = document.getElementById('taskTitleInput');
    const prioritySelect = document.getElementById('taskPrioritySelect');
    const durationInput = document.getElementById('taskDurationInput');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = input.value.trim();
        if (!title) return;

        this.addTask(title, prioritySelect.value, durationInput.value);
        input.value = '';
      });
    }
  }

  async loadTasks() {
    if (window.apiClient) {
      const res = await window.apiClient.getTasks();
      if (res && res.tasks) {
        this.tasks = res.tasks;
        this.render();
        return;
      }
    }

    const saved = localStorage.getItem('sparkx_tasks');
    if (saved) {
      this.tasks = JSON.parse(saved);
    } else {
      this.tasks = [
        { id: 'task_1', title: "Complete SPhINX'26 Presentation Slides", priority: 'HIGH', estimatedMinutes: 45, completed: true },
        { id: 'task_2', title: 'Build Real-Time Camera Gaze Detection Module', priority: 'HIGH', estimatedMinutes: 50, completed: false },
        { id: 'task_3', title: 'Revise Compiler Design Unit 3', priority: 'MEDIUM', estimatedMinutes: 30, completed: false }
      ];
    }
    this.render();
  }

  _saveLocal() {
    localStorage.setItem('sparkx_tasks', JSON.stringify(this.tasks));
  }

  async addTask(title, priority = 'MEDIUM', estimatedMinutes = 25) {
    const newTask = {
      id: `task_${Date.now()}`,
      title,
      priority,
      estimatedMinutes: parseInt(estimatedMinutes, 10) || 25,
      completed: false
    };

    this.tasks.unshift(newTask);
    this._saveLocal();
    this.render();

    if (window.apiClient) {
      await window.apiClient.createTask(title, priority, estimatedMinutes);
    }
  }

  async toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this._saveLocal();
      this.render();

      if (window.apiClient) {
        await window.apiClient.toggleTask(taskId);
      }
    }
  }

  render() {
    if (!this.container) return;

    if (this.tasks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <p>No study tasks queued yet. Add your study goal above to get started!</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.tasks.map(task => `
      <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <div class="task-left">
          <button class="checkbox-btn ${task.completed ? 'checked' : ''}" onclick="window.taskManager.toggleTask('${task.id}')">
            ${task.completed ? '✓' : ''}
          </button>
          <div class="task-details">
            <span class="task-title">${this._escape(task.title)}</span>
            <div class="task-meta">
              <span class="badge-priority ${task.priority.toLowerCase()}">${task.priority}</span>
              <span class="task-est">⏱️ ${task.estimatedMinutes} mins</span>
            </div>
          </div>
        </div>
        ${!task.completed ? `
          <button class="btn-focus-task" onclick="window.taskManager.focusOnTask('${task.id}')" title="Start Focus Session on this task">
            Focus 🎯
          </button>
        ` : ''}
      </div>
    `).join('');
  }

  focusOnTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && this.onSelectTask) {
      this.onSelectTask(task);
    }
  }

  _escape(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
}

window.TaskManager = TaskManager;
