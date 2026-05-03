// ── App Controller ────────────────────────────────────────────
const App = (() => {
  let _currentMatchId = null;
  let _currentMatchData = null;
  let _membersList = [];
  let _currentUser = null;

  // ── Auth Management ──
  function checkLogin() {
    const saved = localStorage.getItem('fmp_current_user');
    if (saved) {
      try {
        _currentUser = JSON.parse(saved);
      } catch (e) {
        _currentUser = null;
      }
    }
    if (!_currentUser) {
      document.getElementById('loginModal').classList.add('open');
    } else {
      updateUserUI();
    }
  }

  function updateUserUI() {
    document.getElementById('currentUserDisplay').textContent = _currentUser.name;
    document.getElementById('currentUserRole').textContent = _currentUser.role;
    document.getElementById('btnLogout').style.display = 'block';

    const isAdmin = _currentUser.role === 'Admin';
    document.getElementById('btnCreateMatch').style.display = isAdmin ? '' : 'none';
    document.getElementById('btnMembers').style.display = isAdmin ? '' : 'none';
    
    // Update empty state message
    const emptyStateP = document.querySelector('#emptyState p');
    if(emptyStateP) {
      emptyStateP.textContent = isAdmin 
        ? 'Chọn một trận đấu bên danh sách hoặc tạo mới để bắt đầu lên kế hoạch.'
        : 'Chọn một trận đấu bên danh sách để xem các công việc được giao cho bạn.';
    }
  }

  async function performLogin(username, password) {
    try {
      const res = await API.login(username, password);
      _currentUser = res;
      localStorage.setItem('fmp_current_user', JSON.stringify(res));
      document.getElementById('loginModal').classList.remove('open');
      document.getElementById('loginForm').reset();
      showToast(`✅ Xin chào, ${_currentUser.name}!`, 'success');
      updateUserUI();
      // Reload match list after login
      await loadMatchList();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }

  function logout() {
    _currentUser = null;
    localStorage.removeItem('fmp_current_user');
    _currentMatchId = null;
    _currentMatchData = null;
    document.getElementById('editorLayout').style.display = 'none';
    document.getElementById('emptyState').style.display = '';
    document.getElementById('loginModal').classList.add('open');
    document.getElementById('currentUserDisplay').textContent = 'Chưa đăng nhập';
    document.getElementById('currentUserRole').textContent = '';
    document.getElementById('btnLogout').style.display = 'none';
  }

  // ── Init ──
  async function init() {
    checkLogin();
    await loadMembers();
    await loadMatchList();
    setupEventListeners();
    _startAutoRefresh();
  }

  // ── Members Management ──
  async function loadMembers() {
    try {
      const res = await API.getMembers();
      _membersList = res.data || [];
      renderMembersList();
    } catch (err) {
      console.error(err);
    }
  }

  function getMembersList() {
    return _membersList;
  }

  function renderMembersList() {
    const listEl = document.getElementById('membersList');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (_membersList.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;padding:10px;">Chưa có thành viên nào.</p>';
      return;
    }
    _membersList.forEach(m => {
      const isMe = _currentUser && _currentUser.id === m.id;
      const isRootAdmin = m.username === 'admin';
      const deleteBtnHtml = (isMe || isRootAdmin) ? '' : `<button class="btn-delete-member" data-id="${m.id}" title="Xóa thành viên">✕</button>`;
      const myTag = isMe ? ' <span style="font-size: 10px; background: rgba(59,130,246,0.2); color: var(--accent); padding: 2px 6px; border-radius: 999px; margin-left: 6px;">(Bạn)</span>' : '';

      const div = document.createElement('div');
      div.className = 'member-item';
      div.innerHTML = `
        <div class="member-info">
          <div class="member-name">${m.name}${myTag}</div>
          <div class="member-role">${m.role || 'Player'} <span class="member-uid">🪪 ${m.id}</span></div>
        </div>
        ${deleteBtnHtml}
      `;
      listEl.appendChild(div);
    });

    document.querySelectorAll('.btn-delete-member').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('Bạn có chắc chắn muốn xóa thành viên này?')) {
          try {
            await API.deleteMember(id);
            showToast('✅ Đã xóa thành viên', 'success');
            await loadMembers();
          } catch (err) {
            showToast('❌ ' + err.message, 'error');
          }
        }
      });
    });
  }

  async function createMember(name, username, password, role) {
    try {
      await API.createMember({ name, username, password, role });
      showToast('✅ Thêm thành viên thành công!', 'success');
      document.getElementById('addMemberForm').reset();
      await loadMembers();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }



  // ── Load match list in sidebar ──
  async function loadMatchList() {
    const list = document.getElementById('matchList');
    try {
      const { data } = await API.getMatches();
      list.innerHTML = '';
      if (!data.length) {
        list.innerHTML = '<li style="padding:8px;font-size:12px;color:var(--text-muted)">Chưa có trận đấu nào</li>';
        return;
      }
      data.forEach(m => {
        const li = document.createElement('li');
        li.className = 'match-item';
        li.dataset.matchId = m.id;

        const statusColor = { 'Planned': 'var(--accent)', 'In Progress': 'var(--accent-yellow)', 'Done': 'var(--accent-green)' }[m.status] || 'var(--text-muted)';

        li.innerHTML = `
          <div class="match-item-name">${m.name}</div>
          <div class="match-item-meta">
            <span class="match-item-date">⏰ ${_formatTimeOnly(m.date)} → 🏁 ${_formatTimeOnly(m.date_end)}</span>
            <span class="match-item-status" style="color:${statusColor}">${_statusLabel(m.status)}</span>
          </div>
          <div class="match-item-meta" style="margin-top:2px;">
            <span class="match-item-date">📅 ${_formatDateOnly(m.date)}</span>
          </div>
        `;
        li.addEventListener('click', () => loadMatch(m.id));
        list.appendChild(li);
      });
      // Restore active highlight
      if (_currentMatchId) _highlightSidebarItem(_currentMatchId);
    } catch (err) {
      list.innerHTML = `<li style="padding:8px;font-size:12px;color:var(--accent-red)">⚠️ ${err.message}<br><span style="color:var(--text-muted)">Kiểm tra backend đang chạy chưa?</span></li>`;
    }
  }

  function _highlightSidebarItem(matchId) {
    document.querySelectorAll('.match-item').forEach(el => {
      el.classList.toggle('active', el.dataset.matchId === matchId);
    });
  }

  // ── Load single match ──
  async function loadMatch(matchId) {
    _currentMatchId = matchId;
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('editorLayout').style.display = 'grid';
    _highlightSidebarItem(matchId);

    try {
      const res = await API.getMatch(matchId);
      _currentMatchData = res.data;

      // Header
      document.getElementById('matchTitleHeader').textContent = res.data.name;
      const dateDisplay = `⏰ ${_formatDateDisplay(res.data.date)} → 🏁 ${_formatDateDisplay(res.data.date_end)}`;
      document.getElementById('matchDateHeader').textContent = dateDisplay;

      const isAdmin = _currentUser && _currentUser.role === 'Admin';
      const statusSelect = document.getElementById('matchStatusHeader');
      statusSelect.value = res.data.status || 'Planned';
      // Status is now auto-managed, always disabled
      statusSelect.disabled = true;
      statusSelect.style.display = 'inline-flex';

      // API Badge and Admin Tools
      const badge = document.getElementById('apiBadge');
      if (isAdmin) {
          badge.style.display = 'flex';
          const timeEl = document.getElementById('apiResponseTime');
          timeEl.textContent = res.metadata.response_time_ms;
          timeEl.style.transform = 'scale(1.3)';
          timeEl.style.color = '#fff';
          setTimeout(() => { timeEl.style.transform = ''; timeEl.style.color = ''; }, 300);
          
          document.getElementById('btnAnalytics').style.display = '';
          document.getElementById('btnLogs').style.display = '';
          // Hide delete button for completed matches
          const isDone = (res.data.status === 'Done');
          document.getElementById('btnDeleteMatch').style.display = isDone ? 'none' : '';
      } else {
          badge.style.display = 'none';
          document.getElementById('btnAnalytics').style.display = 'none';
          document.getElementById('btnLogs').style.display = 'none';
          document.getElementById('btnDeleteMatch').style.display = 'none';
      }

      // Update global progress bar
      _updateProgressBar(res.data);

      // Adjust Layout for Member vs Admin
      const treeCol = document.getElementById('colTree');
      const editorLayout = document.getElementById('editorLayout');
      const kanbanSubtitle = document.getElementById('kanbanSubtitle');
      if (isAdmin) {
          treeCol.style.display = 'flex';
          editorLayout.style.gridTemplateColumns = '220px minmax(0,1fr) 280px';
          if(kanbanSubtitle) kanbanSubtitle.textContent = 'Tất cả công việc';
      } else {
          treeCol.style.display = 'none';
          editorLayout.style.gridTemplateColumns = 'minmax(0,1fr) 300px';
          if(kanbanSubtitle) kanbanSubtitle.textContent = 'Công việc của tôi';
      }

      // Render 3 columns (or 2 for member)
      Tree.render(_currentMatchData);
      Kanban.render(_currentMatchData);

      // Reset detail
      document.getElementById('detailForm').innerHTML = `
        <div class="detail-placeholder">
          <span>👆</span><p>Chọn một nhiệm vụ để xem chi tiết</p>
        </div>`;

    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }

  // ── Global Progress Bar ──
  function _updateProgressBar(matchData) {
    const isAdmin = _currentUser && _currentUser.role === 'Admin';
    let allTasks = [];
    (matchData.categories || []).forEach(cat => {
      (cat.tasks || []).forEach(t => {
        if (isAdmin) {
          allTasks.push(t);
        } else {
          if (t.assignee_id === _currentUser.id || t.assigned_to === _currentUser.name) {
            allTasks.push(t);
          }
        }
      });
    });
    
    const activeTasks = allTasks.filter(t => t.status === 'In Progress' || t.status === 'Done' || t.status === 'Incomplete');
    const total = activeTasks.length;
    const done = activeTasks.filter(t => t.status === 'Done').length;
    const incomplete = activeTasks.filter(t => t.status === 'Incomplete').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const row = document.getElementById('progressRow');
    const bar = document.getElementById('progressRowFill');
    const label = document.getElementById('progressRowLabel');
    if (row) row.style.display = 'flex';
    if (bar) bar.style.width = pct + '%';
    if (label) {
      const incompleteText = incomplete > 0 ? ` | ❌ ${incomplete} không hoàn thành` : '';
      label.textContent = isAdmin 
        ? `${done} / ${total} tasks hoàn thành (${pct}%)${incompleteText}`
        : `${done} / ${total} tasks của bạn hoàn thành (${pct}%)${incompleteText}`;
    }
  }

  // ── Save task detail from Detail form ──
  async function saveTaskDetail(task, catName, payload) {
    if (!_currentMatchId) return;
    try {
      await API.updateTask(_currentMatchId, {
        category_name: catName,
        task_name: task.name,
        new_status: payload.status,
        assigned_to: payload.assigned_to,
        assignee_id: payload.assignee_id,
        location: payload.location,
        cost: payload.cost,
        subtasks: payload.subtasks,
        actor: _currentUser ? _currentUser.name : 'Admin'
      });
      // Update local
      if (_currentMatchData) {
        _currentMatchData.categories.forEach(cat => {
          if (cat.name === catName) {
            (cat.tasks || []).forEach(t => {
              if (t.name === task.name) {
                t.status = payload.status;
                t.assigned_to = payload.assigned_to;
                t.assignee_id = payload.assignee_id;
                if (payload.location !== null) t.location = payload.location;
                if (payload.cost !== null) t.cost = payload.cost;
                if (payload.subtasks) t.subtasks = payload.subtasks;
              }
            });
          }
        });
        Kanban.render(_currentMatchData);
        Tree.updateTaskStatus(task.name, payload.status);
        _updateProgressBar(_currentMatchData);
      }
      showToast('✅ Đã lưu thay đổi!', 'success');
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }

  async function renameTask(catName, oldTaskName, newTaskName) {
    if (!_currentMatchId || !_currentMatchData) return;
    _currentMatchData.categories.forEach(cat => {
      if (cat.name === catName) {
        const t = (cat.tasks || []).find(x => x.name === oldTaskName);
        if (t) t.name = newTaskName;
      }
    });
    try {
      await API.updateTree(_currentMatchId, _currentMatchData.categories, _currentUser ? _currentUser.name : 'Admin');
      Tree.render(_currentMatchData);
      Kanban.render(_currentMatchData);
      showToast('✅ Đã đổi tên nhiệm vụ!', 'success');
    } catch (e) {
      showToast('❌ Lỗi: ' + e.message, 'error');
    }
  }

  async function deleteTask(catName, taskName) {
    if (!_currentMatchId || !_currentMatchData) return;
    _currentMatchData.categories.forEach(cat => {
      if (cat.name === catName) {
        cat.tasks = (cat.tasks || []).filter(x => x.name !== taskName);
      }
    });
    try {
      await API.updateTree(_currentMatchId, _currentMatchData.categories, _currentUser ? _currentUser.name : 'Admin');
      Tree.render(_currentMatchData);
      Kanban.render(_currentMatchData);
      _updateProgressBar(_currentMatchData);
      showToast('🗑️ Đã xóa nhiệm vụ!', 'success');
    } catch (e) {
      showToast('❌ Lỗi: ' + e.message, 'error');
    }
  }

  function promptAddTask() {
    if (!_currentMatchId || !_currentMatchData) return;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    let optionsHtml = '';
    const uniqueCats = [...new Set(_currentMatchData.categories.map(c => c.name))];
    uniqueCats.forEach(c => {
      optionsHtml += `<option value="${c}">${c}</option>`;
    });

    overlay.innerHTML = `
      <div class="modal-content" style="max-width:400px;">
        <div class="modal-header">
          <h3 class="modal-title">Thêm nhiệm vụ mới</h3>
          <button class="modal-close" id="btnCloseAddTask">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Chọn Danh mục</label>
            <select id="addTaskCat" class="form-select">
              ${optionsHtml}
              <option value="_new_">+ Tạo danh mục mới...</option>
            </select>
          </div>
          <div class="form-group" id="newCatGroup" style="display:none;">
            <label class="form-label">Tên danh mục mới</label>
            <input type="text" id="addTaskNewCat" class="form-input" placeholder="Ví dụ: Truyền thông">
          </div>
          <div class="form-group">
            <label class="form-label">Tên nhiệm vụ</label>
            <input type="text" id="addTaskName" class="form-input" placeholder="Tên nhiệm vụ...">
          </div>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button class="btn-cancel" id="btnCancelAddTask">Hủy</button>
          <button class="btn-submit" id="btnConfirmAddTask">Thêm nhiệm vụ</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const selectCat = document.getElementById('addTaskCat');
    const newCatGroup = document.getElementById('newCatGroup');
    const btnClose = document.getElementById('btnCloseAddTask');
    const btnCancel = document.getElementById('btnCancelAddTask');
    const btnConfirm = document.getElementById('btnConfirmAddTask');

    selectCat.addEventListener('change', () => {
      if (selectCat.value === '_new_') newCatGroup.style.display = 'block';
      else newCatGroup.style.display = 'none';
    });

    const closeModal = () => document.body.removeChild(overlay);

    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);

    btnConfirm.addEventListener('click', async () => {
      let catName = selectCat.value;
      if (catName === '_new_') catName = document.getElementById('addTaskNewCat').value.trim();
      const taskName = document.getElementById('addTaskName').value.trim();

      if (!catName || !taskName) {
        showToast('❌ Vui lòng điền đủ thông tin', 'error');
        return;
      }
      
      let cat = _currentMatchData.categories.find(c => c.name === catName);
      if (!cat) {
        cat = { name: catName, tasks: [] };
        _currentMatchData.categories.push(cat);
      }
      cat.tasks.push({
        name: taskName,
        status: 'Todo',
        task_type: 'general',
        subtasks: []
      });

      try {
        await API.updateTree(_currentMatchId, _currentMatchData.categories, _currentUser ? _currentUser.name : 'Admin');
        Tree.render(_currentMatchData);
        Kanban.render(_currentMatchData);
        _updateProgressBar(_currentMatchData);
        showToast('✅ Đã thêm nhiệm vụ!', 'success');
        closeModal();
      } catch(e) {
        showToast('❌ Lỗi: ' + e.message, 'error');
      }
    });
  }

  // ── Create match ──
  async function createMatch(name, date, dateEnd) {
    try {
      // Status is auto-managed based on datetime, always send Planned
      await API.createMatch({ name, date, date_end: dateEnd, status: 'Planned', categories: [] });
      showToast('⚽ Tạo trận đấu thành công! Trạng thái sẽ tự động cập nhật.', 'success');
      await loadMatchList();
      document.getElementById('createMatchModal').classList.remove('open');
      document.getElementById('createMatchForm').reset();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }

  // ── Delete match ──
  async function deleteMatch() {
    if (!_currentMatchId) return;
    // Prevent deleting completed matches
    if (_currentMatchData && _currentMatchData.status === 'Done') {
      showToast('❌ Không thể xoá trận đấu đã hoàn thành!', 'error');
      return;
    }
    document.getElementById('deleteConfirmModal').classList.add('open');
  }

  async function confirmDeleteMatch() {
    if (!_currentMatchId) return;
    try {
      await API.deleteMatch(_currentMatchId);
      showToast('🗑️ Đã xoá trận đấu', 'success');
      _currentMatchId = null;
      _currentMatchData = null;
      document.getElementById('editorLayout').style.display = 'none';
      document.getElementById('emptyState').style.display = '';
      document.getElementById('matchStatusHeader').style.display = 'none';
      document.getElementById('btnDeleteMatch').style.display = 'none';
      document.getElementById('btnAnalytics').style.display = 'none';
      document.getElementById('btnLogs').style.display = 'none';
      document.getElementById('apiBadge').style.display = 'none';
      const bar = document.getElementById('globalProgressBar');
      if (bar) { bar.style.width = '0%'; }
      document.getElementById('deleteConfirmModal').classList.remove('open');
      await loadMatchList();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }

  async function updateMatchStatus(matchId, status) {
    if (!matchId) return;
    try {
      const res = await API.updateMatchStatus(matchId, status, _currentUser ? _currentUser.name : 'Admin');
      if (_currentMatchData) _currentMatchData.status = status;
      document.getElementById('matchStatusHeader').value = status;
      showToast('✅ Đã cập nhật trạng thái trận đấu', 'success');
      await loadMatchList();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    }
  }

  // ── Load logs ──
  async function openLogs() {
    if (!_currentMatchId) return;
    const modal = document.getElementById('logsModal');
    const body = document.getElementById('logsBody');
    modal.classList.add('open');
    body.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const { logs } = await API.getLogs(_currentMatchId);
      if (!logs.length) { body.innerHTML = '<p style="color:var(--text-muted)">Chưa có hoạt động nào.</p>'; return; }
      body.innerHTML = logs.map(l => {
        const d = new Date(l.timestamp);
        const timeStr = isNaN(d) ? l.timestamp : d.toLocaleString('vi-VN');
        return `
          <div class="log-item">
            <div class="log-dot"></div>
            <div style="flex:1">
              <div class="log-action">${l.action}</div>
              <div class="log-meta">${timeStr}${l.actor && l.actor !== "System" ? ` · <strong>${l.actor}</strong>` : ''}</div>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      body.innerHTML = `<p style="color:var(--accent-red)">${err.message}</p>`;
    }
  }

  // ── Toast ──
  let _toastTimer = null;
  function showToast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ── Event listeners ──
  function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
      document.querySelector('.main-content').classList.toggle('expanded');
    });



    // Login & Logout
    document.getElementById('loginForm').addEventListener('submit', e => {
      e.preventDefault();
      performLogin(document.getElementById('loginUsername').value.trim(), document.getElementById('loginPassword').value.trim());
    });
    document.getElementById('btnLogout').addEventListener('click', logout);

    // Analytics
    document.getElementById('btnAnalytics').addEventListener('click', () => { if (_currentMatchId) Analytics.open(_currentMatchId); });
    document.getElementById('closeAnalytics').addEventListener('click', () => Analytics.close());

    // Logs
    document.getElementById('btnLogs').addEventListener('click', openLogs);
    document.getElementById('closeLogs').addEventListener('click', () => document.getElementById('logsModal').classList.remove('open'));

    // Create match
    document.getElementById('btnCreateMatch').addEventListener('click', () => document.getElementById('createMatchModal').classList.add('open'));
    document.getElementById('closeCreateMatch').addEventListener('click', () => document.getElementById('createMatchModal').classList.remove('open'));
    document.getElementById('createMatchForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('newMatchName').value.trim();
      const date = document.getElementById('newMatchDate').value;
      const dateEnd = document.getElementById('newMatchDateEnd').value;
      
      const now = new Date();
      const matchStart = new Date(date);
      const matchEnd = new Date(dateEnd);
      
      if (matchStart < now) {
        showToast('❌ Giờ bắt đầu không thể trong quá khứ!', 'error');
        return;
      }
      if (matchEnd <= matchStart) {
        showToast('❌ Giờ kết thúc phải sau giờ bắt đầu!', 'error');
        return;
      }

      if (name && date && dateEnd) createMatch(name, date, dateEnd);
    });

    // Status select is now auto-managed — remove the change listener
    // Keep the element for display but it's always disabled

    // Delete match
    document.getElementById('btnDeleteMatch').addEventListener('click', deleteMatch);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteMatch);
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
      document.getElementById('deleteConfirmModal').classList.remove('open');
    });

    // Members Modal
    const btnMembers = document.getElementById('btnMembers');
    if (btnMembers) btnMembers.addEventListener('click', () => {
      document.getElementById('membersModal').classList.add('open');
    });
    const closeMembers = document.getElementById('closeMembers');
    if (closeMembers) closeMembers.addEventListener('click', () => {
      document.getElementById('membersModal').classList.remove('open');
    });

    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
      addMemberForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('newMemberName').value.trim();
        const username = document.getElementById('newMemberUsername').value.trim();
        const pass = document.getElementById('newMemberPassword').value.trim();
        const role = document.getElementById('newMemberRole').value;
        if (name && username && pass) createMember(name, username, pass, role);
      });
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      if (overlay.id === 'loginModal') return; // Prevent closing login modal
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    });
  }

  // ── Helper: Format datetime display ──
  function _formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return d.toLocaleDateString('vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch(e) {
      return dateStr;
    }
  }

  // ── Helper: Format time only (HH:mm) ──
  function _formatTimeOnly(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return '—';
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch(e) {
      return '—';
    }
  }

  // ── Helper: Format date only (dd/mm/yyyy) ──
  function _formatDateOnly(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return '—';
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) {
      return '—';
    }
  }

  // ── Helper: Status label in Vietnamese ──
  function _statusLabel(status) {
    const map = { 'Planned': '📅 Sắp tới', 'In Progress': '⚡ Đang diễn ra', 'Done': '✅ Hoàn thành' };
    return map[status] || status || '📅 Sắp tới';
  }

  // ── Auto-refresh status (every 30s) ──
  let _autoRefreshTimer = null;
  function _startAutoRefresh() {
    if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
    _autoRefreshTimer = setInterval(async () => {
      await loadMatchList();
      if (_currentMatchId) {
        try {
          const res = await API.getMatch(_currentMatchId);
          const oldStatus = _currentMatchData ? _currentMatchData.status : null;
          _currentMatchData = res.data;
          if (oldStatus !== res.data.status) {
            // Status changed automatically, refresh UI
            document.getElementById('matchStatusHeader').value = res.data.status;
            Kanban.render(_currentMatchData);
            Tree.render(_currentMatchData);
            _updateProgressBar(_currentMatchData);
            showToast(`🔄 Trạng thái tự động: ${_statusLabel(res.data.status)}`, 'success');
          }
        } catch(e) {}
      }
    }, 30000);
  }

  return { init, saveTaskDetail, showToast, updateLocalProgressBar: _updateProgressBar, getMembersList, getCurrentUser: () => _currentUser, getCurrentMatch: () => _currentMatchData, renameTask, deleteTask, promptAddTask };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
