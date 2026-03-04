'use server';

import { createClient } from '@/lib/supabase/server';

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function updateProfile(updates: { full_name?: string }) {
  const user = await getAuthUser();
  if (!user) return { error: 'Nepřihlášen' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: updates.full_name, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function changePassword(newPassword: string) {
  const user = await getAuthUser();
  if (!user) return { error: 'Nepřihlášen' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const user = await getAuthUser();
  if (!user) return { error: 'Nepřihlášen' };

  const file = formData.get('avatar') as File;
  if (!file) return { error: 'Žádný soubor' };

  const supabase = await createClient();
  const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) return { error: updateError.message };
  return { data: { avatar_url: urlData.publicUrl } };
}
