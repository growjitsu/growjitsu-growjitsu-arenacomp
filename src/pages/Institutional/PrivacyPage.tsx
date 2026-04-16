import React, { useEffect } from 'react';
import { PublicHeader } from '../../components/PublicHeader';
import { PublicFooter } from '../../components/PublicFooter';
import { motion } from 'motion/react';

export const PrivacyPage: React.FC = () => {
  useEffect(() => {
    document.title = "Política de Privacidade | ArenaComp";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Conheça a Política de Privacidade do ArenaComp. Saiba como coletamos, usamos e protegemos seus dados pessoais de acordo com a LGPD.");
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
              POLÍTICA DE PRIVACIDADE – ARENACOMP
            </h1>
            
            <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px] mb-12 border-l-2 border-blue-600 pl-4">
              Última atualização: 15/04/2026
            </p>

            <section className="space-y-8 text-gray-300">
              <p className="leading-relaxed">
                Esta Política explica como o ArenaComp coleta, utiliza e protege seus dados, conforme a Lei Geral de Proteção de Dados (LGPD).
              </p>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">1. DADOS COLETADOS</h2>
                <p className="leading-relaxed font-bold text-white mb-2">Podemos coletar:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nome, e-mail e telefone</li>
                  <li>Dados de perfil (cidade, estado, país, modalidade esportiva)</li>
                  <li>Conteúdos enviados (imagens, certificados, postagens)</li>
                  <li>Dados de navegação e uso</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">2. FINALIDADE DO USO</h2>
                <p className="leading-relaxed font-bold text-white mb-2">Utilizamos os dados para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Operação da plataforma</li>
                  <li>Personalização da experiência</li>
                  <li>Comunicação com o usuário</li>
                  <li>Melhorias no sistema</li>
                  <li>Exibição de anúncios próprios</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">3. COMPARTILHAMENTO</h2>
                <p className="leading-relaxed font-bold text-white mb-2">Seus dados podem ser compartilhados com:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Serviços de hospedagem e infraestrutura</li>
                  <li>Ferramentas de análise</li>
                </ul>
                <p className="leading-relaxed italic mt-4 text-blue-400">Não vendemos dados pessoais.</p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">4. LINKS EXTERNOS</h2>
                <p className="leading-relaxed">
                  A plataforma pode conter links para terceiros. O ArenaComp não é responsável pelas políticas dessas plataformas.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">5. SEGURANÇA</h2>
                <p className="leading-relaxed">
                  Adotamos medidas para proteger os dados, mas não garantimos segurança absoluta.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">6. DIREITOS DO USUÁRIO</h2>
                <p className="leading-relaxed font-bold text-white mb-2">Você pode:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Solicitar acesso aos dados</li>
                  <li>Corrigir dados</li>
                  <li>Solicitar exclusão</li>
                  <li>Revogar consentimento</li>
                </ul>
                <p className="leading-relaxed mt-4">
                  Solicitações: <span className="font-bold text-blue-500">contato@arenacomp.com.br</span>
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">7. RETENÇÃO</h2>
                <p className="leading-relaxed">
                  Os dados são armazenados pelo tempo necessário para operação da plataforma.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">8. COOKIES</h2>
                <p className="leading-relaxed">
                  Utilizamos cookies conforme descrito na Política de Cookies.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">9. ALTERAÇÕES</h2>
                <p className="leading-relaxed">
                  Esta política pode ser atualizada a qualquer momento.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">10. CONTATO</h2>
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
