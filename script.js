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

    // Global click to close options menus
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.task-actions')) {
            document.querySelectorAll('.options-menu.show').forEach(m => {
                m.classList.remove('show');
                m.closest('.task-actions').classList.remove('active');
            });
        }
    });

    // Handle Inline Edit Saving
    taskList.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('edit-input')) {
            saveEdit(e.target);
        }
    });
    
    taskList.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('edit-input')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur(); // Triggers focusout
            } else if (e.key === 'Escape') {
                const item = e.target.closest('.task-item');
                item.classList.remove('editing');
                item.setAttribute('draggable', 'true');
                e.target.value = tasks.find(t => t.id === item.dataset.id).text;
            }
        }
    });

    function saveEdit(input) {
        const item = input.closest('.task-item');
        if (!item.classList.contains('editing')) return; // Avoid double saving
        
        const newText = input.value.trim();
        const task = tasks.find(t => t.id === item.dataset.id);
        
        if (newText && newText !== task.text) {
            task.text = newText;
            saveTasks();
        } else {
            input.value = task.text; // revert visual if empty
        }
        item.classList.remove('editing');
        item.setAttribute('draggable', 'true');
        renderTasks(); // update visually
    }

    // Drag and Drop functionality
    let draggedItem = null;

    taskList.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.task-item');
        if(item && !item.classList.contains('editing') && item.getAttribute('draggable') === 'true') {
            draggedItem = item;
            setTimeout(() => item.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
        }
    });

    taskList.addEventListener('dragend', (e) => {
        const item = e.target.closest('.task-item');
        if(item) {
            item.classList.remove('dragging');
            draggedItem = null;
            updateArrayOrder();
        }
    });

    taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedItem) return;
        
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedItem);
        } else {
            taskList.insertBefore(draggedItem, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function updateArrayOrder() {
        const domIds = [...taskList.querySelectorAll('.task-item')].map(item => item.dataset.id);
        const reorderedTasks = domIds.map(id => tasks.find(t => t.id === id));
        let domIndex = 0;
        tasks = tasks.map(t => {
            if (domIds.includes(t.id)) {
                return reorderedTasks[domIndex++];
            }
            return t;
        });
        saveTasks();
    }

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
        
        // Handle Options Menu Toggle
        if (e.target.closest('.options-btn')) {
            const actionsContainer = e.target.closest('.task-actions');
            const menu = actionsContainer.querySelector('.options-menu');
            
            // Close other menus
            document.querySelectorAll('.options-menu.show').forEach(m => {
                if (m !== menu) {
                    m.classList.remove('show');
                    m.closest('.task-actions').classList.remove('active');
                }
            });

            menu.classList.toggle('show');
            actionsContainer.classList.toggle('active', menu.classList.contains('show'));
            return;
        }
        
        // Handle Delete from Menu
        if (e.target.closest('.delete-menu-btn')) {
            item.querySelector('.options-menu').classList.remove('show');
            item.classList.add('removing');
            // Wait for animation
            setTimeout(() => {
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasks();
                renderTasks();
            }, 300);
            return;
        }

        // Handle Edit from Menu
        if (e.target.closest('.edit-menu-btn')) {
            item.querySelector('.options-menu').classList.remove('show');
            item.classList.add('editing');
            item.removeAttribute('draggable');
            const input = item.querySelector('.edit-input');
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
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
            li.setAttribute('draggable', 'true');
            
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${escapeHTML(task.text)}</span>
                <input type="text" class="edit-input" value="${escapeHTML(task.text)}">
                <div class="task-actions">
                    <button class="options-btn" aria-label="More options">
                        <i class="ph ph-dots-three"></i>
                    </button>
                    <div class="options-menu">
                        <button class="menu-btn edit-menu-btn"><i class="ph ph-pencil"></i> Edit</button>
                        <button class="menu-btn delete-menu-btn"><i class="ph ph-trash"></i> Delete</button>
                    </div>
                </div>
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
