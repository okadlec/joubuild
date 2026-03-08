import type { TypedSupabaseClient } from '../client';
import type { Database } from '../types';

type FormSubmissionInsert = Database['public']['Tables']['form_submissions']['Insert'];
type FormSubmissionUpdate = Database['public']['Tables']['form_submissions']['Update'];

export function getFormTemplates(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('form_templates')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
}

export function getFormTemplate(
  client: TypedSupabaseClient,
  id: string
) {
  return client.from('form_templates').select('*').eq('id', id).single();
}

export function getFormSubmissions(
  client: TypedSupabaseClient,
  templateId: string
) {
  return client
    .from('form_submissions')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });
}

export function getFormSubmission(
  client: TypedSupabaseClient,
  id: string
) {
  return client.from('form_submissions').select('*').eq('id', id).single();
}

export function createFormSubmission(
  client: TypedSupabaseClient,
  data: FormSubmissionInsert
) {
  return client.from('form_submissions').insert(data).select().single();
}

export function updateFormSubmission(
  client: TypedSupabaseClient,
  id: string,
  data: FormSubmissionUpdate
) {
  return client
    .from('form_submissions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

// RFIs

export function getRfis(
  client: TypedSupabaseClient,
  projectId: string
) {
  return client
    .from('rfis')
    .select('*')
    .eq('project_id', projectId)
    .order('number', { ascending: false });
}

export function getRfi(
  client: TypedSupabaseClient,
  id: string
) {
  return client.from('rfis').select('*').eq('id', id).single();
}

export function createRfi(
  client: TypedSupabaseClient,
  data: Database['public']['Tables']['rfis']['Insert']
) {
  return client.from('rfis').insert(data).select().single();
}

export function updateRfi(
  client: TypedSupabaseClient,
  id: string,
  data: Database['public']['Tables']['rfis']['Update']
) {
  return client.from('rfis').update(data).eq('id', id).select().single();
}
