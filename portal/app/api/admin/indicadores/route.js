import { NextResponse } from 'next/server';
import { requireOwner } from '../../../../lib/requireOwner';
import { createAdminClient } from '../../../../lib/supabaseAdmin';
import { getCrmContacts } from '../../../../lib/crmData';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Segunda-feira da semana de uma data ISO (YYYY-MM-DD).
function mondayOf(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dow);
  return toDateStr(date);
}

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const admin = createAdminClient();
  const { data: checkins, error: dbError } = await admin
    .from('weekly_checkins')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(26);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Atividade de relacionamento por semana: usamos a "Data Contato" de
  // cada contato do CRM como proxy de quando houve interação. Não é um
  // histórico de mudança de estágio (a planilha não guarda isso), mas é
  // o melhor sinal disponível sem criar um novo mecanismo de rastreio.
  let relacionamentosPorSemana = {};
  let crmError = null;
  try {
    const contacts = await getCrmContacts();
    for (const c of contacts) {
      if (!c.dataContato) continue;
      const week = mondayOf(c.dataContato);
      relacionamentosPorSemana[week] = (relacionamentosPorSemana[week] || 0) + 1;
    }
  } catch (e) {
    crmError = e.message;
  }

  return NextResponse.json({
    checkins: checkins || [],
    relacionamentosPorSemana,
    crmError,
  });
}

export async function POST(request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  if (!body.weekStart) {
    return NextResponse.json({ error: 'missing_week_start' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: upsertError } = await admin.from('weekly_checkins').upsert(
    {
      week_start: body.weekStart,
      objetivo_semana: body.objetivoSemana ?? null,
      objetivo_status: body.objetivoStatus ?? null,
      estudo_count: body.estudoCount ?? null,
      posicionamento_count: body.posicionamentoCount ?? null,
      producao_count: body.producaoCount ?? null,
      revisao_feita: !!body.revisaoFeita,
      notas: body.notas ?? null,
    },
    { onConflict: 'week_start' }
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
