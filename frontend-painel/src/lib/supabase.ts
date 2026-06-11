import { createClient } from '@supabase/supabase-js'

// No ambiente de Produção, usaríamos import.meta.env
// Como é um MVP demonstrativo baseado nas credenciais já compartilhadas,
// vamos instanciar diretamente para o frontend conectar.

export const supabaseUrl = 'https://dmdouaufrtqpnrntcljh.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtZG91YXVmcnRxcG5ybnRjbGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODcyNzUsImV4cCI6MjA5NjY2MzI3NX0.OTQZdd1Xr4Ay20UtiX5cK3YesNMn8_Wrkp3qRjBAd1Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
