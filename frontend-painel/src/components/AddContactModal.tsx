import React, { useState } from 'react';
import { X, UserPlus, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddContact } from '@/hooks/use-messages';
import { toast } from 'sonner';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (conversationId: string) => void;
}

export default function AddContactModal({ isOpen, onClose, onSuccess }: AddContactModalProps) {
  const { user, tenantId } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const addContactMutation = useAddContact();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !user || !tenantId) {
      toast.error('Preencha os dados e aguarde o carregamento completo da página.');
      return;
    }

    try {
      // Formata o telefone (remove caracteres não numéricos para salvar limpo no banco, se desejar)
      const cleanPhone = phone.replace(/\D/g, '');
      
      const result = await addContactMutation.mutateAsync({
        fullName: name,
        phone: cleanPhone,
        agentId: user.id,
        tenantId: tenantId
      });

      toast.success('Contato adicionado com sucesso!');
      setName('');
      setPhone('');
      onClose();
      
      if (onSuccess && result.conversation) {
        onSuccess(result.conversation.id);
      }
    } catch (error: any) {
      toast.error('Erro ao adicionar contato: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <UserPlus size={20} />
            </div>
            <h2 className="font-semibold text-lg text-slate-800">Novo Lead / Contato</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva" 
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 5511999999999" 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-1">Inclua o código do país (ex: 55 para o Brasil)</p>
          </div>

          <div className="mt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={addContactMutation.isPending || !name.trim() || !phone.trim()}
              className="flex-1 py-2.5 px-4 bg-brand text-white rounded-xl font-medium hover:bg-brand-hover shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addContactMutation.isPending ? 'Salvando...' : 'Salvar e Iniciar Chat'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
