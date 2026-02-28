// Export Project Edge Function
// Generates As-Built exports (ZIP with HTML/PDF)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { project_id, export_type } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id' }),
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
        type: export_type || 'as_built',
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all project data
    const [
      { data: project },
      { data: tasks },
      { data: sheets },
      { data: photos },
    ] = await Promise.all([
      supabaseClient.from('projects').select('*').eq('id', project_id).single(),
      supabaseClient.from('tasks').select('*').eq('project_id', project_id),
      supabaseClient.from('sheets').select('*, sheet_versions(*)').eq('project_id', project_id),
      supabaseClient.from('photos').select('*').eq('project_id', project_id),
    ]);

    // Generate a summary JSON for now
    const summary = {
      project,
      task_count: tasks?.length || 0,
      sheet_count: sheets?.length || 0,
      photo_count: photos?.length || 0,
      exported_at: new Date().toISOString(),
    };

    const fileName = `exports/${project_id}/${exportRecord.id}.json`;
    await supabaseClient.storage.from('exports').upload(
      fileName,
      JSON.stringify(summary, null, 2),
      { contentType: 'application/json' }
    );

    const { data: urlData } = supabaseClient.storage.from('exports').getPublicUrl(fileName);

    await supabaseClient
      .from('exports')
      .update({
        status: 'completed',
        file_url: urlData.publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportRecord.id);

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
