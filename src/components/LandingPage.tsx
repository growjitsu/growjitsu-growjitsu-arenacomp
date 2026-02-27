import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Shield, Users, Zap, CheckCircle, ArrowRight, 
  Menu, X, Layout, Smartphone, BarChart3, Clock, 
  Mail, Lock, User as UserIcon, ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { authService } from '../services/authService';

export default function LandingPage({ onLogin }: { onLogin: (userType?: string) => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<'athlete' | 'organizer'>('athlete');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setName('');
    setPassword('');
    setConfirmPassword('');
  }, [authMode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConfigured) {
      setError('Configuração ausente: Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY foram adicionados corretamente nas "Environment Variables" do AI Studio.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        if (!name) {
          setError('O nome é obrigatório');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não coincidem');
          setLoading(false);
          return;
        }

        await authService.signUp({
          email,
          password,
          name,
          userType: selectedUserType,
        });

        onLogin(selectedUserType);
      } else {
        const { userType } = await authService.signIn(email, password);
        onLogin(userType);
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      setError(err.message || 'Ocorreu um erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: "Categorização Automática", desc: "Regra oficial por ano de nascimento integrada ao sistema." },
    { icon: Layout, title: "Divisão Inteligente", desc: "Separação automática por idade, faixa e peso em segundos." },
    { icon: Trophy, title: "Gestão de Eventos", desc: "Crie e gerencie campeonatos profissionais com facilidade." },
    { icon: Smartphone, title: "Placar Eletrônico", desc: "Interface otimizada para tablets e TVs em eventos ao vivo." },
    { icon: Users, title: "Área do Atleta", desc: "Perfis completos com histórico e categoria automática." },
    { icon: BarChart3, title: "Dashboard Pro", desc: "Controle total de inscritos e métricas para organizadores." },
  ];

  const steps = [
    { num: "01", title: "Crie sua conta", desc: "Escolha seu perfil de Atleta ou Organizador." },
    { num: "02", title: "Cadastre o evento", desc: "Configure local, data e regras do campeonato." },
    { num: "03", title: "Inscrições", desc: "Atletas se inscrevem e são categorizados na hora." },
    { num: "04", title: "Organize", desc: "O sistema gera as chaves e o cronograma." },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] selection:bg-bjj-blue selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 border-b border-[var(--border-ui)] bg-[var(--bg-app)]/80 backdrop-blur-xl z-[100]">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-bjj-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Trophy className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black font-display tracking-tighter">ARENA<span className="text-bjj-blue">COMP</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {['Sobre', 'Funcionalidades', 'Campeonatos', 'Planos'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-[var(--text-muted)] hover:text-bjj-blue transition-colors">{item}</a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              className="hidden sm:block text-sm font-bold hover:text-bjj-blue transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
              className="btn-primary py-2.5 px-6 text-sm shadow-blue-500/20"
            >
              Começar Agora
            </button>
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 top-20 bg-[var(--bg-app)] z-[90] p-6 md:hidden"
          >
            <nav className="flex flex-col gap-6">
              {['Sobre', 'Funcionalidades', 'Campeonatos', 'Planos'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-2xl font-black font-display" onClick={() => setIsMenuOpen(false)}>{item}</a>
              ))}
              <button 
                onClick={() => { setShowAuthModal(true); setIsMenuOpen(false); }}
                className="btn-primary w-full py-4"
              >
                Entrar na Plataforma
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 right-0 w-96 h-96 bg-bjj-blue/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-bjj-purple/20 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-bjj-blue/10 text-bjj-blue text-xs font-black uppercase tracking-widest mb-6">
              A Nova Referência Nacional
            </span>
            <h1 className="text-5xl md:text-7xl font-black font-display tracking-tight leading-[0.9] mb-8">
              O futuro dos campeonatos de <span className="text-bjj-blue">Jiu-Jitsu</span> começa aqui.
            </h1>
            <p className="text-xl text-[var(--text-muted)] leading-relaxed mb-10 max-w-xl">
              Gestão inteligente, categorias automáticas por ano de nascimento, criação de chaves e placar eletrônico profissional em uma única plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                className="btn-primary py-4 px-10 text-lg group"
              >
                Criar minha conta
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="btn-outline py-4 px-10 text-lg">
                Sou Organizador
              </button>
            </div>
            <div className="mt-12 flex items-center gap-6 text-sm text-[var(--text-muted)] font-medium">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <img key={i} src={`https://picsum.photos/seed/user${i}/100/100`} className="w-10 h-10 rounded-full border-2 border-[var(--bg-app)]" referrerPolicy="no-referrer" />
                ))}
              </div>
              <p><span className="text-[var(--text-main)] font-bold">+2.500</span> atletas já utilizam a ArenaComp</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 card-surface p-4 bg-zinc-900/50 backdrop-blur-sm border-white/10 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
              <img 
                src="https://picsum.photos/seed/dashboard/1200/800" 
                className="rounded-xl w-full shadow-2xl"
                alt="ArenaComp Dashboard"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-6 -left-6 card-surface p-4 bg-bjj-blue text-white shadow-2xl -rotate-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Placar ao Vivo</p>
                <p className="text-2xl font-black tabular-nums">04:20</p>
              </div>
              <div className="absolute -top-6 -right-6 card-surface p-4 bg-emerald-500 text-white shadow-2xl rotate-3">
                <CheckCircle size={24} />
                <p className="text-xs font-bold mt-1">Categoria Confirmada</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-bjj-blue/20 to-bjj-purple/20 blur-3xl -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-24 px-6 bg-[var(--bg-card)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black font-display mb-6">Tudo o que você precisa para organizar com excelência.</h2>
            <p className="text-lg text-[var(--text-muted)]">Elimine erros manuais e foque no que importa: a experiência dos atletas e do público.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -8 }}
                className="card-surface p-8 bg-[var(--bg-app)] hover:border-bjj-blue/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-bjj-blue/10 flex items-center justify-center text-bjj-blue mb-6">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black font-display text-center mb-20">Como funciona</h2>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-[var(--border-ui)] -z-10" />
            {steps.map((s, i) => (
              <div key={i} className="text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-[var(--bg-app)] border-4 border-bjj-blue flex items-center justify-center mx-auto shadow-xl">
                  <span className="text-3xl font-black font-display text-bjj-blue">{s.num}</span>
                </div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-sm text-[var(--text-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 px-6 bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-bjj-blue/30 blur-[150px] rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black font-display mb-8">Um plano único. Acesso total.</h2>
          <div className="max-w-md mx-auto card-surface p-12 bg-white/5 border-white/10 backdrop-blur-xl">
            <p className="text-zinc-400 font-bold uppercase tracking-widest mb-4">Assinatura Mensal</p>
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-2xl font-bold opacity-50">R$</span>
              <span className="text-7xl font-black font-display">19,90</span>
              <span className="text-xl font-bold opacity-50">/mês</span>
            </div>
            <ul className="text-left space-y-4 mb-10">
              {['Acesso completo à plataforma', 'Campeonatos ilimitados', 'Categorização automática', 'Placar eletrônico pro', 'Suporte prioritário'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle size={18} className="text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="btn-primary w-full py-5 text-xl shadow-blue-500/40"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-[var(--border-ui)]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-bjj-blue rounded-lg flex items-center justify-center">
                <Trophy className="text-white" size={18} />
              </div>
              <span className="text-xl font-black font-display tracking-tighter">ARENA<span className="text-bjj-blue">COMP</span></span>
            </div>
            <p className="text-[var(--text-muted)] max-w-sm leading-relaxed">
              A plataforma definitiva para a evolução do Jiu-Jitsu competitivo. Tecnologia a serviço da tradição.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Links</h4>
            <ul className="space-y-4 text-sm text-[var(--text-muted)]">
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Sobre nós</a></li>
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Campeonatos</a></li>
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-[var(--text-muted)]">
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-bjj-blue transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-[var(--border-ui)] text-center text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">
          © 2026 ArenaComp. Todos os direitos reservados.
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md card-surface p-8 bg-[var(--bg-card)] shadow-2xl"
            >
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-[var(--border-ui)] rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex gap-4 mb-8 p-1 bg-[var(--border-ui)] rounded-xl">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${authMode === 'login' ? 'bg-[var(--bg-card)] text-bjj-blue shadow-sm' : 'text-[var(--text-muted)]'}`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${authMode === 'signup' ? 'bg-[var(--bg-card)] text-bjj-blue shadow-sm' : 'text-[var(--text-muted)]'}`}
                >
                  Criar Conta
                </button>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black font-display">
                    {authMode === 'login' ? 'Bem-vindo de volta' : 'Comece sua jornada'}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {authMode === 'login' ? 'Acesse sua conta ArenaComp' : 'Junte-se a milhares de atletas'}
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
                      {error}
                    </div>
                  )}
                  {authMode === 'signup' && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <button 
                          type="button" 
                          onClick={() => setSelectedUserType('athlete')}
                          className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${selectedUserType === 'athlete' ? 'border-bjj-blue bg-bjj-blue/5' : 'border-[var(--border-ui)]'}`}
                        >
                          <UserIcon size={24} className={selectedUserType === 'athlete' ? 'text-bjj-blue' : 'text-[var(--text-muted)]'} />
                          <span className="text-[10px] font-black uppercase">Atleta</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setSelectedUserType('organizer')}
                          className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${selectedUserType === 'organizer' ? 'border-bjj-purple bg-bjj-purple/5' : 'border-[var(--border-ui)]'}`}
                        >
                          <ShieldCheck size={24} className={selectedUserType === 'organizer' ? 'text-bjj-purple' : 'text-[var(--text-muted)]'} />
                          <span className="text-[10px] font-black uppercase">Organizador</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-[var(--text-muted)] ml-1">Nome Completo</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                          <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome completo"
                            className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-bjj-blue/50"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                      <input 
                        type="email" 
                        placeholder="seu@email.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-bjj-blue/50" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-ui)] rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-bjj-blue/50" 
                      />
                    </div>
                  </div>

                  {authMode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Confirmar Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full bg-[var(--bg-app)] border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 ${
                            confirmPassword && password !== confirmPassword 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-[var(--border-ui)] focus:ring-bjj-blue/50'
                          }`} 
                        />
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-[10px] text-red-500 font-bold mt-1">As senhas não coincidem</p>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary w-full py-4 mt-4 shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processando...' : (authMode === 'login' ? 'Entrar' : 'Criar Conta')}
                  </button>
                </form>

                <p className="text-center text-xs text-[var(--text-muted)]">
                  {authMode === 'login' ? (
                    <>Não tem uma conta? <button onClick={() => setAuthMode('signup')} className="text-bjj-blue font-bold hover:underline">Cadastre-se</button></>
                  ) : (
                    <>Já tem uma conta? <button onClick={() => setAuthMode('login')} className="text-bjj-blue font-bold hover:underline">Faça login</button></>
                  )}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
