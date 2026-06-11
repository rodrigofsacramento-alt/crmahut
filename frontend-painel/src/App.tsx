import React, { useState, useEffect } from 'react';
import { 
  Search, MessageSquare, Calendar, Building, FileText, 
  Settings, ChevronLeft, Plus, Phone, 
  Paperclip, Send, Bot, CheckCheck, Sparkles, MapPin, DollarSign
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, useSetConversationAIEnabled, useLeadPropertyRecommendations } from '@/hooks/use-messages';
import { useSendWhatsAppMessage } from '@/hooks/use-whatsapp';
import WhatsAppSettingsDrawer from '@/components/whatsapp/WhatsAppSettingsDrawer';
import AddContactModal from '@/components/AddContactModal';
import { Toaster, toast } from 'sonner';
import { supabase } from '@/lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { user, profile, signIn, signUp } = useAuth();
  
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);

  // Hooks do projeto antigo
  const { data: conversations = [], isLoading: convLoading } = useConversations(user?.id, profile?.role || 'admin');
  const { data: messages = [] } = useMessages(selectedConvId);
  const { data: leadPropertyRecommendations = [] } = useLeadPropertyRecommendations(!!user);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const setConversationAIMutation = useSetConversationAIEnabled();
  const sendWhatsAppMutation = useSendWhatsAppMessage();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 font-inter p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Building className="h-8 w-8 text-brand" />
            <span className="text-2xl font-bold text-slate-900">estate.io</span>
          </div>
          <h2 className="text-xl font-semibold text-center mb-6 text-slate-800">
            {isRegistering ? 'Criar nova conta' : 'Faça login para continuar'}
          </h2>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            if (isRegistering) {
              const res = await signUp(loginEmail, loginPassword, loginName || 'Novo Usuário');
              if (res.error) {
                toast.error(res.error.message);
              } else {
                toast.success('Conta criada! Tentando login...');
                const loginRes = await signIn(loginEmail, loginPassword);
                if (loginRes.error) {
                  if (loginRes.error.message.toLowerCase().includes('email')) {
                    toast.error('Verifique a sua caixa de entrada para confirmar o e-mail!');
                  } else {
                    toast.error(loginRes.error.message);
                  }
                }
              }
            } else {
              const res = await signIn(loginEmail, loginPassword);
              if (res.error) toast.error(res.error.message);
            }
          }}>
            {isRegistering && (
              <input 
                type="text" placeholder="Seu nome" required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand"
                value={loginName} onChange={e => setLoginName(e.target.value)}
              />
            )}
            <input 
              type="email" placeholder="Seu email" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand"
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
            />
            <input 
              type="password" placeholder="Sua senha" required minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand"
              value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
            />
            <button type="submit" className="w-full py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand/90 transition-colors">
              {isRegistering ? 'Cadastrar e Entrar' : 'Entrar no Sistema'}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-slate-500 hover:text-brand"
              >
                {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se agora'}
              </button>
            </div>
          </form>
        </div>
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  const selectedConv = conversations.find(c => c.id === selectedConvId) || null;
  const aiEnabled = selectedConv?.ai_enabled !== false;

  const activeChat = selectedConv ? {
    name: selectedConv.client?.full_name || selectedConv.subject || 'Cliente Sem Nome',
    phone: selectedConv.client?.phone || 'Sem número',
    status: selectedConv.status || 'open'
  } : null;

  // Filtrando conversas ativas
  const visibleConversations = conversations.filter(c => c.status !== 'deleted');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvId) return;

    try {
      await sendWhatsAppMutation.mutateAsync({
        conversationId: selectedConvId,
        content: inputText
      });
      setInputText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Verifique a conexão do WhatsApp.');
    }
  };

  const toggleAI = async () => {
    if (!selectedConvId) return;
    try {
      await setConversationAIMutation.mutateAsync({
        conversationId: selectedConvId,
        enabled: !aiEnabled
      });
    } catch (error) {
      console.error('Erro ao alternar IA:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-slate-800 font-sans">
      
      {/* 1. SIDEBAR (Navegação) */}
      <aside className="w-20 lg:w-64 bg-sidebar flex flex-col transition-all duration-300 shadow-2xl z-20">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10">
          <Building className="w-8 h-8 text-brand" />
          <span className="ml-3 font-bold text-xl text-white hidden lg:block tracking-tight">estate.io</span>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          <div className="relative mb-6 hidden lg:block px-2">
            <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand transition-all"
            />
          </div>
          
          <NavItem icon={<DollarSign />} label="Comissões" href="/comissoes" />
          <NavItem icon={<MessageSquare />} label="Atendimento" active href="/atendimento" />
          
          <div className="mt-auto">
            <button 
              onClick={() => setIsWhatsAppDrawerOpen(true)}
              className="flex w-full items-center lg:justify-start justify-center gap-3 px-3 py-3 rounded-xl transition-all group relative text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <Settings />
              <span className="hidden lg:block font-medium">WhatsApp Web</span>
            </button>
            <NavItem icon={<ChevronLeft />} label="Recolher" />
          </div>
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL (Header Global + Telas) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER GLOBAL (Dashboard) */}
        <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 z-30 shrink-0 shadow-sm">
          <div>
            <h1 className="font-semibold text-lg text-slate-800 leading-tight">Central de Atendimento</h1>
            <p className="text-xs text-slate-500">Comunicação com clientes em tempo real</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar leads, imóveis, clientes..." 
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand transition-all"
              />
            </div>
            
            <button 
              onClick={() => setIsWhatsAppDrawerOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Settings size={18} />
            </button>
            
            <button 
              onClick={() => setIsAddContactOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand text-brand rounded-lg text-sm font-semibold hover:bg-brand/5 transition-all"
            >
              <Plus size={16} /> Adicionar Contato
            </button>
            
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover shadow-sm transition-all">
              <Plus size={16} /> Novo Atendimento
            </button>
          </div>
        </header>

        {/* ÁREA DE TELAS (Lista de Conversas + Chat Window + Painel IA) */}
        <div className="flex-1 flex bg-slate-50 relative overflow-hidden">
          
          {/* 2. LISTA DE CONVERSAS (Middle Panel) */}
          <div className="w-80 lg:w-96 bg-surface border-r border-border flex flex-col shadow-soft z-10 hidden md:flex shrink-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Conversas</h2>
                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                  {visibleConversations.length}
                </span>
              </div>
              
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                />
              </div>

              <div className="flex gap-2 text-sm">
                <button className="flex-1 py-1.5 bg-brand text-white rounded-md font-medium shadow-sm hover:bg-brand-hover transition-colors">Meus</button>
                <button className="flex-1 py-1.5 bg-slate-100 text-slate-600 rounded-md font-medium hover:bg-slate-200 transition-colors">Equipe</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-custom">
              {convLoading ? (
                <div className="p-4 text-center text-slate-400 text-sm">Carregando conversas...</div>
              ) : visibleConversations.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">Nenhuma conversa encontrada.</div>
              ) : (
                visibleConversations.map(conv => {
                  const isActive = conv.id === selectedConvId;
                  const clientName = conv.client?.full_name || conv.subject || 'Cliente';
                  
                  return (
                    <div 
                      key={conv.id} 
                      onClick={() => setSelectedConvId(conv.id)}
                      className={cn(
                        "p-3 rounded-xl cursor-pointer transition-colors flex gap-3 border",
                        isActive 
                          ? "bg-brand/5 border-brand/20 hover:bg-brand/10" 
                          : "hover:bg-slate-50 border-transparent"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`} alt="Avatar" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={cn("font-semibold truncate", isActive ? "text-slate-900" : "text-slate-700")}>{clientName}</h3>
                          <span className="text-xs text-brand font-medium">Agora</span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">{conv.subject || 'Nova conversa'}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-sm">{conv.status}</span>
                          {conv.ai_enabled !== false && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-sm flex items-center gap-1"><Bot size={10}/> IA Ativa</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. ÁREA PRINCIPAL (Chat Window + Painel IA) */}
          <div className="flex-1 flex bg-slate-50 relative">
            
            {/* Chat Window */}
            <main className="flex-1 flex flex-col relative z-10 bg-white shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] border-r border-slate-100">
              
              {activeChat ? (
                <>
                  {/* Header */}
                  <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                      <h1 className="font-semibold text-lg text-slate-800">{activeChat.name}</h1>
                      <span className="text-sm text-slate-400 flex items-center gap-1"><Phone size={14}/> {activeChat.phone}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Toggle IA */}
                      <button 
                        onClick={toggleAI}
                        disabled={setConversationAIMutation.isPending}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm border",
                          aiEnabled 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200",
                          setConversationAIMutation.isPending && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Bot size={16} />
                        {aiEnabled ? "IA Ativa" : "IA Pausada"}
                      </button>
                      
                      <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-full transition-colors"><Phone size={18} /></button>
                        <button className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-full transition-colors"><Settings size={18} /></button>
                      </div>
                    </div>
                  </header>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc] bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center bg-blend-soft-light bg-opacity-40">
                    {messages.map((msg) => {
                      const isMe = msg.sender?.role === 'agent';
                      const isBot = msg.sender?.role === 'system';
                      const time = new Date(msg.created_at || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      return (
                        <ChatMessage 
                          key={msg.id} 
                          isMe={isMe} 
                          isBot={isBot}
                          time={time} 
                          text={msg.content} 
                        />
                      );
                    })}
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex gap-2 mb-3 px-2">
                      <QuickAction icon={<Calendar size={14}/>} label="Agendar Visita" />
                      <QuickAction icon={<FileText size={14}/>} label="Enviar Ficha" />
                      <QuickAction icon={<Building size={14}/>} label="Sugerir Imóveis" />
                    </div>
                    
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/50 transition-all">
                      <button type="button" className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Paperclip size={20} /></button>
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Digite sua mensagem para o cliente..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 px-2 placeholder:text-slate-400"
                        disabled={sendWhatsAppMutation.isPending}
                      />
                      <button 
                        type="submit" 
                        disabled={!inputText.trim() || sendWhatsAppMutation.isPending}
                        className="p-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand text-white rounded-lg transition-all shadow-sm"
                      >
                        <Send size={18} className={inputText.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <MessageSquare size={48} className="opacity-20" />
                  <p>Selecione uma conversa para iniciar o atendimento</p>
                </div>
              )}
            </main>

            {/* 4. PAINEL DE INTELIGÊNCIA (Matches) */}
            {activeChat && (
              <aside className="w-80 bg-white flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] border-l border-slate-100 relative z-20">
                <div className="h-16 border-b border-border flex items-center px-6 bg-gradient-to-r from-brand/5 to-transparent">
                  <Sparkles className="w-5 h-5 text-brand mr-2" />
                  <h2 className="font-bold text-slate-800">Cérebro da IA</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 scrollbar-custom">
                  
                  {/* Perfil Estruturado */}
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Perfil Extraído</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <ProfileTag label="Status" value={activeChat.status} />
                      <ProfileTag label="Telefone" value={activeChat.phone} />
                    </div>
                  </div>

                  {/* Match Score Results */}
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Matches</h3>
                      <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">Realtime</span>
                    </div>
                    
                    <div className="space-y-4">
                      {leadPropertyRecommendations
                        .filter(r => r.lead_phone && activeChat.phone.includes(r.lead_phone))
                        .map(match => (
                          <MatchCard 
                            key={match.property_id}
                            score={match.match_score}
                            title={match.property_title}
                            price={`R$ ${match.property_price}`}
                            location={match.property_location}
                            tags={[...(match.match_reasons || []).slice(0, 2)]}
                          />
                        ))
                      }
                      
                      {leadPropertyRecommendations.filter(r => r.lead_phone && activeChat.phone.includes(r.lead_phone)).length === 0 && (
                        <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">
                          Nenhum imóvel sugerido pela IA ainda.
                        </div>
                      )}
                    </div>
                    
                    <button className="w-full mt-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                      <Search size={16} /> Ver Catálogo Completo
                    </button>
                  </div>
                  
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
      
      {/* Modais e Overlays */}
      <WhatsAppSettingsDrawer 
        open={isWhatsAppDrawerOpen} 
        onOpenChange={setIsWhatsAppDrawerOpen} 
      />
      <AddContactModal 
        isOpen={isAddContactOpen} 
        onClose={() => setIsAddContactOpen(false)} 
        onSuccess={(convId) => setSelectedConvId(convId)}
      />
      <Toaster position="top-right" richColors />
    </div>
  );
}

// ================= SUBCOMPONENTS =================

function NavItem({ icon, label, active = false, badge, href = "#" }: any) {
  return (
    <a href={href} className={cn(
      "flex items-center lg:justify-start justify-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
      active 
        ? "bg-brand text-white shadow-md" 
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    )}>
      {icon}
      <span className="hidden lg:block font-medium">{label}</span>
      {badge && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </a>
  )
}

function ChatMessage({ isMe, text, time, isBot = false }: any) {
  return (
    <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[75%] lg:max-w-[65%] rounded-2xl px-4 py-3 relative shadow-sm",
        isMe ? "bg-brand text-white rounded-tr-sm" : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm"
      )}>
        {isBot && (
          <span className="absolute -top-3 -right-2 bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-white flex items-center gap-1 shadow-sm">
            <Bot size={10} /> IA
          </span>
        )}
        <p className="text-[15px] leading-relaxed break-words">{text}</p>
        <div className={cn(
          "flex justify-end items-center gap-1 mt-1 text-[11px]",
          isMe ? "text-brand-foreground/70" : "text-slate-400"
        )}>
          <span>{time}</span>
          {isMe && <CheckCheck size={14} className={cn(isBot ? "text-white/60" : "text-blue-200")} />}
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label }: any) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
      {icon}
      {label}
    </button>
  )
}

function ProfileTag({ label, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex flex-col">
      <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-slate-700 truncate">{value}</span>
    </div>
  )
}

function MatchCard({ score, title, price, location, tags }: any) {
  const numScore = Number(score) || 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
      {numScore >= 90 && (
        <div className="absolute -right-6 top-3 bg-emerald-500 text-white text-[10px] font-bold py-1 px-8 rotate-45">
          STRONG
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full font-black text-sm border-2",
            numScore >= 90 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
            numScore >= 70 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-100"
          )}>
            {numScore}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 leading-tight">{title}</h4>
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={10}/> {location}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex items-center gap-2 text-brand font-bold">
        {price}
      </div>
      
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t: string, i: number) => (
          <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
            {t}
          </span>
        ))}
      </div>
      
      <button className="w-full mt-4 bg-brand/10 text-brand font-semibold text-xs py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        Sugerir no Chat
      </button>
    </div>
  )
}
