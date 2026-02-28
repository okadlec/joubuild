// Report Generation Edge Function
// Generates PDF/CSV reports for projects

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { project_id, type, filters, format } = await req.json();

    if (!project_id || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id or type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create export record
    const { data: exportRecord, error: insertError } = await supabaseClient
      .from('exports')
      .insert({
        project_id,
        type,
        status: 'processing',
        config: { filters, format },
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch tasks for the project
    let query = supabaseClient.from('tasks').select('*').eq('project_id', project_id);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.assignee_id) query = query.eq('assignee_id', filters.assignee_id);

    const { data: tasks } = await query;

    // Generate CSV content
    if (format === 'csv' || type === 'tasks_csv') {
      const headers = ['Title', 'Status', 'Priority', 'Due Date', 'Assignee'];
      const rows = (tasks || []).map((t: Record<string, unknown>) =>
        [t.title, t.status, t.priority, t.due_date || '', t.assignee_id || ''].join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');

      const fileName = `exports/${project_id}/${exportRecord.id}.csv`;
      await supabaseClient.storage.from('exports').upload(fileName, csv, {
        contentType: 'text/csv',
      });

      const { data: urlData } = supabaseClient.storage.from('exports').getPublicUrl(fileName);

      await supabaseClient
        .from('exports')
        .update({
          status: 'completed',
          file_url: urlData.publicUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', exportRecord.id);
    }

    // TODO: Add PDF generation with puppeteer or jsPDF

    return new Response(
      JSON.stringify({ success: true, export_id: exportRecord.id }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
