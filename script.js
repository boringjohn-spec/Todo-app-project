document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // App State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all'; // all, active, completed

    // Initialize
    renderTasks();

    // Event Listeners
    taskForm.addEventListener('submit', addTask);
    taskList.addEventListener('click', handleTaskAction);
    clearCompletedBtn.addEventListener('click', clearCompleted);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active class
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Set filter and re-render
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Functions
    function addTask(e) {
        e.preventDefault();
        const text = taskInput.value.trim();
        
        if (!text) return;
        
        const newTask = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.unshift(newTask); // Add to beginning
        saveTasks();
        
        taskInput.value = '';
        renderTasks();
    }

    function handleTaskAction(e) {
        const item = e.target.closest('.task-item');
        if (!item) return;

        const taskId = item.dataset.id;
        
        // Handle Delete
        if (e.target.closest('.delete-btn')) {
            item.classList.add('removing');
            // Wait for animation
            setTimeout(() => {
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasks();
                renderTasks();
            }, 300);
            return;
        }

        // Handle Toggle Completion
        if (e.target.classList.contains('task-checkbox') || e.target.classList.contains('task-text')) {
            // If text is clicked, also toggle checkbox
            if (e.target.classList.contains('task-text')) {
                const checkbox = item.querySelector('.task-checkbox');
                checkbox.checked = !checkbox.checked;
            }
            
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const checkbox = item.querySelector('.task-checkbox');
                task.completed = checkbox.checked;
                saveTasks();
                renderTasks();
            }
        }
    }

    function clearCompleted() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateStats();
    }

    function updateStats() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        taskCount.textContent = `${activeTasks} item${activeTasks !== 1 ? 's' : ''} left`;
    }

    function renderTasks() {
        taskList.innerHTML = '';
        
        let filteredTasks = tasks;
        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }

        if (filteredTasks.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.style.textAlign = 'center';
            emptyState.style.color = 'var(--text-secondary)';
            emptyState.style.padding = '20px';
            emptyState.style.fontSize = '0.9rem';
            
            if (tasks.length === 0) {
                emptyState.textContent = 'No tasks yet. Add one above!';
            } else {
                emptyState.textContent = 'No tasks found for this filter.';
            }
            
            taskList.appendChild(emptyState);
            updateStats();
            return;
        }

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.dataset.id = task.id;
            
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${escapeHTML(task.text)}</span>
                <button class="delete-btn" aria-label="Delete task">
                    <i class="ph ph-trash"></i>
                </button>
            `;
            
            taskList.appendChild(li);
        });
        
        updateStats();
    }

    // Utility function to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
