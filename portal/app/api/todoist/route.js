import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabaseServer';

const PROJECT_NAME = '👩🏻‍💻 PROFISSIONAL';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!user || !ownerEmail || user.email !== ownerEmail) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const token = process.env.TODOIST_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'todoist_not_configured' }, { status: 500 });
  }

  const headers = { Authorization: `Bearer ${token}` };

  const projectsRes = await fetch('https://api.todoist.com/rest/v2/projects', { headers });
  if (!projectsRes.ok) {
    return NextResponse.json({ error: 'todoist_api_error' }, { status: 502 });
  }
  const projects = await projectsRes.json();
  const project = projects.find((p) => p.name === PROJECT_NAME);

  if (!project) {
    return NextResponse.json(
      { error: 'project_not_found', availableProjects: projects.map((p) => p.name) },
      { status: 404 }
    );
  }

  const [sectionsRes, tasksRes] = await Promise.all([
    fetch(`https://api.todoist.com/rest/v2/sections?project_id=${project.id}`, { headers }),
    fetch(`https://api.todoist.com/rest/v2/tasks?project_id=${project.id}`, { headers }),
  ]);
  const sections = await sectionsRes.json();
  const tasks = await tasksRes.json();

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
