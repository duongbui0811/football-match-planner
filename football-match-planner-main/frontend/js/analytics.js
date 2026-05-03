// ── Analytics Modal ──────────────────────────────────────────
const Analytics = (() => {

  async function open(matchId) {
    const modal = document.getElementById('analyticsModal');
    const body  = document.getElementById('analyticsBody');
    modal.classList.add('open');
    body.innerHTML = '<div class="loading-spinner"></div>';
    try {
      const data = await API.getAnalytics(matchId);
      body.innerHTML = renderAnalytics(data);
      // Animate progress bars after render
      setTimeout(() => {
        body.querySelectorAll('.analytics-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.pct + '%';
        });
        body.querySelectorAll('.analytics-overall-fill').forEach(bar => {
          const pct = bar.dataset.pct;
          if (pct) bar.style.width = pct + '%';
        });
      }, 50);
    } catch (err) {
      body.innerHTML = `<p style="color:var(--accent-red)">${err.message}</p>`;
    }
  }

  function renderAnalytics(data) {
    const medal = ['🥇', '🥈', '🥉'];
    const totalTasks = data.total_tasks || 0;
    const doneTasks  = data.done_tasks  || 0;
    const globalPct  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const skippedTotal = data.total_skipped_subtasks || 0;
    const rules = data.scoring_rules || {};

    // ── Leaderboard Table ──
    const rows = (data.leaderboard || []).map((m, i) => {
      const subtaskInfo = m.total_subtasks > 0
        ? `${m.done_subtasks}/${m.total_subtasks}`
        : '—';
      const skippedBadge = m.skipped_subtasks > 0
        ? `<span style="color:var(--accent-red); font-size:10px; margin-left:4px;" title="${m.skipped_subtasks} sub-task bị bỏ qua do dữ liệu lỗi">⚠️ ${m.skipped_subtasks}</span>`
        : '';

      return `
      <tr class="analytics-row">
        <td><span class="rank-badge rank-${i + 1}">${medal[i] || (i + 1)}</span></td>
        <td style="font-weight:600">${m.member || '(Chưa giao)'}</td>
        <td>
          <span class="score-value">${m.total_score}</span>
          <div style="font-size:9px; color:var(--text-muted); margin-top:2px;">
            🎯 ${m.task_score || 0} + ⭐ ${m.subtask_bonus || 0}
          </div>
        </td>
        <td>
          <div class="analytics-bar-wrap">
            <div class="analytics-bar-fill" data-pct="${m.completion_rate}" style="width:0%"></div>
          </div>
          <span class="analytics-bar-label">${m.completion_rate}%</span>
        </td>
        <td style="color:var(--text-secondary)">${m.done_tasks}/${m.total_tasks}</td>
        <td style="color:var(--text-secondary)">${subtaskInfo}${skippedBadge}</td>
      </tr>`;
    }).join('');

    // ── Data Cleansing Alert ──
    const cleansingAlert = skippedTotal > 0 ? `
      <div style="display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:var(--radius-sm); margin-bottom:16px; font-size:12px; color:var(--accent-yellow);">
        <span style="font-size:18px;">🛡️</span>
        <div>
          <strong>Data Cleansing:</strong> Đã phát hiện và bỏ qua <strong>${skippedTotal}</strong> sub-task lỗi
          <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Sub-task có status=null/\"N/A\" hoặc cost dạng chuỗi đã bị loại khỏi pipeline tính toán</div>
        </div>
      </div>
    ` : '';

    // ── Scoring Rules Legend ──
    const rulesHtml = rules.task_done ? `
      <div class="analytics-legend" style="margin-top:16px;">
        <div style="font-weight:600; margin-bottom:6px; font-size:12px; color:var(--text-primary);">📐 Công thức tính điểm (Aggregation Pipeline)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; font-size:11px;">
          <span>🎯 Task Done</span><span style="color:var(--accent-green); font-weight:700;">+${rules.task_done}đ</span>
          <span>🎯 Task In Progress</span><span style="color:var(--accent-yellow); font-weight:700;">+${rules.task_in_progress}đ</span>
          <span>🎯 Task Todo</span><span style="color:var(--text-muted); font-weight:700;">+${rules.task_todo}đ</span>
          <span>⭐ Sub-task Done (bonus)</span><span style="color:var(--accent-green); font-weight:700;">+${rules.subtask_done_bonus}đ</span>
          <span>⭐ Sub-task In Progress (bonus)</span><span style="color:var(--accent-yellow); font-weight:700;">+${rules.subtask_in_progress_bonus}đ</span>
        </div>
        <div style="margin-top:8px; font-size:10px; color:var(--text-muted);">Tổng điểm = Σ(task_score) + Σ(subtask_bonus) · Sub-task có dữ liệu lỗi bị loại tự động</div>
      </div>
    ` : '';

    return `
      <!-- Overall Progress -->
      <div class="analytics-overall">
        <div class="analytics-overall-label">
          <span>🏆 Tiến độ tổng thể trận đấu</span>
          <strong style="color:var(--accent-green)">${doneTasks}/${totalTasks} tasks hoàn thành</strong>
        </div>
        <div class="analytics-overall-track">
          <div class="analytics-overall-fill" data-pct="${globalPct}" style="width:0%">
            <span class="analytics-overall-pct">${globalPct}%</span>
          </div>
        </div>
      </div>

      ${cleansingAlert}

      <!-- Leaderboard Table -->
      <table class="analytics-table">
        <thead>
          <tr>
            <th>#</th>
            <th>THÀNH VIÊN</th>
            <th>ĐIỂM</th>
            <th>TIẾN ĐỘ TASK</th>
            <th>TASKS</th>
            <th>SUB-TASKS</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Chưa có dữ liệu hiệu suất</td></tr>'}
        </tbody>
      </table>

      ${rulesHtml}
    `;
  }

  function close() { document.getElementById('analyticsModal').classList.remove('open'); }

  return { open, close };
})();
