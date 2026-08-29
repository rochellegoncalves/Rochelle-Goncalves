import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabaseServer';

const PROJECT_NAME = '👩🏻‍💻 PROFISSIONAL';
const API_BASE = 'https://api.todoist.com/api/v1';

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
      { error: 'todoist_api_error', status: e.status, body: e.body, tokenLength: token.length },
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

  let sections, tasks;
  try {
    [sections, tasks] = await Promise.all([
      todoistGet(`/sections?project_id=${project.id}`, headers),
      todoistGet(`/tasks?project_id=${project.id}`, headers),
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: 'todoist_api_error', status: e.status, body: e.body },
      { status: 502 }
    );
  }

  const today = todayISO();

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const groups = sortedSections.map((section) => {
    const sectionTasks = tasks
      .filter((t) => t.section_id === section.id)
      .map((t) => ({
        id: t.id,
        content: t.content,
        due: t.due?.date || null,
        priority: t.priority,
        isOverdue: !!t.due?.date && t.due.date < today,
        isToday: t.due?.date === today,
      }));
    return { id: section.id, name: section.name, tasks: sectionTasks };
  });

  const looseTasks = tasks.filter((t) => !t.section_id);
  if (looseTasks.length > 0) {
    groups.push({
      id: 'sem-secao',
      name: 'Sem seção',
      tasks: looseTasks.map((t) => ({
        id: t.id,
        content: t.content,
        due: t.due?.date || null,
        priority: t.priority,
        isOverdue: !!t.due?.date && t.due.date < today,
        isToday: t.due?.date === today,
      })),
    });
  }

  const urgent = tasks
    .filter((t) => t.due?.date && t.due.date <= today)
    .map((t) => ({
      id: t.id,
      content: t.content,
      due: t.due.date,
      sectionName: sections.find((s) => s.id === t.section_id)?.name || 'Sem seção',
      isOverdue: t.due.date < today,
    }))
    .sort((a, b) => a.due.localeCompare(b.due));

  return NextResponse.json({ groups, urgent });
}
