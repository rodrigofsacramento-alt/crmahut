import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  useWhatsAppSession,
  useStartWhatsAppSession,
  useDisconnectWhatsAppSession,
  useSetWhatsAppAIEnabled,
} from '@/hooks/use-whatsapp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  MessageCircle,
  QrCode,
  Loader2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Server,
  Building2,
  Plug,
  Phone,
  ArrowRight,
  Bot,
  Copy,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppConnect() {
  const { profile } = useAuth();
  const { data: session, isLoading, refetch } = useWhatsAppSession();
  const startMutation = useStartWhatsAppSession();
  const disconnectMutation = useDisconnectWhatsAppSession();
  const setAIMutation = useSetWhatsAppAIEnabled();
  const [connectingSince, setConnectingSince] = useState<number | null>(null);
  const [pairingPhone, setPairingPhone] = useState('');
  const aiEnabled = session?.ai_enabled !== false;
  const qrExpiresAt = session?.qr_expires_at ? new Date(session.qr_expires_at) : null;
  const qrExpired = !!qrExpiresAt && qrExpiresAt.getTime() <= Date.now();

  // Realtime updates for QR code and status
  useEffect(() => {
    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel('whatsapp-session-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_sessions', filter: `tenant_id=eq.${profile.tenant_id}` },
        () => {
          refetch();
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [profile?.tenant_id, refetch]);

  // Timer para detectar se a conexao esta demorando demais.
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

  const handleRestartWithPairingCode = async () => {
    const cleanPhone = pairingPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Informe o numero com DDI e DDD. Ex: 5555999999999');
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      setConnectingSince(Date.now());
      await startMutation.mutateAsync({ phone_number: cleanPhone });
      toast.info('Gerando codigo de pareamento. Aguarde alguns segundos.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao gerar codigo de pareamento');
    }
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

  const aiControl = (
    <div className="w-full rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Inteligencia artificial</p>
            <p className="text-xs text-muted-foreground">
              {aiEnabled ? 'Responde automaticamente novas mensagens.' : 'Mensagens entram em modo manual.'}
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
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Disconnected state
  if (!session || session.status === 'disconnected') {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-gradient-to-r from-primary to-primary/90 p-6 text-primary-foreground">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <WifiOff className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold">WhatsApp da imobiliaria desconectado</h3>
                      <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15">Atencao necessaria</Badge>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                      As mensagens novas nao entram na Central de Atendimento enquanto a conta da imobiliaria estiver fora do ar.
                      Reconecte pelo QR Code ou use pareamento por codigo quando o celular nao conseguir ler o QR.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 gap-2 bg-white text-primary hover:bg-white/90"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar status
                </Button>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background/60 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Estado atual</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">Recebimento pausado</p>
                      <p className="mt-1 text-sm text-muted-foreground">A equipe ainda pode consultar historico, mas nao recebe novos contatos.</p>
                    </div>
                    <span className="flex h-3 w-3 rounded-full bg-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.12)]" />
                  </div>
                </div>

                {session?.phone_number && (
                  <div className="rounded-lg border border-border bg-background/60 p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Ultimo numero conectado</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-foreground">{session.phone_number}</span>
                    </div>
                  </div>
                )}

                {aiControl}
              </div>

              <div className="rounded-lg border border-border bg-background/60 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">Reconectar conta WhatsApp Business</p>
                    <p className="mt-1 text-sm text-muted-foreground">Use o celular oficial da imobiliaria para manter o atendimento centralizado.</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <QrCode className="h-5 w-5" />
                  </div>
                </div>

                <label className="text-xs font-semibold text-muted-foreground">Numero para pareamento por codigo</label>
                <input
                  type="tel"
                  value={pairingPhone}
                  onChange={(e) => setPairingPhone(e.target.value)}
                  placeholder="Ex: 5599999999999"
                  className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Opcional. Se o QR nao for lido no Android, informe o numero do celular e use o codigo exibido.
                </p>

                <Button className="mt-5 w-full gap-2" size="lg" onClick={handleConnect} disabled={startMutation.isPending}>
                  {startMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  {startMutation.isPending ? 'Iniciando conexao...' : 'Conectar WhatsApp da imobiliaria'}
                </Button>
              </div>
            </div>
          </section>

          <aside className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Checklist rapido</h4>
                <p className="mt-1 text-sm text-muted-foreground">Antes de reconectar, confira estes pontos para evitar falhas recorrentes.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                'O celular da imobiliaria esta com internet.',
                'Ha vaga para novo aparelho conectado no WhatsApp.',
                'O app WhatsApp esta aberto em Aparelhos conectados.',
                'Apos escanear, aguarde o status mudar para conectado.',
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-border bg-background/60 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <p className="text-sm leading-5 text-foreground">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-sm font-semibold">Limite do WhatsApp</p>
              <p className="mt-1 text-sm leading-5">
                Se aparecer erro ao conectar, remova um dispositivo antigo em Aparelhos conectados e tente novamente.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // QR Ready state
  if (session.status === 'qr_ready' && (session.qr_code || session.pairing_code)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-4 py-8">
        <h3 className="mb-2 text-2xl font-semibold text-foreground">Conectar WhatsApp da Imobiliária</h3>
        <p className="mb-6 max-w-2xl text-center text-sm leading-6 text-muted-foreground">
          Abra o <strong>WhatsApp no celular da imobiliária</strong>, vá em <strong>Menu &gt; Aparelhos conectados &gt; Conectar aparelho</strong> e escaneie o código abaixo.
        </p>
        {session.qr_code && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <img
              src={session.qr_code.startsWith('data:') ? session.qr_code : `data:image/png;base64,${session.qr_code}`}
              alt="QR Code WhatsApp"
              className="aspect-square w-[min(78vw,460px)] bg-white [image-rendering:pixelated]"
            />
          </div>
        )}
        {session.pairing_code && (
          <div className="mb-5 w-full max-w-lg rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Código de pareamento</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-3xl font-bold tracking-[0.18em] text-emerald-950">{session.pairing_code}</span>
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
        <div className="mb-6 grid w-full max-w-3xl gap-3 md:grid-cols-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium">Importante:</p>
            <p>O WhatsApp permite no máximo <strong>4 dispositivos</strong> conectados simultaneamente.</p>
            <p className="mt-1">Se aparecer "Não é possível conectar novos dispositivos", remova um aparelho em <strong>Menu &gt; Aparelhos conectados</strong> e tente novamente.</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Se o QR nao ler</p>
            <p className="mt-1">Clique em cancelar, informe o numero com DDI/DDD no campo de pareamento e conecte novamente para gerar codigo.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="tel"
                value={pairingPhone}
                onChange={(e) => setPairingPhone(e.target.value)}
                placeholder="Ex: 5555999999999"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={handleRestartWithPairingCode}
                disabled={disconnectMutation.isPending || startMutation.isPending}
              >
                Gerar codigo
              </Button>
            </div>
            {qrExpiresAt && (
              <p className={qrExpired ? 'mt-2 font-medium text-destructive' : 'mt-2'}>
                {qrExpired ? 'Este QR pode ter expirado. Gere um novo.' : `Expira por volta de ${qrExpiresAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`}
              </p>
            )}
          </div>
        </div>
        <div className="w-full max-w-md mb-4">
          {aiControl}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar status
          </Button>
          <Button variant="outline" onClick={handleDisconnect} disabled={disconnectMutation.isPending} className="gap-2">
            <WifiOff className="h-4 w-4" />
            Cancelar e gerar novo
          </Button>
        </div>
      </div>
    );
  }

  // Connecting state
  if (session.status === 'connecting') {
    const elapsed = connectingSince ? Math.floor((Date.now() - connectingSince) / 1000) : 0;
    const showBrokerWarning = elapsed > 10;

    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Conectando WhatsApp da Imobiliária...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Aguardando QR Code. Isso pode levar alguns segundos.
        </p>
        {showBrokerWarning && (
          <div className="mt-6 max-w-md bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <Server className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">O serviço de conexão WhatsApp pode estar indisponível.</p>
              <p className="mt-1">
                Verifique a conexão do WhatsApp e tente novamente em alguns instantes.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={handleDisconnect}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        <div className="w-full max-w-md mt-6">
          {aiControl}
        </div>
      </div>
    );
  }

  // Error state
  if (session.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Erro na conexão da Imobiliária</h3>
        <p className="text-muted-foreground text-center max-w-md mb-2">
          {session.last_error || 'Não foi possível conectar o WhatsApp da imobiliária ao sistema.'}
        </p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
            Desconectar
          </Button>
          <Button onClick={handleConnect} disabled={startMutation.isPending}>
            Tentar novamente
          </Button>
        </div>
        <div className="w-full max-w-md mt-6">
          {aiControl}
        </div>
      </div>
    );
  }

  // Connected state
  if (session.status === 'connected') {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Wifi className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <CardTitle>WhatsApp da Imobiliária Conectado</CardTitle>
            <CardDescription>
              {session.phone_number ? `Número: ${session.phone_number}` : 'Sessão ativa'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            O WhatsApp da imobiliária está conectado. As mensagens de clientes aparecem automaticamente na Central de Atendimento.
          </p>
          <div className="mb-4">
            {aiControl}
          </div>
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
            <WifiOff className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
