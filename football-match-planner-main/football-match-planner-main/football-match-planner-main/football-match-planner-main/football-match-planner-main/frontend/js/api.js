/**
 * API Layer — Football Match Planner
 * USE_MOCK = true  : Hoạt động hoàn toàn offline (demo)
 * USE_MOCK = false : Kết nối backend FastAPI + MongoDB
 */
const USE_MOCK = false;   // ← đổi false khi backend + MongoDB đã chạy
const BASE_URL = 'http://localhost:8000';

// ─── Mock Data ───────────────────────────────────────────────
const MOCK_MATCHES = [
  { id: 'match001', name: 'Siêu Cúp Chung Kết: FC Lão Tướng vs FC Sinh Viên', date: '2026-05-15T15:30', date_end: '2026-05-15T17:30', status: 'Planned' },
  { id: 'match002', name: 'Giao hữu khởi động: FC Sinh Viên vs FC Bán Bia',   date: '2026-05-02T18:00', date_end: '2026-05-02T20:00', status: 'In Progress' },
  { id: 'match003', name: 'Giải Mùa Thu - Vòng Bảng: Lượt Đi',               date: '2026-09-10T17:00', date_end: '2026-09-10T19:00', status: 'Planned' }
];

const MOCK_MEMBERS = [
  { id: 'mem_111', name: 'Nguyễn Bảo Tài', username: 'tai', role: 'Admin', password: '123' },
  { id: 'mem_222', name: 'Tô Hiến Hải Đăng', username: 'dang', role: 'Member', password: '123' },
  { id: 'mem_333', name: 'Phan Đăng Vũ', username: 'vu', role: 'Member', password: '123' }
];

