// ── Tree View ────────────────────────────────────────
const Tree = (() => {
  let _matchData = null;
  let _selectedTask = null;

  function render(matchData) {
    _matchData = matchData;
    const container = document.getElementById('treeContainer');
    container.innerHTML = '';

    matchData.categories.forEach((cat, catIdx) => {
      const catEl = document.createElement('div');
      catEl.className = 'tree-category';
      catEl.dataset.catIdx = catIdx;

      const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');

      const header = document.createElement('div');
      header.className = 'tree-category-header';
      header.draggable = !isMatchLocked;
      header.innerHTML = `
        <span class="tree-chevron open">▶</span>
        <span class="tree-cat-name">${cat.name}</span>
        <span class="tree-cat-count">${(cat.tasks || []).filter(t => t.status !== 'Todo').length}</span>
      `;

      const taskList = document.createElement('div');
      taskList.className = 'tree-tasks';
      taskList.id = `tree-tasks-${catIdx}`;

      const currentUser = App.getCurrentUser();
      const isAdmin = currentUser && currentUser.role === 'Admin';
      
      (cat.tasks || []).forEach((task, taskIdx) => {
        if (task.status === 'Todo') return;
        if (!isAdmin) {
            const isAssignee = task.assignee_id === currentUser.id || task.assigned_to === currentUser.name;
            if (!isAssignee) return;
        }
        const taskEl = createTaskNode(task, taskIdx, catIdx, cat.name);
        taskList.appendChild(taskEl);
      });

      // Toggle collapse
      header.addEventListener('click', () => {
        const chevron = header.querySelector('.tree-chevron');
        const isOpen = chevron.classList.contains('open');
        chevron.classList.toggle('open', !isOpen);
        taskList.style.display = isOpen ? 'none' : 'flex';
      });

      // Drag category
      header.addEventListener('dragstart', e => {
        e.dataTransfer.setData('treeCatIdx', catIdx);
        e.dataTransfer.effectAllowed = 'move';
      });
      catEl.addEventListener('dragover', e => { e.preventDefault(); catEl.style.outline = '1px dashed var(--accent)'; });
      catEl.addEventListener('dragleave', () => { catEl.style.outline = ''; });
      catEl.addEventListener('drop', e => {
        e.preventDefault();
        catEl.style.outline = '';
        const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');
        if (isMatchLocked) {
          App.showToast('❌ Không thể kéo thả khi trận đấu đã bắt đầu hoặc kết thúc!', 'error');
          return;
        }
        const fromIdx = parseInt(e.dataTransfer.getData('treeCatIdx'));
        if (isNaN(fromIdx) || fromIdx === catIdx) return;
        const cats = _matchData.categories;
        const [moved] = cats.splice(fromIdx, 1);
        cats.splice(catIdx, 0, moved);
        render(_matchData);
        API.updateTree(_matchData.id, cats).catch(() => {});
      });

      catEl.appendChild(header);
      catEl.appendChild(taskList);
      container.appendChild(catEl);
    });
  }

  function createTaskNode(task, taskIdx, catIdx, catName) {
    const el = document.createElement('div');
    el.className = 'tree-task';
    el.dataset.taskIdx = taskIdx;
    
    const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');
    el.draggable = !isMatchLocked;

    const dotClass = task.status === 'Done' ? 'Done' : task.status === 'In Progress' ? 'InProgress' : task.status === 'Incomplete' ? 'Incomplete' : 'Todo';
    el.innerHTML = `
      <span class="tree-task-status-dot status-dot-${dotClass}"></span>
      <span class="tree-task-name">${task.name}</span>
    `;

    el.addEventListener('click', () => {
      document.querySelectorAll('.tree-task').forEach(t => t.classList.remove('selected'));
      el.classList.add('selected');
      _selectedTask = { task, catName };
      Detail.render(task, catName);
      Kanban.highlightCard(task.name);
    });

    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('treeTaskIdx', taskIdx);
      e.dataTransfer.setData('treeTaskCatIdx', catIdx);
      e.stopPropagation();
    });
    el.addEventListener('dragover', e => e.preventDefault());
    el.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');
      if (isMatchLocked) {
        App.showToast('❌ Không thể kéo thả khi trận đấu đã bắt đầu hoặc kết thúc!', 'error');
        return;
      }
      const fromTaskIdx = parseInt(e.dataTransfer.getData('treeTaskIdx'));
      const fromCatIdx = parseInt(e.dataTransfer.getData('treeTaskCatIdx'));
      if (isNaN(fromTaskIdx)) return;
      const fromCat = _matchData.categories[fromCatIdx];
      const toCat = _matchData.categories[catIdx];
      const [movedTask] = fromCat.tasks.splice(fromTaskIdx, 1);
      toCat.tasks.splice(taskIdx, 0, movedTask);
      render(_matchData);
      Kanban.render(_matchData);
      API.updateTree(_matchData.id, _matchData.categories).catch(() => {});
    });

    return el;
  }

  function updateTaskStatus(taskName, newStatus) {
    if (!_matchData) return;
    _matchData.categories.forEach(cat => {
      (cat.tasks || []).forEach(task => {
        if (task.name === taskName) task.status = newStatus;
      });
    });
    render(_matchData);
  }

  return { render, updateTaskStatus };
})();
