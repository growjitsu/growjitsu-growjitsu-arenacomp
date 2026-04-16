import React, { useEffect } from 'react';
import { PublicHeader } from '../../components/PublicHeader';
import { PublicFooter } from '../../components/PublicFooter';
import { motion } from 'motion/react';

export const CookiesPage: React.FC = () => {
  useEffect(() => {
    document.title = "Política de Cookies | ArenaComp";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Entenda como o ArenaComp utiliza cookies para melhorar sua experiência, personalizar navegação e otimizar o desempenho da plataforma.");
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#000] text-white selection:bg-blue-500/30">
      <PublicHeader />
      
      <main className="pt-32 pb-24 px-6">
        <article className="max-w-3xl mx-auto prose prose-invert prose-blue">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-8 text-white">
              POLÍTICA DE COOKIES – ARENACOMP
            </h1>
            
            <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px] mb-12 border-l-2 border-blue-600 pl-4">
              Última atualização: 15/04/2026
            </p>

            <section className="space-y-8 text-gray-300">
              <p className="leading-relaxed">
                Esta Política explica o uso de cookies no ArenaComp.
              </p>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">1. O QUE SÃO COOKIES</h2>
                <p className="leading-relaxed">
                  Cookies são pequenos arquivos armazenados no dispositivo do usuário.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">2. TIPOS UTILIZADOS</h2>
                <div className="space-y-4 pl-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Cookies essenciais:</h3>
                    <p className="leading-relaxed opacity-80">Necessários para funcionamento do sistema</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Cookies de desempenho:</h3>
                    <p className="leading-relaxed opacity-80">Analisam uso da plataforma</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Cookies de funcionalidade:</h3>
                    <p className="leading-relaxed opacity-80">Salvam preferências do usuário</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">3. FINALIDADE</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Melhorar experiência</li>
                  <li>Otimizar desempenho</li>
                  <li>Personalizar navegação</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">4. GERENCIAMENTO</h2>
                <p className="leading-relaxed font-bold text-white mb-2">O usuário pode:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Bloquear cookies no navegador</li>
                  <li>Excluir cookies existentes</li>
                </ul>
                <p className="leading-relaxed italic mt-4 text-rose-400">
                  A desativação pode afetar funcionalidades.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">5. CONSENTIMENTO</h2>
                <p className="leading-relaxed">
                  Ao utilizar o ArenaComp, você concorda com o uso de cookies.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">6. ALTERAÇÕES</h2>
                <p className="leading-relaxed">
                  Esta política pode ser atualizada a qualquer momento.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">7. CONTATO</h2>
                <p className="leading-relaxed font-bold text-blue-500">
                  contato@arenacomp.com.br
                </p>
              </div>
            </section>
          </motion.div>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
};