const MOCK_MATCH_DETAIL = {
  'match001': {
    id: 'match001',
    name: 'Siêu Cúp Chung Kết: FC Lão Tướng vs FC Sinh Viên',
    date: '2026-05-15T15:30', date_end: '2026-05-15T17:30', status: 'Planned', user_id: 'usr_a1b2c3',
    categories: [
      {
        name: 'Hậu cần & Sân bãi',
        tasks: [
          { name: 'Tìm sân vận động', assigned_to: 'Nguyễn Bảo Tài', status: 'In Progress', task_type: 'logistics', location: 'Sân Hàng Đẫy, Hà Nội', created_by: 'usr_a1b2c3',
            subtasks: [
              { name: 'Liên hệ sân Hàng Đẫy', cost: 1500, status: 'Done' },
              { name: 'Thương lượng giá thuê đèn', cost: 0, status: 'In Progress' },
              { name: 'Đàm phán phí gửi xe', cost: 0, status: 'Todo' }
            ]
          },
          { name: 'Chuẩn bị đồng phục', assigned_to: 'Tô Hiến Hải Đăng', status: 'Todo', task_type: 'logistics', location: 'Xưởng in số 5 Hàng Gai', created_by: 'usr_a1b2c3',
            subtasks: [
              { name: 'Thu thập size áo anh em', cost: 0, status: 'Todo' },
              { name: 'Đặt in số cho áo đấu mới', cost: 850, status: 'Todo' }
            ]
          }
        ]
      },
      {
        name: 'Tài chính & Quỹ Đội',
        tasks: [
          { name: 'Thu quỹ tháng 5', assigned_to: 'Phan Đăng Vũ (Bầu Sô)', status: 'In Progress', task_type: 'logistics', created_by: 'usr_d4e5f6',
            subtasks: [
              { name: 'Thu tiền vé tháng trước', cost: 2500, status: 'Done' },
              { name: 'Nhắc nợ ông D', cost: null, status: 'In Progress' }
            ]
          },
          { name: 'Chi phí giải khát', assigned_to: 'Phan Đăng Vũ (Bầu Sô)', status: 'Done', task_type: 'logistics', created_by: 'usr_d4e5f6',
            subtasks: [
              { name: 'Mua 3 thùng nước', cost: 300, status: 'Done' },
              { name: 'Mua bò húc tăng lực', cost: 150, status: 'Done' }
            ]
          }
        ]
      },
      {
        name: 'Chuyên môn & Chiến thuật',
        tasks: [
          { name: 'Tập sút Penalty', assigned_to: 'Bùi Đăng Dương HLV', status: 'Todo', task_type: 'general', created_by: 'usr_a1b2c3',
            subtasks: [
              { name: 'Chuẩn bị bóng', cost: 0, status: 'Done' },
              { name: 'Luyện tập sơ đồ 4-3-3', cost: null, status: 'Todo' }
            ]
          }
        ]
      },
      {
        name: 'Việc cá nhân',
        tasks: [
          { name: 'Gửi văn mẫu xin phép vợ', assigned_to: 'Toàn đội', status: 'Todo', task_type: 'personal', created_by: 'usr_a1b2c3',
            subtasks: [
              { name: 'Soạn thảo đơn xin phép', cost: 0, status: 'Todo' },
              { name: 'Nộp đơn trước 3 ngày', cost: 0, status: 'Todo' },
              { name: 'Xác nhận được phê duyệt', cost: 0, status: 'Todo' }
            ]
          }
        ]
      },
      {
        name: 'Truyền thông',
        tasks: [
          { name: 'Quay phim & Chụp ảnh', assigned_to: 'Phạm Minh Hoàng', status: 'Todo', task_type: 'general', created_by: 'usr_a1b2c3',
            subtasks: [
              { name: 'Thuê thợ chụp sports', cost: 500, status: 'Todo' },
              { name: 'Viết bài Recap Facebook', cost: 0, status: 'Todo' }
            ]
          }
        ]
      }
    ],
    activity_logs: [
      { action: 'Tạo mới sự kiện Chung kết Siêu cúp', timestamp: '2026-04-20T10:00:00Z', actor: 'usr_a1b2c3', user_id: 'usr_a1b2c3' },
      { action: 'Cập nhật tiến độ thu quỹ tháng 5', timestamp: '2026-04-21T08:30:00Z', actor: 'usr_d4e5f6', user_id: 'usr_d4e5f6' }
    ]
  },
  'match002': {
    id: 'match002', name: 'Giao hữu khởi động: FC Sinh Viên vs FC Bán Bia',
    date: '2026-05-02T18:00', date_end: '2026-05-02T20:00', status: 'In Progress', user_id: 'usr_d4e5f6',
    categories: [
      { name: 'Hậu cần & Sân bãi', tasks: [
        { name: 'Thuê sân cỏ nhân tạo', assigned_to: 'Nguyễn Bảo Tài', status: 'Todo', task_type: 'logistics', location: 'Khu vực Cầu Giấy, Hà Nội', created_by: 'usr_d4e5f6',
          subtasks: [{ name: 'Hỏi sân khu vực Cầu Giấy', cost: 600, status: 'Todo' }]
        }
      ]},
      { name: 'Tài chính & Quỹ Đội', tasks: [
        { name: 'Góp tiền bia', assigned_to: 'Phan Đăng Vũ (Bầu Sô)', status: 'Done', task_type: 'logistics', created_by: 'usr_d4e5f6',
          subtasks: [{ name: 'Thu 50k/người (30 người)', cost: 1500, status: 'Done' }]
        }
      ]}
    ],
    activity_logs: [
      { action: 'Tạo trận giao hữu dưỡng sinh', timestamp: '2026-04-20T11:00:00Z', actor: 'usr_d4e5f6', user_id: 'usr_d4e5f6' }
    ]
  },
  'match003': {
    id: 'match003', name: 'Giải Mùa Thu - Vòng Bảng: Lượt Đi',
    date: '2026-09-10T17:00', date_end: '2026-09-10T19:00', status: 'Planned', user_id: 'usr_a1b2c3',
    categories: [
      { name: 'Chuyên môn & Chiến thuật', tasks: [
        { name: 'Lên danh sách thi đấu', assigned_to: 'Bùi Đăng Dương HLV', status: 'In Progress', task_type: 'general', created_by: 'usr_a1b2c3',
          subtasks: [
            { name: 'Chốt danh sách đá chính', cost: 0, status: 'Done' },
            { name: 'Thực tập chống phạt góc', cost: 0, status: 'Todo' }
          ]
        }
      ]},
      { name: 'Truyền thông', tasks: [
        { name: 'Lên Poster cổ động', assigned_to: 'Phạm Minh Hoàng', status: 'Todo', task_type: 'general', created_by: 'usr_a1b2c3',
          subtasks: [{ name: 'Thiết kế ảnh bìa Fanpage', cost: 100, status: 'Todo' }]
        }
      ]}
    ],
    activity_logs: [
      { action: 'Tạo giải đấu Mùa Thu', timestamp: '2026-04-22T08:00:00Z', actor: 'usr_a1b2c3', user_id: 'usr_a1b2c3' }
    ]
  }
};

