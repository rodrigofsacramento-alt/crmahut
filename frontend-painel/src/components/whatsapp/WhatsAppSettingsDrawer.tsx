import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  useWhatsAppSession,
  useStartWhatsAppSession,
  useDisconnectWhatsAppSession,
  useSetWhatsAppAIEnabled,
  type WhatsAppSession,
} from '@/hooks/use-whatsapp';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plug,
  Wifi,
  WifiOff,
  AlertTriangle,
  QrCode,
  Loader2,
  Phone,
  Clock,
  Info,
  CheckCircle2,
  Server,
  MessageCircle,
  X,
  Building2,
  RefreshCw,
  Shield,
  Copy,
  Bot,
} from 'lucide-react';

interface WhatsAppSettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusConfig(status: WhatsAppSession['status']) {
  switch (status) {
    case 'connected':
      return {
        label: 'WhatsApp da imobiliária conectado',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: Plug,
      };
    case 'connecting':
      return {
        label: 'Iniciando conexão da imobiliária...',
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: RefreshCw,
      };
    case 'qr_ready':
      return {
        label: 'Escaneie o QR Code no celular da imobiliária',
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: QrCode,
      };
    case 'error':
      return {
        label: 'Falha na conexão da imobiliária',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertTriangle,
      };
    case 'disconnected':
    default:
      return {
        label: 'WhatsApp da imobiliária desconectado',
        color: 'bg-slate-400',
        textColor: 'text-slate-600',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200',
        icon: Plug,
      };
  }
}

