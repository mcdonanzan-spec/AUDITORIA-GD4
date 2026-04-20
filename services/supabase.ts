
// v1.0.2 - Melhoria na robustez e logs detalhados para diagnóstico
import { createClient } from '@supabase/supabase-js';
import { Obra, Audit, User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check your environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export const getObras = async (): Promise<Obra[]> => {
  try {
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar obras:', error);
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Falha crítica getObras:', err);
    throw err;
  }
};

export const addObra = async (obra: Partial<Obra>): Promise<Obra> => {
  const { data, error } = await supabase
    .from('obras')
    .insert([obra])
    .select()
    .single();
  
  if (error) {
    console.error('Erro no Supabase (addObra):', error);
    throw error;
  }
  return data;
};

export const updateObra = async (obra: Obra): Promise<Obra> => {
  const { data, error } = await supabase
    .from('obras')
    .update(obra)
    .eq('id', obra.id)
    .select()
    .single();
  
  if (error) {
    console.error('Erro no Supabase (updateObra):', error);
    throw error;
  }
  return data;
};

export const getAudits = async (): Promise<Audit[]> => {
  try {
    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar auditorias:', error);
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Falha crítica getAudits:', err);
    throw err;
  }
};

export const saveAudit = async (audit: any): Promise<Audit> => {
  console.log('Iniciando persistência da auditoria no Supabase...');
  try {
    const { data, error } = await supabase
      .from('audits')
      .insert([audit])
      .select()
      .single();
    
    if (error) {
      console.error('Erro detalhado ao salvar auditoria:', error);
      // Fornece mais contexto sobre o erro do Supabase
      const enhancedError = new Error(`Erro Supabase (${error.code}): ${error.message}`);
      (enhancedError as any).details = error.details;
      (enhancedError as any).hint = error.hint;
      throw enhancedError;
    }
    
    console.log('Auditoria salva com sucesso!');
    return data;
  } catch (err) {
    console.error('Falha crítica saveAudit:', err);
    throw err;
  }
};

export const signAudit = async (auditId: string, signature: any, type: 'auditor' | 'engenheiro'): Promise<void> => {
  const field = type === 'auditor' ? 'assinatura_auditor' : 'assinatura_engenheiro';
  const { error } = await supabase
    .from('audits')
    .update({ [field]: signature })
    .eq('id', auditId);
  
  if (error) {
    console.error(`Erro ao assinar auditoria (${type}):`, error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Erro no Supabase (getUsers):', error);
    throw error;
  }
  return data || [];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (error) {
    console.error('Erro no Supabase (getUserByEmail):', error);
    throw error;
  }
  return data;
};

export const createUserRequest = async (user: Partial<User>): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) {
    console.error('Erro no Supabase (createUserRequest):', error);
    throw error;
  }
  return data;
};

export const updateUser = async (user: User): Promise<User> => {
  const { error } = await supabase
    .from('users')
    .update(user)
    .eq('id', user.id);
  
  if (error) {
    console.error('Erro no Supabase (updateUser):', error);
    throw error;
  }
  return user;
};

export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) throw error;
};

// --- STORAGE FUNCTIONS ---

export const uploadImage = async (base64Data: string, path: string): Promise<string> => {
  try {
    // Converte base64 para Blob/File para o Supabase Storage
    const base64Content = base64Data.split(',')[1] || base64Data;
    const byteCharacters = atob(base64Content);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    const blob = new Blob(byteArrays, { type: 'image/jpeg' });
    
    const { data, error } = await supabase.storage
      .from('auditoria-evidencias')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Erro no upload Storage:', error);
      throw error;
    }

    // Retorna a URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('auditoria-evidencias')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (err) {
    console.error('Falha crítica no uploadImage:', err);
    throw err;
  }
};
