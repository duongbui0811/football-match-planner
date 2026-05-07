// ── Detail Form (Dynamic) ────────────────────────────────────
const Detail = (() => {

  function render(task, catName) {
    const form = document.getElementById('detailForm');
    const isLogistics = catName && (catName.includes('Hậu cần') || catName.includes('Tài chính'));

    // Build allowed status options based on current task status
    let allowedStatuses = [];
    if (task.status === 'Done') {
      // Done tasks are locked — no changes allowed
      allowedStatuses = ['Done'];
    } else if (task.status === 'Incomplete') {
      // Incomplete is auto-managed, no changes allowed
      allowedStatuses = ['Incomplete'];
    } else {
      // Normal flow: Todo → In Progress → Done (no Incomplete option)
      allowedStatuses = ['Todo', 'In Progress', 'Done'];
    }
    const statusOpts = allowedStatuses.map(s =>
      `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s === 'Todo' ? 'Cần làm' : s === 'In Progress' ? 'Đang xử lý' : s === 'Done' ? 'Đã xong' : 'Không hoàn thành'}</option>`
    ).join('');

    const currentUser = App.getCurrentUser();
    const currentMatch = App.getCurrentMatch();
    const isMatchLocked = currentMatch && (currentMatch.status === 'In Progress' || currentMatch.status === 'Done');

    const isAdmin = currentUser && currentUser.role === 'Admin';
    const isAssignee = currentUser && (task.assignee_id === currentUser.id || task.assigned_to === currentUser.name);
    const isIncomplete = task.status === 'Incomplete';
    const isDone = task.status === 'Done';
    const isUnassigned = !task.assigned_to && !task.assignee_id;
    const canAssign = isAdmin && !isMatchLocked && !isIncomplete && !isDone;
    const canEditStatus = !isMatchLocked && !isIncomplete && !isDone && !isUnassigned && (isAdmin || isAssignee);
    const canAddSubtask = canEditStatus && !isDone;

    const subtasksHtml = buildSubtasksHtml(task.subtasks || [], canEditStatus);
    const extraFields = buildLogisticsFields(task, isAdmin && !isMatchLocked);

    const typeMap = { logistics: '🚚 Hậu cần', personal: '👤 Cá nhân', general: '📋 Chung' };
    const typeBadge = typeMap[task.task_type] || '📋 Chung';

    const createdByHtml = '';

    form.innerHTML = `
      <div class="detail-task-header">
        <div class="detail-tags-row">
          <span class="detail-category-tag">${catName || 'Chung'}</span>
          ${isAdmin && !isMatchLocked ? `
            <button class="btn-icon" id="btnEditTaskName" title="Đổi tên" style="border:none;background:none;cursor:pointer;font-size:16px;">✏️</button>
            <button class="btn-icon" id="btnDeleteTask" title="Xóa nhiệm vụ" style="border:none;background:none;cursor:pointer;font-size:16px;color:red;">🗑️</button>
          ` : ''}
        </div>
        <div class="detail-task-title" id="detailTaskTitleEl">${task.name}</div>
        ${createdByHtml}
        <div class="detail-assignee">
          <label class="form-label">👤 Người phụ trách</label>
          ${isAdmin && !isMatchLocked ? `
          <select class="form-select" id="detailAssignee">
            <option value="">-- Chọn thành viên --</option>
            ${App.getMembersList().map(m => `<option value="${m.id}" data-name="${m.name}" ${task.assignee_id === m.id ? 'selected' : (task.assigned_to === m.name && !task.assignee_id ? 'selected' : '')}>${m.name} (${m.role || 'Member'})</option>`).join('')}
          </select>` : `
          <div class="detail-uid-row" style="margin:0; padding:10px 12px; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2);">
            <span class="detail-uid-value" style="font-size: 13px; font-family: 'Inter', sans-serif;">${task.assigned_to || 'Chưa phân công'}</span>
          </div>`}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Trạng thái</label>
        <select class="form-select" id="detailStatus" ${canEditStatus ? '' : 'disabled'}>${statusOpts}</select>
      </div>

      ${extraFields}

      <div class="form-group">
        <label class="form-label">Sub-tasks & Biên lai</label>
        <div class="subtask-list" id="subtaskList">${subtasksHtml}</div>
        ${canAddSubtask ? `
        <div style="display:flex; gap:8px; margin-top:8px;">
          <input type="text" id="newSubtaskName" class="form-input" placeholder="Tên subtask mới..." style="flex:1;">
          <input type="number" id="newSubtaskCost" class="form-input" placeholder="Chi phí ($)" style="width:100px;" min="0">
          <button type="button" class="btn-submit" id="btnAddSubtask" style="width:auto; padding:6px 12px; font-size:12px;">+ Thêm</button>
        </div>
        ` : (isDone ? `<div style="color:var(--accent-green); font-size:12px; margin-top:8px; padding: 8px 10px; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); border-radius: 8px;">✅ Nhiệm vụ đã hoàn thành — không thể thêm sub-task mới.</div>` : '')}
      </div>

      ${isMatchLocked ? `<div style="color:var(--accent-red); font-size:12px; margin-top:10px; padding: 10px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;">🔒 Trận đấu đã bắt đầu hoặc kết thúc, không thể thay đổi thông tin nhiệm vụ.</div>` : 
      isIncomplete ? `<div style="color:var(--accent-red); font-size:12px; margin-top:10px; padding: 10px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;">❌ Nhiệm vụ này không hoàn thành — Trận đấu đã diễn ra mà task chưa được hoàn tất.</div>` : 
      isDone ? `<div style="color:var(--accent-green); font-size:12px; margin-top:10px; padding: 10px; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); border-radius: 8px;">✅ Nhiệm vụ đã hoàn thành.</div>` :
      (isUnassigned && canAssign) ? `<div style="color:var(--accent-yellow); font-size:12px; margin-top:10px; padding: 10px; background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.2); border-radius: 8px;">⚠️ Vui lòng phân công người phụ trách trước khi thay đổi trạng thái.</div><button class="btn-submit" id="detailSaveBtn" style="margin-top:10px;">💾 Lưu phân công</button>` :
      canEditStatus ? `<button class="btn-submit" id="detailSaveBtn">💾 Lưu thay đổi</button>` : `<div style="color:var(--accent-red); font-size:12px; margin-top:10px;">⚠️ Bạn chỉ có thể cập nhật trạng thái nếu nhiệm vụ được giao cho bạn.</div>`}
    `;

    if (canEditStatus || (isUnassigned && canAssign)) {
      const btnAddSubtask = document.getElementById('btnAddSubtask');
      if (btnAddSubtask) {
        btnAddSubtask.addEventListener('click', () => {
          const nameEl = document.getElementById('newSubtaskName');
          const costEl = document.getElementById('newSubtaskCost');
          const name = nameEl.value.trim();
          const cost = costEl.value !== '' ? parseFloat(costEl.value) : null;
          if (cost !== null && cost < 0) {
            App.showToast('❌ Chi phí không được là số âm!', 'error');
            return;
          }
          if (name) {
            task.subtasks = task.subtasks || [];
            task.subtasks.push({ name: name, cost: cost, status: 'Todo' });
            document.getElementById('subtaskList').innerHTML = buildSubtasksHtml(task.subtasks, canEditStatus);
            nameEl.value = '';
            costEl.value = '';
            // Auto click save to refresh UI with listeners
            document.getElementById('detailSaveBtn').click();
          }
        });
      }

      document.querySelectorAll('.btn-delete-subtask').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.currentTarget.dataset.idx;
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.style.display = 'flex';
          overlay.innerHTML = `
            <div class="modal-box modal-box-sm">
              <div class="modal-header">
                <h2>🗑️ Xác nhận xoá</h2>
              </div>
              <div class="modal-body">
                <p style="color:var(--text-secondary);margin-bottom:20px">Bạn có chắc chắn muốn xoá subtask này? Hành động này <strong style="color:var(--accent-red)">không thể hoàn tác</strong>.</p>
                <div style="display:flex;gap:10px">
                  <button class="btn-submit btn-danger" id="confirmDelSubtaskBtn" style="background:var(--accent-red);border-color:var(--accent-red);">🗑️ Xoá</button>
                  <button class="btn-cancel" id="cancelDelSubtaskBtn">Huỷ</button>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(overlay);

          const closeModal = () => document.body.removeChild(overlay);
          document.getElementById('cancelDelSubtaskBtn').onclick = closeModal;
          document.getElementById('confirmDelSubtaskBtn').onclick = () => {
            task.subtasks.splice(idx, 1);
            document.getElementById('detailSaveBtn').click(); // Auto save
            closeModal();
          };
        });
      });

      document.querySelectorAll('.btn-edit-subtask').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.currentTarget.dataset.idx;
          const currentName = task.subtasks[idx].name;
          const currentCost = task.subtasks[idx].cost || 0;

          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.style.display = 'flex';
          overlay.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
              <div class="modal-header">
                <h3 class="modal-title">Sửa Subtask</h3>
                <button class="modal-close" id="btnCloseEditSubtask">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Tên subtask</label>
                  <input type="text" id="editSubtaskName" class="form-input" value="${currentName}">
                </div>
                <div class="form-group">
                  <label class="form-label">Chi phí ($)</label>
                  <input type="number" id="editSubtaskCost" class="form-input" value="${currentCost}" min="0">
                </div>
              </div>
              <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                <button class="btn-cancel" id="btnCancelEditSubtask">Hủy</button>
                <button class="btn-submit" id="btnConfirmEditSubtask">Lưu thay đổi</button>
              </div>
            </div>
          `;
          document.body.appendChild(overlay);

          const closeModal = () => document.body.removeChild(overlay);
          document.getElementById('btnCloseEditSubtask').onclick = closeModal;
          document.getElementById('btnCancelEditSubtask').onclick = closeModal;
          document.getElementById('btnConfirmEditSubtask').onclick = () => {
            const newName = document.getElementById('editSubtaskName').value.trim();
            const newCost = parseFloat(document.getElementById('editSubtaskCost').value) || 0;
            if (newCost < 0) {
              App.showToast('❌ Chi phí không được là số âm!', 'error');
              return;
            }
            if (newName) {
              task.subtasks[idx].name = newName;
              task.subtasks[idx].cost = newCost;
              document.getElementById('detailSaveBtn').click();
              closeModal();
            } else {
              App.showToast('❌ Vui lòng nhập tên!', 'error');
            }
          };
        });
      });

      document.getElementById('detailSaveBtn').addEventListener('click', () => {
        const newStatus = document.getElementById('detailStatus').value;
        const assigneeEl = document.getElementById('detailAssignee');
        const newAssigneeId = assigneeEl ? assigneeEl.value : (task.assignee_id || null);
        const newAssignee = assigneeEl ? (newAssigneeId ? assigneeEl.options[assigneeEl.selectedIndex].dataset.name : '') : (task.assigned_to || '');
        const costEl = document.getElementById('detailCost');
        const locEl = document.getElementById('detailLocation');
        const newCost = costEl ? (costEl.value !== '' ? parseFloat(costEl.value) : null) : null;
        const newLocation = locEl ? locEl.value : null;

        const checkboxes = document.querySelectorAll('.subtask-check');
        const updatedSubtasks = (task.subtasks || []).map((s, idx) => {
          if (checkboxes[idx]) {
            s.status = checkboxes[idx].checked ? 'Done' : 'Todo';
          }
          return s;
        });

        if (newStatus === 'Done') {
          const hasIncompleteSubtasks = updatedSubtasks.some(s => s.status !== 'Done');
          if (hasIncompleteSubtasks) {
            App.showToast('❌ Vui lòng hoàn thành tất cả sub-tasks trước khi chuyển sang Đã xong!', 'error');
            document.getElementById('detailStatus').value = task.status;
            return;
          }
        }

        App.saveTaskDetail(task, catName, {
          status: newStatus, assigned_to: newAssignee, assignee_id: newAssigneeId, cost: newCost, location: newLocation, subtasks: updatedSubtasks
        }).then(() => {
          // Re-render detail panel to reflect the new state immediately
          task.status = newStatus;
          task.assigned_to = newAssignee;
          task.assignee_id = newAssigneeId;
          if (newCost !== null) task.cost = newCost;
          if (newLocation !== null) task.location = newLocation;
          task.subtasks = updatedSubtasks;
          Detail.render(task, catName);
        });
      });
    }

    if (isAdmin) {
      const btnEditTaskName = document.getElementById('btnEditTaskName');
      const titleEl = document.getElementById('detailTaskTitleEl');
      if (btnEditTaskName) {
        btnEditTaskName.addEventListener('click', () => {
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.style.display = 'flex';
          overlay.innerHTML = `
            <div class="modal-content" style="max-width:400px;">
              <div class="modal-header">
                <h3 class="modal-title">Đổi tên Nhiệm vụ</h3>
                <button class="modal-close" id="btnCloseEditTask">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Tên nhiệm vụ</label>
                  <input type="text" id="editTaskName" class="form-input" value="${task.name}">
                </div>
              </div>
              <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                <button class="btn-cancel" id="btnCancelEditTask">Hủy</button>
                <button class="btn-submit" id="btnConfirmEditTask">Lưu thay đổi</button>
              </div>
            </div>
          `;
          document.body.appendChild(overlay);

          const closeModal = () => document.body.removeChild(overlay);
          document.getElementById('btnCloseEditTask').onclick = closeModal;
          document.getElementById('btnCancelEditTask').onclick = closeModal;
          document.getElementById('btnConfirmEditTask').onclick = () => {
            const newName = document.getElementById('editTaskName').value.trim();
            if (newName && newName !== task.name) {
              const oldName = task.name;
              task.name = newName;
              App.renameTask(catName, oldName, newName);
              Detail.render(task, catName);
              closeModal();
            } else if (!newName) {
              App.showToast('❌ Vui lòng nhập tên!', 'error');
            } else {
              closeModal();
            }
          };
        });
      }
      const btnDeleteTask = document.getElementById('btnDeleteTask');
      if (btnDeleteTask) {
        btnDeleteTask.addEventListener('click', () => {
          const overlay = document.createElement('div');
          overlay.className = 'modal-overlay';
          overlay.style.display = 'flex';
          overlay.innerHTML = `
            <div class="modal-box modal-box-sm">
              <div class="modal-header">
                <h2>🗑️ Xác nhận xoá Nhiệm vụ</h2>
              </div>
              <div class="modal-body">
                <p style="color:var(--text-secondary);margin-bottom:20px">Bạn có chắc muốn xóa toàn bộ nhiệm vụ này? Hành động này <strong style="color:var(--accent-red)">không thể hoàn tác</strong>.</p>
                <div style="display:flex;gap:10px">
                  <button class="btn-submit btn-danger" id="confirmDelTaskBtn" style="background:var(--accent-red);border-color:var(--accent-red);">🗑️ Xoá vĩnh viễn</button>
                  <button class="btn-cancel" id="cancelDelTaskBtn">Huỷ</button>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(overlay);

          const closeModal = () => document.body.removeChild(overlay);
          document.getElementById('cancelDelTaskBtn').onclick = closeModal;
          document.getElementById('confirmDelTaskBtn').onclick = () => {
            App.deleteTask(catName, task.name);
            document.getElementById('detailForm').innerHTML = '<div class="detail-placeholder"><span>👆</span><p>Đã xóa nhiệm vụ.</p></div>';
            closeModal();
          };
        });
      }
    }

    // Live map link update
    const locEl = document.getElementById('detailLocation');
    const mapEl = document.getElementById('mapLink');
    if (locEl && mapEl) {
      locEl.addEventListener('input', () => {
        const q = encodeURIComponent(locEl.value || 'Hà Nội');
        mapEl.href = `https://www.google.com/maps/search/${q}`;
      });
    }
  }

  function buildLogisticsFields(task, isAdmin) {
    // Always auto-calculate cost from subtask costs
    const cost = (task.subtasks || []).filter(s => typeof s.cost === 'number' && s.cost !== null).reduce((acc, s) => acc + s.cost, 0);
    const locationVal = task.location || '';
    const mapQuery = encodeURIComponent(locationVal || 'Hà Nội');

    const locationHtml = task.name === 'Đặt sân bóng' ? `
      <div class="form-group">
        <label class="form-label">📍 Địa điểm</label>
        <input type="text" class="form-input" id="detailLocation" value="${locationVal}" placeholder="VD: Sân Hàng Đẫy, Hà Nội" ${isAdmin ? '' : 'readonly'} />
        <a class="map-link" href="https://www.google.com/maps/search/${mapQuery}" target="_blank" id="mapLink" style="margin-top:6px">
          🗺️ Xem trên Google Maps
        </a>
      </div>
    ` : '';

    return `
      <div class="form-group">
        <label class="form-label">💰 Tổng chi phí (USD $) <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">— tự tính từ sub-tasks</span></label>
        <input type="number" class="form-input" value="${cost}" id="detailCost" readonly style="background: rgba(255,255,255,0.03); cursor: default;" />
      </div>
      ${locationHtml}
    `;
  }

  function buildSubtasksHtml(subtasks, canEditStatus) {
    if (!subtasks.length) return '';
    const total = subtasks.length;
    const done = subtasks.filter(s => s.status === 'Done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const progressHeader = `
      <div class="subtask-progress-header">
        <span class="subtask-progress-label">Tiến độ: ${done}/${total} (${pct}%)</span>
        <div class="subtask-progress-track"><div class="subtask-progress-fill" style="width:${pct}%"></div></div>
      </div>`;

    const rows = subtasks.map((s, idx) => {
      const isError = !s.status || s.status === 'null' || s.status === 'N/A' || typeof s.cost === 'string';
      const isDone = s.status === 'Done';
      const costLabel = typeof s.cost === 'number'
        ? `<span class="subtask-cost">$${s.cost.toLocaleString()}</span>`
        : `<span class="subtask-cost-err">⚠️ ${s.cost}</span>`;

      return `
        <div class="subtask-item">
          <input type="checkbox" class="subtask-check" ${isDone ? 'checked' : ''} ${isError || !canEditStatus ? 'disabled' : ''} />
          <span class="subtask-name ${isDone ? 'subtask-done' : ''} ${isError ? 'subtask-error' : ''}" id="subtask-name-${idx}">${s.name}</span>
          ${costLabel}
          ${isError ? '<span class="subtask-err-icon" title="Dữ liệu lỗi — bị bỏ qua trong pipeline">⚠️</span>' : ''}
          ${canEditStatus ? `
            <div style="margin-left: auto; display:flex; gap:4px;">
              <button type="button" class="btn-icon btn-edit-subtask" data-idx="${idx}" title="Sửa" style="border:none;background:none;cursor:pointer;padding:0 4px;font-size:12px">✏️</button>
              <button type="button" class="btn-icon btn-delete-subtask" data-idx="${idx}" title="Xóa" style="border:none;background:none;cursor:pointer;padding:0 4px;font-size:12px;color:red">✕</button>
            </div>
          ` : ''}
        </div>`;
    }).join('');

    return progressHeader + rows;
  }

  return { render };
})();
