
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
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) throw error;
  return data || [];
};

export const createUserRequest = async (user: User): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateUser = async (user: User): Promise<User> => {
  const { error } = await supabase
    .from('users')
    .update(user)
    .eq('id', user.id);
  
  if (error) throw error;
  return user;
};

export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);
  
  if (error) throw error;
};