// ─── Mock Analytics ───────────────────────────────────────────
function computeMockAnalytics(matchId) {
  const match = MOCK_MATCH_DETAIL[matchId];
  if (!match) return { leaderboard: [], total_fund_usd: 0, total_tasks: 0, done_tasks: 0, total_skipped_subtasks: 0, scoring_rules: {} };

  const scoreMap = {};
  let totalFund = 0;
  let totalTasks = 0, doneTasks = 0;
  let totalSkippedSubtasks = 0;

  match.categories.forEach(cat => {
    (cat.tasks || []).forEach(task => {
      if (!task.status || task.status === 'null' || task.status === 'N/A') return;
      totalTasks++;
      if (task.status === 'Done') doneTasks++;

      const member = task.assigned_to || '(Chưa giao)';
      if (!scoreMap[member]) scoreMap[member] = { task_score: 0, subtask_bonus: 0, total_tasks: 0, done_tasks: 0, total_subtasks: 0, done_subtasks: 0, skipped_subtasks: 0 };

      const taskPts = task.status === 'Done' ? 10 : task.status === 'In Progress' ? 5 : 1;
      scoreMap[member].task_score += taskPts;
      scoreMap[member].total_tasks += 1;
      scoreMap[member].done_tasks += task.status === 'Done' ? 1 : 0;

      (task.subtasks || []).forEach(s => {
        // Data Cleansing: bỏ qua subtask lỗi
        const hasInvalidStatus = !s.status || s.status === 'null' || s.status === 'N/A' || s.status === '';
        const hasStringCost = typeof s.cost === 'string';

        if (hasInvalidStatus || hasStringCost) {
          scoreMap[member].skipped_subtasks += 1;
          totalSkippedSubtasks += 1;
          return; // Bỏ qua subtask này
        }

        scoreMap[member].total_subtasks += 1;
        if (s.status === 'Done') {
          scoreMap[member].done_subtasks += 1;
          scoreMap[member].subtask_bonus += 3;
        } else if (s.status === 'In Progress') {
          scoreMap[member].subtask_bonus += 1;
        }

        if (typeof s.cost === 'number' && s.cost > 0) totalFund += s.cost;
      });
    });
  });

  const leaderboard = Object.entries(scoreMap).map(([member, d]) => ({
    member,
    total_score: d.task_score + d.subtask_bonus,
    task_score: d.task_score,
    subtask_bonus: d.subtask_bonus,
    total_tasks: d.total_tasks,
    done_tasks: d.done_tasks,
    completion_rate: Math.round((d.done_tasks / Math.max(d.total_tasks, 1)) * 1000) / 10,
    total_subtasks: d.total_subtasks,
    done_subtasks: d.done_subtasks,
    subtask_completion_rate: d.total_subtasks > 0 ? Math.round((d.done_subtasks / d.total_subtasks) * 1000) / 10 : 0,
    skipped_subtasks: d.skipped_subtasks
  })).sort((a, b) => b.total_score - a.total_score);

  return {
    match_id: matchId, leaderboard,
    total_fund_usd: totalFund,
    total_tasks: totalTasks,
    done_tasks: doneTasks,
    total_skipped_subtasks: totalSkippedSubtasks,
    scoring_rules: {
      task_done: 10,
      task_in_progress: 5,
      task_todo: 1,
      subtask_done_bonus: 3,
      subtask_in_progress_bonus: 1
    },
    note: '[MOCK] Sub-task có status=null/N/A hoặc cost sai định dạng đã bị phát hiện và bỏ qua tự động'
  };
}

