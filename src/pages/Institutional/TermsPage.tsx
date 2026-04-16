import React, { useEffect } from 'react';
import { PublicHeader } from '../../components/PublicHeader';
import { PublicFooter } from '../../components/PublicFooter';
import { motion } from 'motion/react';

export const TermsPage: React.FC = () => {
  useEffect(() => {
    document.title = "Termos de Uso | ArenaComp";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Leia os Termos de Uso do ArenaComp. Saiba como nossa plataforma funciona e quais são as suas responsabilidades.");
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
              TERMOS DE USO – ARENACOMP
            </h1>
            
            <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px] mb-12 border-l-2 border-blue-600 pl-4">
              Última atualização: 15/04/2026
            </p>

            <section className="space-y-8 text-gray-300">
              <p className="leading-relaxed">
                Bem-vindo ao ArenaComp. Ao acessar ou utilizar nossa plataforma, você concorda com estes Termos de Uso. Caso não concorde, recomendamos não utilizar o sistema.
              </p>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">1. SOBRE A PLATAFORMA</h2>
                <p className="leading-relaxed">
                  O ArenaComp é uma plataforma digital voltada para atletas, professores e organizadores de eventos esportivos, permitindo a criação de perfis, publicação de conteúdos, compartilhamento de resultados, certificados e exibição de anúncios.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">2. CADASTRO E RESPONSABILIDADE</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O usuário deve fornecer informações verdadeiras, completas e atualizadas</li>
                  <li>O acesso é pessoal e intransferível</li>
                  <li>O usuário é responsável pela segurança de suas credenciais</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">3. USO PERMITIDO</h2>
                <p className="leading-relaxed font-bold text-white mb-2">O usuário concorda em NÃO:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Utilizar a plataforma para atividades ilegais</li>
                  <li>Publicar conteúdo ofensivo, discriminatório ou ilícito</li>
                  <li>Violar direitos de terceiros</li>
                  <li>Tentar acessar áreas restritas ou comprometer a segurança do sistema</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">4. CONTEÚDO DO USUÁRIO</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O usuário é responsável por todo conteúdo publicado</li>
                  <li>Ao publicar, concede ao ArenaComp licença para exibição dentro da plataforma</li>
                  <li>O ArenaComp poderá remover conteúdos que violem estes termos</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">5. ANÚNCIOS</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A plataforma exibe anúncios próprios</li>
                  <li>O ArenaComp não se responsabiliza por decisões tomadas com base em anúncios exibidos</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">6. REDIRECIONAMENTO PARA PRODUTOS DE TERCEIROS</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O ArenaComp pode redirecionar usuários para plataformas externas de venda de produtos digitais</li>
                  <li>Toda transação ocorre fora do ambiente do ArenaComp</li>
                  <li>O ArenaComp não é responsável por pagamentos, entregas ou suporte desses produtos</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">7. DISPONIBILIDADE</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>O sistema pode passar por atualizações ou manutenções</li>
                  <li>Não garantimos funcionamento ininterrupto</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">8. LIMITAÇÃO DE RESPONSABILIDADE</h2>
                <p className="leading-relaxed mb-2">O ArenaComp não se responsabiliza por:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Danos indiretos</li>
                  <li>Perda de dados</li>
                  <li>Interrupções do sistema</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">9. SUSPENSÃO DE CONTA</h2>
                <p className="leading-relaxed">
                  Contas podem ser suspensas ou excluídas em caso de violação destes termos.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">10. ALTERAÇÕES</h2>
                <p className="leading-relaxed">
                  Os Termos podem ser atualizados a qualquer momento. O uso contínuo implica aceitação.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">11. LEGISLAÇÃO</h2>
                <p className="leading-relaxed">
                  Regido pelas leis brasileiras.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">12. CONTATO</h2>
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
