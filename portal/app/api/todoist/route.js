import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabaseServer';

const PROJECT_NAME = '👩🏻‍💻 PROFISSIONAL';
const API_BASE = 'https://api.todoist.com/api/v1';
const HEADER_PATTERN = /^\*\*(.+)\*\*$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function extractList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.results)) return json.results;
  return [];
}

async function todoistGet(path, headers) {
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const error = new Error('todoist_api_error');
    error.status = res.status;
    error.body = bodyText.slice(0, 300);
    throw error;
  }
  return extractList(await res.json());
}

function byDueDateAsc(a, b) {
  if (!a.due && !b.due) return 0;
  if (!a.due) return 1;
  if (!b.due) return -1;
  return a.due.localeCompare(b.due);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!user || !ownerEmail || user.email !== ownerEmail) {
    return NextResponse.json(
      {
        error: 'forbidden',
        debug: { userEmail: user?.email || null, ownerEmailConfigured: !!ownerEmail, ownerEmail },
      },
      { status: 403 }
    );
  }

  const token = process.env.TODOIST_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'todoist_not_configured' }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${token}` };

  let projects;
  try {
    projects = await todoistGet('/projects', headers);
  } catch (e) {
    return NextResponse.json(
      { error: 'todoist_api_error', status: e.status, body: e.body },
      { status: 502 }
    );
  }

  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) {
    return NextResponse.json(
      { error: 'project_not_found', availableProjects: projects.map((p) => p.name) },
      { status: 404 }
    );
  }

  let tasks;
  try {
    tasks = await todoistGet(`/tasks?project_id=${project.id}`, headers);
  } catch (e) {
    return NextResponse.json(
      { error: 'todoist_api_error', status: e.status, body: e.body },
      { status: 502 }
    );
  }

  const today = todayISO();

  // Todoist keeps the "order" field as the position in the list you see in
  // the app -- that's what lets us tell which tasks fall under which
  // "**Área**" header task.
  const ordered = [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const groups = [];
  let current = null;

  for (const t of ordered) {
    const headerMatch = t.content.trim().match(HEADER_PATTERN);
    if (headerMatch) {
      current = { id: t.id, name: headerMatch[1].trim(), tasks: [] };
      groups.push(current);
      continue;
    }

    const task = {
      id: t.id,
      content: t.content,
      due: t.due?.date || null,
      priority: t.priority,
      isOverdue: !!t.due?.date && t.due.date < today,
      isToday: t.due?.date === today,
    };

    if (!current) {
      if (!groups.length || groups[0].id !== 'sem-area') {
        groups.unshift({ id: 'sem-area', name: 'Sem área', tasks: [] });
      }
      groups[0].tasks.push(task);
    } else {
      current.tasks.push(task);
    }
  }

  for (const group of groups) {
    group.tasks.sort(byDueDateAsc);
  }

  const urgent = ordered
    .filter((t) => !HEADER_PATTERN.test(t.content.trim()) && t.due?.date && t.due.date <= today)
    .map((t) => {
      const owningGroup = groups.find((g) => g.tasks.some((task) => task.id === t.id));
      return {
        id: t.id,
        content: t.content,
        due: t.due.date,
        groupName: owningGroup?.name || 'Sem área',
        isOverdue: t.due.date < today,
      };
    })
    .sort(byDueDateAsc);

  return NextResponse.json({ groups, urgent });
}

// Muda a data de uma tarefa direto no Todoist -- a nossa tela só lê o
// Todoist ao carregar, então a mudança feita lá também aparece aqui na
// próxima vez que a página for recarregada (via de mão dupla).
export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!user || !ownerEmail || user.email !== ownerEmail) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = process.env.TODOIST_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'todoist_not_configured' }, { status: 500 });
  }

  const { taskId, dueDate } = await request.json();
  if (!taskId) {
    return NextResponse.json({ error: 'missing_task_id' }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(dueDate ? { due_date: dueDate } : { due_string: 'no date' }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'todoist_api_error', status: res.status, body: bodyText.slice(0, 300) },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