// ─── API Object ───────────────────────────────────────────────
const API = {
  // Members API
  async getMembers() {
    if (USE_MOCK) { await _delay(50); return { data: MOCK_MEMBERS, total: MOCK_MEMBERS.length }; }
    const res = await fetch(`${BASE_URL}/member/`);
    if (!res.ok) throw new Error('Lỗi tải danh sách thành viên');
    return res.json();
  },

  async createMember(payload) {
    if (USE_MOCK) {
      await _delay(50);
      if (MOCK_MEMBERS.find(m => m.username === payload.username)) throw new Error('Username already exists');
      const newMem = { id: 'mem_' + Date.now(), name: payload.name, username: payload.username, password: payload.password, role: payload.role || 'Member' };
      MOCK_MEMBERS.push(newMem);
      return { message: 'Member created', data: { id: newMem.id, name: newMem.name, username: newMem.username, role: newMem.role } };
    }
    const res = await fetch(`${BASE_URL}/member/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const text = await res.text(); throw new Error(text || 'Tạo thành viên thất bại'); }
    return res.json();
  },

  async login(username, password) {
    if (USE_MOCK) {
      await _delay(50);
      const user = MOCK_MEMBERS.find(m => m.username === username && m.password === password);
      if (!user) throw new Error('Invalid username or password');
      return { id: user.id, username: user.username, name: user.name, role: user.role };
    }
    const res = await fetch(`${BASE_URL}/member/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!res.ok) { const text = await res.text(); throw new Error(text || 'Login failed'); }
    return res.json();
  },

  async deleteMember(memberId) {
    if (USE_MOCK) {
      await _delay(50);
      const idx = MOCK_MEMBERS.findIndex(m => m.id === memberId);
      if (idx !== -1) MOCK_MEMBERS.splice(idx, 1);
      return { message: 'Member deleted' };
    }
    const res = await fetch(`${BASE_URL}/member/${memberId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Xóa thành viên thất bại');
    return res.json();
  },

  // Matches API
  async getMatches() {
    if (USE_MOCK) { await _delay(80); return { data: MOCK_MATCHES, total: MOCK_MATCHES.length }; }
    const res = await fetch(`${BASE_URL}/match/`);
    if (!res.ok) throw new Error('Không tải được danh sách trận đấu');
    return res.json();
  },

  async getMatch(id) {
    if (USE_MOCK) {
      const t0 = performance.now();
      await _delay(12 + Math.random() * 8);
      const raw = MOCK_MATCH_DETAIL[id];
      if (!raw) throw new Error('Không tìm thấy trận đấu');
      const data = JSON.parse(JSON.stringify(raw));
      return { data, metadata: { response_time_ms: Math.round((performance.now() - t0) * 100) / 100, query_count: 1, message: '[MOCK] Fetched entire nested document with 1 single query' } };
    }
    const res = await fetch(`${BASE_URL}/match/${id}`);
    if (!res.ok) throw new Error('Không tìm thấy trận đấu');
    return res.json();
  },

  async createMatch(payload) {
    if (USE_MOCK) {
      await _delay(60);
      const newId = 'match_' + Date.now();
      const newMatch = { id: newId, name: payload.name, date: payload.date, date_end: payload.date_end || null, status: payload.status || 'Planned', categories: [], activity_logs: [] };
      MOCK_MATCHES.push({ id: newId, name: payload.name, date: payload.date, date_end: payload.date_end || null, status: payload.status || 'Planned' });
      MOCK_MATCH_DETAIL[newId] = newMatch;
      return { message: 'Match created', id: newId };
    }
    const res = await fetch(`${BASE_URL}/match/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Tạo trận thất bại');
    return res.json();
  },

  async deleteMatch(matchId) {
    if (USE_MOCK) {
      await _delay(40);
      const idx = MOCK_MATCHES.findIndex(m => m.id === matchId);
      if (idx === -1) throw new Error('Match not found');
      if (MOCK_MATCHES[idx].status === 'Done') throw new Error('Không thể xoá trận đấu đã hoàn thành');
      MOCK_MATCHES.splice(idx, 1);
      delete MOCK_MATCH_DETAIL[matchId];
      return { message: 'Match deleted successfully' };
    }
    const res = await fetch(`${BASE_URL}/match/${matchId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Xoá trận thất bại');
    return res.json();
  },

  async updateMatchStatus(matchId, status, actor) {
    if (USE_MOCK) {
      await _delay(40);
      const matchIndex = MOCK_MATCHES.findIndex(m => m.id === matchId);
      if (matchIndex === -1) throw new Error('Match not found');
      // No longer delete on Done
      MOCK_MATCHES[matchIndex].status = status;
      if (MOCK_MATCH_DETAIL[matchId]) MOCK_MATCH_DETAIL[matchId].status = status;
      return { message: 'Match status updated successfully' };
    }
    const res = await fetch(`${BASE_URL}/match/${matchId}/update-status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actor })
    });
    if (!res.ok) { const errorText = await res.text(); throw new Error(errorText || 'Cập nhật trạng thái thất bại'); }
    return res.json();
  },

  async updateTask(matchId, payload) {
    if (USE_MOCK) {
      await _delay(30);
      const match = MOCK_MATCH_DETAIL[matchId];
      if (match) {
        match.categories.forEach(cat => {
          if (cat.name === payload.category_name) {
            cat.tasks.forEach(t => { if (t.name === payload.task_name) { t.status = payload.new_status; } });
          }
        });
        const log = { action: `[${payload.category_name}] Task '${payload.task_name}' → '${payload.new_status}'`, timestamp: new Date().toISOString(), actor: payload.actor || payload.assigned_to || 'Admin' };
        match.activity_logs.unshift(log);
      }
      return { message: 'Update successful' };
    }
    const res = await fetch(`${BASE_URL}/match/${matchId}/update-task`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Cập nhật thất bại');
    return res.json();
  },

  async updateTree(matchId, categories, actor) {
    if (USE_MOCK) {
      await _delay(20);
      if (MOCK_MATCH_DETAIL[matchId]) MOCK_MATCH_DETAIL[matchId].categories = categories;
      return { message: 'Tree saved' };
    }
    const res = await fetch(`${BASE_URL}/match/${matchId}/update-tree`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categories, actor }) });
    if (!res.ok) throw new Error('Lưu cây thất bại');
    return res.json();
  },

  async getAnalytics(matchId) {
    if (USE_MOCK) { await _delay(50); return computeMockAnalytics(matchId); }
    const res = await fetch(`${BASE_URL}/match/${matchId}/analytics`);
    if (!res.ok) throw new Error('Lỗi phân tích');
    return res.json();
  },

  async getLogs(matchId) {
    if (USE_MOCK) {
      await _delay(25);
      const match = MOCK_MATCH_DETAIL[matchId];
      const logs = match ? [...match.activity_logs].reverse() : [];
      return { logs, total: logs.length };
    }
    const res = await fetch(`${BASE_URL}/match/${matchId}/logs`);
    if (!res.ok) throw new Error('Lỗi tải log');
    return res.json();
  }
};

function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