export default function WhatsAppSettingsDrawer({ open, onOpenChange }: WhatsAppSettingsDrawerProps) {
  const { profile } = useAuth();
  const { data: session, isLoading, refetch } = useWhatsAppSession();
  const startMutation = useStartWhatsAppSession();
  const disconnectMutation = useDisconnectWhatsAppSession();
  const setAIMutation = useSetWhatsAppAIEnabled();
  const [connectingSince, setConnectingSince] = useState<number | null>(null);
  const [pairingPhone, setPairingPhone] = useState('');
  const aiEnabled = session?.ai_enabled !== false;

  // Realtime updates
  useEffect(() => {
    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel('whatsapp-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_sessions', filter: `tenant_id=eq.${profile.tenant_id}` },
        () => refetch()
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [profile?.tenant_id, refetch]);

  useEffect(() => {
    if (session?.status === 'connecting') {
      if (!connectingSince) setConnectingSince(Date.now());
    } else {
      setConnectingSince(null);
    }
  }, [session?.status, connectingSince]);

  const handleConnect = () => {
    setConnectingSince(Date.now());
    const cleanPhone = pairingPhone.replace(/\D/g, '');
    startMutation.mutate(cleanPhone ? { phone_number: cleanPhone } : {}, {
      onSuccess: () => toast.info('Sessão iniciada. Escaneie o QR Code quando aparecer.'),
      onError: (err: any) => toast.error(err?.message || 'Erro ao iniciar sessão'),
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => toast.success('Sessão desconectada'),
      onError: (err: any) => toast.error(err?.message || 'Erro ao desconectar'),
    });
  };

  const handleToggleAI = (enabled: boolean) => {
    setAIMutation.mutate(
      { enabled },
      {
        onSuccess: () => toast.success(enabled ? 'IA ativada' : 'IA pausada'),
        onError: (err: any) => toast.error(err?.message || 'Erro ao atualizar IA'),
      }
    );
  };

  const statusConfig = getStatusConfig(session?.status || 'disconnected');
  const StatusIcon = statusConfig.icon;

  const elapsed = connectingSince ? Math.floor((Date.now() - connectingSince) / 1000) : 0;
  const showBrokerWarning = session?.status === 'connecting' && elapsed > 10;
  const qrExpiresAt = session?.qr_expires_at ? new Date(session.qr_expires_at) : null;
  const qrExpired = !!qrExpiresAt && qrExpiresAt.getTime() <= Date.now();

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-muted-foreground" />
            Conexão WhatsApp Business
          </SheetTitle>
          <SheetDescription>
            Gerencie a conta do WhatsApp da imobiliária integrada ao sistema. Os clientes enviam mensagens para este número e você as recebe aqui na Central de Atendimento.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identity Header */}
            <div className="rounded-xl border bg-slate-50 border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">Conta da Imobiliária</p>
                  <p className="text-xs text-muted-foreground">
                    {session?.phone_number ? `Número conectado: ${session.phone_number}` : 'Nenhuma conta conectada'}
                  </p>
                </div>
                <span className={`inline-flex h-2 w-2 rounded-full ${statusConfig.color}`} />
              </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-xl border p-4 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white`}>
                  <StatusIcon className={`h-5 w-5 ${statusConfig.textColor} ${session?.status === 'connecting' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${statusConfig.textColor}`}>{statusConfig.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Status da integração com WhatsApp
                  </p>
                </div>
              </div>

              {session?.phone_number && session.status === 'connected' && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/60 p-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{session.phone_number}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">WhatsApp Business</span>
                </div>
              )}

              {session?.last_connected_at && session.status === 'connected' && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Conectado desde {formatDateTime(session.last_connected_at)}</span>
                </div>
              )}

              {session?.status === 'connecting' && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Aguardando QR Code no celular da imobiliária... ({elapsed}s)</span>
                </div>
              )}

              {session?.last_error && session.status === 'error' && (
                <div className="mt-3 rounded-lg bg-red-100 border border-red-200 p-2.5 text-xs text-red-800">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{session.last_error}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Inteligencia artificial</p>
                    <p className="text-xs text-muted-foreground">
                      {aiEnabled ? 'Novas mensagens acionam a IA.' : 'Novas mensagens entram sem resposta automatica.'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={handleToggleAI}
                  disabled={setAIMutation.isPending}
                  aria-label="Ativar ou pausar inteligencia artificial"
                />
              </div>
            </div>

            {/* QR Code Section */}
            {session?.status === 'qr_ready' && (session.qr_code || session.pairing_code) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">Conectar celular da imobiliária</h4>
                </div>
                {session.qr_code && (
                  <div className="flex justify-center">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                      <img
                        src={session.qr_code.startsWith('data:') ? session.qr_code : `data:image/png;base64,${session.qr_code}`}
                        alt="QR Code WhatsApp"
                        className="aspect-square w-[min(82vw,420px)] bg-white [image-rendering:pixelated]"
                      />
                    </div>
                  </div>
                )}
                {session.pairing_code && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Codigo de pareamento</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-[0.18em] text-emerald-950">{session.pairing_code}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigator.clipboard?.writeText(session.pairing_code || '')}
                        title="Copiar código"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-emerald-800">
                      No WhatsApp do Android, abra Aparelhos conectados e escolha a opção de conectar com número/código.
                    </p>
                  </div>
                )}
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-amber-800">Como conectar:</p>
                  <ol className="text-xs text-amber-700 list-decimal list-inside space-y-0.5">
                    <li>Abra o <strong>WhatsApp no celular da imobiliária</strong></li>
                    <li>Vá em <strong>Menu &gt; Aparelhos conectados &gt; Conectar aparelho</strong></li>
                    <li>Aponte a câmera para o QR Code acima</li>
                  </ol>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {qrExpired ? 'Este QR pode ter expirado. Cancele e gere um novo.' : 'O QR Code expira em poucos minutos.'}
                  {qrExpiresAt && !qrExpired ? ` Expira por volta de ${qrExpiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : ''}
                </p>
              </div>
            )}

            {/* Broker Warning */}
            {showBrokerWarning && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-3">
                <Server className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">O serviço de conexão pode estar indisponível.</p>
                  <p className="mt-1 text-xs">
                    Verifique a conexão do WhatsApp e tente novamente em alguns instantes.
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Ações</h4>
              {(!session || session.status === 'disconnected' || session.status === 'error') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Número para pareamento por código</label>
                  <input
                    type="tel"
                    value={pairingPhone}
                    onChange={(e) => setPairingPhone(e.target.value)}
                    placeholder="Ex: 5599999999999"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Opcional. Use quando o Android não conseguir ler o QR Code.
                  </p>
                </div>
              )}
              {!session || session.status === 'disconnected' ? (
                <Button className="w-full gap-2" onClick={handleConnect} disabled={startMutation.isPending}>
                  {startMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  {startMutation.isPending ? 'Iniciando...' : 'Conectar WhatsApp'}
                </Button>
              ) : session.status === 'connected' ? (
                <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                  {disconnectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar WhatsApp'}
                </Button>
              ) : session.status === 'error' ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                    <WifiOff className="h-4 w-4" />
                    Desconectar
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleConnect} disabled={startMutation.isPending}>
                    {startMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                  {disconnectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Cancelar conexão
                </Button>
              )}
            </div>

            <Separator />

            {/* Session Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Informações da sessão</h4>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessão</span>
                  <span className="font-medium">{session?.session_name || 'default'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{session?.status || 'disconnected'}</span>
                </div>
                {session?.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em</span>
                    <span className="font-medium">{formatDateTime(session.created_at)}</span>
                  </div>
                )}
                {session?.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atualizado em</span>
                    <span className="font-medium">{formatDateTime(session.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-lg border bg-blue-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <Info className="h-4 w-4" />
                <span>Como funciona a integração</span>
              </div>
              <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
                <li>Esta é a <strong>conta do WhatsApp da imobiliária</strong> conectada ao sistema.</li>
                <li>Quando um cliente envia mensagem para este número, ela <strong>aparece aqui na Central de Atendimento</strong>.</li>
                <li>Você responde pelo sistema e a mensagem é <strong>enviada pelo WhatsApp da imobiliária</strong>.</li>
                <li>O WhatsApp permite no máximo <strong>4 dispositivos</strong> conectados simultaneamente.</li>
                <li>Mantenha a conexão WhatsApp ativa para não perder mensagens.</li>
              </ul>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
