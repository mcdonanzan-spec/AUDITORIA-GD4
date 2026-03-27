
// v1.0.1 - Melhoria na robustez das funções de inserção
import { createClient } from '@supabase/supabase-js';
import { Obra, Audit, User } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Check your environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export const getObras = async (): Promise<Obra[]> => {
  const { data, error } = await supabase
    .from('obras')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
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

export const getAudits = async (): Promise<Audit[]> => {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const saveAudit = async (audit: Audit): Promise<Audit> => {
  const { data, error } = await supabase
    .from('audits')
    .insert([audit])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getUsers = async (): Promise<User[]> => {
  console.log('Buscando todos os usuários...');
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Erro no Supabase (getUsers):', error);
    throw error;
  }
  console.log('Total de usuários encontrados:', data?.length || 0);
  return data || [];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  console.log('Buscando usuário por e-mail:', email);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (error) {
    console.error('Erro no Supabase (getUserByEmail):', error);
    throw error;
  }
  console.log('Resultado da busca por e-mail:', data ? 'Encontrado' : 'Não encontrado');
  return data;
};

export const createUserRequest = async (user: Partial<User>): Promise<User> => {
  console.log('Iniciando createUserRequest no Supabase...', user);
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) {
    console.error('Erro detalhado no Supabase (createUserRequest):', error);
    throw error;
  }
  console.log('Usuário criado com sucesso:', data);
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
