// ── Kanban Board ─────────────────────────────────────────────
const Kanban = (() => {
  let _matchData = null;
  let _draggedCard = null;

  const COLS = [
    { id: 'Todo', label: 'Cần làm', countId: 'count-Todo', cardsId: 'cards-Todo' },
    { id: 'InProgress', label: 'Đang xử lý', countId: 'count-InProgress', cardsId: 'cards-InProgress' },
    { id: 'Done', label: 'Đã xong', countId: 'count-Done', cardsId: 'cards-Done' },
    { id: 'Incomplete', label: 'Không hoàn thành', countId: 'count-Incomplete', cardsId: 'cards-Incomplete' }
  ];



  function render(matchData) {
    _matchData = matchData;

    const allTasks = [];
    const currentUser = App.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'Admin';
    (matchData.categories || []).forEach(cat => {
      (cat.tasks || []).forEach(task => {
        if (!isAdmin) {
          const isAssignee = task.assignee_id === currentUser.id || task.assigned_to === currentUser.name;
          if (!isAssignee) return;
        }
        allTasks.push({ ...task, categoryName: cat.name });
      });
    });

    const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');

    COLS.forEach(col => {
      const cardsEl = document.getElementById(col.cardsId);
      cardsEl.innerHTML = '';
      if (col.id === 'Todo' && isAdmin && !isMatchLocked) {
        const btnAdd = document.createElement('button');
        btnAdd.className = 'btn-submit';
        btnAdd.style.margin = '8px';
        btnAdd.style.width = 'calc(100% - 16px)';
        btnAdd.style.padding = '6px 0';
        btnAdd.textContent = '+ Thêm nhiệm vụ mới';
        btnAdd.onclick = () => App.promptAddTask();
        cardsEl.appendChild(btnAdd);
      }
      const status = col.id === 'InProgress' ? 'In Progress' : col.id;
      const filtered = allTasks.filter(t => t.status === status);
      document.getElementById(col.countId).textContent = filtered.length;
      filtered.forEach(task => cardsEl.appendChild(createCard(task)));
    });

    // Setup drop zones (use a simple guard so we don't duplicate listeners)
    COLS.forEach(col => {
      const el = document.getElementById(`kanban-${col.id}`);
      if (el._dropSetup) return;
      el._dropSetup = true;

      // Incomplete column is read-only — no drag-drop allowed into it
      if (col.id === 'Incomplete') return;

      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', e => {
        e.preventDefault(); el.classList.remove('drag-over');

        const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');
        if (isMatchLocked) {
          App.showToast('❌ Không thể kéo thả khi trận đấu đã bắt đầu hoặc kết thúc!', 'error');
          return;
        }

        const newStatus = col.id === 'InProgress' ? 'In Progress' : col.id;
        let taskName, categoryName, oldStatus;
        let isFromTree = false;

        if (_draggedCard) {
          ({ taskName, categoryName, oldStatus } = _draggedCard);
        } else if (e.dataTransfer.getData('treeTaskIdx')) {
          if (col.id !== 'Todo') return;
          const taskIdx = parseInt(e.dataTransfer.getData('treeTaskIdx'));
          const catIdx = parseInt(e.dataTransfer.getData('treeTaskCatIdx'));
          const task = _matchData.categories[catIdx].tasks[taskIdx];
          taskName = task.name; categoryName = _matchData.categories[catIdx].name;
          oldStatus = task.status; isFromTree = true;
        } else return;

        if (oldStatus === newStatus) return;

        // Don't allow dragging FROM Incomplete to other columns
        if (oldStatus === 'Incomplete') {
          App.showToast('❌ Không thể chuyển task đã không hoàn thành!', 'error');
          return;
        }

        // Don't allow dragging FROM Done to any other column
        if (oldStatus === 'Done') {
          App.showToast('❌ Task đã hoàn thành không thể di chuyển!', 'error');
          return;
        }

        // Don't allow dragging unassigned tasks
        let isUnassigned = false;
        _matchData.categories.forEach(cat => {
          if (cat.name === categoryName) {
            (cat.tasks || []).forEach(t => {
              if (t.name === taskName && !t.assigned_to && !t.assignee_id) isUnassigned = true;
            });
          }
        });
        if (isUnassigned) {
          App.showToast('❌ Vui lòng phân công người phụ trách trước khi chuyển trạng thái!', 'error');
          return;
        }

        if (newStatus === 'Done') {
          let hasIncompleteSubtasks = false;
          _matchData.categories.forEach(cat => {
            if (cat.name === categoryName) {
              (cat.tasks || []).forEach(t => {
                if (t.name === taskName) {
                  const incomplete = (t.subtasks || []).some(s => s.status !== 'Done');
                  if (incomplete) hasIncompleteSubtasks = true;
                }
              });
            }
          });
          if (hasIncompleteSubtasks) {
            App.showToast('❌ Vui lòng hoàn thành tất cả sub-tasks trước khi chuyển sang Đã xong!', 'error');
            return;
          }
        }

        updateLocalStatus(taskName, newStatus);
        render(_matchData);
        Tree.updateTaskStatus(taskName, newStatus);
        App.updateLocalProgressBar(_matchData);

        const currentUser = App.getCurrentUser();
        API.updateTask(_matchData.id, {
          category_name: categoryName, task_name: taskName, new_status: newStatus,
          actor: currentUser ? currentUser.name : 'Admin'
        }).then(() => {
          App.showToast(`✅ ${isFromTree ? 'Thêm' : 'Chuyển'} "${taskName}" → ${col.label}`, 'success');
        }).catch(err => App.showToast('❌ ' + err.message, 'error'));
        _draggedCard = null;
      });
    });
  }

  function createCard(task) {
    const card = document.createElement('div');
    const currentUser = App.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'Admin';
    const isAssignee = currentUser && (task.assignee_id === currentUser.id || task.assigned_to === currentUser.name);
    const isIncomplete = task.status === 'Incomplete';
    const isDone = task.status === 'Done';
    const isUnassigned = !task.assigned_to && !task.assignee_id;
    const isMatchLocked = _matchData && (_matchData.status === 'In Progress' || _matchData.status === 'Done');

    card.className = 'kanban-card' + (isIncomplete ? ' card-incomplete' : '') + (isDone ? ' card-done' : '') + (isUnassigned ? ' card-unassigned' : '');
    card.draggable = !isIncomplete && !isDone && !isUnassigned && !isMatchLocked && (isAdmin || isAssignee);
    card.dataset.taskName = task.name;
    card.dataset.status = task.status;

    const subtaskTotal = (task.subtasks || []).length;
    const subtaskDone = (task.subtasks || []).filter(s => s.status === 'Done').length;
    const subtaskPct = subtaskTotal > 0 ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;
    const subtaskHtml = subtaskTotal > 0 ? `
      <div class="card-subtask-bar">
        <div class="card-subtask-fill" style="width:${subtaskPct}%"></div>
      </div>
      <span class="card-subtask-count">${subtaskDone}/${subtaskTotal} sub-tasks</span>
    ` : '';

    card.innerHTML = `
      <div class="card-header-row">
        <span class="card-category">${task.categoryName}</span>
      </div>
      <div class="card-title">${task.name}</div>
      <div class="card-meta">
        <span class="card-assignee">👤 ${task.assigned_to || 'Chưa giao'}</span>
      </div>
      ${subtaskHtml}
    `;

    card.addEventListener('dragstart', () => {
      card.classList.add('dragging');
      _draggedCard = { taskName: task.name, categoryName: task.categoryName, oldStatus: task.status };
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); });
    card.addEventListener('click', () => { Detail.render(task, task.categoryName); highlightCard(task.name); });

    return card;
  }

  function updateLocalStatus(taskName, newStatus) {
    if (!_matchData) return;
    _matchData.categories.forEach(cat => {
      (cat.tasks || []).forEach(t => { if (t.name === taskName) t.status = newStatus; });
    });
  }

  function highlightCard(taskName) {
    document.querySelectorAll('.kanban-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.taskName === taskName);
    });
  }

  return { render, highlightCard };
})();
