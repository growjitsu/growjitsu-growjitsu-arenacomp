import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Instagram, Twitter, Facebook, Mail } from 'lucide-react';
import { Logo } from './Logo';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-[#050505] border-t border-white/10 py-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand */}
        <div className="space-y-6">
          <Logo size={44} showText={true} />
          <p className="text-gray-500 text-sm leading-relaxed">
            A maior plataforma de competições e rankings para atletas de alto rendimento. Conectando campeões ao redor do mundo.
          </p>
          <div className="flex items-center space-x-4">
            <a href="#" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <Instagram size={18} />
            </a>
            <a href="#" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <Twitter size={18} />
            </a>
            <a href="#" className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <Facebook size={18} />
            </a>
          </div>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Plataforma</h4>
          <ul className="space-y-4">
            <li><Link to="/rankings" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">Rankings Globais</Link></li>
            <li><Link to="/search" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">Buscar Atletas</Link></li>
            <li><Link to="/login" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">Criar Perfil</Link></li>
          </ul>
        </div>

        {/* Institutional */}
        <div>
          <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Institucional</h4>
          <ul className="space-y-4">
            <li><a href="#" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">Termos de Uso</a></li>
            <li><a href="#" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">Política de Privacidade</a></li>
            <li><a href="#" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">Cookies</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Fale Conosco</h4>
          <ul className="space-y-4">
            <li className="flex items-center space-x-3 text-gray-500 text-sm">
              <Mail size={16} className="text-blue-500" />
              <span>contato@arenacomp.com.br</span>
            </li>
            <li className="mt-6">
              <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                Suporte Técnico
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
          © 2026 ArenaComp Protocol. Todos os direitos reservados.
        </p>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">System Online</span>
        </div>
      </div>
    </footer>
  );
};
